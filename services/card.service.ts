import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { Prisma } from '@prisma/client'
import { cache } from 'react'

export interface CreateCardInput {
  name: string
  lastFourDigits: string
  dueDay: number
  closingDay: number
  color: string
  limitAmount: number
  provider?: string | null
}

export interface CardDTO {
  id: string
  name: string
  lastFourDigits: string
  dueDay: number
  closingDay: number
  color: string
  limitAmount: string
  provider: string | null
  createdAt: string
}

export const getCardsByUser = cache(async (userId: string): Promise<CardDTO[]> => {
  const cards = await prisma.card.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
  return cards.map((c) => ({
    id: c.id,
    name: c.name,
    lastFourDigits: c.lastFourDigits,
    dueDay: c.dueDay,
    closingDay: c.closingDay,
    color: c.color,
    limitAmount: c.limitAmount.toString(),
    provider: c.provider,
    createdAt: c.createdAt.toISOString(),
  }))
})

export async function createCard(userId: string, input: CreateCardInput): Promise<CardDTO> {
  const card = await prisma.card.create({
    data: {
      userId,
      name: input.name,
      lastFourDigits: input.lastFourDigits,
      dueDay: input.dueDay,
      closingDay: input.closingDay,
      color: input.color,
      limitAmount: input.limitAmount,
      provider: input.provider ?? null,
    },
  })
  return {
    id: card.id,
    name: card.name,
    lastFourDigits: card.lastFourDigits,
    dueDay: card.dueDay,
    closingDay: card.closingDay,
    color: card.color,
    limitAmount: card.limitAmount.toString(),
    provider: card.provider,
    createdAt: card.createdAt.toISOString(),
  }
}

export async function deleteCard(id: string, userId: string): Promise<void> {
  const card = await prisma.card.findUnique({ where: { id } })
  if (!card || card.userId !== userId) {
    throw new Error('Card not found or unauthorized')
  }
  await prisma.card.delete({ where: { id } })
}

/**
 * Verify a card belongs to the given user.
 * Used when saving a transaction with a cardId to prevent cross-user assignment.
 */
export async function verifyCardOwnership(cardId: string, userId: string): Promise<boolean> {
  const card = await prisma.card.findUnique({ where: { id: cardId } })
  return card?.userId === userId
}

export async function updateCard(id: string, userId: string, input: Partial<CreateCardInput>): Promise<CardDTO> {
  const card = await prisma.card.findUnique({ where: { id } })
  if (!card || card.userId !== userId) {
    throw new Error('Card not found or unauthorized')
  }

  const updated = await prisma.card.update({
    where: { id },
    data: input,
  })
  
  return {
    id: updated.id,
    name: updated.name,
    lastFourDigits: updated.lastFourDigits,
    dueDay: updated.dueDay,
    closingDay: updated.closingDay,
    color: updated.color,
    limitAmount: updated.limitAmount.toString(),
    provider: updated.provider,
    createdAt: updated.createdAt.toISOString(),
  }
}

// ---------- Invoice import (Nubank CSV) ----------

export interface ImportInvoiceItem {
  title: string
  amount: number // invoice value (per-installment value for installments)
  date: string // posting date YYYY-MM-DD
  category: string
  isInstallment?: boolean
  currentInstallment?: number | null
  totalInstallments?: number | null
}

export interface ImportInvoiceResult {
  card: CardDTO
  imported: number
  skippedDuplicates: number
  limitAmount: string | null
}

function localDate(value: string): Date {
  return new Date(value.includes('T') ? value : `${value}T12:00:00.000Z`)
}

function addMonths(date: Date, delta: number): Date {
  const d = new Date(date)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + delta)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return d
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function ym(date: Date): string {
  return date.toISOString().slice(0, 7)
}

/** Natural-key dedupe so re-importing the same CSV never duplicates charges. */
function itemKey(t: {
  title: string
  amount: number
  date: Date
  isInstallment: boolean
  purchaseDate: Date | null
  totalInstallments: number | null
}): string {
  const norm = t.title.trim().toLowerCase().replace(/\s+/g, ' ')
  if (t.isInstallment && t.purchaseDate) {
    return `inst|${norm}|${ym(t.purchaseDate)}|${t.amount.toFixed(2)}|${t.totalInstallments ?? 0}`
  }
  return `plain|${norm}|${ymd(t.date)}|${t.amount.toFixed(2)}`
}

