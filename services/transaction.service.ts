import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { isInstallmentActiveInMonth, getInstallmentForMonth, getRecurringStatusForMonth } from '@/lib/installments'
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

function isPlainInMonth(t: LoadedTransaction, startOfMonth: Date, endOfMonth: Date) {
  return !t.isInstallment && !t.isRecurring && t.date >= startOfMonth && t.date <= endOfMonth
}

function isRecurringActiveInRange(t: LoadedTransaction, startOfMonth: Date, endOfMonth: Date) {
  const tDate = new Date(t.date)
  if (tDate > endOfMonth) return false

  if (t.endDate) {
    return new Date(t.endDate) >= startOfMonth
  }
  return t.isActive
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
      const pDate = new Date(t.purchaseDate)
      pDate.setHours(0, 0, 0, 0)
      const dueDay = t.dueDay || pDate.getDate()

      let startMonth = pDate.getMonth()
      let startYear = pDate.getFullYear()

      if (t.card && t.cardId) {
        if (pDate.getDate() > t.card.closingDay) {
          startMonth++
          if (startMonth > 11) {
            startMonth = 0
            startYear++
          }
        }
        if (t.card.dueDay < t.card.closingDay) {
          startMonth++
          if (startMonth > 11) {
            startMonth = 0
            startYear++
          }
        }
      } else {
        if (pDate.getDate() > dueDay) {
           startMonth++
           if (startMonth > 11) {
             startMonth = 0
             startYear++
           }
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

    } else if (t.isRecurring) {
      const startDate = new Date(t.date)
      startDate.setHours(0, 0, 0, 0)
      const rDay = t.recurringDay || startDate.getDate()
      
      let baseMonth = startDate.getMonth()
      let baseYear = startDate.getFullYear()

      if (t.card && t.cardId) {
        if (startDate.getDate() > t.card.closingDay) {
          baseMonth++
          if (baseMonth > 11) {
            baseMonth = 0
            baseYear++
          }
        }
        if (t.card.dueDay < t.card.closingDay) {
          baseMonth++
          if (baseMonth > 11) {
            baseMonth = 0
            baseYear++
          }
        }
      } else {
        if (startDate.getDate() > rDay) {
           baseMonth++
           if (baseMonth > 11) {
             baseMonth = 0
             baseYear++
           }
        }
      }

      const endLimit = t.endDate ? new Date(t.endDate) : today
      const upperLimit = endLimit < today ? endLimit : today

      let current = new Date(baseYear, baseMonth, rDay)
      
      let cycleCount = 0
      while (current <= upperLimit) {
        cycleCount++
        current = new Date(current.getFullYear(), current.getMonth() + 1, rDay)
      }
      effectiveAmount = Number(t.amount) * cycleCount

    } else {
      const tDate = new Date(t.date)
      tDate.setHours(0, 0, 0, 0)
      
      let effectiveDate = tDate

      if (t.card && t.cardId) {
        let billMonth = tDate.getMonth()
        let billYear = tDate.getFullYear()

        if (tDate.getDate() > t.card.closingDay) {
          billMonth++
          if (billMonth > 11) {
            billMonth = 0
            billYear++
          }
        }
        
        let dueMonth = billMonth
        let dueYear = billYear
        
        if (t.card.dueDay < t.card.closingDay) {
          dueMonth++
          if (dueMonth > 11) {
            dueMonth = 0
            dueYear++
          }
        }
        effectiveDate = new Date(dueYear, dueMonth, t.card.dueDay)
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

// 🆕 Get transactions for a specific month (installment + recurring aware)
export const getTransactionsByMonth = cache(async (userId: string, year: number, month: number) => {
  const { startOfMonth, endOfMonth } = monthBounds(year, month)
  const transactions = (await loadUserTransactions(userId)).map(stripCard)

  // Non-installment, non-recurring transactions for the target month
  const nonInstallments = transactions.filter(
    (t) => !t.isInstallment && !t.isRecurring && t.date >= startOfMonth && t.date <= endOfMonth,
  )

  // Installment transactions
  const activeInstallments = transactions.filter((t) =>
    t.isInstallment && t.totalInstallments && t.purchaseDate
      ? isInstallmentActiveInMonth(new Date(t.purchaseDate), t.totalInstallments, year, month)
      : false,
  )

  // Recurring transactions — always included if active or endDate covers this month
  const activeRecurring = transactions.filter((t) => {
    if (!t.isRecurring) return false
    const tDate = new Date(t.date)
    if (tDate > endOfMonth) return false
    
    if (t.endDate) {
      return new Date(t.endDate) >= startOfMonth
    }
    return t.isActive
  })

  // Merge and mark with current installment info
  const enrichedActiveInstallments = activeInstallments.map((t) => ({
    ...t,
    _activeInstallment: getInstallmentForMonth(
      new Date(t.purchaseDate!),
      t.totalInstallments!,
      year,
      month,
    ),
  }))

  // Enrich recurring with payment status for the month
  const enrichedRecurring = activeRecurring.map((t) => ({
    ...t,
    _recurringStatus: getRecurringStatusForMonth(t.recurringDay, year, month),
  }))

  return [...enrichedActiveInstallments, ...nonInstallments, ...enrichedRecurring]
})

function computeMonthTotals(transactions: LoadedTransaction[], year: number, month: number) {
  const { startOfMonth, endOfMonth } = monthBounds(year, month)

  const nonInstallments = transactions.filter((t) => isPlainInMonth(t, startOfMonth, endOfMonth))
  const installments = transactions.filter((t) => t.isInstallment)
  const activeRecurring = transactions.filter(
    (t) => t.isRecurring && isRecurringActiveInRange(t, startOfMonth, endOfMonth),
  )

  return computeMonthSummary(installments, nonInstallments, year, month, activeRecurring)
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

// Pure function to compute a month's summary from transaction lists
function computeMonthSummary(
  installments: Array<{ type: string; installmentAmount: Decimal | null; isInstallment: boolean; totalInstallments: number | null; purchaseDate: Date | null }>,
  nonInstallments: Array<{ type: string; amount: Decimal }>,
  year: number,
  month: number, // 1-12
  recurring?: Array<{ type: string; amount: Decimal }>,
) {
  let income = 0
  let expense = 0
  let count = 0

  // Active installments for this month contribute their per-installment amount
  for (const t of installments) {
    if (t.isInstallment && t.totalInstallments && t.purchaseDate) {
      if (isInstallmentActiveInMonth(new Date(t.purchaseDate), t.totalInstallments, year, month)) {
        const value = t.installmentAmount ? Number(t.installmentAmount) : 0
        if (t.type === 'INCOME') {
          income += value
        } else {
          expense += value
        }
        count++
      }
    }
  }

  // Non-installment transactions from the target month
  for (const t of nonInstallments) {
    const value = Number(t.amount)
    if (t.type === 'INCOME') {
      income += value
    } else {
      expense += value
    }
    count++
  }

  // Recurring transactions — always included with full amount
  if (recurring) {
    for (const t of recurring) {
      const value = Number(t.amount)
      if (t.type === 'INCOME') {
        income += value
      } else {
        expense += value
      }
      count++
    }
  }

  return { income, expense, balance: income - expense, transactionCount: count }
}

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
      const year = t.date.getFullYear()
      const month = t.date.getMonth() + 1
      months.add(`${year}-${String(month).padStart(2, '0')}`)
    }
  })

  // Expand installment transactions to cover all months in their timeline
  for (const t of transactions) {
    if (t.isInstallment && t.totalInstallments && t.purchaseDate) {
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
  const { startOfMonth, endOfMonth } = monthBounds(year, month)
  const transactions = await loadUserTransactions(userId)

  const nonInstallments = transactions.filter(
    (t) => t.type === 'EXPENSE' && isPlainInMonth(t, startOfMonth, endOfMonth),
  )
  const installments = transactions.filter((t) => t.isInstallment)
  const recurring = transactions.filter((t) => t.isRecurring && t.type === 'EXPENSE')

  const categoryMap = new Map<string, number>()

  for (const t of nonInstallments) {
    const current = categoryMap.get(t.category) ?? 0
    categoryMap.set(t.category, current + Number(t.amount))
  }

  for (const t of installments) {
    if (t.totalInstallments && t.purchaseDate) {
      if (isInstallmentActiveInMonth(new Date(t.purchaseDate), t.totalInstallments, year, month)) {
        const value = t.installmentAmount ? Number(t.installmentAmount) : 0
        const current = categoryMap.get(t.category) ?? 0
        categoryMap.set(t.category, current + value)
      }
    }
  }

  // Add active recurring expenses
  const activeRecurring = recurring.filter((t) => {
    if (!t.isActive) return false
    if (t.endDate) {
      return t.endDate >= startOfMonth
    }
    return true
  })

  for (const t of activeRecurring) {
    const current = categoryMap.get(t.category) ?? 0
    categoryMap.set(t.category, current + Number(t.amount))
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
