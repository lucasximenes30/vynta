import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  getTransactionsByMonth,
  getMonthSummary,
  getMonthComparison,
  getAvailableMonths,
  getExpensesByCategory,
  getMonthlyTrend,
  getReportSnapshot,
} from '@/services/transaction.service'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') // 'summary', 'transactions', 'comparison', 'available'
  const refYear = searchParams.get('refYear')
  const refMonth = searchParams.get('refMonth')
  const year = refYear ?? searchParams.get('year')
  const month = refMonth ?? searchParams.get('month')
  if ((year !== null && (!Number.isInteger(Number(year)) || Number(year) < 1900 || Number(year) > 2100))
    || (month !== null && (!Number.isInteger(Number(month)) || Number(month) < 1 || Number(month) > 12))) {
    return NextResponse.json({ error: 'Período inválido' }, { status: 400 })
  }

  try {
    if (type === 'report' && year && month) {
      return NextResponse.json(await getReportSnapshot(session.userId, Number(year), Number(month)), { headers: { 'Cache-Control': 'private, no-store' } })
    }
    if (type === 'transactions' && year && month) {
      const transactions = await getTransactionsByMonth(
        session.userId,
        parseInt(year),
        parseInt(month)
      )
      return NextResponse.json({ transactions })
    }

    if (type === 'summary' && year && month) {
      const summary = await getMonthSummary(
        session.userId,
        parseInt(year),
        parseInt(month)
      )
      return NextResponse.json({ summary })
    }

    if (type === 'comparison') {
      const cYear = Number(year ?? new Date().getFullYear())
      const cMonth = Number(month ?? new Date().getMonth() + 1)
      const comparison = await getMonthComparison(session.userId, cYear, cMonth)
      return NextResponse.json(comparison)
    }

    if (type === 'available') {
      const months = await getAvailableMonths(session.userId)
      return NextResponse.json({ months })
    }

    if (type === 'categories' && year && month) {
      const categories = await getExpensesByCategory(
        session.userId,
        parseInt(year),
        parseInt(month)
      )
      return NextResponse.json({ categories })
    }

    if (type === 'trend') {
      const trend = await getMonthlyTrend(session.userId)
      return NextResponse.json({ trend })
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
  } catch (error) {
    console.error('Error in monthly route:', error)
    return NextResponse.json(
      { error: 'Failed to fetch monthly data' },
      { status: 500 }
    )
  }
}
