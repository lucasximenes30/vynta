import { NextRequest, NextResponse } from 'next/server'
import { runScheduledPushes } from '@/services/pushScheduler.service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Triggered by Vercel Cron (sends `Authorization: Bearer $CRON_SECRET` automatically) or any
// external scheduler using the same header. Idempotent: safe to call as often as you like.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runScheduledPushes()
  return NextResponse.json(result)
}
