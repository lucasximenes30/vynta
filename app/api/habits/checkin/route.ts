import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { toggleCheckin } from '@/services/habit.service'

const checkinSchema = z.object({
  habitId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  completed: z.boolean(),
})

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = checkinSchema.parse(body)
    const { checkin, currentStreak, bestStreak } = await toggleCheckin(data.habitId, session.userId, data.date, data.completed)
    return NextResponse.json({ checkin, currentStreak, bestStreak })
  } catch (error: any) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? 'Invalid input'
        : error.message ?? 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
