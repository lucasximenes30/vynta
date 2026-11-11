import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { updateUserAdmin, deleteUserAdmin } from '@/services/admin/user.admin.service'
import { z } from 'zod'

const updateUserSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional().nullable(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, email, phone } = updateUserSchema.parse(body)

    const user = await updateUserAdmin(id, { name, email, phone })

    return NextResponse.json({ success: true, user })
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (session.userId === id) {
      return NextResponse.json({ error: 'Não é possível excluir seu próprio usuário.' }, { status: 400 })
    }

    await deleteUserAdmin(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? 'Something went wrong' }, { status: 400 })
  }
}
