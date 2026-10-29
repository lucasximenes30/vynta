import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { isInstallmentActiveInMonth, getInstallmentForMonth, getRecurringStatusForMonth } from '@/lib/installments'
import {
  billMonthIndexForDate,
  cardTxContributesToMonth,
  dueMonthIndexForBill,
  invoiceDueDateForBill,
  parcelaDueDate,
  parcelaNumberForDueMonth,
  postingParcelaIndex,
} from '@/lib/invoice'
import { effectivePayDay, firstPayMonthIdx } from '@/lib/payday'
import { cache } from 'react'

export interface CreateTransactionInput {
  title: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  category: string
  date: string
  userId: string
  isInstallment?: boolean
  totalInstallments?: number
  purchaseDate?: string
  dueDay?: number
  isRecurring?: boolean
  recurringDay?: number
  cardId?: string | null
  paymentMethod?: string | null
}

export interface UpdateTransactionInput {
  title: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  category: string
  date: string
  isInstallment?: boolean
  totalInstallments?: number
  purchaseDate?: string
  dueDay?: number
  isRecurring?: boolean
  recurringDay?: number
  cardId?: string | null
  paymentMethod?: string | null
}

export async function createTransaction(input: CreateTransactionInput) {
  const installmentAmount =
    input.isInstallment && input.totalInstallments
      ? input.amount / input.totalInstallments
      : null

  return prisma.transaction.create({
    data: {
      title: input.title,
      amount: new Decimal(input.amount),
      installmentAmount: installmentAmount ? new Decimal(installmentAmount) : null,
      type: input.type,
      category: input.category,
      date: new Date(input.date.includes('T') ? input.date : `${input.date}T12:00:00Z`),
      userId: input.userId,
      ...(input.isInstallment !== undefined && { isInstallment: input.isInstallment }),
      ...(input.totalInstallments !== undefined && { totalInstallments: input.totalInstallments }),
      ...(input.purchaseDate && { purchaseDate: new Date(input.purchaseDate.includes('T') ? input.purchaseDate : `${input.purchaseDate}T12:00:00Z`) }),
      ...(input.dueDay !== undefined && { dueDay: input.dueDay }),
      ...(input.isRecurring !== undefined && { isRecurring: input.isRecurring }),
      ...(input.recurringDay !== undefined && { recurringDay: input.recurringDay }),
      ...(input.cardId !== undefined && { cardId: input.cardId ?? null }),
      ...(input.paymentMethod !== undefined && { paymentMethod: input.paymentMethod ?? null }),
    },
  })
}

export async function updateTransaction(id: string, userId: string, input: UpdateTransactionInput) {
  const existing = await prisma.transaction.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    throw new Error('Transaction not found or unauthorized')
  }

  const installmentAmount =
    input.isInstallment && input.totalInstallments
      ? input.amount / input.totalInstallments
      : null

  const recurringDay = 'recurringDay' in input ? input.recurringDay : undefined

  return prisma.transaction.update({
    where: { id },
    data: {
      title: input.title,
      amount: new Decimal(input.amount),
      installmentAmount: installmentAmount ? new Decimal(installmentAmount) : null,
      type: input.type,
      category: input.category,
      date: new Date(input.date.includes('T') ? input.date : `${input.date}T12:00:00Z`),
      ...(input.isInstallment !== undefined && { isInstallment: input.isInstallment }),
      totalInstallments: input.totalInstallments ?? null,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate.includes('T') ? input.purchaseDate : `${input.purchaseDate}T12:00:00Z`) : null,
      dueDay: input.dueDay ?? null,
      ...(input.isRecurring !== undefined && { isRecurring: input.isRecurring }),
      ...(recurringDay !== undefined && { recurringDay: recurringDay ?? null }),
      ...(input.cardId !== undefined && { cardId: input.cardId ?? null }),
      ...(input.paymentMethod !== undefined && { paymentMethod: input.paymentMethod ?? null }),
    },
  })
}

