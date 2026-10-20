import { prisma } from '@/lib/prisma'
import { generateAIText } from '@/services/ai.service'
import {
  SupportedLocale,
  CATEGORY_LABELS,
  resolveCanonicalCategory,
  localizeCategoryName,
} from '@/lib/categories'
import { cache as reactCache } from 'react'
import { unstable_cache } from 'next/cache'
import { createHash } from 'crypto'

export interface AIInsight {
  text: string
  type: 'positive' | 'negative' | 'tip'
}

export interface InsightsInput {
  monthlyIncome: number
  monthlyExpense: number
  monthlyBalance: number
  topCategories: { category: string; amount: number }[]
  previousIncome: number
  previousExpense: number
  previousBalance: number
  trend: { month: string; income: number; expense: number }[]
  language: string
}

// Cache em memória para server-side (Map com TTL)
const cache = new Map<string, { data: AIInsight[]; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24h
const MAX_AI_INSIGHTS = 4
const AI_INSIGHTS_REVALIDATE_SECONDS = 6 * 60 * 60
const MAX_INSIGHT_CHARS = 180

function normalizeLanguage(language: string): SupportedLocale {
  return language === 'en' ? 'en' : 'pt-BR'
}


function localizeTopCategories(
  categories: { category: string; amount: number }[],
  language: SupportedLocale
): { category: string; amount: number }[] {
  return categories.map((item) => ({
    ...item,
    category: localizeCategoryName(item.category, language),
  }))
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function applyCategoryLocalizationToText(text: string, language: SupportedLocale): string {
  let localizedText = text

  for (const [canonical, labels] of Object.entries(CATEGORY_LABELS)) {
    const target = labels[language]
    const variants = [canonical, labels.en, labels['pt-BR']]

    for (const variant of variants) {
      if (!variant || variant === target) continue
      const regex = new RegExp(`\\b${escapeRegex(variant)}\\b`, 'gi')
      localizedText = localizedText.replace(regex, target)
    }
  }

  return localizedText
}

function shortenInsightText(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''

  if (cleaned.length <= MAX_INSIGHT_CHARS) {
    return cleaned
  }

  const truncated = cleaned.slice(0, MAX_INSIGHT_CHARS)
  const lastPunctuation = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf(';'),
    truncated.lastIndexOf(','),
    truncated.lastIndexOf('!')
  )

  if (lastPunctuation >= 80) {
    return truncated.slice(0, lastPunctuation).trim()
  }

  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace >= 70) {
    return `${truncated.slice(0, lastSpace).trim()}...`
  }

  return `${truncated.trim()}...`
}

function scoreInsight(insight: AIInsight): number {
  let score = 0

  if (insight.type === 'negative') score += 4
  else if (insight.type === 'tip') score += 3
  else score += 2

  if (/(R\$|\$|\d+%)/.test(insight.text)) score += 2
  if (insight.text.length >= 70 && insight.text.length <= 170) score += 1

  return score
}

