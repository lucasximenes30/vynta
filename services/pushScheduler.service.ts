import { prisma } from '@/lib/prisma'
import { userHasAccess } from '@/lib/access'
import { listUserNotifications } from '@/services/notification.service'
import { DEFAULT_PREFERENCES, isPushConfigured, sendToSubscriptions, type PushPayload } from '@/services/push.service'

/**
 * Scheduled Web Push reminders. Called by the cron route; safe to run at any frequency:
 * every push is claimed in `push_logs` (userId + key) before it is sent, so overlapping or
 * repeated runs never notify twice. What gets sent depends on each user's local time:
 *  - morning (07h–11h): bills due today/tomorrow/late, today's agenda, trial ending
 *  - evening (19h–22h): pending habits, "did you log your spending today?"
 *  - any time (06h–23h): agenda events starting within the next hour (needs a frequent cron)
 */

const MORNING = [7, 11]
const EVENING = [19, 22]
const EVENT_WINDOW_MIN = 60
const DAY_MS = 24 * 60 * 60 * 1000
const CONCURRENCY = 6

type Local = { day: string; hour: number; minute: number; midnight: Date }

function localTime(timeZone: string, now: Date): Local {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(now)
  } catch {
    return localTime(DEFAULT_PREFERENCES.timezone, now)
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  const day = `${get('year')}-${get('month')}-${get('day')}`
  const hour = Number(get('hour'))
  const minute = Number(get('minute'))
  const offset = Date.parse(`${day}T${get('hour')}:${get('minute')}:00Z`) - Math.floor(now.getTime() / 60000) * 60000
  return { day, hour, minute, midnight: new Date(Date.parse(`${day}T00:00:00Z`) - offset) }
}

const inRange = (h: number, [from, to]: number[]) => h >= from && h <= to

function listNames(names: string[], max = 2) {
  const shown = names.slice(0, max).join(', ')
  return names.length > max ? `${shown} e mais ${names.length - max}` : shown
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let i = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) await fn(items[i++])
  }))
}

interface Planned { userId: string; key: string; payload: PushPayload }

