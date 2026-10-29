import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { importCardInvoice } from '@/services/card.service'

const itemSchema = z.object({
  title: z.string().min(1).max(200),
  amount: z.number().positive(),
  date: z.string().min(10),
  category: z.string().min(1).max(60),
  isInstallment: z.boolean().optional(),
  currentInstallment: z.number().int().min(1).max(99).optional().nullable(),
  totalInstallments: z.number().int().min(2).max(99).optional().nullable(),
  isRecurring: z.boolean().optional(),
})

const importSchema = z.object({
  cardId: z.string().uuid().optional(),
  card: z
    .object({
      name: z.string().min(1).max(40),
      lastFourDigits: z.string().length(4).regex(/^\d{4}$/),
      dueDay: z.number().int().min(1).max(31),
      closingDay: z.number().int().min(1).max(31),
      color: z.enum(['blue', 'purple', 'pink', 'red', 'orange', 'black', 'gray']),
      limitAmount: z.number().min(0),
      provider: z.enum(['nubank']).optional().nullable(),
    })
    .optional(),
  availableLimit: z.number().min(0).optional().nullable(),
  items: z.array(itemSchema).min(1).max(500),
})

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = importSchema.parse(body)

    const result = await importCardInvoice(session.userId, {
      cardId: data.cardId,
      card: data.card,
      items: data.items,
      availableLimit: data.availableLimit ?? null,
    })

    return NextResponse.json({ success: true, ...result }, { status: 201 })
  } catch (error: any) {
    const message = error instanceof z.ZodError
      ? error.errors[0]?.message ?? 'Invalid input'
      : error.message ?? 'Something went wrong'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
