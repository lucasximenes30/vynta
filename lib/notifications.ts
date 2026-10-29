import { computeCommittedLimit, getCardInvoiceTotal } from '@/lib/invoice'

export type NotificationType = 'upcoming' | 'today' | 'late'

export type NotificationSourceType = 'recurring' | 'installment' | 'card_bill' | 'card_limit'

export type NotificationActionType = 'REGISTER_PAYMENT'

export interface Notification {
  id: string
  notificationKey: string
  title: string
  description: string
  type: NotificationType
  days: number
  sourceTxId: string
  sourceType: NotificationSourceType
  dueDate: Date
  actionable: boolean
  actionType: NotificationActionType | null
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getNotificationKey(sourceType: NotificationSourceType, sourceId: string, dueDate: Date): string {
  return `${sourceType}:${sourceId}:${formatDateKey(dueDate)}`
}

function isActionableNotification(sourceType: NotificationSourceType, type: NotificationType): boolean {
  if (sourceType === 'card_limit') return false
  return type === 'today' || type === 'late'
}

/**
 * Calculate the next due date based on dueDay and current date.
 * Returns a Date for the next occurrence of dueDay.
 */
function getNextDueDate(dueDay: number): Date {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const currentDay = now.getDate()
  const year = now.getFullYear()
  const month = now.getMonth()

  // If dueDay hasn't happened yet this month, use current month
  if (dueDay >= currentDay) {
    return new Date(year, month, dueDay)
  }
  // Otherwise, next month
  return new Date(year, month + 1, dueDay)
}

/**
 * Determine days difference between today and the next due date.
 * Positive = future, 0 = today, negative = late (already passed).
 */
function daysDifference(dueDay: number): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const nextDue = getNextDueDate(dueDay)
  const diff = Math.round((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // If the next due date is exactly 30 days away, the actual due date already passed this month
  if (diff === 30 || diff === 31 || diff === 29 || diff === 28) {
    const candidate = new Date(now.getFullYear(), now.getMonth(), dueDay)
    if (candidate < now) {
      // Already passed this month, it's late
      return -1 * Math.round((now.getTime() - candidate.getTime()) / (1000 * 60 * 60 * 24))
    }
  }

  return diff
}

/**
 * Check if an installment is still active (not all installments paid).
 */
function isInstallmentActive(
  purchaseDate: Date | null,
  totalInstallments: number | null,
  dueDay: number | null,
): boolean {
  if (!totalInstallments || !purchaseDate || !dueDay) return false

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const pd = new Date(purchaseDate)
  pd.setHours(0, 0, 0, 0)

  // Calculate last payment date
  const lastMonth = pd.getMonth() + totalInstallments - 1
  const lastDate = new Date(pd.getFullYear(), lastMonth, dueDay)

  return now <= lastDate
}

/**
 * Generate notifications dynamically from transactions.
 * No persistence, no cron — computed on the fly.
 */
export function generateNotifications(
  transactions: Array<{
    id: string
    title: string
    type: string
    isInstallment: boolean
    isRecurring: boolean
    dueDay: number | null
    recurringDay: number | null
    totalInstallments: number | null
    purchaseDate: Date | null
    isActive: boolean
    endDate: Date | null
    cardId?: string | null
    amount?: number | string | null
    installmentAmount?: number | string | null
    date?: Date | string | null
  }>,
  cards: Array<{
    id: string
    name: string
    lastFourDigits: string
    dueDay: number
    closingDay: number
    limitAmount?: number | string | null
  }> = [],
  today?: Date,
): Notification[] {
  const now = today ?? new Date()
  now.setHours(0, 0, 0, 0)

  const notifications: Notification[] = []

  for (const tx of transactions) {
    if (tx.type !== 'EXPENSE') continue
    // Card transactions are billed through the invoice — the card_bill
    // notification already covers them, so no per-item reminders.
    if (tx.cardId) continue

    // --- Recurring transactions ---
    if (tx.isRecurring) {
      if (!tx.isActive) continue
      if (tx.endDate && tx.endDate < now) continue
      if (!tx.recurringDay) continue

      const { diff, dueDate } = getDueInfoForDay(now, tx.recurringDay)
      const type = diff > 0 && diff <= 5 ? 'upcoming' : diff === 0 ? 'today' : diff < 0 ? 'late' : null

      if (type) {
        const absDays = Math.abs(diff)
        const sourceType: NotificationSourceType = 'recurring'
        const notificationKey = getNotificationKey(sourceType, tx.id, dueDate)
        notifications.push({
          id: `recurring-${tx.id}-${formatDateKey(dueDate)}`,
          notificationKey,
          title: tx.title,
          description: getDescription(type, absDays),
          type,
          days: absDays,
          sourceTxId: tx.id,
          sourceType,
          dueDate,
          actionable: isActionableNotification(sourceType, type),
          actionType: isActionableNotification(sourceType, type) ? 'REGISTER_PAYMENT' : null,
        })
      }
    }

    // --- Installment transactions ---
    if (tx.isInstallment && tx.dueDay) {
      if (!isInstallmentActive(tx.purchaseDate, tx.totalInstallments, tx.dueDay)) continue

      const { diff, dueDate } = getDueInfoForDay(now, tx.dueDay)
      const type = diff > 0 && diff <= 5 ? 'upcoming' : diff === 0 ? 'today' : diff < 0 ? 'late' : null

      if (type) {
        let displayTitle = tx.title
        if (tx.cardId) {
          const card = cards.find(c => c.id === tx.cardId)
          if (card) {
             displayTitle = `${tx.title} (Cartão **** ${card.lastFourDigits})`
          }
        }

        const absDays = Math.abs(diff)
        const sourceType: NotificationSourceType = 'installment'
        const notificationKey = getNotificationKey(sourceType, tx.id, dueDate)
        notifications.push({
          id: `installment-${tx.id}-${formatDateKey(dueDate)}`,
          notificationKey,
          title: displayTitle,
          description: getDescription(type, absDays),
          type,
          days: absDays,
          sourceTxId: tx.id,
          sourceType,
          dueDate,
          actionable: isActionableNotification(sourceType, type),
          actionType: isActionableNotification(sourceType, type) ? 'REGISTER_PAYMENT' : null,
        })
      }
    }
  }

  // --- Card Bills (Fatura do Cartão) & Limits ---
  for (const card of cards) {
    // 1. Check Due Date — alerts go out 7, 3 and 1 days before, on the due day and while overdue
    const { diff, dueDate } = getDueInfoForDay(now, card.dueDay)
    const type = diff > 0 && (diff === 7 || diff <= 3) ? 'upcoming' : diff === 0 ? 'today' : diff < 0 ? 'late' : null

    if (type) {
      const absDays = Math.abs(diff)
      const sourceType: NotificationSourceType = 'card_bill'
      const notificationKey = getNotificationKey(sourceType, card.id, dueDate)

      // Invoice value tied to this due date: its bill cycle is the due month
      // (or the previous one when dueDay < closingDay)
      const dueIdx = dueDate.getFullYear() * 12 + dueDate.getMonth()
      const billIdx = card.dueDay < card.closingDay ? dueIdx - 1 : dueIdx
      const billYear = Math.floor(billIdx / 12)
      const billMonth0 = ((billIdx % 12) + 12) % 12
      const invoiceTotal = getCardInvoiceTotal(
        { id: card.id, closingDay: card.closingDay, dueDay: card.dueDay },
        transactions.map((tx) => ({
          id: tx.id,
          title: tx.title,
          type: tx.type,
          amount: tx.amount ?? 0,
          installmentAmount: tx.installmentAmount ?? null,
          date: tx.date ?? dueDate,
          purchaseDate: tx.purchaseDate,
          isInstallment: tx.isInstallment,
          totalInstallments: tx.totalInstallments,
          isRecurring: tx.isRecurring,
          isActive: tx.isActive,
          endDate: tx.endDate,
          cardId: tx.cardId,
        })),
        billYear,
        billMonth0,
      )
      const valueText = invoiceTotal > 0
        ? `Fatura de R$ ${invoiceTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} — `
        : ''

      notifications.push({
        id: `cardbill-${card.id}-${formatDateKey(dueDate)}`,
        notificationKey,
        title: `Fatura ${card.name} (**** ${card.lastFourDigits})`,
        description: `${valueText}${getDescription(type, absDays)}`,
        type,
        days: absDays,
        sourceTxId: card.id,
        sourceType,
        dueDate,
        actionable: isActionableNotification(sourceType, type),
        actionType: isActionableNotification(sourceType, type) ? 'REGISTER_PAYMENT' : null,
      })
    }

    // 2. Check Limit Usage — committed = charges on unpaid invoices only
    // (matches what the bank shows as used limit; paid cycles release it)
    const cardLimit = card.limitAmount ? Number(card.limitAmount) : 0
    if (cardLimit > 0) {
      const usedLimit = computeCommittedLimit(
        { id: card.id, closingDay: card.closingDay, dueDay: card.dueDay },
        transactions.map((tx) => ({
          id: tx.id,
          title: tx.title,
          type: tx.type,
          amount: tx.amount ?? 0,
          installmentAmount: tx.installmentAmount ?? null,
          date: tx.date ?? now,
          purchaseDate: tx.purchaseDate,
          isInstallment: tx.isInstallment,
          totalInstallments: tx.totalInstallments,
          isRecurring: tx.isRecurring,
          recurringDay: tx.recurringDay,
          isActive: tx.isActive,
          endDate: tx.endDate,
          cardId: tx.cardId,
        })),
        now,
      )

      const usagePercent = (usedLimit / cardLimit) * 100
      if (usagePercent >= 85) {
        const sourceType: NotificationSourceType = 'card_limit'
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        const dueDate = new Date(now)
        notifications.push({
          id: `cardlimit-${card.id}-${monthKey}`,
          notificationKey: `card_limit:${card.id}:${monthKey}`,
          title: `Limite alto: ${card.name}`,
          description: `Você já utilizou ${usagePercent.toFixed(0)}% do limite do seu cartão.`,
          type: 'upcoming', // Use 'upcoming' as a warning
          days: 0,
          sourceTxId: card.id,
          sourceType,
          dueDate,
          actionable: false,
          actionType: null,
        })
      }
    }
  }

  // Sort: late first, then today, then upcoming (by days)
  const order = { late: 0, today: 1, upcoming: 2 }
  notifications.sort((a, b) => {
    const typeOrder = order[a.type] - order[b.type]
    if (typeOrder !== 0) return typeOrder
    return a.days - b.days
  })

  return notifications
}

/**
 * Calculate days difference for a given day-of-month relative to today.
 * Returns: 0 if today is the due day, positive if upcoming, negative if late.
 */
function getDueInfoForDay(now: Date, dayOfMonth: number): { diff: number; dueDate: Date } {
  const todayDay = now.getDate()
  const thisMonthDue = new Date(now.getFullYear(), now.getMonth(), dayOfMonth)
  thisMonthDue.setHours(0, 0, 0, 0)

  if (dayOfMonth === todayDay) {
    return { diff: 0, dueDate: thisMonthDue }
  }

  if (thisMonthDue > now) {
    // Upcoming this month
    return {
      diff: Math.round((thisMonthDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      dueDate: thisMonthDue,
    }
  }

  // Past this month — calculate how many days late
  const daysLate = Math.round((now.getTime() - thisMonthDue.getTime()) / (1000 * 60 * 60 * 24))

  // If only 1-2 days late, we could still show "upcoming" for next month
  // But if we're within the 5-day window looking ahead at next month:
  const nextMonthDue = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth)
  nextMonthDue.setHours(0, 0, 0, 0)
  const daysToNext = Math.round((nextMonthDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // If both late and the next one is within 5 days, show late (it's still late!)
  // We only show upcoming if days late <= (next month distance - 5), i.e., not meaningfully late
  if (daysLate <= 2 && daysToNext <= 5) {
    // Edge case: just passed but next one is close — still show as late
    // since the previous one is overdue
  }

  // Show as upcoming for next month only if less than 3 days late
  if (daysLate <= 3 && daysToNext <= 5) {
    return { diff: daysToNext, dueDate: nextMonthDue }
  }

  return { diff: -daysLate, dueDate: thisMonthDue }
}

/**
 * Generate Portuguese description for notification type.
 */
function getDescription(type: NotificationType, days: number): string {
  switch (type) {
    case 'upcoming':
      if (days === 1) return 'Falta 1 dia para o pagamento'
      return `Faltam ${days} dias para o pagamento`
    case 'today':
      return 'Pagamento vence hoje'
    case 'late':
      if (days === 1) return 'Atrasado há 1 dia'
      return `Atrasado há ${days} dias`
  }
}
