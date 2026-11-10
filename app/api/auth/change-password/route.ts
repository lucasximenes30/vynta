import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash, compare } from 'bcryptjs'
import { SALT_ROUNDS } from '@/lib/constants'
import { enforceRateLimits } from '@/lib/rateLimit'

const schema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória').max(128),
  newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres').max(128, 'Senha muito longa'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // A stolen session must not be able to brute-force the current password.
    const limited = await enforceRateLimits([{ key: `chpwd:user:${session.userId}`, limit: 5, windowSec: 15 * 60 }])
    if (limited) return limited

    const body = await request.json()
    const { currentPassword, newPassword } = schema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { password: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const validPassword = await compare(currentPassword, user.password)
    if (!validPassword) {
      return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
    }

    if (await compare(newPassword, user.password)) {
      return NextResponse.json({ error: 'A nova senha deve ser diferente' }, { status: 400 })
    }

    const hashedPassword = await hash(newPassword, SALT_ROUNDS)

    await prisma.user.update({
      where: { id: session.userId },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    const message = error instanceof z.ZodError
      ? error.errors[0]?.message ?? 'Dados inválidos'
      : error.message ?? 'Algo deu errado'

    return NextResponse.json(
      { error: message },
      { status: 400 }
    )
  }
}
