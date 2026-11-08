import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

// Open pixel. Approximate by nature: Gmail proxies images on open (counts), Apple Mail may
// prefetch (false opens) and clients that block images never count.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const now = new Date()
  await prisma.emailLog.updateMany({ where: { id, openedAt: null }, data: { openedAt: now } }).catch(() => {})
  await prisma.emailLog.updateMany({ where: { id }, data: { opens: { increment: 1 } } }).catch(() => {})

  return new NextResponse(GIF, {
    headers: { 'content-type': 'image/gif', 'cache-control': 'no-store, no-cache, must-revalidate, private', 'content-length': String(GIF.length) },
  })
}