export interface CancelRecurringResult {
  isActive: false
  endDate: Date
  message: string
  monthExcluded: boolean
}

/**
 * Cancel a recurring transaction with correct financial behavior.
 *
 * Case 1 (current day >= recurringDay): this month already counted.
 *   endDate = last day of current month.
 * Case 2 (current day < recurringDay): current month should not be counted.
 *   endDate = today.
 */
export async function cancelRecurring(
  id: string,
  userId: string,
): Promise<CancelRecurringResult> {
  const tx = await prisma.transaction.findUnique({ where: { id } })
  if (!tx || tx.userId !== userId) {
    throw new Error('Transaction not found or unauthorized')
  }
  if (!tx.isRecurring) {
    throw new Error('Transaction is not recurring')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayOfMonth = today.getDate()
  const rDay = tx.recurringDay ?? 1

  let endDate: Date
  let message: string
  if (dayOfMonth >= rDay) {
    // Current month already counted — end at last day of this month
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
    message =
      'O pagamento deste mês já ocorreu. A assinatura foi cancelada e não será cobrada nos próximos meses.'
    await prisma.transaction.update({
      where: { id },
      data: { isActive: false, endDate },
    })
    return { isActive: false, endDate, message, monthExcluded: false }
  } else {
    // Current month should NOT be counted
    endDate = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59) // End of last month
    message =
      'Cancelado com sucesso. Como a data de pagamento ainda não chegou, nenhuma cobrança será feita este mês.'
    await prisma.transaction.update({
      where: { id },
      data: { isActive: false, endDate },
    })
    return { isActive: false, endDate, message, monthExcluded: true }
  }
}

// Single query per request: every read below derives its result in memory from this list.
const loadUserTransactions = cache(async (userId: string) => {
  return prisma.transaction.findMany({
    where: { userId },
    include: { card: { select: { dueDay: true, closingDay: true } } },
    orderBy: { date: 'desc' },
  })
})

type LoadedTransaction = Awaited<ReturnType<typeof loadUserTransactions>>[number]

function stripCard({ card: _card, ...rest }: LoadedTransaction) {
  return rest
}

function monthBounds(year: number, month: number) {
  return {
    startOfMonth: new Date(year, month - 1, 1),
    endOfMonth: new Date(year, month, 0, 23, 59, 59, 999),
  }
}

/**
 * When a recurring transaction starts counting. Salary slots use `createdAt`
 * (the moment the user configured it) so a payday that already passed this
 * month is skipped; ordinary recurring uses the user-chosen `date`.
 */
function recurringStartRef(t: { date: Date; createdAt: Date; salarySlot: number | null }): Date {
  return new Date(t.salarySlot != null ? t.createdAt : t.date)
}

export const getTransactionsByUser = cache(async (userId: string) => {
  const transactions = await loadUserTransactions(userId)
  return transactions.map(stripCard)
})

