import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { reorderWorkoutDay } from '@/services/workoutDay.service'

const reorderWorkoutDaySchema = z.object({
  dayId: z.string().min(1, 'Treino inválido'),
  direction: z.enum(['up', 'down']),
})

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = reorderWorkoutDaySchema.parse(body)

    const days = await reorderWorkoutDay(session.userId, data.dayId, data.direction)
    return NextResponse.json({ days })
  } catch (error: unknown) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? 'Dados inválidos'
        : error instanceof Error
          ? error.message
          : 'Something went wrong'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
