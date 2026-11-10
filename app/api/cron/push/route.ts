import { NextRequest, NextResponse } from 'next/server'
import { runScheduledPushes } from '@/services/pushScheduler.service'
import { syncAllCalendarFeeds } from '@/services/calendarSync.service'
import { runScheduledEmails } from '@/services/emailScheduler.service'
import { pruneRateLimits } from '@/lib/rateLimit'
import { safeEqual } from '@/lib/password'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Triggered by Vercel Cron (sends `Authorization: Bearer $CRON_SECRET` automatically) or any
// external scheduler using the same header. Idempotent: safe to call as often as you like.
// Each job runs isolated: a failure is reported per job (and kept visible via the 500 status)
// instead of crashing the whole run with an empty body.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || !safeEqual(request.headers.get('authorization') ?? '', `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const run = async <T>(name: string, job: () => Promise<T>) => {
    try {
      return await job()
    } catch (err) {
      console.error(`[cron] ${name} failed`, err)
      return { error: err instanceof Error ? err.message : String(err) }
    }
  }

  const [calendar, result, emails, pruned] = await Promise.all([
    run('calendar', syncAllCalendarFeeds),
    run('pushes', runScheduledPushes),
    run('emails', runScheduledEmails),
    run('rate-limits', pruneRateLimits),
  ])

  const failed = [calendar, result, emails, pruned].some(
    (r) => r && typeof r === 'object' && 'error' in r,
  )
  return NextResponse.json({ ...result, calendar, emails, pruned }, { status: failed ? 500 : 200 })
}
