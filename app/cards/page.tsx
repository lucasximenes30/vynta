import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getCardsByUser } from '@/services/card.service'
import { getTransactionsByUser } from '@/services/transaction.service'
import CardsClient from './CardsClient'

export const metadata: Metadata = {
  title: 'Cartões',
}

export default async function CardsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [cards, transactions] = await Promise.all([
    getCardsByUser(session.userId),
    getTransactionsByUser(session.userId),
  ])

  // Serialize transactions for client
  const serializedTransactions = transactions.map(t => ({
    id: t.id,
    title: t.title,
    amount: t.amount.toString(),
    installmentAmount: t.installmentAmount ? t.installmentAmount.toString() : null,
    type: t.type,
    category: t.category,
    date: t.date.toISOString(),
    isInstallment: t.isInstallment,
    totalInstallments: t.totalInstallments,
    purchaseDate: t.purchaseDate ? t.purchaseDate.toISOString() : null,
    dueDay: t.dueDay,
    isRecurring: t.isRecurring,
    recurringDay: t.recurringDay,
    isActive: t.isActive,
    endDate: t.endDate ? t.endDate.toISOString() : null,
    cardId: t.cardId ?? undefined,
  }))

  return <CardsClient session={session} initialCards={cards} transactions={serializedTransactions} />
}
