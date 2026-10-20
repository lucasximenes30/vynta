import { NextResponse } from 'next/server'
import { getSession, setSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { activateRecurringSubscription } from '@/services/subscription.service'
import { getSubscriptionCheckout, findSubscriptionByCheckout } from '@/services/abacatepay.service'
import { sessionPayloadFromUser } from '@/services/user.service'
import { userHasAccess } from '@/lib/access'
import { tierFromAmount, normalizeTier } from '@/lib/plans'

/**
 * GET /api/subscription/status
 * Check current subscription status for the logged-in user.
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [user, latestTx] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          email: true,
          subscriptionStatus: true,
          role: true,
          plan: true,
          billingApprovedAt: true,
          subscriptionEndDate: true,
          subscriptionExpiresAt: true,
          subscriptionId: true,
        },
      }),
      prisma.paymentTransaction.findFirst({
        where: { userId: session.userId },
        orderBy: { createdAt: 'desc' },
        select: { providerTransactionId: true, status: true },
      }),
    ])

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const canAccess = userHasAccess(user)
    const isExpired = !canAccess && user.subscriptionStatus === 'ACTIVE'

    return NextResponse.json({
      ok: true,
      status: user.subscriptionStatus,
      role: user.role,
      plan: user.plan,
      canAccess,
      isExpired,
      billingApprovedAt: user.billingApprovedAt,
      subscriptionEndDate: user.subscriptionEndDate,
      pendingTransactionId: latestTx?.providerTransactionId || null,
    })
  } catch (err: any) {
    console.error('[Subscription/Status] Error:', err.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * POST /api/subscription/status
 * Check status of pending payment with AbacatePay.
 * If approved or activated, updates the session and returns approved.
 */
export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If user is already active and not expired, sync session if needed
    if (userHasAccess(user)) {
      if (session.subscriptionStatus !== user.subscriptionStatus || session.plan !== user.plan) {
        await setSession(sessionPayloadFromUser(user))
      }
      return NextResponse.json({ ok: true, status: 'approved', canAccess: true })
    }

    // Check latest transaction in DB
    const tx = await prisma.paymentTransaction.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    if (!tx || !tx.providerTransactionId) {
      return NextResponse.json({
        ok: false,
        error: 'Nenhuma transação pendente encontrada',
        status: 'no_pending_transaction',
        canAccess: false,
      })
    }

    const checkoutId = tx.providerTransactionId
    const amountCents = Math.round(Number(tx.amount || 0) * 100)

    // If the database transaction was already promoted to ACTIVE by the webhook
    if (tx.status === 'ACTIVE') {
      const refreshedUser = await prisma.user.findUnique({ where: { id: user.id } })
      if (refreshedUser) {
        await setSession(sessionPayloadFromUser(refreshedUser))
      }
      return NextResponse.json({
        ok: true,
        status: 'approved',
        message: 'Pagamento confirmado! Seu acesso foi liberado.',
        canAccess: true,
      })
    }

    // Otherwise, actively check with AbacatePay API
    try {
      // 1. Try to find the active subscription by checkout
      const sub = await findSubscriptionByCheckout(checkoutId).catch(() => null)
      if (sub && sub.status === 'ACTIVE') {
        const tier = normalizeTier(tierFromAmount(sub.amount || amountCents))
        const activated = await activateRecurringSubscription({
          userId: user.id,
          tier,
          subscriptionId: sub.id,
          customerId: sub.customerId,
          chargeId: checkoutId,
          checkoutId,
          amountCents: sub.amount || amountCents,
        })

        const finalUser = activated || (await prisma.user.findUnique({ where: { id: user.id } }))
        if (finalUser) {
          await setSession(sessionPayloadFromUser(finalUser))
        }

        return NextResponse.json({
          ok: true,
          status: 'approved',
          message: 'Assinatura confirmada! Acesso liberado.',
          canAccess: true,
        })
      }

      // 2. Check the checkout itself
      const checkout = await getSubscriptionCheckout(checkoutId).catch(() => null)
      if (checkout && (checkout.status === 'PAID' || checkout.status === 'ACTIVE')) {
        const tier = normalizeTier(tierFromAmount(checkout.amount || amountCents))
        const activated = await activateRecurringSubscription({
          userId: user.id,
          tier,
          subscriptionId: `sub_pending_${checkout.id}`,
          customerId: checkout.customerId,
          chargeId: checkout.id,
          checkoutId: checkout.id,
          amountCents: checkout.amount || amountCents,
        })

        const finalUser = activated || (await prisma.user.findUnique({ where: { id: user.id } }))
        if (finalUser) {
          await setSession(sessionPayloadFromUser(finalUser))
        }

        return NextResponse.json({
          ok: true,
          status: 'approved',
          message: 'Pagamento confirmado! Acesso liberado.',
          canAccess: true,
        })
      }

      if (checkout && (checkout.status === 'PENDING' || tx.status === 'PENDING')) {
        return NextResponse.json({
          ok: true,
          status: 'pending',
          message: 'Pagamento ainda não confirmado. Aguarde alguns instantes.',
          canAccess: false,
        })
      }
    } catch (checkErr: any) {
      console.warn('[Subscription/Check] AbacatePay direct status check failed:', checkErr.message)
    }

    return NextResponse.json({
      ok: true,
      status: 'pending',
      message: 'Aguardando confirmação do pagamento.',
      canAccess: false,
    })
  } catch (err: any) {
    console.error('[Subscription/Check] Error:', err.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
