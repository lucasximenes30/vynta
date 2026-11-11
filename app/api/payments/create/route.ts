import { NextRequest, NextResponse, after } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPromoCheckout, createSubscriptionCheckout } from '@/services/abacatepay.service'
import { getPromoEligibility } from '@/services/subscription.service'
import { normalizeTier, PLANS, PROMO_FIRST_MONTH } from '@/lib/plans'
import { notifyAdminsPendingSale } from '@/services/push.service'
import { enforceRateLimits } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      console.log('[Payments/Create] 401 - No session found in cookies')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await enforceRateLimits([{ key: `checkout:${session.userId}`, limit: 6, windowSec: 600 }])
    if (limited) return limited

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, billingCustomerId: true },
    })

    if (!user) {
      console.log('[Payments/Create] 404 - User not found:', session.userId)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let rawTier: unknown = 'pro'
    let sessionId: string | null = req.cookies.get('vynta_session_id')?.value ?? null

    try {
      const body = await req.json()
      if (body) {
        if (body.planTier) rawTier = body.planTier
        if (body.sessionId) sessionId = body.sessionId
      }
    } catch {
      // Body can be empty, default to 'pro'
    }

    const isPromo = rawTier === 'promo'
    const tier = normalizeTier(rawTier)
    const appUrl = req.nextUrl.origin

    if (isPromo && !(await getPromoEligibility(user.id))) {
      return NextResponse.json({ error: 'Esta oferta não está mais disponível para a sua conta.' }, { status: 400 })
    }

    console.log(`[Payments/Create] Creating ${isPromo ? 'promo' : 'subscription'} checkout for ${user.email} (tier: ${tier})...`)

    const checkout = isPromo
      ? await createPromoCheckout({ userId: user.id, appUrl, sessionId })
      : await createSubscriptionCheckout({ userId: user.id, tier, appUrl, sessionId })

    console.log('[Payments/Create] ✓ Subscription checkout created:', checkout.id)

    after(async () => {
      try {
        await notifyAdminsPendingSale({
          checkoutId: checkout.id,
          name: user.name,
          email: user.email,
          tier,
          amountCents: isPromo ? PROMO_FIRST_MONTH.priceCents : PLANS[tier].priceCents,
        })
      } catch (e) {
        console.error('[Payments/Create] Falha ao enviar push admin:', e)
      }
    })

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
