import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { enforceRateLimits } from '@/lib/rateLimit'
import {
  calculateFinancialScore,
  detectSpendingAnomalies,
  getWeeklyAnalysis,
} from '@/services/insights.service'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const limited = await enforceRateLimits([{ key: `advanced-reports:${session.userId}`, limit: 20, windowSec: 600 }])
  if (limited) return limited

  const url = new URL(request.url)
  const language = url.searchParams.get('language') || 'pt-BR'

  try {
    const [score, anomalies, weekly] = await Promise.all([
      calculateFinancialScore(session.userId, language),
      detectSpendingAnomalies(session.userId),
      getWeeklyAnalysis(session.userId),
    ])

    return NextResponse.json({ score, anomalies, weekly })
  } catch (error) {
    console.error('Error generating advanced reports:', error)
    return NextResponse.json({ error: 'Failed to generate advanced reports' }, { status: 500 })
  }
}
