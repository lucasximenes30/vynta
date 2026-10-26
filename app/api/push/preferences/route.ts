import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { getNotificationPreferences, isPushConfigured, updateNotificationPreferences } from '@/services/push.service'

const prefsSchema = z.object({
  bills: z.boolean().optional(),
  agenda: z.boolean().optional(),
  habits: z.boolean().optional(),
  dailyLog: z.boolean().optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const prefs = await getNotificationPreferences(session.userId)
  return NextResponse.json({ ...prefs, configured: isPushConfigured() })
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = prefsSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid preferences' }, { status: 400 })

  const prefs = await updateNotificationPreferences(session.userId, parsed.data)
  return NextResponse.json(prefs)
}
