import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { APP_URL, isAllowedClickTarget } from '@/services/email.service'

export const dynamic = 'force-dynamic'

// Tracked e-mail link: records the click on the email_logs row, then redirects.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const target = request.nextUrl.searchParams.get('u') ?? ''
  const destination = isAllowedClickTarget(target) ? target : `${APP_URL}/dashboard`

  const now = new Date()
  const row = await prisma.emailLog.findUnique({ where: { id }, select: { openedAt: true, clickedAt: true } }).catch(() => null)
  if (row) {
    await prisma.emailLog.update({
      where: { id },
      data: {
        clicks: { increment: 1 },
        lastClickUrl: destination.slice(0, 500),
        ...(row.clickedAt ? {} : { clickedAt: now }),
        // A click proves the e-mail was opened even when images (pixel) are blocked.
        ...(row.openedAt ? {} : { openedAt: now, opens: { increment: 1 } }),
      },
    }).catch(() => {})
  }

  return NextResponse.redirect(destination, 302)
}
