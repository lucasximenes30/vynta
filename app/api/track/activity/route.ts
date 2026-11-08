import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPromoEligibility } from '@/services/subscription.service'

export const dynamic = 'force-dynamic'

const MIN_INTERVAL_MS = 10 * 60 * 1000

/** Heartbeat from the app shell: records when the user last opened the app (at most one write per 10 min). */
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ ok: false }, { status: 401 })

  const now = new Date()
  const [, promo] = await Promise.all([
    prisma.user.updateMany({
      where: { id: session.userId, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: new Date(now.getTime() - MIN_INTERVAL_MS) } }] },
      data: { lastSeenAt: now },
    }),
    session.plan === 'FREE_TRIAL' ? getPromoEligibility(session.userId, now.getTime()) : false,
  ])
  // Lets the shell decide whether to show the first-month offer.
  return NextResponse.json({ ok: true, promo })
}
