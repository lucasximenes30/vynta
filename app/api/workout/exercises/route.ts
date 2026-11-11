import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createCustomExercise, listAvailableExercises } from '@/services/exercise.service'

const createCustomExerciseSchema = z.object({
  name: z.string().trim().min(1, 'Nome do exercicio e obrigatorio').max(80, 'Nome muito longo'),
  muscleGroup: z.string().trim().min(1, 'Grupo muscular e obrigatorio'),
  equipment: z.string().trim().max(80, 'Equipamento muito longo').optional(),
})

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const query = request.nextUrl.searchParams.get('query') ?? undefined
    const muscleGroup = request.nextUrl.searchParams.get('muscleGroup') ?? undefined

    const exercises = await listAvailableExercises(session.userId, { query, muscleGroup })

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
    const data = createCustomExerciseSchema.parse(body)

    const exercise = await createCustomExercise(session.userId, {
      name: data.name,
      muscleGroup: data.muscleGroup,
      equipment: data.equipment,
    })

    return NextResponse.json({ exercise }, { status: 201 })
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
