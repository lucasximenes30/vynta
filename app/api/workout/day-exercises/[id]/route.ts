import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { deleteWorkoutDayExercise, updateWorkoutDayExercise } from '@/services/workoutDayExercise.service'

const updateWorkoutDayExerciseSchema = z.object({
  sets: z.number().int().min(1).max(50),
  reps: z.string().trim().min(1, 'Repeticoes sao obrigatorias').max(30),
  targetWeight: z.number().min(0).nullable().optional(),
  notes: z.string().max(400).optional(),
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
    const data = updateWorkoutDayExerciseSchema.parse(body)

    const workoutDayExercise = await updateWorkoutDayExercise(session.userId, id, {
      sets: data.sets,
      reps: data.reps,
      targetWeight: data.targetWeight,
      notes: data.notes,
    })

    return NextResponse.json({ workoutDayExercise })
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    await deleteWorkoutDayExercise(session.userId, id)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Exercicio do treino nao encontrado'
    return NextResponse.json({ error: message }, { status: 404 })
  }
}
