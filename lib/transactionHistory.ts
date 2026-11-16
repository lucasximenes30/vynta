import { effectivePayDay } from './payday'

export interface HistoryTransaction {
  id: string
  date: string
  createdAt?: string
  isRecurring?: boolean
  recurringDay?: number
  payDayType?: string
  isInstallment?: boolean
  dueDay?: number
  purchaseDate?: string
  cardId?: string
}

/** Display the occurrence being viewed, without changing the original transaction. */
export function historyDate(transaction: HistoryTransaction, period: string, cards: { id: string; dueDay: number }[]): string {
  if (!transaction.isRecurring && !transaction.isInstallment) return transaction.date.slice(0, 10)
  const [year, month] = period.split('-').map(Number)
  const card = cards.find(card => card.id === transaction.cardId)
  const day = card?.dueDay ?? (transaction.isRecurring
    ? effectivePayDay(year, month - 1, transaction.payDayType, transaction.recurringDay || Number(transaction.date.slice(8, 10)))
    : transaction.dueDay || Number((transaction.purchaseDate || transaction.date).slice(8, 10)))
  return `${period}-${String(Math.min(day, new Date(year, month, 0).getDate())).padStart(2, '0')}`
}

export function compareHistoryTransactions(a: HistoryTransaction, b: HistoryTransaction, descending = true): number {
  const order = a.date.localeCompare(b.date) || (a.createdAt || '').localeCompare(b.createdAt || '') || a.id.localeCompare(b.id)
  return descending ? -order : order
}