export async function importCardInvoice(
  userId: string,
  input: {
    cardId?: string
    card?: CreateCardInput
    items: ImportInvoiceItem[]
    availableLimit?: number | null
  },
): Promise<ImportInvoiceResult> {
  let card: { id: string; dueDay: number; closingDay: number }

  if (input.cardId) {
    const existing = await prisma.card.findUnique({ where: { id: input.cardId } })
    if (!existing || existing.userId !== userId) {
      throw new Error('Card not found or unauthorized')
    }
    card = existing
  } else {
    if (!input.card) throw new Error('Card data required')
    card = await prisma.card.create({
      data: {
        userId,
        name: input.card.name,
        lastFourDigits: input.card.lastFourDigits,
        dueDay: input.card.dueDay,
        closingDay: input.card.closingDay,
        color: input.card.color,
        limitAmount: input.card.limitAmount,
        provider: input.card.provider ?? null,
      },
    })
  }

  const existing = await prisma.transaction.findMany({
    where: { cardId: card.id, type: 'EXPENSE' },
    select: {
      title: true,
      amount: true,
      date: true,
      isInstallment: true,
      purchaseDate: true,
      totalInstallments: true,
    },
  })

  const seen = new Map<string, number>()
  for (const t of existing) {
    const key = itemKey({
      title: t.title,
      amount: Number(t.amount),
      date: t.date,
      isInstallment: t.isInstallment,
      purchaseDate: t.purchaseDate,
      totalInstallments: t.totalInstallments,
    })
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }

  const toCreate: Prisma.TransactionCreateManyInput[] = []
  let skipped = 0

  for (const item of input.items) {
    const isInst = !!item.isInstallment && !!item.totalInstallments && item.totalInstallments > 1
    const postingDate = localDate(item.date)
    const installmentValue = Math.round(item.amount * 100) / 100
    const purchaseDate = isInst && item.currentInstallment
      ? addMonths(postingDate, -(item.currentInstallment - 1))
      : null
    // amount stores the full purchase price so installmentAmount comes out exact
    const fullAmount = isInst && item.totalInstallments
      ? Math.round(installmentValue * item.totalInstallments * 100) / 100
      : installmentValue

    const key = itemKey({
      title: item.title,
      amount: fullAmount,
      date: postingDate,
      isInstallment: isInst,
      purchaseDate,
      totalInstallments: isInst ? item.totalInstallments! : null,
    })
    const count = seen.get(key) ?? 0
    if (count > 0) {
      seen.set(key, count - 1)
      skipped++
      continue
    }

    toCreate.push({
      userId,
      cardId: card.id,
      title: item.title.trim(),
      type: 'EXPENSE',
      category: item.category || 'General',
      amount: new Decimal(fullAmount),
      installmentAmount: isInst ? new Decimal(installmentValue) : null,
      date: postingDate,
      isInstallment: isInst,
      totalInstallments: isInst ? item.totalInstallments! : null,
      purchaseDate,
      dueDay: card.dueDay,
      paymentMethod: 'credit_card',
    })
  }

  if (toCreate.length > 0) {
    await prisma.transaction.createMany({ data: toCreate })
  }

  // If the user told us their *available* limit in the bank app, the total limit is
  // available + everything the app counts as used for this card (sum of full amounts).
  let limitAmount: string | null = null
  if (input.availableLimit != null && Number.isFinite(input.availableLimit)) {
    const agg = await prisma.transaction.aggregate({
      where: { cardId: card.id, type: 'EXPENSE' },
      _sum: { amount: true },
    })
    const used = Number(agg._sum.amount ?? 0)
    const total = Math.round((input.availableLimit + used) * 100) / 100
    const updated = await prisma.card.update({ where: { id: card.id }, data: { limitAmount: total } })
    limitAmount = updated.limitAmount.toString()
  } else {
    const fresh = await prisma.card.findUnique({ where: { id: card.id } })
    limitAmount = fresh?.limitAmount.toString() ?? null
  }

  const fresh = await prisma.card.findUnique({ where: { id: card.id } })
  return {
    card: {
      id: fresh!.id,
      name: fresh!.name,
      lastFourDigits: fresh!.lastFourDigits,
      dueDay: fresh!.dueDay,
      closingDay: fresh!.closingDay,
      color: fresh!.color,
      limitAmount: fresh!.limitAmount.toString(),
      provider: fresh!.provider,
      createdAt: fresh!.createdAt.toISOString(),
    },
    imported: toCreate.length,
    skippedDuplicates: skipped,
    limitAmount,
  }
}
