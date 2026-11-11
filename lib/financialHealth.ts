import { localizeCategoryName } from './categories'

export interface FinancialOccurrence {
  id: string
  title: string
  date: string
  category: string
  type: string
  amount: number
}

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export function analyzeFinancialHealth(
  items: FinancialOccurrence[],
  period: string,
) {
  const current = items.filter((item) => item.date.startsWith(period))
  const income = current
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0)
  const expenses = current
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0)
  const savingsRate =
    income > 0 ? Math.max(0, (income - expenses) / income) : null
  const categories = new Map<string, number>()
  current
    .filter((t) => t.type === 'EXPENSE')
    .forEach((t) => {
      const name = localizeCategoryName(t.category)
      categories.set(name, (categories.get(name) || 0) + t.amount)
    })
  const top = [...categories].sort((a, b) => b[1] - a[1])[0]
  const general = categories.get('Geral') || 0
  const recommendations: string[] = []
  if (!income)
    recommendations.push(
      'Ainda não há receitas registradas neste mês. Confira seu salário e outras entradas antes de avaliar quanto pode guardar.',
    )
  else if (expenses > income)
    recommendations.push(
      `Ainda não há sobra para guardar: as despesas do mês superam as receitas em ${money(expenses - income)}. Confira se todas as entradas foram registradas e revise os gastos previstos.`,
    )
  else if (savingsRate! < 0.2)
    recommendations.push(
      `A sobra prevista está baixa: ${money(income - expenses)} (${Math.round(savingsRate! * 100)}% das receitas). Comece com um valor que caiba no orçamento para sua reserva, depois aumente aos poucos.`,
    )
  else
    recommendations.push(
      `Você tem ${money(income - expenses)} de sobra prevista. Confira o que ainda falta pagar antes de guardar parte desse valor em uma meta.`,
    )
  if (general > 0)
    recommendations.push(
      `${money(general)} estão em Geral. Revise as categorias em Finanças para identificar melhor para onde vai seu dinheiro.`,
    )
  if (top && top[0] !== 'Geral')
    recommendations.push(
      `${top[0]} é a maior categoria: ${money(top[1])} (${Math.round((top[1] / expenses) * 100)}% das despesas). Abra esses lançamentos e veja quais são essenciais e quais podem ser ajustados.`,
    )

  const savings = income
    ? expenses > income
      ? 0
      : savingsRate! >= 0.2
        ? 30
        : savingsRate! >= 0.1
          ? 20
          : 10
    : 0
  const control = income
    ? expenses > income
      ? 0
      : expenses > income * 0.9
        ? 10
        : 30
    : 0
  const organization = expenses ? Math.round(20 * (1 - general / expenses)) : 0
  const coverage = income && expenses ? 20 : current.length ? 10 : 0
  const total = savings + control + organization + coverage
  const score = current.length
    ? {
        score: total,
        label: !income
          ? 'Faltam receitas'
          : total >= 80
            ? 'Muito Bom'
            : total >= 60
              ? 'Bom'
              : total >= 40
                ? 'Regular'
                : 'Precisa de atenção',
        breakdown: [
          {
            category: 'Sobra para guardar',
            score: savings,
            max: 30,
            description: !income
              ? 'Registre as receitas para avaliar.'
              : expenses > income
                ? 'Sem sobra prevista neste mês.'
                : `${money(income - expenses)} de sobra prevista; não significa dinheiro já poupado.`,
          },
          {
            category: 'Equilíbrio do mês',
            score: control,
            max: 30,
            description: 'Compara as receitas com as despesas do período.',
          },
          {
            category: 'Organização',
            score: organization,
            max: 20,
            description: 'Quanto das despesas tem uma categoria definida.',
          },
          {
            category: 'Dados registrados',
            score: coverage,
            max: 20,
            description: 'Presença de receitas e despesas para analisar o mês.',
          },
        ],
        recommendations,
      }
    : null

  const [year, month] = period.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const weekly = []
  for (let day = 1; day <= lastDay;) {
    const date = new Date(Date.UTC(year, month - 1, day))
    const endDay = Math.min(lastDay, day + (7 - (date.getUTCDay() || 7)))
    const week = `${period}-${String(day).padStart(2, '0')}`
    const end = `${period}-${String(endDay).padStart(2, '0')}`
    const entries = current.filter((t) => t.date >= week && t.date <= end)
    const inc = entries
      .filter((t) => t.type === 'INCOME')
      .reduce((s, t) => s + t.amount, 0)
    const exp = entries
      .filter((t) => t.type === 'EXPENSE')
      .reduce((s, t) => s + t.amount, 0)
    const cats = new Map<string, number>()
    entries
      .filter((t) => t.type === 'EXPENSE')
      .forEach((t) => {
        const c = localizeCategoryName(t.category)
        cats.set(c, (cats.get(c) || 0) + t.amount)
      })
    weekly.push({
      week,
      end,
      income: inc,
      expense: exp,
      balance: inc - exp,
      transactionCount: entries.length,
      topCategory: [...cats].sort((a, b) => b[1] - a[1])[0]?.[0] || null,
    })
    day = endDay + 1
  }

  // Compare against earlier, distinct purchases. The tested purchase never inflates its own baseline.
  let comparedCount = 0
  const anomalies = current
    .filter((t) => t.type === 'EXPENSE')
    .flatMap((t) => {
      const seen = new Set<string>()
      const baseline = items
        .filter((p) => {
          if (
            p.type !== 'EXPENSE' ||
            p.date >= t.date ||
            p.id === t.id ||
            seen.has(p.id) ||
            localizeCategoryName(p.category) !==
              localizeCategoryName(t.category)
          )
            return false
          seen.add(p.id)
          return true
        })
        .map((p) => p.amount)
      if (baseline.length < 3) return []
      comparedCount++
      const avg = baseline.reduce((a, b) => a + b, 0) / baseline.length
      const sd = Math.sqrt(
        baseline.reduce((s, a) => s + (a - avg) ** 2, 0) / baseline.length,
      )
      if (t.amount <= Math.max(avg * 1.5, avg + 2 * sd) || t.amount - avg < 20)
        return []
      return [
        {
          ...t,
          category: localizeCategoryName(t.category),
          averageInCategory: avg,
          deviation: avg > 0 ? t.amount / avg : 0,
        },
      ]
    })
    .sort((a, b) => b.deviation - a.deviation)
    .slice(0, 5)
  return {
    score,
    weekly: current.length ? weekly : [],
    anomalies,
    comparedCount,
    expenseCount: current.filter((t) => t.type === 'EXPENSE').length,
  }
}
