import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Marks the guided first-steps tour as finished/skipped ("complete") or brings it back ("reset").
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const action = body?.action
  if (action !== 'complete' && action !== 'reset') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { tourCompletedAt: action === 'complete' ? new Date() : null },
  })
  return NextResponse.json({ ok: true })
}

