import webpush from 'web-push'
import { prisma } from '@/lib/prisma'
import { PLANS, formatBRL, type BillingTier } from '@/lib/plans'
import { isAllowedPushEndpoint } from '@/lib/outboundPolicy'

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
  /** Dedup key the SW marks when this push arrives so the offline evaluator doesn't repeat it. */
  localKey?: string
  /** Optional custom audio URL played when the notification is delivered/opened (e.g. approved sale chime). */
  sound?: string
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
    try {
      webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contato@vynta.app', publicKey!, privateKey!)
    } catch (err) {
      // Malformed env values throw here; treat push as unconfigured instead of 500ing callers.
      console.error('[push] VAPID keys inválidas:', err)
      configured = false
    }
  }
  return configured
}

/** Devices (browsers/phones) per account that receive pushes. Generous on purpose: phone + PC + tablet + work PC... */
export const MAX_DEVICES_PER_USER = 10

export async function savePushSubscription(userId: string, sub: PushSubscriptionInput, userAgent?: string | null) {
  if (!isAllowedPushEndpoint(sub.endpoint)) throw new Error('Serviço de notificações não permitido.')
  // An endpoint belongs to one browser profile: if another account logs in on it, it moves over.
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent?.slice(0, 300) },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent?.slice(0, 300) },
  })

  // Every device of the account receives pushes (phone, computer, tablet...). Only very old
  // extras beyond MAX_DEVICES_PER_USER are dropped, keeping the most recently registered ones.
  const extra = await prisma.pushSubscription.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    skip: MAX_DEVICES_PER_USER,
    select: { id: true },
  })
  if (extra.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: extra.map((s) => s.id) } } })
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
    // Revalidate stored subscriptions too; invalid legacy records must never be contacted by cron.
    if (!isAllowedPushEndpoint(sub.endpoint)) { gone.push(sub.id); return }
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
        { TTL: ttl, timeout: 10_000, urgency: 'normal', topic: payload.tag?.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) || undefined },
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

/**
 * Sends a Web Push notification to all devices registered by users with role === 'ADMIN'.
 * Wrapped in try/catch so admin notifications never block or fail customer flows.
 */
export async function sendPushToAdmins(payload: PushPayload): Promise<number> {
  if (!isPushConfigured()) return 0
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { user: { role: 'ADMIN' } },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    })
    if (subs.length === 0) return 0
    return await sendToSubscriptions(subs, payload)
  } catch (err: any) {
    console.error('[push] sendPushToAdmins failed:', err?.message || err)
    return 0
  }
}

export async function notifyAdminsNewAccount(params: {
  userId: string
  name?: string
  email?: string
}): Promise<number> {
  return sendPushToAdmins({
    title: 'Nova conta criada',
    body: 'Olá, seu SaaS acabou de ter uma conta criada.',
    url: '/admin/users',
    tag: `admin-signup-${params.userId}`,
  })
}

export async function notifyAdminsPendingSale(params: {
  checkoutId: string
  name?: string
  email?: string
  tier: BillingTier
  amountCents?: number
}): Promise<number> {
  const plan = PLANS[params.tier] ?? PLANS.pro
  const planLabel = params.tier === 'pro_yearly' ? 'Plano Anual' : 'Plano Mensal'
  const fullValue = formatBRL(params.amountCents && params.amountCents > 0 ? params.amountCents : plan.priceCents)

  return sendPushToAdmins({
    title: 'Compra pendente',
    body: `Compra pendente no valor de ${fullValue} (${planLabel})`,
    url: '/admin/payments',
    tag: `admin-pending-${params.checkoutId}`,
  })
}

export async function notifyAdminsApprovedSale(params: {
  chargeId: string
  name?: string
  email?: string
  tier: BillingTier
  amountCents?: number
}): Promise<number> {
  const plan = PLANS[params.tier] ?? PLANS.pro
  const planLabel = params.tier === 'pro_yearly' ? 'Plano Anual' : 'Plano Mensal'
  const fullValue = formatBRL(params.amountCents && params.amountCents > 0 ? params.amountCents : plan.priceCents)

  return sendPushToAdmins({
    title: 'Conta aprovada',
    body: `Compra aprovada no valor de ${fullValue} (${planLabel})`,
    url: '/admin/payments?sound=sale',
    tag: `admin-sale-${params.chargeId}`,
    sound: '/sounds/sale-approved.mp3',
  })
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