function computeBalance(transactions: LoadedTransaction[], upToDate?: Date) {
  let income = 0
  let expense = 0

  const today = upToDate ? new Date(upToDate) : new Date()
  today.setHours(23, 59, 59, 999)

  for (const t of transactions) {
    let effectiveAmount = 0

    if (t.isInstallment && t.totalInstallments && t.purchaseDate) {
      if (t.card && t.cardId) {
        // Card installment: parcela n is paid on the due date of its bill cycle.
        // Only count parcelas on/after the posting invoice — ones billed before
        // the card was imported were already settled outside the app.
        const firstCounted = Math.max(1, postingParcelaIndex(t, t.card))
        const instValue = t.installmentAmount != null ? Number(t.installmentAmount) : Number(t.amount) / t.totalInstallments
        let paidCount = 0
        for (let n = firstCounted; n <= t.totalInstallments; n++) {
          if (parcelaDueDate({ purchaseDate: t.purchaseDate, totalInstallments: t.totalInstallments }, t.card, n) <= today) paidCount++
        }
        effectiveAmount = instValue * paidCount
      } else {
        const pDate = new Date(t.purchaseDate)
        pDate.setHours(0, 0, 0, 0)
        const dueDay = t.dueDay || pDate.getDate()

        let startMonth = pDate.getMonth()
        let startYear = pDate.getFullYear()

        if (pDate.getDate() > dueDay) {
          startMonth++
          if (startMonth > 11) {
            startMonth = 0
            startYear++
          }
        }

        let paidCount = 0
        for (let i = 0; i < t.totalInstallments; i++) {
          const instDate = new Date(startYear, startMonth + i, dueDay)
          if (instDate <= today) {
            paidCount++
          }
        }
        effectiveAmount = Number(t.installmentAmount) * paidCount
      }

    } else if (t.isRecurring) {
      const startDate = recurringStartRef(t)
      startDate.setHours(0, 0, 0, 0)
      const rDay = t.recurringDay || startDate.getDate()

      if (t.card && t.cardId) {
        // Card recurring: each cycle posts on a bill and is paid on that bill's due date
        const firstBill = billMonthIndexForDate(startDate, t.card)
        const lastBill = t.endDate
          ? billMonthIndexForDate(new Date(t.endDate), t.card)
          : t.isActive
            ? Infinity
            : -1
        let cycleCount = 0
        for (let b = firstBill; b <= lastBill; b++) {
          if (invoiceDueDateForBill(t.card, b) > today) break
          cycleCount++
        }
        effectiveAmount = Number(t.amount) * cycleCount
      } else {
        let baseMonth = startDate.getMonth()
        let baseYear = startDate.getFullYear()

        if (startDate.getDate() > effectivePayDay(baseYear, baseMonth, t.payDayType, rDay)) {
          baseMonth++
          if (baseMonth > 11) {
            baseMonth = 0
            baseYear++
          }
        }

        const endLimit = t.endDate ? new Date(t.endDate) : today
        const upperLimit = !t.isActive && !t.endDate ? null : endLimit < today ? endLimit : today

        let y = baseYear
        let m = baseMonth
        let cycleCount = 0
        while (upperLimit && new Date(y, m, effectivePayDay(y, m, t.payDayType, rDay)) <= upperLimit) {
          cycleCount++
          m++
          if (m > 11) {
            m = 0
            y++
          }
        }
        effectiveAmount = Number(t.amount) * cycleCount
      }

    } else {
      const tDate = new Date(t.date)
      tDate.setHours(0, 0, 0, 0)
      
      let effectiveDate = tDate

      if (t.card && t.cardId) {
        effectiveDate = invoiceDueDateForBill(t.card, billMonthIndexForDate(tDate, t.card))
      }

      if (effectiveDate <= today) {
        effectiveAmount = Number(t.amount)
      }
    }

    if (t.type === 'INCOME') {
      income += effectiveAmount
    } else {
      expense += effectiveAmount
    }
  }

  return { income, expense, balance: income - expense }
}

export const getUserBalance = cache(async (userId: string, upToDate?: Date) => {
  return computeBalance(await loadUserTransactions(userId), upToDate)
})

export const getMonthlySummary = cache(async (userId: string) => {
  const now = new Date()
  return getMonthSummary(userId, now.getFullYear(), now.getMonth() + 1)
})

/**
 * Whether a transaction belongs to the target month for summary/listing purposes.
 * Card transactions belong to the month their invoice is DUE (not the posting month),
 * and installments/recurring imported mid-stream only count from the posting invoice.
 */
