import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildFunnelPayload } from '@/services/admin/funnel.admin.service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const range = req.nextUrl.searchParams.get('range') || 'all'
  const payload = await buildFunnelPayload(range)
  return NextResponse.json(payload)
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const target = body?.target || 'funnel' // 'funnel' | 'test_payments' | 'all_payments' | 'logs' | 'everything'

  const results: Record<string, number> = {}

  if (target === 'funnel' || target === 'everything') {
    const deleted = await prisma.funnelEvent.deleteMany({})
    results.funnelEventsDeleted = deleted.count
    await prisma.adminActionLog.create({
      data: {
        adminId: session.userId,
        action: 'FUNNEL_RESET',
        description: `Zerou os dados do funil (${deleted.count} eventos removidos).`,
      },
    })
  }

  if (target === 'test_payments' || target === 'everything') {
    const deleted = await prisma.paymentTransaction.deleteMany({
      where: {
        status: { in: ['PENDING', 'FAILED', 'EXPIRED', 'CANCELED'] },
      },
    })
    results.paymentsDeleted = deleted.count
    await prisma.adminActionLog.create({
      data: {
        adminId: session.userId,
        action: 'PAYMENT_STATUS_UPDATED',
        description: `Limpou ${deleted.count} transação(ões) pendentes/expiradas/falhas.`,
      },
    })
  }

  if (target === 'all_payments') {
    const deleted = await prisma.paymentTransaction.deleteMany({})
    results.paymentsDeleted = deleted.count
    await prisma.adminActionLog.create({
      data: {
        adminId: session.userId,
        action: 'PAYMENT_STATUS_UPDATED',
        description: `Zerou todo o histórico de transações de pagamento (${deleted.count} removidas).`,
      },
    })
  }

  if (target === 'logs' || target === 'everything') {
    const deleted = await prisma.adminActionLog.deleteMany({
      where: target === 'everything' ? { action: { not: 'FUNNEL_RESET' } } : {},
    })
    results.logsDeleted = deleted.count
  }

  const payload = await buildFunnelPayload('all')
  return NextResponse.json({ ok: true, results, ...payload })
}
