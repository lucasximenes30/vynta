import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

// Server-only module (no 'use server'): every caller must already know the userId is trusted.

export interface PushPayload {
  title: string
  body: string
  /** Same-origin path opened when the notification is tapped. */
  url?: string
  /** Notifications with the same tag replace each other instead of stacking. */
  tag?: string
  actions?: Array<{ action: string; title: string; url: string }>
  /** Seconds the push service keeps trying to deliver (phone offline). Default 12h. */
  ttl?: number
}

export interface PushSubscriptionInput {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

let configured: boolean | null = null

export function isPushConfigured(): boolean {
  if (configured !== null) return configured
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  configured = !!(publicKey && privateKey)
  if (configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contato@vynta.app', publicKey!, privateKey!)
  }
  return configured
}

export async function savePushSubscription(userId: string, sub: PushSubscriptionInput, userAgent?: string | null) {
  // An endpoint belongs to one browser profile: if another account logs in on it, it moves over.
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent?.slice(0, 300) },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent?.slice(0, 300) },
  })
}

export async function deletePushSubscription(endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } })
}

type StoredSubscription = { id: string; endpoint: string; p256dh: string; auth: string }

/** Sends to the given subscriptions, pruning the ones the push service reports as gone. Returns how many were delivered. */
export async function sendToSubscriptions(subs: StoredSubscription[], payload: PushPayload): Promise<number> {
  if (!isPushConfigured() || subs.length === 0) return 0

  const { ttl = 60 * 60 * 12, ...message } = payload
  const body = JSON.stringify(message)
  const delivered: string[] = []
  const gone: string[] = []

  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
        { TTL: ttl, urgency: 'normal', topic: payload.tag?.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) || undefined },
      )
      delivered.push(sub.id)
    } catch (err: any) {
      const status = err?.statusCode
      if (status === 404 || status === 410 || status === 403) gone.push(sub.id)
      else console.error('[push] send failed', status, err?.body || err?.message)
    }
  }))

  await Promise.all([
    gone.length ? prisma.pushSubscription.deleteMany({ where: { id: { in: gone } } }) : null,
    delivered.length ? prisma.pushSubscription.updateMany({ where: { id: { in: delivered } }, data: { lastUsedAt: new Date() } }) : null,
  ])

  return delivered.length
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!isPushConfigured()) return 0
  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  })
  return sendToSubscriptions(subs, payload)
}

export const DEFAULT_PREFERENCES = { bills: true, agenda: true, habits: true, dailyLog: true, timezone: 'America/Sao_Paulo' }

export async function getNotificationPreferences(userId: string) {
  const [prefs, devices] = await Promise.all([
    prisma.notificationPreference.findUnique({
      where: { userId },
      select: { bills: true, agenda: true, habits: true, dailyLog: true, timezone: true },
    }),
    prisma.pushSubscription.count({ where: { userId } }),
  ])
  return { ...(prefs ?? DEFAULT_PREFERENCES), devices }
}

export async function updateNotificationPreferences(
  userId: string,
  data: Partial<Omit<typeof DEFAULT_PREFERENCES, 'timezone'>> & { timezone?: string },
) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_PREFERENCES, ...data },
    update: data,
    select: { bills: true, agenda: true, habits: true, dailyLog: true, timezone: true },
  })
}
