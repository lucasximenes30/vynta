import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createSubscriptionCheckout } from '@/services/abacatepay.service'
import { normalizeTier } from '@/lib/plans'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      console.log('[Payments/Create] 401 - No session found in cookies')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, billingCustomerId: true },
    })

    if (!user) {
      console.log('[Payments/Create] 404 - User not found:', session.userId)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let rawTier: unknown = 'pro'
    let sessionId: string | null = null

    try {
      const body = await req.json()
      if (body) {
        if (body.planTier) rawTier = body.planTier
        if (body.sessionId) sessionId = body.sessionId
      }
    } catch {
      // Body can be empty, default to 'pro'
    }

    const tier = normalizeTier(rawTier)
    const appUrl = req.nextUrl.origin

    console.log(`[Payments/Create] Creating subscription checkout for ${user.email} (tier: ${tier})...`)

    const checkout = await createSubscriptionCheckout({
      userId: user.id,
      tier,
      appUrl,
      sessionId,
    })

    console.log('[Payments/Create] ✓ Subscription checkout created:', checkout.id)

    return NextResponse.json({
      ok: true,
      provider: 'abacatepay',
      status: 'pending',
      redirectUrl: checkout.url,
      checkoutId: checkout.id,
    }, { status: 200 })
  } catch (err: any) {
    console.error('[Payments/Create] Error creating checkout:', err)
    return NextResponse.json({
      error: 'Não foi possível gerar o checkout de pagamento agora. Tente novamente em instantes.',
      details: process.env.NODE_ENV !== 'production' ? err?.message : undefined,
    }, { status: 500 })
  }
}
