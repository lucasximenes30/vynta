import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import {
  getWorkoutDayAssignmentByDate,
  upsertWorkoutDayAssignment,
} from '@/services/workoutDayAssignment.service'

const dayAssignmentSchema = z.object({
  planId: z.string().min(1, 'Plano invalido'),
  workoutDayId: z.string().min(1, 'Treino invalido'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data invalida'),
})

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const planId = request.nextUrl.searchParams.get('planId')
  const date = request.nextUrl.searchParams.get('date')

  if (!planId || !date) {
    return NextResponse.json({ error: 'Plano e data sao obrigatorios' }, { status: 400 })
  }

  try {
    const assignment = await getWorkoutDayAssignmentByDate(session.userId, { planId, date })
    return NextResponse.json({ assignment })
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
    const data = dayAssignmentSchema.parse(body)

    const assignment = await upsertWorkoutDayAssignment(session.userId, {
      planId: data.planId,
      workoutDayId: data.workoutDayId,
      date: data.date,
    })

    return NextResponse.json({ assignment }, { status: 201 })
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
