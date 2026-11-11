import { generateAIText } from '@/services/ai.service'
import {
  SupportedLocale,
  CATEGORY_LABELS,
  resolveCanonicalCategory,
  localizeCategoryName,
} from '@/lib/categories'
import { unstable_cache } from 'next/cache'
import { createHash } from 'crypto'

export interface AIInsight {
  text: string
  type: 'positive' | 'negative' | 'tip'
}

export interface InsightsInput {
  userId: string
  period: string
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

// Persistent insights cache is isolated by account, period and exact prompt inputs.
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

  if (insight.text.includes('$') || /\d%/.test(insight.text)) score += 2
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

export async function generateAIInsights(input: InsightsInput): Promise<{ insights: AIInsight[]; source: 'ai' | 'summary' }> {

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

  const savingsRate = input.monthlyIncome > 0 ? Math.max(0, (input.monthlyIncome - input.monthlyExpense) / input.monthlyIncome * 100).toFixed(1) : 'unavailable (no income recorded)'

  const prompt = `You are Vynta AI, a practical personal finance assistant.

Output language: ${language === 'pt-BR' ? 'Brazilian Portuguese' : 'English'}.

STRICT OUTPUT FORMAT:
- Return ONLY a JSON array.
- Return exactly 4 items.
- Each item must be: {"text":"string","type":"positive"|"negative"|"tip"}
- No markdown, no code block, no extra text.

INSIGHT RULES:
- IMPORTANT: Analyze actual user financial behavior deeply. Avoid superficial observations.
- Describe spending concentration or changes only when supported by the data. Do not infer debt, late payments or income stability from these totals.
- GENERATE ACTIONABLE RECOMMENDATIONS: Provide realistic saving suggestions and budgeting rules based on the provided numbers.
- BAN GENERIC FLUFF: Do not write meaningless motivational sentences (e.g., "Keep it up!", "Save for the future"). Give concrete, data-driven advice only.
- Prioritize only the 4 most critical insights.
- Keep each insight short and practical (single short paragraph, up to 180 characters).
- Use the category names exactly as listed in "Top Categories".
- Do not invent numbers.
- This is recorded/planned income and expenses, not verified bank balances or actual savings.
- Never show negative savings percentages. If expenses exceed income, explain the monetary shortfall and suggest checking missing income before reviewing adjustable expenses.
- If income is absent or unusually low, state that incomplete records can affect the analysis. Use calm, specific wording; avoid blame or alarm.

FINANCIAL DATA:
- Monthly income: R$ ${input.monthlyIncome.toFixed(2)} (${incomeChange >= 0 ? '+' : ''}${incomeChange.toFixed(1)}% vs previous month)
- Monthly expense: R$ ${input.monthlyExpense.toFixed(2)} (${expenseChange >= 0 ? '+' : ''}${expenseChange.toFixed(1)}% vs previous month)
- Monthly balance: R$ ${input.monthlyBalance.toFixed(2)} (${balanceChange >= 0 ? '+' : ''}R$ ${Math.abs(balanceChange).toFixed(2)} vs previous month)
- Non-negative planned surplus rate (not actual money saved): ${savingsRate}
- Monthly shortfall when expenses exceed income: R$ ${Math.max(0, input.monthlyExpense - input.monthlyIncome).toFixed(2)}

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
      ['ai-insights-v2', input.userId, input.period, promptHash],
      { revalidate: AI_INSIGHTS_REVALIDATE_SECONDS },
    )()

    return { insights, source: 'ai' }
  } catch (error) {
    console.error('[Insights AI] Falling back to static insights', {
      message: error instanceof Error ? error.message : String(error),
    })
    return { insights: getStaticInsights(input), source: 'summary' }
  }
}

// Throws when the AI response is unusable so that failures are never cached.
async function requestAIInsights(prompt: string, language: SupportedLocale): Promise<AIInsight[]> {
  const aiResult = await generateAIText({
    purpose: 'reports',
    prompt,
    temperature: 0.45,
    maxOutputTokens: 1024,
  })

  let text = aiResult.text.slice(0, 16_384).trim()

  // Extrair JSON se tiver markdown wrapping
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start >= 0 && end > start) text = text.slice(start, end + 1)

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
          : `A sobra prevista equivale a ${savingsRate}% das receitas. Confira os próximos vencimentos antes de guardar parte desse valor.`,
        type: 'positive' 
      })
    } else if (parseInt(savingsRate) < 0) {
      insights.push({ 
        text: isEn 
          ? `Expenses exceeded income this month. Cut non-essential items now to stop the deficit from compounding.`
          : `As despesas superam as receitas registradas. Confira as entradas que faltam e revise os gastos previstos que podem ser ajustados.`,
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
