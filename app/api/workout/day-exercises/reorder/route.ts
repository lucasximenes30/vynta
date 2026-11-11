import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { reorderWorkoutDayExercise } from '@/services/workoutDayExercise.service'

const reorderWorkoutDayExerciseSchema = z.object({
  id: z.string().min(1, 'Exercicio invalido'),
  direction: z.enum(['up', 'down']),
})

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = reorderWorkoutDayExerciseSchema.parse(body)

    const exercises = await reorderWorkoutDayExercise(session.userId, data.id, data.direction)
    return NextResponse.json({ exercises })
  } catch (error: unknown) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? 'Dados invalidos'
        : error instanceof Error
          ? error.message
          : 'Something went wrong'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
