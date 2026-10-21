import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createCustomerPortalLink } from '@/services/abacatepay.service'
import { getSubscriptionCheckoutId } from '@/services/subscription.service'

/** POST /api/subscription/portal → AbacatePay customer portal (cancel, change card, receipts). */
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [user, checkoutId] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { billingCustomerId: true } }),
    getSubscriptionCheckoutId(session.userId),
  ])
  if (!user?.billingCustomerId || !checkoutId) {
    return NextResponse.json({ error: 'Nenhuma assinatura encontrada.' }, { status: 404 })
  }

  try {
    const url = await createCustomerPortalLink(user.billingCustomerId, checkoutId)
    return NextResponse.json({ url })
  } catch (err: any) {
    console.error('[Subscription/Portal] Error:', err?.message)
    return NextResponse.json({ error: 'Não foi possível abrir o portal agora. Tente novamente.' }, { status: 502 })
  }
}
