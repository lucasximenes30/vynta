import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { getCardsByUser, createCard } from '@/services/card.service'

const createCardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(40),
  lastFourDigits: z.string().length(4, 'Must be exactly 4 digits').regex(/^\d{4}$/, 'Must be numeric digits'),
  dueDay: z.number().int().min(1).max(31),
  closingDay: z.number().int().min(1).max(31),
  color: z.enum(['blue', 'purple', 'pink', 'red', 'orange', 'black', 'gray']),
  limitAmount: z.number().min(0, 'Limit must be positive'),
  provider: z.enum(['nubank']).optional().nullable(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cards = await getCardsByUser(session.userId)
  return NextResponse.json({ cards })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = createCardSchema.parse(body)
    const card = await createCard(session.userId, data)
    return NextResponse.json({ success: true, card }, { status: 201 })
  } catch (error: any) {
    const message = error instanceof z.ZodError
      ? error.errors[0]?.message ?? 'Invalid input'
      : error.message ?? 'Something went wrong'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
