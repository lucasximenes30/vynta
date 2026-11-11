import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { enforceRateLimits } from '@/lib/rateLimit'
import { getFinancialOccurrences } from '@/services/transaction.service'
import { analyzeFinancialHealth } from '@/lib/financialHealth'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const limited = await enforceRateLimits([{ key: `advanced-reports:${session.userId}`, limit: 20, windowSec: 600 }])
  if (limited) return limited
  const now = new Date()
  const current = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(now)
  const period = new URL(request.url).searchParams.get('period') || current
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || period > current || period < '1900-01') return NextResponse.json({ error: 'Período inválido' }, { status: 400 })
  try {
    const [year, month] = period.split('-').map(Number)
    const items = await getFinancialOccurrences(session.userId, year, month)
    return NextResponse.json(analyzeFinancialHealth(items, period))
  } catch (error) {
    console.error('Error generating advanced reports:', error)
    return NextResponse.json({ error: 'Não foi possível carregar a análise' }, { status: 500 })
  }
}
