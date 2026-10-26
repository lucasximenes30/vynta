import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { IcalSyncError, syncUserCalendarFeed } from '@/services/calendarSync.service'

const putSchema = z.object({ url: z.string().trim().url().max(2000) })

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { icalFeedUrl: true, icalSyncedAt: true, icalSyncError: true },
  })
  const count = user?.icalFeedUrl
    ? await prisma.calendarEvent.count({ where: { userId: session.userId, source: 'ical' } })
    : 0
  return NextResponse.json({
    connected: !!user?.icalFeedUrl,
    syncedAt: user?.icalSyncedAt ?? null,
    error: user?.icalSyncError ?? null,
    count,
  })
}

// Saves the feed URL and runs the first sync — the response doubles as validation feedback.
export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const parsed = putSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Link inválido' }, { status: 400 })
  if (!parsed.data.url.startsWith('https://')) {
    return NextResponse.json({ error: 'O link precisa começar com https://' }, { status: 400 })
  }

  try {
    const result = await syncUserCalendarFeed(session.userId, parsed.data.url)
    await prisma.user.update({ where: { id: session.userId }, data: { icalFeedUrl: parsed.data.url } })
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof IcalSyncError ? e.message : 'Falha ao sincronizar a agenda'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

// Re-syncs on demand ("Sincronizar agora").
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { icalFeedUrl: true } })
  if (!user?.icalFeedUrl) return NextResponse.json({ error: 'Nenhuma agenda conectada' }, { status: 400 })

  try {
    const result = await syncUserCalendarFeed(session.userId, user.icalFeedUrl)
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof IcalSyncError ? e.message : 'Falha ao sincronizar'
    await prisma.user.update({ where: { id: session.userId }, data: { icalSyncError: msg } })
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

// Disconnects: removes the URL and every imported event (manual events are untouched).
export async function DELETE() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.$transaction([
    prisma.calendarEvent.deleteMany({ where: { userId: session.userId, source: 'ical' } }),
    prisma.user.update({
      where: { id: session.userId },
      data: { icalFeedUrl: null, icalSyncedAt: null, icalSyncError: null },
    }),
  ])
  return NextResponse.json({ ok: true })
}