function txInMonth(t: LoadedTransaction, year: number, month: number): boolean {
  const targetIdx = year * 12 + (month - 1)
  if (t.card && t.cardId) {
    return cardTxContributesToMonth(t, t.card, targetIdx)
  }
  const { startOfMonth, endOfMonth } = monthBounds(year, month)
  if (t.isInstallment) {
    return !!(t.totalInstallments && t.purchaseDate) &&
      isInstallmentActiveInMonth(new Date(t.purchaseDate!), t.totalInstallments!, year, month)
  }
  if (t.isRecurring) {
    // Counts from the first payday on/after the start reference —
    // a recurring configured mid-month skips paydays that already passed
    const startRef = recurringStartRef(t)
    const rDay = t.recurringDay || startRef.getDate()
    if (targetIdx < firstPayMonthIdx(startRef, t.payDayType, rDay)) return false
    if (t.endDate) {
      const e = new Date(t.endDate)
      return targetIdx <= e.getFullYear() * 12 + e.getMonth()
    }
    return t.isActive
  }
  return t.date >= startOfMonth && t.date <= endOfMonth
}

// 🆕 Get transactions for a specific month (installment + recurring aware)
export const getTransactionsByMonth = cache(async (userId: string, year: number, month: number) => {
  const targetIdx = year * 12 + (month - 1)
  const transactions = (await loadUserTransactions(userId)).filter((t) => txInMonth(t, year, month))

  return transactions.map((t) => ({
    ...stripCard(t),
    ...(t.isInstallment && t.totalInstallments && t.purchaseDate
      ? {
          _activeInstallment: t.card
            ? parcelaNumberForDueMonth(
                { purchaseDate: t.purchaseDate, totalInstallments: t.totalInstallments },
                t.card,
                targetIdx,
              ) ?? getInstallmentForMonth(new Date(t.purchaseDate), t.totalInstallments, year, month)
            : getInstallmentForMonth(new Date(t.purchaseDate), t.totalInstallments, year, month),
        }
      : {}),
    ...(t.isRecurring
      ? {
          _recurringStatus: getRecurringStatusForMonth(
            t.recurringDay != null ? effectivePayDay(year, month - 1, t.payDayType, t.recurringDay) : null,
            year,
            month,
          ),
        }
      : {}),
  }))
})

function computeMonthTotals(transactions: LoadedTransaction[], year: number, month: number) {
  let income = 0
  let expense = 0
  let count = 0

  for (const t of transactions) {
    if (!txInMonth(t, year, month)) continue
    // Installments contribute their per-installment amount; everything else the full amount
    const value = t.isInstallment && t.installmentAmount ? Number(t.installmentAmount) : Number(t.amount)
    if (t.type === 'INCOME') {
      income += value
    } else {
      expense += value
    }
    count++
  }

  return { income, expense, balance: income - expense, transactionCount: count }
}

function computeMonthSummaryWithBalance(transactions: LoadedTransaction[], year: number, month: number) {
  const summary = computeMonthTotals(transactions, year, month)
  const overall = computeBalance(transactions, monthBounds(year, month).endOfMonth)
  return { ...summary, balance: overall.balance }
}

// 🆕 Get monthly summary for any month (installment + recurring aware)
export const getMonthSummary = cache(async (userId: string, year: number, month: number) => {
  return computeMonthSummaryWithBalance(await loadUserTransactions(userId), year, month)
})

// 🆕 Get comparison between selected month and previous month (installment-aware)
export const getMonthComparison = cache(async (userId: string, refYear: number, refMonth: number) => {
  const transactions = await loadUserTransactions(userId)
  const currentSummary = computeMonthSummaryWithBalance(transactions, refYear, refMonth)

  let prevYear = refYear
  let prevMonth = refMonth - 1
  if (prevMonth < 1) {
    prevMonth = 12
    prevYear--
  }

  const previousSummary = computeMonthSummaryWithBalance(transactions, prevYear, prevMonth)

  return {
    current: { year: refYear, month: refMonth, ...currentSummary },
    previous: { year: prevYear, month: prevMonth, ...previousSummary },
    comparison: {
      incomeChange: currentSummary.income - previousSummary.income,
      expenseChange: currentSummary.expense - previousSummary.expense,
      balanceChange: currentSummary.balance - previousSummary.balance,
    },
  }
})

