import { prisma } from '@/lib/prisma'
import { cache } from 'react'

export interface CreateCardInput {
  name: string
  lastFourDigits: string
  dueDay: number
  closingDay: number
  color: string
  limitAmount: number
}

export interface CardDTO {
  id: string
  name: string
  lastFourDigits: string
  dueDay: number
  closingDay: number
  color: string
  limitAmount: string
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
    createdAt: updated.createdAt.toISOString(),
  }
}
