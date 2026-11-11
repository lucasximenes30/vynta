import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { getHabitsByUser, createHabit } from '@/services/habit.service'

const createHabitSchema = z.object({
  title: z.string().min(1, 'Title is required').max(60),
  description: z.string().max(200).optional(),
  icon: z.string().min(1),
  color: z.string().min(1),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const habits = await getHabitsByUser(session.userId)
  return NextResponse.json({ habits })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = createHabitSchema.parse(body)
    const habit = await createHabit(session.userId, data)
    return NextResponse.json({ habit }, { status: 201 })
  } catch (error: any) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? 'Invalid input'
        : error.message ?? 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
