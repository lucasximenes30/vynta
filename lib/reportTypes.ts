export interface ReportSummary {
  income: number
  pendingIncome?: number
  accumulatedBalance?: number
  expense: number
  balance: number
  transactionCount: number
}
export interface ReportSnapshot {
  period: string
  summary: ReportSummary
  previous: ReportSummary
  comparison: { incomeChange: number; expenseChange: number; balanceChange: number }
  categories: { category: string; amount: number }[]
  months: string[]
  trend: { month: string; year: number; income: number; expense: number }[]
}
export interface ReportInsight { text: string; type: 'positive' | 'negative' | 'tip' }
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const reportCurrency = (value: number) => currency.format(value)
export function reportMonth(period: string) {
  const [year, month] = period.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
