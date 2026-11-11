import { offlineRecordId } from '@/lib/offlineMutation'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createTransaction, getTransactionsByUser, getUserBalance, getMonthlySummary } from '@/services/transaction.service'
import { verifyCardOwnership } from '@/services/card.service'
import { prisma } from '@/lib/prisma'
import { enforceRateLimits } from '@/lib/rateLimit'
import { readBoundedText } from '@/lib/boundedBody'

const createSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().min(1, 'Category is required'),
  date: z.string(),
  isInstallment: z.boolean().optional(),
  totalInstallments: z.number().int().positive().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  dueDay: z.number().int().min(1).max(31).optional().nullable(),
  isRecurring: z.boolean().optional(),
  recurringDay: z.number().int().min(1).max(31).optional().nullable(),
  cardId: z.string().uuid().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  goalId: z.string().uuid().optional().nullable(),
  goalAmount: z.number().positive('Goal amount must be positive').optional().nullable(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [transactions, balance, monthly] = await Promise.all([
    getTransactionsByUser(session.userId),
    getUserBalance(session.userId),
    getMonthlySummary(session.userId),
  ])

  return NextResponse.json({ transactions, balance, monthly })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const limited = await enforceRateLimits([{ key: `transaction-write:${session.userId}`, limit: 120, windowSec: 60 }])
  if (limited) return limited

  try {
    const body = JSON.parse(await readBoundedText(request, 16 * 1024))
    const data = createSchema.parse(body)
    const { isInstallment, totalInstallments, purchaseDate, dueDay, isRecurring, recurringDay, cardId, goalId, goalAmount, ...rest } = data

    // Security: verify the cardId belongs to this user before saving
    if (cardId) {
      const owned = await verifyCardOwnership(cardId, session.userId)
      if (!owned) {
        return NextResponse.json({ success: false, error: 'Card not found' }, { status: 403 })
      }
    }

    const transaction = await createTransaction({
      ...(!goalId && { id: offlineRecordId(request, session.userId) }),
      ...rest,
      userId: session.userId,
      ...(isInstallment !== undefined && { isInstallment }),
      totalInstallments: totalInstallments ?? undefined,
      ...(purchaseDate && { purchaseDate }),
      ...(dueDay && { dueDay }),
      ...(isRecurring !== undefined && { isRecurring }),
      ...(recurringDay && { recurringDay }),
      cardId: cardId ?? null,
    })

    // Lógica para alocação de meta
    if (goalId && goalAmount) {
      const goal = await prisma.financialGoal.findUnique({ where: { id: goalId } })
      if (goal && goal.userId === session.userId) {
        await prisma.$transaction(async (tx) => {
          // 1. Criar GoalTransaction (Depósito na meta)
          await tx.goalTransaction.create({
            data: {
              goalId,
              amount: goalAmount,
              type: 'DEPOSIT',
              description: `Alocado da transação: ${rest.title}`,
              transactionId: transaction.id,
            }
          })
          
          // 2. Atualizar saldo da meta
          const newTotal = parseFloat(goal.currentAmount.toString()) + goalAmount
          await tx.financialGoal.update({
            where: { id: goalId },
            data: { currentAmount: newTotal }
          })
        })

        // 3. Criar a Despesa (EXPENSE) espelho SOMENTE se a transação original for RECEITA
        // Se a transação original for DESPESA, o valor já foi debitado do saldo principal.
        if (rest.type === 'INCOME') {
          await createTransaction({
            title: `Alocação para Meta: ${goal.title}`,
            amount: goalAmount,
            type: 'EXPENSE',
            category: 'Investment',
            date: rest.date,
            userId: session.userId,
          })
        }
      }
    }

    return NextResponse.json({ success: true, transaction })
  } catch (error: any) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? 'Invalid input'
      : error.message ?? 'Something went wrong'

    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    )
  }
}
