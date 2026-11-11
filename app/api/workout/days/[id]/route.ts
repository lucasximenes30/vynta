import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { deleteWorkoutDay, updateWorkoutDay } from '@/services/workoutDay.service'

const updateWorkoutDaySchema = z.object({
  name: z.string().trim().min(1, 'Nome do treino é obrigatório').max(80, 'Nome do treino muito longo'),
  weekDay: z.number().int().min(0).max(6).nullable().optional(),
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
    const data = updateWorkoutDaySchema.parse(body)

    const day = await updateWorkoutDay(session.userId, id, {
      name: data.name,
      weekDay: data.weekDay,
    })

    return NextResponse.json({ day })
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    await deleteWorkoutDay(session.userId, id)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Treino não encontrado'
    return NextResponse.json({ error: message }, { status: 404 })
  }
}
