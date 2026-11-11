import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { completeWorkoutSession } from '@/services/workoutSession.service'

const completeWorkoutSessionSchema = z.object({
  planId: z.string().min(1, 'Plano invalido'),
  workoutDayId: z.string().min(1, 'Treino invalido'),
  date: z.string().datetime().optional(),
  dayNotes: z.string().max(1000).optional(),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().min(1, 'Exercicio invalido'),
        setsDone: z.number().int().min(1).max(50).nullable().optional(),
        repsDone: z.string().trim().max(30).nullable().optional(),
        weightUsed: z.number().min(0).nullable().optional(),
        completed: z.boolean().optional(),
        notes: z.string().max(600).optional(),
        sets: z
          .array(
            z.object({
              setNumber: z.number().int().min(1),
              plannedReps: z.string().trim().max(30).nullable().optional(),
              actualReps: z.number().int().min(0).max(1000).nullable().optional(),
              weight: z.number().min(0).nullable().optional(),
              completed: z.boolean().optional(),
            })
          )
          .max(50, 'Muitas séries')
          .optional(),
      })
    )
    .min(1, 'Informe os exercicios realizados')
    .max(200, 'Muitos exercicios informados'),
})

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = completeWorkoutSessionSchema.parse(body)

    const workoutSession = await completeWorkoutSession(session.userId, {
      planId: data.planId,
      workoutDayId: data.workoutDayId,
      date: data.date,
      dayNotes: data.dayNotes,
      exercises: data.exercises,
    })

    return NextResponse.json({ workoutSession }, { status: 201 })
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
