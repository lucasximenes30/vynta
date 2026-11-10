import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, setSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { SALT_ROUNDS } from '@/lib/constants'
import { z } from 'zod'
import { sessionPayloadFromUser } from '@/services/user.service'

const forcePasswordChangeSchema = z.object({
  newPassword: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres').max(128, 'Senha muito longa'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()

    const body = await request.json()
    const { newPassword } = forcePasswordChangeSchema.parse(body)

    // This endpoint skips the current-password check, so it only works while the account is
    // actually flagged (temporary password set by an admin). Otherwise use /api/auth/change-password.
    const current = await prisma.user.findUnique({ where: { id: session.userId }, select: { forcePasswordChange: true } })
    if (!current?.forcePasswordChange) {
      return NextResponse.json({ error: 'Troca de senha não solicitada para esta conta.' }, { status: 403 })
    }

    const hashedPassword = await hash(newPassword, SALT_ROUNDS)

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        password: hashedPassword,
        forcePasswordChange: false,
      },
    })

    // Update the session to reflect forcePasswordChange is now false
    await setSession(sessionPayloadFromUser(updatedUser))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    const message = error instanceof z.ZodError
      ? error.errors[0]?.message ?? 'Invalid input'
      : error.message ?? 'Something went wrong'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
