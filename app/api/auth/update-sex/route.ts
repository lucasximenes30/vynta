import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  sex: z.enum(['MALE', 'FEMALE', 'PREFER_NOT_SAY']).nullable(),
})

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { sex } = schema.parse(body)

    await prisma.user.update({
      where: { id: session.userId },
      data: { sex },
    })

    return NextResponse.json({ success: true, sex })
  } catch (error: any) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? 'Dados inválidos'
      : error.message ?? 'Algo deu errado'

    return NextResponse.json(
      { error: message },
      { status: 400 }
    )
  }
}
