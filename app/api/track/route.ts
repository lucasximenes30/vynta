import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const BOT_UA_RE = /bot|crawler|spider|prerender|headless|facebookexternalhit|facebot|whatsapp|telegrambot|slackbot|discordbot|linkedinbot|uptimerobot|pingdom|gtmetrix|lighthouse|pagespeed|vercel-screenshot/i
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  try {
    const ua = req.headers.get('user-agent') || ''
    if (BOT_UA_RE.test(ua)) {
      return NextResponse.json({ success: true, ignored: 'bot' })
    }

    const body = await req.json()
    const { sessionId, eventName, metadata } = body

    if (!sessionId || !eventName || typeof sessionId !== 'string' || typeof eventName !== 'string') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Attach authenticated userId from the real 'session' cookie; skip ADMIN sessions so admin testing doesn't pollute funnel metrics
    const session = await getSession()
    if (session?.role === 'ADMIN') {
      return NextResponse.json({ success: true, ignored: 'admin' })
    }

    const userId = session?.userId && UUID_RE.test(session.userId) ? session.userId : null

    await prisma.funnelEvent.create({
      data: {
        sessionId: sessionId.slice(0, 128),
        eventName: eventName.slice(0, 64),
        userId,
        metadata: metadata || {},
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    // Return 200 even on error so we don't break the client with fire-and-forget
    console.error('[Funnel Tracking Error]', error)
    return NextResponse.json({ success: false })
  }
}
