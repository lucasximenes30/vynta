import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { updateWorkoutLog } from '@/services/workoutLog.service'

const updateWorkoutLogSchema = z.object({
  completed: z.boolean().optional(),
  notes: z.string().max(1000).nullable().optional(),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().min(1, 'Exercicio invalido'),
        done: z.boolean().optional(),
      })
    )
    .max(300, 'Muitos exercicios informados')
    .optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const body = await request.json()
    const data = updateWorkoutLogSchema.parse(body)

    const workoutLog = await updateWorkoutLog(session.userId, id, {
      completed: data.completed,
      notes: data.notes,
      exercises: data.exercises,
    })

    return NextResponse.json({ workoutLog })
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
