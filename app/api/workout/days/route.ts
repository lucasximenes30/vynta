import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createWorkoutDay, getWorkoutDaysByPlan } from '@/services/workoutDay.service'

const createWorkoutDaySchema = z.object({
  planId: z.string().min(1, 'Plano inválido'),
  name: z.string().trim().min(1, 'Nome do treino é obrigatório').max(80, 'Nome do treino muito longo'),
  weekDay: z.number().int().min(0).max(6).nullable().optional(),
})

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const planId = request.nextUrl.searchParams.get('planId')
  if (!planId) {
    return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
  }

  try {
    const days = await getWorkoutDaysByPlan(session.userId, planId)
    return NextResponse.json({ days })
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
    const data = createWorkoutDaySchema.parse(body)

    const day = await createWorkoutDay(session.userId, {
      planId: data.planId,
      name: data.name,
      weekDay: data.weekDay,
    })

    return NextResponse.json({ day }, { status: 201 })
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
