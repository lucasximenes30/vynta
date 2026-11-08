import { prisma } from '@/lib/prisma'
import { userHasAccess } from '@/lib/access'
import { isPromoEligible } from '@/lib/plans'
import {
  inactiveEmail, neverUsedEmail, promoEndingEmail, trialExpiredEmail, trialLastDayEmail, type RenderedEmail,
} from '@/lib/emailTemplates'
import { isEmailConfigured, sendTrackedEmail } from '@/services/email.service'
import { getLastActivityByUser } from '@/services/admin/user.admin.service'
import { activityTrackingStart, lastSeenOrFallback } from '@/services/pushScheduler.service'

/**
 * Remarketing / lifecycle e-mails. Runs inside the cron route (2x/day is enough). Every e-mail is
 * claimed in `email_logs (userId, key)` before sending, so each one goes out at most once; the same
 * row records opens/clicks (see sendTrackedEmail).
 *  - never-used:     trial account 20h–6d old that never created anything
 *  - inactive:       has access but hasn't opened the app for 3+ days (once per absence)
 *  - trial-last-day: trial ends within 24h → 1º mês promocional
 *  - trial-expired:  trial ended 12h–7d ago (still inside the promo window)
 *  - promo-ending:   one-time promo month ends within 3 days → recurring plan
 * Users with `emailOptOut` never receive these (transactional e-mails are separate).
 */

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const CONCURRENCY = 5

interface Planned {
  user: { id: string; name: string; email: string }
  key: string
  build: (unsubscribeUrl?: string) => RenderedEmail
  tag: string
}

export async function runScheduledEmails(now = new Date()) {
  if (!isEmailConfigured()) return { skipped: 'BREVO_API_KEY not configured' }
  const t = now.getTime()

  const users = await prisma.user.findMany({
    where: {
      emailOptOut: false,
      role: { notIn: ['ADMIN', 'COURTESY'] },
      plan: { notIn: ['ADMIN', 'COURTESY'] },
      OR: [
        { plan: 'FREE_TRIAL', createdAt: { gte: new Date(t - 30 * DAY) } },
        { plan: { in: ['PRO', 'PRO_YEARLY', 'VIP'] }, subscriptionStatus: 'ACTIVE' },
      ],
    },
    select: {
      id: true, name: true, email: true, createdAt: true, lastSeenAt: true, role: true, plan: true,
      subscriptionStatus: true, subscriptionEndDate: true, subscriptionExpiresAt: true, subscriptionId: true,
    },
  })
  if (users.length === 0) return { users: 0, planned: 0, sent: 0 }

  const neverUsedCandidates = users.filter((u) => u.plan === 'FREE_TRIAL' && t - u.createdAt.getTime() >= 20 * HOUR && t - u.createdAt.getTime() < 6 * DAY)
  const [lastActivity, trackingStart] = await Promise.all([
    getLastActivityByUser(neverUsedCandidates.map((u) => u.id)),
    activityTrackingStart(),
  ])

  const planned: Planned[] = []
  for (const u of users) {
    const user = { id: u.id, name: u.name, email: u.email }
    const exp = u.subscriptionExpiresAt?.getTime()

    if (u.plan === 'FREE_TRIAL' && exp) {
      const promo = isPromoEligible(u, false, t)
      if (exp > t && exp - t <= DAY) {
        planned.push({ user, key: `trial-last-day:${u.subscriptionExpiresAt!.toISOString().slice(0, 10)}`, tag: 'trial-last-day', build: (unsub) => trialLastDayEmail(u.name, unsub) })
        continue
      }
      if (promo && t - exp >= 12 * HOUR) {
        planned.push({ user, key: 'trial-expired', tag: 'trial-expired', build: (unsub) => trialExpiredEmail(u.name, unsub) })
        continue
      }
    }

    if (u.subscriptionId?.startsWith('promo_') && u.subscriptionEndDate) {
      const daysLeft = Math.ceil((u.subscriptionEndDate.getTime() - t) / DAY)
      if (daysLeft >= 1 && daysLeft <= 3) {
        planned.push({ user, key: `promo-ending:${u.subscriptionEndDate.toISOString().slice(0, 10)}`, tag: 'promo-ending', build: (unsub) => promoEndingEmail(u.name, daysLeft, unsub) })
        continue
      }
    }

    if (!userHasAccess(u, t)) continue

    if (neverUsedCandidates.includes(u) && !lastActivity.has(u.id)) {
      planned.push({ user, key: 'never-used', tag: 'never-used', build: (unsub) => neverUsedEmail(u.name, unsub) })
      continue
    }

    if (trackingStart) {
      const since = lastSeenOrFallback(u, trackingStart)
      const away = Math.floor((t - since.getTime()) / DAY)
      if (away >= 3 && away <= 30) {
        planned.push({ user, key: `inactive:${since.toISOString().slice(0, 10)}`, tag: 'inactive', build: (unsub) => inactiveEmail(u.name, away, unsub) })
      }
    }
  }

  if (planned.length === 0) return { users: users.length, planned: 0, sent: 0 }

  // Each send claims its own (userId, key) row first; failures release it so the next run retries.
  const stats = { sent: 0, duplicate: 0, failed: 0 }
  let i = 0
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, planned.length) }, async () => {
    while (i < planned.length) {
      const p = planned[i++]
      const result = await sendTrackedEmail({ user: p.user, key: p.key, tag: p.tag, marketing: true, build: ({ unsubscribeUrl }) => p.build(unsubscribeUrl) })
      stats[result]++
    }
  }))

  return { users: users.length, planned: planned.length, ...stats }
}
