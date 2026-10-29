import { createHash } from 'crypto'
import { generateNotifications, Notification, NotificationActionType } from '@/lib/notifications'
import { prisma } from '@/lib/prisma'

interface StoredNotificationPayload {
  version: 1
  notificationKey: string
  sourceType: Notification['sourceType']
  sourceTxId: string
  actionType: NotificationActionType | null
  type: Notification['type']
  paidAt: string | null
}

export interface NotificationWithState extends Notification {
  read: boolean
  paidAt: string | null
}

function buildNotificationRowId(userId: string, notificationKey: string): string {
  const digest = createHash('sha256')
    .update(`${userId}|${notificationKey}`)
    .digest('hex')
    .slice(0, 32)

  return `vynta-notif-${digest}`
}

function parseStoredPayload(message: string): StoredNotificationPayload | null {
  try {
    const parsed = JSON.parse(message) as Partial<StoredNotificationPayload>
    if (!parsed || parsed.version !== 1 || typeof parsed.notificationKey !== 'string') {
      return null
    }

    return {
      version: 1,
      notificationKey: parsed.notificationKey,
      sourceType: (parsed.sourceType as Notification['sourceType']) ?? 'recurring',
      sourceTxId: parsed.sourceTxId ?? '',
      actionType: (parsed.actionType as NotificationActionType | null) ?? null,
      type: (parsed.type as Notification['type']) ?? 'upcoming',
      paidAt: parsed.paidAt ?? null,
    }
  } catch {
    return null
  }
}

function toStoredPayload(candidate: Notification, paidAt: string | null): StoredNotificationPayload {
  return {
    version: 1,
    notificationKey: candidate.notificationKey,
    sourceType: candidate.sourceType,
    sourceTxId: candidate.sourceTxId,
    actionType: candidate.actionType,
    type: candidate.type,
    paidAt,
  }
}

async function getNotificationCandidates(userId: string, today?: Date): Promise<Notification[]> {
  const [transactions, cards] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        type: true,
        isInstallment: true,
        isRecurring: true,
        dueDay: true,
        recurringDay: true,
        totalInstallments: true,
        purchaseDate: true,
        isActive: true,
        endDate: true,
        cardId: true,
        amount: true,
        installmentAmount: true,
        date: true,
      },
    }),
    prisma.card.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        lastFourDigits: true,
        dueDay: true,
        closingDay: true,
        limitAmount: true,
      },
    }),
  ])

  return generateNotifications(
    transactions.map((tx) => ({
      id: tx.id,
      title: tx.title,
      type: tx.type,
      isInstallment: tx.isInstallment,
      isRecurring: tx.isRecurring,
      dueDay: tx.dueDay,
      recurringDay: tx.recurringDay,
      totalInstallments: tx.totalInstallments,
      purchaseDate: tx.purchaseDate,
      isActive: tx.isActive,
      endDate: tx.endDate,
      cardId: tx.cardId,
      amount: Number(tx.amount),
      installmentAmount: tx.installmentAmount == null ? null : Number(tx.installmentAmount),
      date: tx.date,
    })),
    cards.map((card) => ({
      id: card.id,
      name: card.name,
      lastFourDigits: card.lastFourDigits,
      dueDay: card.dueDay,
      closingDay: card.closingDay,
      limitAmount: card.limitAmount == null ? null : Number(card.limitAmount),
    })),
    today,
  )
}

async function syncNotificationRows(userId: string, candidates: Notification[]) {
  const rowIds = candidates.map((candidate) => buildNotificationRowId(userId, candidate.notificationKey))

  if (rowIds.length === 0) {
    return new Map<string, { read: boolean; paidAt: string | null }>()
  }

  const existingRows = await prisma.notification.findMany({
    where: {
      userId,
      id: { in: rowIds },
    },
    select: {
      id: true,
      message: true,
      date: true,
      read: true,
    },
  })

  const existingById = new Map(existingRows.map((row) => [row.id, row]))
  const stateById = new Map<string, { read: boolean; paidAt: string | null }>()

  const rowsToCreate: Array<{ id: string; userId: string; message: string; date: Date; read: boolean }> = []
  const updates: Promise<unknown>[] = []

  for (const candidate of candidates) {
    const rowId = buildNotificationRowId(userId, candidate.notificationKey)
    const existing = existingById.get(rowId)

    const existingPayload = existing ? parseStoredPayload(existing.message) : null
    const paidAt = existingPayload?.paidAt ?? null
    const payload = toStoredPayload(candidate, paidAt)
    const payloadString = JSON.stringify(payload)

    if (!existing) {
      rowsToCreate.push({
        id: rowId,
        userId,
        message: payloadString,
        date: candidate.dueDate,
        read: false,
      })
      stateById.set(rowId, { read: false, paidAt: null })
      continue
    }

    stateById.set(rowId, { read: existing.read, paidAt })

    if (existing.message !== payloadString || existing.date.getTime() !== candidate.dueDate.getTime()) {
      updates.push(
        prisma.notification.update({
          where: { id: rowId },
          data: {
            message: payloadString,
            date: candidate.dueDate,
          },
        }),
      )
    }
  }

  if (rowsToCreate.length > 0) {
    await prisma.notification.createMany({
      data: rowsToCreate,
      skipDuplicates: true,
    })
  }

  if (updates.length > 0) {
    await Promise.all(updates)
  }

  return stateById
}

export async function listUserNotifications(userId: string, today?: Date): Promise<NotificationWithState[]> {
  const candidates = await getNotificationCandidates(userId, today)

  if (candidates.length === 0) {
    return []
  }

  const stateById = await syncNotificationRows(userId, candidates)

  return candidates
    .map((candidate) => {
      const rowId = buildNotificationRowId(userId, candidate.notificationKey)
      const rowState = stateById.get(rowId) ?? { read: false, paidAt: null }

      return {
        ...candidate,
        id: rowId,
        read: rowState.read,
        paidAt: rowState.paidAt,
      }
    })
    .filter((notification) => !notification.paidAt)
}

export async function markNotificationsAsRead(userId: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0

  const result = await prisma.notification.updateMany({
    where: {
      userId,
      id: { in: ids },
      read: false,
    },
    data: {
      read: true,
    },
  })

  return result.count
}

export async function markAllActiveNotificationsAsRead(userId: string): Promise<number> {
  const notifications = await listUserNotifications(userId)
  const unreadIds = notifications.filter((notification) => !notification.read).map((notification) => notification.id)

  return markNotificationsAsRead(userId, unreadIds)
}

export async function registerNotificationPayment(userId: string, id: string): Promise<void> {
  const notifications = await listUserNotifications(userId)
  const target = notifications.find((notification) => notification.id === id)

  if (!target) {
    throw new Error('Notification not found')
  }

  if (!target.actionable || target.actionType !== 'REGISTER_PAYMENT') {
    throw new Error('Notification is not actionable')
  }

  const currentRow = await prisma.notification.findFirst({
    where: {
      id,
      userId,
    },
    select: {
      message: true,
    },
  })

  const fallbackPayload = toStoredPayload(target, null)
  const parsed = currentRow ? parseStoredPayload(currentRow.message) : null
  const paidAt = parsed?.paidAt ?? new Date().toISOString()

  await prisma.notification.update({
    where: { id },
    data: {
      read: true,
      message: JSON.stringify({
        ...fallbackPayload,
        paidAt,
      }),
    },
  })
}
