import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const LOOKBACK_DAYS = 120

/** GET /api/transactions/suggestions → the user's most frequent one-off entries (title + usual category). */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const groups = await prisma.transaction.groupBy({
    by: ['title', 'category', 'type'],
    where: {
      userId: session.userId,
      isInstallment: false,
      isRecurring: false,
      date: { gte: new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000) },
    },
    _count: { _all: true },
    _max: { date: true },
    orderBy: { _count: { title: 'desc' } },
    take: 40,
  })

  // Keep the most used category per title/type.
  const seen = new Set<string>()
  const suggestions = groups
    .filter((g) => {
      const key = `${g.type}:${g.title.trim().toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 16)
    .map((g) => ({ title: g.title, category: g.category, type: g.type, count: g._count._all }))

  return NextResponse.json({ suggestions }, { headers: { 'Cache-Control': 'private, max-age=300' } })
}
