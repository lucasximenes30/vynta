import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { SALT_ROUNDS } from '@/lib/constants'
import { verifyPasswordResetToken } from '@/services/email.service'

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres.'),
})

const passwordOf = async (id: string) =>
  (await prisma.user.findUnique({ where: { id }, select: { password: true } }))?.password ?? null

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Dados inválidos.' }, { status: 400 })
  }

  const userId = await verifyPasswordResetToken(parsed.data.token, passwordOf)
  if (!userId) {
    return NextResponse.json({ error: 'Este link expirou ou já foi usado. Peça um novo.' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: userId },
    data: { password: await hash(parsed.data.password, SALT_ROUNDS), forcePasswordChange: false },
  })

  return NextResponse.json({ ok: true })
}
