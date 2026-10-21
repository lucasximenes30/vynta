import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        sex: true,
        plan: true,
        subscriptionStatus: true,
        subscriptionEndDate: true,
        subscriptionExpiresAt: true,
        billingCustomerId: true,
        role: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      user,
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar usuário' }, { status: 500 })
  }
}
