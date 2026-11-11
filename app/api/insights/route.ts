import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { getReportSnapshot } from '@/services/transaction.service'
import { generateAIInsights } from '@/services/insights.service'
import { enforceRateLimits } from '@/lib/rateLimit'
import { readBoundedText } from '@/lib/boundedBody'

const inputSchema = z.object({
  language: z.enum(['pt-BR', 'en']).default('pt-BR'),
  year: z.number().int().min(1900).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
})

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const limited = await enforceRateLimits([
    { key: `insights:minute:${session.userId}`, limit: 8, windowSec: 60 },
    { key: `insights:day:${session.userId}`, limit: 80, windowSec: 86400 },
  ])
  if (limited) return limited
  const raw = await readBoundedText(request, 2048).then((text) => JSON.parse(text || '{}')).catch(() => null)
  const parsed = inputSchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Período ou idioma inválido.' }, { status: 400 })
  const now = new Date()
  const { language, year = now.getFullYear(), month = now.getMonth() + 1 } = parsed.data
  try {
    const report = await getReportSnapshot(session.userId, year, month)
    if (report.summary.transactionCount === 0) return NextResponse.json({ insights: [], period: report.period })
    const result = await generateAIInsights({
      userId: session.userId,
      period: report.period,
      monthlyIncome: report.summary.income,
      monthlyExpense: report.summary.expense,
      monthlyBalance: report.summary.income - report.summary.expense,
      topCategories: report.categories,
      previousIncome: report.previous.income,
      previousExpense: report.previous.expense,
      previousBalance: report.previous.income - report.previous.expense,
      trend: report.trend,
      language,
    })
    return NextResponse.json({ ...result, period: report.period }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    console.error('[Insights API] Generation unavailable')
    return NextResponse.json({ error: 'A análise está temporariamente indisponível.' }, { status: 503 })
  }
}