// 🆕 Get available months — scoped strictly to the authenticated user's data.
// Only expands recurring months if the user actually has recurring transactions.
// Always includes current month as minimum (for new users with no data).
export const getAvailableMonths = cache(async (userId: string) => {
  const transactions = await loadUserTransactions(userId)

  const months = new Set<string>()

  // Always include current month so new users always see at least one option
  const now = new Date()
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  months.add(currentYM)

  // If user has no transactions at all, return only current month
  if (transactions.length === 0) {
    return [currentYM]
  }

  // Add months from regular (non-installment, non-recurring) transactions
  transactions.forEach((t) => {
    if (!t.isInstallment && !t.isRecurring) {
      let year = t.date.getFullYear()
      let month = t.date.getMonth() + 1
      // Card charges belong to the month their invoice is paid
      if (t.card && t.cardId) {
        const dueIdx = dueMonthIndexForBill(billMonthIndexForDate(t.date, t.card), t.card)
        year = Math.floor(dueIdx / 12)
        month = (dueIdx % 12) + 1
      }
      months.add(`${year}-${String(month).padStart(2, '0')}`)
    }
  })

  // Expand installment transactions to cover all months in their timeline
  for (const t of transactions) {
    if (t.isInstallment && t.totalInstallments && t.purchaseDate) {
      if (t.card && t.cardId) {
        // Card parcelas land in the due month of each bill cycle, from the posting invoice on
        const firstN = Math.max(1, postingParcelaIndex(t, t.card))
        for (let n = firstN; n <= t.totalInstallments; n++) {
          const first = billMonthIndexForDate(new Date(t.purchaseDate), t.card)
          const dueIdx = dueMonthIndexForBill(first + n - 1, t.card)
          months.add(`${Math.floor(dueIdx / 12)}-${String((dueIdx % 12) + 1).padStart(2, '0')}`)
        }
        continue
      }
      const pd = new Date(t.purchaseDate)
      const firstYear = pd.getFullYear()
      const firstMonth = pd.getMonth() + 1

      for (let i = 0; i < t.totalInstallments; i++) {
        const m = firstMonth + i
        const y = firstYear + Math.floor((m - 1) / 12)
        const actualMonth = ((m - 1) % 12) + 1
        months.add(`${y}-${String(actualMonth).padStart(2, '0')}`)
      }
    }
  }

  // Only add the rolling 6-month window if this user actually has recurring transactions.
  // This prevents new users or non-recurring users from seeing months they have no data for.
  const hasRecurring = transactions.some((t) => t.isRecurring)
  if (hasRecurring) {
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
  }

  return Array.from(months).sort().reverse()
})

// 🆕 Get expenses by category for a specific month (installment + recurring aware)
export const getExpensesByCategory = cache(async (userId: string, year: number, month: number) => {
  const transactions = await loadUserTransactions(userId)
  const categoryMap = new Map<string, number>()

  for (const t of transactions) {
    if (t.type !== 'EXPENSE' || !txInMonth(t, year, month)) continue
    const value = t.isInstallment && t.installmentAmount ? Number(t.installmentAmount) : Number(t.amount)
    const current = categoryMap.get(t.category) ?? 0
    categoryMap.set(t.category, current + value)
  }

  return Array.from(categoryMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
})

// 🆕 Get monthly trend data (last 6 months) — installment-aware
export const getMonthlyTrend = cache(async (userId: string) => {
  const now = new Date()
  const months: { year: number; month: number; label: string }[] = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleDateString('pt-BR', { month: 'short' }),
    })
  }

  const transactions = await loadUserTransactions(userId)

  return months.map((m) => {
    const summary = computeMonthTotals(transactions, m.year, m.month)
    return {
      month: m.label,
      income: summary.income,
      expense: summary.expense,
    }
  })
})