export async function runScheduledPushes(now = new Date()) {
  if (!isPushConfigured()) return { skipped: 'VAPID keys not configured' }

  const users = await prisma.user.findMany({
    where: { pushSubscriptions: { some: {} } },
    select: {
      id: true, name: true, createdAt: true, role: true, plan: true,
      subscriptionStatus: true, subscriptionEndDate: true, subscriptionExpiresAt: true,
      canUseFinance: true, canUseHabits: true, canUseAgenda: true,
      notificationPrefs: { select: { bills: true, agenda: true, habits: true, dailyLog: true, timezone: true } },
      pushSubscriptions: { select: { id: true, endpoint: true, p256dh: true, auth: true } },
    },
  })

  const planned: Planned[] = []
  const ctx = users.map((u) => {
    const prefs = u.notificationPrefs ?? DEFAULT_PREFERENCES
    return { user: u, prefs, local: localTime(prefs.timezone, now), hasAccess: userHasAccess(u, now.getTime()) }
  })

  // Trial ending: the only reminder sent to users still on the free trial's last day, regardless of slot.
  for (const { user, local } of ctx) {
    if (user.plan !== 'FREE_TRIAL' || !user.subscriptionExpiresAt || !inRange(local.hour, [9, 21])) continue
    const msLeft = user.subscriptionExpiresAt.getTime() - now.getTime()
    if (msLeft > 0 && msLeft <= DAY_MS) {
      planned.push({
        userId: user.id,
        key: `trial-ending:${user.subscriptionExpiresAt.toISOString().slice(0, 10)}`,
        payload: {
          title: 'Último dia do seu teste grátis',
          body: 'Continue com tudo que você já organizou: assine em 1 minuto e não perca a sequência.',
          url: '/subscription?source=push',
          tag: 'trial',
        },
      })
    }
  }

  const active = ctx.filter((c) => c.hasAccess)
  const morning = active.filter((c) => inRange(c.local.hour, MORNING))
  const evening = active.filter((c) => inRange(c.local.hour, EVENING))
  const daytime = active.filter((c) => c.user.canUseAgenda !== false && c.prefs.agenda && inRange(c.local.hour, [6, 23]))

  const habitUsers = evening.filter((c) => c.prefs.habits && c.user.canUseHabits)
  const logUsers = evening.filter((c) => c.prefs.dailyLog && c.user.canUseFinance)
  const agendaDays = [...new Set(daytime.map((c) => c.local.day))]

  const [habits, lastTx, events] = await Promise.all([
    habitUsers.length
      ? prisma.habit.findMany({
          where: { userId: { in: habitUsers.map((c) => c.user.id) }, isActive: true },
          orderBy: { order: 'asc' },
          select: {
            userId: true, title: true,
            checkins: { where: { date: { in: [...new Set(habitUsers.map((c) => c.local.day))] }, completed: true }, select: { date: true } },
          },
        })
      : [],
    logUsers.length
      ? prisma.transaction.groupBy({
          by: ['userId'],
          where: { userId: { in: logUsers.map((c) => c.user.id) } },
          _max: { createdAt: true },
        })
      : [],
    daytime.length
      ? prisma.calendarEvent.findMany({
          where: {
            userId: { in: daytime.map((c) => c.user.id) },
            OR: agendaDays.map((day) => ({ date: { gte: new Date(`${day}T00:00:00Z`), lte: new Date(`${day}T23:59:59.999Z`) } })),
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
          select: { id: true, userId: true, title: true, date: true, startTime: true, isAllDay: true },
        })
      : [],
  ])

  // Evening: habits still open today
  for (const { user, local } of habitUsers) {
    const mine = habits.filter((h) => h.userId === user.id)
    const pending = mine.filter((h) => !h.checkins.some((c) => c.date === local.day))
    if (mine.length === 0 || pending.length === 0) continue
    const done = mine.length - pending.length
    planned.push({
      userId: user.id,
      key: `habits:${local.day}`,
      payload: {
        title: pending.length === 1 ? `Falta 1 hábito hoje: ${pending[0].title}` : `Faltam ${pending.length} hábitos hoje`,
        body: done > 0
          ? `Você já fez ${done} de ${mine.length}. ${pending.length === 1 ? 'Marque antes de dormir e mantenha a sequência.' : `Falta: ${listNames(pending.map((h) => h.title))}.`}`
          : `${listNames(pending.map((h) => h.title))}. Marque antes de dormir e mantenha a sequência.`,
        url: '/habits?source=push',
        tag: 'habits',
        ttl: 3 * 3600,
      },
    })
  }

  // Evening: nothing logged today (only for people who use the finance side or just signed up)
  const lastTxByUser = new Map(lastTx.map((t) => [t.userId, t._max.createdAt]))
  for (const { user, local } of logUsers) {
    const last = lastTxByUser.get(user.id)
    if (last && last >= local.midnight) continue
    const engaged = (last && now.getTime() - last.getTime() < 14 * DAY_MS) || now.getTime() - user.createdAt.getTime() < 14 * DAY_MS
    if (!engaged) continue
    planned.push({
      userId: user.id,
      key: `daily-log:${local.day}`,
      payload: {
        title: 'Gastou algo hoje?',
        body: 'Anote em 5 segundos e feche o dia sabendo exatamente pra onde foi o dinheiro.',
        url: '/dashboard?add=expense&source=push',
        tag: 'daily-log',
        ttl: 3 * 3600,
        actions: [
          { action: 'expense', title: 'Anotar gasto', url: '/dashboard?add=expense&source=push' },
          { action: 'income', title: 'Anotar entrada', url: '/dashboard?add=income&source=push' },
        ],
      },
    })
  }

  // Agenda: morning digest + "starting soon"
  for (const { user, local } of daytime) {
    const today = events.filter((e) => e.userId === user.id && e.date.toISOString().slice(0, 10) === local.day)
    if (today.length === 0) continue

    if (inRange(local.hour, MORNING)) {
      planned.push({
        userId: user.id,
        key: `agenda-digest:${local.day}`,
        payload: {
          title: today.length === 1 ? 'Você tem 1 compromisso hoje' : `Você tem ${today.length} compromissos hoje`,
          body: today.map((e) => (e.startTime && !e.isAllDay ? `${e.startTime} ${e.title}` : e.title)).slice(0, 3).join(' · ')
            + (today.length > 3 ? ` · +${today.length - 3}` : ''),
          url: '/calendar?source=push',
          tag: 'agenda',
          ttl: 6 * 3600,
        },
      })
    }

    const nowMin = local.hour * 60 + local.minute
    for (const e of today) {
      if (e.isAllDay || !e.startTime) continue
      const [h, m] = e.startTime.split(':').map(Number)
      const diff = h * 60 + m - nowMin
      if (diff <= 0 || diff > EVENT_WINDOW_MIN) continue
      planned.push({
        userId: user.id,
        key: `event:${e.id}:${local.day}`,
        payload: {
          title: e.title,
          body: diff <= 5 ? `Começa agora (${e.startTime})` : `Começa às ${e.startTime} — em ${diff} min`,
          url: '/calendar?source=push',
          tag: `event-${e.id}`,
          ttl: diff * 60,
        },
      })
    }
  }

  // Morning: bills due (per-user, reuses the in-app notification rules)
  await mapLimit(morning.filter((c) => c.prefs.bills && c.user.canUseFinance), CONCURRENCY, async ({ user, local }) => {
    const [y, mo, d] = local.day.split('-').map(Number)
    const bills = (await listUserNotifications(user.id, new Date(y, mo - 1, d, 12)))
      .filter((n) => n.sourceType !== 'card_limit' && (n.type === 'today' || (n.type === 'upcoming' && n.days === 1) || (n.type === 'late' && n.days <= 3)))
    if (bills.length === 0) return
    const late = bills.filter((b) => b.type === 'late')
    const today = bills.filter((b) => b.type === 'today')
    const tomorrow = bills.filter((b) => b.type === 'upcoming')
    const title = late.length
      ? `${late.length === 1 ? '1 conta atrasada' : `${late.length} contas atrasadas`}`
      : today.length
        ? `${today.length === 1 ? 'Conta vence hoje' : `${today.length} contas vencem hoje`}`
        : `${tomorrow.length === 1 ? 'Conta vence amanhã' : `${tomorrow.length} contas vencem amanhã`}`
    const body = [
      late.length ? `Atrasado: ${listNames(late.map((b) => b.title))}` : '',
      today.length ? `Hoje: ${listNames(today.map((b) => b.title))}` : '',
      tomorrow.length ? `Amanhã: ${listNames(tomorrow.map((b) => b.title))}` : '',
    ].filter(Boolean).join(' · ')
    planned.push({
      userId: user.id,
      key: `bills:${local.day}`,
      payload: { title, body, url: '/finances?source=push', tag: 'bills', ttl: 8 * 3600 },
    })
  })

  if (planned.length === 0) return { users: users.length, planned: 0, sent: 0 }

  // Claim first, send after: a key that already exists (previous run) is silently skipped.
  const claimed = await prisma.pushLog.createManyAndReturn({
    data: planned.map(({ userId, key }) => ({ userId, key })),
    skipDuplicates: true,
    select: { userId: true, key: true },
  })
  const claimedSet = new Set(claimed.map((c) => `${c.userId}|${c.key}`))
  const subsByUser = new Map(users.map((u) => [u.id, u.pushSubscriptions]))

  let sent = 0
  const failed: Planned[] = []
  await mapLimit(planned.filter((p) => claimedSet.has(`${p.userId}|${p.key}`)), CONCURRENCY, async (p) => {
    const delivered = await sendToSubscriptions(subsByUser.get(p.userId) ?? [], p.payload)
    sent += delivered
    if (delivered === 0) failed.push(p)
  })

  // Nothing delivered (push service down, etc.): release the claim so the next run retries.
  if (failed.length) {
    await prisma.pushLog.deleteMany({ where: { OR: failed.map(({ userId, key }) => ({ userId, key })) } })
  }

  await prisma.pushLog.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 40 * DAY_MS) } } })

  return { users: users.length, planned: planned.length, claimed: claimed.length, sent, failed: failed.length }
}
