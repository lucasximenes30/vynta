import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { deletePushSubscription, savePushSubscription, updateNotificationPreferences } from '@/services/push.service'

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(1000),
    keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  }),
  timezone: z.string().max(64).optional(),
})

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })

  const { subscription, timezone } = parsed.data
  await Promise.all([
    savePushSubscription(session.userId, subscription, request.headers.get('user-agent')),
    timezone && isValidTimeZone(timezone) ? updateNotificationPreferences(session.userId, { timezone }) : null,
  ])
  return NextResponse.json({ ok: true })
}

// No session required: the endpoint is an unguessable capability URL only the device knows,
// and the login screen uses this to unlink a device after logout.
export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (typeof body?.endpoint !== 'string' || body.endpoint.length > 1000) {
    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
  }

  await deletePushSubscription(body.endpoint)
  return NextResponse.json({ ok: true })
}

function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}
