import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { passwordResetEmail } from '@/lib/emailTemplates'
import { APP_URL, createPasswordResetToken, sendTrackedEmail } from '@/services/email.service'

const schema = z.object({ email: z.string().email() })
const THROTTLE_MS = 2 * 60 * 1000

// Always answers the same way, so the endpoint can't be used to discover which e-mails have accounts.
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Digite um e-mail válido.' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.trim().toLowerCase() },
    select: { id: true, name: true, email: true, password: true },
  })

  if (user) {
    // One reset e-mail per account every 2 minutes (the dedup key doubles as rate limit).
    const token = await createPasswordResetToken(user.id, user.password)
    await sendTrackedEmail({
      user,
      key: `pwd-reset:${Math.floor(Date.now() / THROTTLE_MS)}`,
      tag: 'password-reset',
      build: () => passwordResetEmail(user.name, `${APP_URL}/redefinir-senha?token=${encodeURIComponent(token)}`),
    })
  }

  return NextResponse.json({ ok: true })
}
