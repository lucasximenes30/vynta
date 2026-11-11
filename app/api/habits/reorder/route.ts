import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { reorderHabits } from '@/services/habit.service'

const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
})

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { ids } = reorderSchema.parse(body)
    await reorderHabits(session.userId, ids)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? 'Invalid input'
        : error.message ?? 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
