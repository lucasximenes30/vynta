import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { addExerciseToWorkoutDay, getWorkoutDayExercises } from '@/services/workoutDayExercise.service'

const addWorkoutDayExerciseSchema = z.object({
  workoutDayId: z.string().min(1, 'Treino invalido'),
  exerciseId: z.string().min(1, 'Exercicio invalido'),

  sets: z.number().int().min(1).max(50),
  reps: z.string().trim().min(1, 'Repeticoes sao obrigatorias').max(30),
  targetWeight: z.number().min(0).nullable().optional(),
  notes: z.string().max(400).optional(),
})

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workoutDayId = request.nextUrl.searchParams.get('workoutDayId')

  if (!workoutDayId) {
    return NextResponse.json({ error: 'Treino invalido' }, { status: 400 })
  }

  try {
    const exercises = await getWorkoutDayExercises(session.userId, workoutDayId)
    return NextResponse.json({ exercises })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = addWorkoutDayExerciseSchema.parse(body)

    const workoutDayExercise = await addExerciseToWorkoutDay(session.userId, {
      workoutDayId: data.workoutDayId,
      exerciseId: data.exerciseId,
      sets: data.sets,
      reps: data.reps,
      targetWeight: data.targetWeight,
      notes: data.notes,
    })

    return NextResponse.json({ workoutDayExercise }, { status: 201 })
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
