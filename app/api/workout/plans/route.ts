import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createWorkoutPlan, getActiveWorkoutPlanByUser } from '@/services/workoutPlan.service'

const createWorkoutPlanSchema = z.object({
  name: z.string().trim().min(1, 'Nome do plano é obrigatório').max(80, 'Nome muito longo'),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan = await getActiveWorkoutPlanByUser(session.userId)
  return NextResponse.json({ plan })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = createWorkoutPlanSchema.parse(body)

    const plan = await createWorkoutPlan(session.userId, data.name)
    return NextResponse.json({ plan }, { status: 201 })
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
