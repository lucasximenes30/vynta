import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { archiveHabit, updateHabit } from '@/services/habit.service'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    await archiveHabit(id, session.userId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? 'Not found' }, { status: 404 })
  }
}

const updateHabitSchema = z.object({
  title: z.string().min(1, 'Title is required').max(60),
  description: z.string().max(200).optional(),
  icon: z.string().min(1),
  color: z.string().min(1),
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
    const data = updateHabitSchema.parse(body)
    const habit = await updateHabit(id, session.userId, data)
    return NextResponse.json({ habit })
  } catch (error: any) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? 'Invalid input'
        : error.message ?? 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