function normalizeAndPrioritizeInsights(raw: AIInsight[], language: SupportedLocale): AIInsight[] {
  const normalized = raw
    .map((item) => {
      const rawText = typeof item?.text === 'string' ? item.text : ''
      const localizedText = applyCategoryLocalizationToText(rawText, language)
      const shortText = shortenInsightText(localizedText)

      const type: AIInsight['type'] =
        item?.type === 'positive' || item?.type === 'negative' || item?.type === 'tip'
          ? item.type
          : 'tip'

      return {
        text: shortText,
        type,
      }
    })
    .filter((item) => item.text.length > 0)

  const unique: AIInsight[] = []
  const seen = new Set<string>()

  for (const item of normalized) {
    const signature = item.text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 120)

    if (!signature || seen.has(signature)) continue
    seen.add(signature)
    unique.push(item)
  }

  return unique
    .map((item, index) => ({ item, index, score: scoreInsight(item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, MAX_AI_INSIGHTS)
    .map((entry) => entry.item)
}

function cacheKey(input: InsightsInput): string {
  return JSON.stringify({
    i: input.monthlyIncome,
    e: input.monthlyExpense,
    t: input.topCategories.map((c) => `${c.category}:${Math.round(c.amount / 10) * 10}`),
    l: input.language,
  })
}

export async function generateAIInsights(input: InsightsInput): Promise<AIInsight[]> {
  // Check cache em memória
  const key = cacheKey(input)
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data

  const language = normalizeLanguage(input.language)
  const localizedTopCategories = localizeTopCategories(input.topCategories, language)

  const totalExpenses = localizedTopCategories.reduce((s, c) => s + c.amount, 0)
  const categoryDetails = localizedTopCategories
    .map((c) => {
    const pct = totalExpenses > 0 ? ((c.amount / totalExpenses) * 100).toFixed(0) : '0'
      if (language === 'pt-BR') {
        return `- ${c.category}: R$ ${c.amount.toFixed(2)} (${pct}% dos gastos)`
      }
      return `- ${c.category}: R$ ${c.amount.toFixed(2)} (${pct}% of expenses)`
    })
    .join('\n')

  const trendText = input.trend
    .map((t) =>
      language === 'pt-BR'
        ? `${t.month}: Receita R$ ${t.income.toFixed(2)} | Despesa R$ ${t.expense.toFixed(2)}`
        : `${t.month}: Income R$ ${t.income.toFixed(2)} | Expense R$ ${t.expense.toFixed(2)}`
    )
    .join('\n')

  const incomeChange = input.previousIncome > 0 ? ((input.monthlyIncome - input.previousIncome) / input.previousIncome) * 100 : 0
  const expenseChange = input.previousExpense > 0 ? ((input.monthlyExpense - input.previousExpense) / input.previousExpense) * 100 : 0
  const balanceChange = input.monthlyBalance - input.previousBalance

  const savingsRate = input.monthlyIncome > 0 ? ((input.monthlyBalance / input.monthlyIncome) * 100).toFixed(1) : '0'

  const prompt = `You are Vynta AI, a practical personal finance assistant.

Output language: ${language === 'pt-BR' ? 'Brazilian Portuguese' : 'English'}.

STRICT OUTPUT FORMAT:
- Return ONLY a JSON array.
- Return exactly 4 items.
- Each item must be: {"text":"string","type":"positive"|"negative"|"tip"}
- No markdown, no code block, no extra text.

INSIGHT RULES:
- IMPORTANT: Analyze actual user financial behavior deeply. Avoid superficial observations.
- GENERATE SPECIFIC ALERTS: Warn about spending concentration, unusual expense behavior, dangerous debt, or category spikes based on the data.
- GENERATE ACTIONABLE RECOMMENDATIONS: Provide realistic saving suggestions and budgeting rules based on the provided numbers.
- BAN GENERIC FLUFF: Do not write meaningless motivational sentences (e.g., "Keep it up!", "Save for the future"). Give concrete, data-driven advice only.
- Prioritize only the 4 most critical insights.
- Keep each insight short and practical (single short paragraph, up to 180 characters).
- Use the category names exactly as listed in "Top Categories".
- Do not invent numbers.

FINANCIAL DATA:
- Monthly income: R$ ${input.monthlyIncome.toFixed(2)} (${incomeChange >= 0 ? '+' : ''}${incomeChange.toFixed(1)}% vs previous month)
- Monthly expense: R$ ${input.monthlyExpense.toFixed(2)} (${expenseChange >= 0 ? '+' : ''}${expenseChange.toFixed(1)}% vs previous month)
- Monthly balance: R$ ${input.monthlyBalance.toFixed(2)} (${balanceChange >= 0 ? '+' : ''}R$ ${Math.abs(balanceChange).toFixed(2)} vs previous month)
- Savings rate: ${savingsRate}%

Top Categories:
${categoryDetails}

6-Month Trend:
${trendText}`

  try {
    // Persistent cache (Vercel Data Cache) keyed by the prompt, which encodes all input data:
    // insights are regenerated automatically whenever the user's numbers change.
    const promptHash = createHash('sha256').update(prompt).digest('hex')
    const insights = await unstable_cache(
      () => requestAIInsights(prompt, language),
      ['ai-insights', promptHash],
      { revalidate: AI_INSIGHTS_REVALIDATE_SECONDS },
    )()

    // Save to cache
    cache.set(key, { data: insights, timestamp: Date.now() })

    // Limpar entradas velhas do cache (>100 entries)
    if (cache.size > 100) {
      const keys = Array.from(cache.keys())
      for (let i = 0; i < keys.length - 80; i++) {
        cache.delete(keys[i])
      }
    }

    return insights
  } catch (error) {
    console.error('[Insights AI] Falling back to static insights', {
      message: error instanceof Error ? error.message : String(error),
    })
    return getStaticInsights(input)
  }
}

// Throws when the AI response is unusable so that failures are never cached.
async function requestAIInsights(prompt: string, language: SupportedLocale): Promise<AIInsight[]> {
  const aiResult = await generateAIText({
    purpose: 'reports',
    prompt,
    temperature: 0.45,
  })

  let text = aiResult.text.trim()

  // Extrair JSON se tiver markdown wrapping
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (jsonMatch) {
    text = jsonMatch[0]
  }

  const parsed: AIInsight[] = JSON.parse(text)
  const insights = Array.isArray(parsed) ? normalizeAndPrioritizeInsights(parsed, language) : []

  if (insights.length === 0) {
    throw new Error('Empty AI insights response')
  }

  return insights
}

function getStaticInsights(input: InsightsInput): AIInsight[] {
  const insights: AIInsight[] = []
  const language = normalizeLanguage(input.language)
  const isEn = language === 'en'
  const localizedTopCategories = localizeTopCategories(input.topCategories, language)
  const totalExpenses = localizedTopCategories.reduce((s, c) => s + c.amount, 0)

  if (localizedTopCategories.length > 0) {
    const top = localizedTopCategories[0]
    const pct = totalExpenses > 0 ? ((top.amount / totalExpenses) * 100).toFixed(0) : '0'
    const high = topCategoryIsHigh(totalExpenses, top.amount)
    insights.push({
      text: isEn 
        ? `${top.category} is your top expense (${pct}%). Review this category first to improve your monthly margin.`
        : `${top.category} é seu maior gasto (${pct}%). Revise essa categoria primeiro para melhorar sua margem no mês.`,
      type: high ? 'negative' : 'tip'
    })
  }

  const balChange = input.monthlyBalance - input.previousBalance
  if (balChange >= 0) {
    insights.push({ 
      text: isEn 
        ? `Your balance improved by R$ ${Math.abs(balChange).toFixed(2)} vs last month. Keep this pace and reserve part of the surplus.`
        : `Seu saldo melhorou R$ ${Math.abs(balChange).toFixed(2)} vs o mês anterior. Mantenha o ritmo e reserve parte do excedente.`, 
      type: 'positive' 
    })
  } else {
    insights.push({ 
      text: isEn 
        ? `Your balance dropped by R$ ${Math.abs(balChange).toFixed(2)} vs last month. Focus on cutting variable expenses this week.`
        : `Seu saldo caiu R$ ${Math.abs(balChange).toFixed(2)} vs o último mês. Foque em reduzir gastos variáveis nesta semana.`, 
      type: 'negative' 
    })
  }

  const expChange = input.monthlyExpense - input.previousExpense
  if (expChange > 0) {
    insights.push({ 
      text: isEn 
        ? `Expenses increased by R$ ${expChange.toFixed(2)}. Set a spending cap for your top category in the next cycle.`
        : `As despesas subiram R$ ${expChange.toFixed(2)}. Defina um teto para sua principal categoria no próximo ciclo.`, 
      type: 'negative' 
    })
  } else if (expChange < 0) {
    insights.push({ 
      text: isEn 
        ? `You reduced expenses by R$ ${Math.abs(expChange).toFixed(2)}. Good control, keep tracking this pattern.`
        : `Você reduziu despesas em R$ ${Math.abs(expChange).toFixed(2)}. Bom controle, mantenha esse padrão.`, 
      type: 'positive' 
    })
  }

  const incChange = input.monthlyIncome - input.previousIncome
  if (incChange > 0) {
    insights.push({ 
      text: isEn 
        ? `Income grew by R$ ${incChange.toFixed(2)}. Consider directing part of this gain to savings or investing.`
        : `A receita cresceu R$ ${incChange.toFixed(2)}. Direcione parte desse ganho para reserva ou investimento.`, 
      type: 'positive' 
    })
  }

  if (input.monthlyIncome > 0) {
    const savingsRate = ((input.monthlyBalance / input.monthlyIncome) * 100).toFixed(0)
    if (parseInt(savingsRate) >= 20) {
      insights.push({ 
        text: isEn 
          ? `Savings rate is ${savingsRate}%, a strong level. Keep consistency and avoid inflating lifestyle costs.`
          : `A taxa de poupança está em ${savingsRate}%, um nível forte. Mantenha constância e evite inflar o padrão de gastos.`, 
        type: 'positive' 
      })
    } else if (parseInt(savingsRate) < 0) {
      insights.push({ 
        text: isEn 
          ? `Expenses exceeded income this month. Cut non-essential items now to stop the deficit from compounding.`
          : `As despesas superaram a receita neste mês. Corte itens não essenciais agora para evitar efeito acumulado.`, 
        type: 'negative' 
      })
    }
  }

  if (localizedTopCategories.length >= 2) {
    const top2 = localizedTopCategories.slice(0, 2).reduce((s, c) => s + c.amount, 0)
    const pct = totalExpenses > 0 ? ((top2 / totalExpenses) * 100).toFixed(0) : '0'
    insights.push({ 
      text: isEn 
        ? `${localizedTopCategories[0].category} and ${localizedTopCategories[1].category} account for ${pct}% of spending. Optimizing these two gives the biggest impact.`
        : `${localizedTopCategories[0].category} e ${localizedTopCategories[1].category} somam ${pct}% dos gastos. Otimizar essas duas traz maior impacto.`, 
      type: 'tip' 
    })
  }

  return normalizeAndPrioritizeInsights(insights, language)
}

function topCategoryIsHigh(total: number, topAmount: number): boolean {
  if (total === 0) return false
  return (topAmount / total) > 0.3
}

// ==================== ANÁLISES AVANÇADAS ====================

export interface WeeklyAnalysis {
  week: string
  income: number
  expense: number
  balance: number
  transactionCount: number
  topCategory: string | null
}

/**
 * Análise semanal dos últimos 4 meses (ou do período disponível)
 */
export const getWeeklyAnalysis = reactCache(async (userId: string): Promise<WeeklyAnalysis[]> => {
  const now = new Date()
  const fourMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: fourMonthsAgo,
        lte: now,
      },
    },
    orderBy: { date: 'asc' },
  })

  // Agrupar por semana
  const weeks = new Map<string, {
    income: number
    expense: number
    transactions: typeof transactions
  }>()

  transactions.forEach((t) => {
    const weekStart = getWeekStart(t.date)
    const key = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`

    if (!weeks.has(key)) {
      weeks.set(key, { income: 0, expense: 0, transactions: [] })
    }
    const week = weeks.get(key)!
    week.transactions.push(t)
    if (t.type === 'INCOME') {
      week.income += Number(t.amount)
    } else {
      week.expense += Number(t.amount)
    }
  })

  const result: WeeklyAnalysis[] = []
  for (const [weekKey, data] of weeks) {
    const topCategory = data.transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce<Map<string, number>>((acc, t) => {
        const localized = localizeCategoryName(t.category, 'pt-BR')
        acc.set(localized, (acc.get(localized) || 0) + Number(t.amount))
        return acc
      }, new Map())

    const [topCat] = Array.from(topCategory.entries()).sort((a, b) => b[1] - a[1])

    result.push({
      week: weekKey,
      income: Math.round(data.income * 100) / 100,
      expense: Math.round(data.expense * 100) / 100,
      balance: Math.round((data.income - data.expense) * 100) / 100,
      transactionCount: data.transactions.length,
      topCategory: topCat ? topCat[0] : null,
    })
  }

  return result
})

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d
}

/**
 * Score financeiro: nota de 0-100 baseada nos hábitos do usuário
 */
export interface FinancialScore {
  score: number
  label: string
  breakdown: {
    category: string
    score: number
    max: number
  }[]
  recommendations: string[]
}

export async function calculateFinancialScore(userId: string, locale: string = 'pt-BR'): Promise<FinancialScore> {
  const isEn = locale !== 'pt-BR'
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startOfMonth,
        lte: now,
      },
    },
  })

  // ... (keeping internal logic the same, just changing text generation below)
  const income = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const expenses = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const recommendations: string[] = []

  // Score 1: Taxa de poupança (0-30 pts)
  let savingsScore = 0
  if (income > 0) {
    const savingsRate = (income - expenses) / income
    if (savingsRate >= 0.3) savingsScore = 30
    else if (savingsRate >= 0.2) savingsScore = 25
    else if (savingsRate >= 0.1) savingsScore = 20
    else if (savingsRate >= 0) savingsScore = 15
    else if (savingsRate >= -0.1) savingsScore = 10
    else savingsScore = 5

    if (savingsRate < 0.2) {
      recommendations.push(
        isEn 
          ? `Your savings rate is at ${(savingsRate * 100).toFixed(0)}%. Aim for at least 20% to build a stronger financial cushion.`
          : `Sua taxa de poupança está em ${(savingsRate * 100).toFixed(0)}%. A meta ideal é de pelo menos 20% para maior segurança financeira.`
      )
    }
  }

  // Score 2: Diversificação de gastos (0-25 pts)
  let diversificationScore = 25
  const expenseByCategory = new Map<string, number>()
  transactions
    .filter((t) => t.type === 'EXPENSE')
    .forEach((t) => {
      const localized = localizeCategoryName(t.category, locale as SupportedLocale)
      expenseByCategory.set(localized, (expenseByCategory.get(localized) || 0) + Number(t.amount))
    })

  if (expenses > 0) {
    const categories = Array.from(expenseByCategory.entries()).sort((a, b) => b[1] - a[1])
    if (categories.length > 0) {
      const topPct = categories[0][1] / expenses
      if (topPct > 0.5) {
        diversificationScore = 15
        recommendations.push(
          isEn 
            ? `The category "${categories[0][0]}" makes up ${Math.round(topPct * 100)}% of your expenses. Try to balance your spending across different needs.`
            : `A categoria "${categories[0][0]}" concentra ${Math.round(topPct * 100)}% dos seus gastos. Tente equilibrar melhor suas despesas.`
        )
      } else if (topPct > 0.35) {
        diversificationScore = 20
      }
    }

    if (categories.length < 3 && transactions.filter((t) => t.type === 'EXPENSE').length > 0) {
      diversificationScore = 15
      recommendations.push(
        isEn 
          ? `Low category diversity. Track all your expenses to get a fully clear picture of your habits.`
          : `Pouca diversidade nas categorias registradas. Tente organizar todos os seus gastos para uma visão mais completa.`
      )
    }
  }

  // Score 3: Consistência (0-25 pts) - transações regulares
  let consistencyScore = 25
  const uniqueDays = new Set(transactions.map((t) => t.date.toDateString())).size
  const monthProgress = now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const expectedDays = Math.max(1, Math.ceil(monthProgress * 15))

  if (uniqueDays < expectedDays * 0.5) {
    consistencyScore = 15
    recommendations.push(
      isEn 
        ? `Log your expenses more frequently for highly accurate insights and better control over your cash flow.`
        : `Registre seus gastos com maior frequência para receber análises mais precisas e melhorar seu controle.`
    )
  }

  // Score 4: Controle de gastos (0-20 pts)
  let controlScore = 20
  if (expenses > income && income > 0) {
    controlScore = 5
    recommendations.push(
      isEn 
        ? `You are spending more than your income this month. Prioritize cutting non-essential expenses to recover.`
        : `Você está gastando acima do que ganha neste mês. Priorize o corte de gastos não essenciais para se recuperar.`
    )
  } else if (income > 0 && expenses / income > 0.9) {
    controlScore = 12
    recommendations.push(
      isEn 
        ? `Your expenses are very close to your total income. Try to keep a larger safety margin.`
        : `Seus gastos estão muito próximos do total da sua receita. Busque manter uma margem de segurança maior.`
    )
  }

  // Verificar se há transações de tendência de aumento
  if (transactions.length >= 4) {
    const last2WeekTransactions = transactions.filter(
      (t) => t.date >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14)
    )
    const prev2WeekTransactions = transactions.filter(
      (t) => t.date >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 28) &&
             t.date < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14)
    )

    const last2WeekSpending = last2WeekTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const prev2WeekSpending = prev2WeekTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    if (prev2WeekSpending > 0 && last2WeekSpending > prev2WeekSpending * 1.2) {
      const increase = ((last2WeekSpending - prev2WeekSpending) / prev2WeekSpending * 100).toFixed(0)
      recommendations.push(
        isEn 
          ? `Your weekly expenses grew by ${increase}% in the last two weeks. Keep a close eye on your recent spending.`
          : `Seus gastos semanais subiram cerca de ${increase}% nas últimas duas semanas. Fique atento a essas variações.`
      )
    }
  }

  const totalScore = savingsScore + diversificationScore + consistencyScore + controlScore

  let label = ''
  if (totalScore >= 90) label = isEn ? 'Excellent' : 'Excelente'
  else if (totalScore >= 75) label = isEn ? 'Very Good' : 'Muito Bom'
  else if (totalScore >= 60) label = isEn ? 'Good' : 'Bom'
  else if (totalScore >= 40) label = isEn ? 'Fair' : 'Regular'
  else label = isEn ? 'Needs Improvement' : 'Precisa melhorar'

  return {
    score: totalScore,
    label,
    breakdown: [
      { category: isEn ? 'Savings' : 'Poupança', score: savingsScore, max: 30 },
      { category: isEn ? 'Diversification' : 'Diversificação', score: diversificationScore, max: 25 },
      { category: isEn ? 'Consistency' : 'Consistência', score: consistencyScore, max: 25 },
      { category: isEn ? 'Control' : 'Controle', score: controlScore, max: 20 },
    ],
    recommendations,
  }
}

/**
 * Detectar anomalias de gastos (picos incomuns)
 */
export interface SpendingAnomaly {
  date: string
  category: string
  amount: number
  averageInCategory: number
  deviation: number
  title: string
}

export async function detectSpendingAnomalies(userId: string): Promise<SpendingAnomaly[]> {
  // Pegar transações dos últimos 3 meses
  const now = new Date()
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 4, 1)

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'EXPENSE',
      date: {
        gte: threeMonthsAgo,
        lte: now,
      },
    },
    orderBy: { date: 'asc' },
  })

  // Calcular média e desvio por categoria
  const categoryStats = new Map<string, { amounts: number[]; total: number }>()

  transactions.forEach((t) => {
    if (!categoryStats.has(t.category)) {
      categoryStats.set(t.category, { amounts: [], total: 0 })
    }
    const stats = categoryStats.get(t.category)!
    const amount = Number(t.amount)
    stats.amounts.push(amount)
    stats.total += amount
  })

  const anomalies: SpendingAnomaly[] = []

  transactions.forEach((t) => {
    const amount = Number(t.amount)
    const stats = categoryStats.get(t.category)!

    if (stats.amounts.length < 3) return // precisa de pelo menos 3 dados para comparar

    const avg = stats.total / stats.amounts.length
    const variance = stats.amounts.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) / stats.amounts.length
    const stdDev = Math.sqrt(variance)

    if (stdDev === 0) return

    const deviation = (amount - avg) / stdDev

    // Se mais de 2 desvios padrões acima da média, é anomalia
    if (deviation > 2 && stats.amounts.length >= 3) {
      anomalies.push({
        date: t.date.toISOString(),
        category: localizeCategoryName(t.category, 'pt-BR'),
        amount,
        averageInCategory: Math.round(avg * 100) / 100,
        deviation: Math.round(deviation * 100) / 100,
        title: t.title,
      })
    }
  })

  return anomalies.sort((a, b) => b.deviation - a.deviation).slice(0, 5)
}

/**
 * Gerar insights personalizados para seção de relatórios avançados
 */
export async function generateAdvancedInsights(
  userId: string,
  locale: string = 'pt-BR'
): Promise<{
  score: FinancialScore
  anomalies: SpendingAnomaly[]
  weekly: WeeklyAnalysis[]
}> {
  const [score, anomalies, weekly] = await Promise.all([
    calculateFinancialScore(userId, locale),
    detectSpendingAnomalies(userId),
    getWeeklyAnalysis(userId),
  ])

  return { score, anomalies, weekly }
}
