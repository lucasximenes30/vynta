import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createUserAdmin } from '@/services/admin/user.admin.service'
import { z } from 'zod'

const createUserSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, phone } = createUserSchema.parse(body)

    const result = await createUserAdmin({ name, email, phone })

    return NextResponse.json({ success: true, user: result.user, tempPassword: result.rawPassword })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Este e-mail já está em uso.' }, { status: 400 })
    }
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? 'Invalid input'
      : error.message ?? 'Something went wrong'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
