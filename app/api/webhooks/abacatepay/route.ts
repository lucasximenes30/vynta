import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { activateRecurringSubscription, cancelRecurringSubscription } from '@/services/subscription.service'
import { findSubscriptionByCheckout } from '@/services/abacatepay.service'
import { FacebookService } from '@/services/facebook.service'
import { notifyAdminsApprovedSale } from '@/services/push.service'
import { tierFromCycle, tierFromAmount, normalizeTier, type BillingTier } from '@/lib/plans'
import { authenticAbacateWebhook } from '@/lib/abacateWebhook'
import { readBoundedText } from '@/lib/boundedBody'

export async function POST(req: Request) {
  let rawBody: string
  try { rawBody = await readBoundedText(req, 256 * 1024) }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 413 }) }
  const secret = process.env.ABACATEPAY_WEBHOOK_SECRET
  // Configuration failures are retryable; invalid delivery credentials never reach payment code.
  if (!secret) return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 })
  if (!authenticAbacateWebhook(req, rawBody, secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const event = JSON.parse(rawBody)
    const eventType = event.event
    const data = event.data || {}
    const subscription = data.subscription
    const checkout = data.checkout || data.billing
    const payment = data.payment
    const customer = data.customer

    // Handle subscription events (completed or renewed)
    if (eventType === 'subscription.completed' || eventType === 'subscription.renewed') {
      const subscriptionId = subscription?.id
      if (!subscriptionId) {
        console.warn('[AbacatePay Webhook] No subscription ID in event')
        return NextResponse.json({ ok: true, message: 'Ignored - missing subscription' })
      }
      const checkoutId = checkout?.id || subscription?.checkoutId || null
      const customerId = customer?.id || subscription?.customerId || null
      // Authenticated delivery identifiers are stable across automatic retries.
      const chargeId = payment?.id || `${subscriptionId}:${event.id}`
      const amountCents = Number(payment?.amount || subscription?.amount || checkout?.amount || 0)

      // Find user
      let userId: string | null = null
      let sessionId: string | null = null

      // Strategy 1: Check checkout metadata or externalId
      if (checkout?.metadata?.userId) {
        userId = String(checkout.metadata.userId)
      } else if (checkout?.externalId) {
        const parts = String(checkout.externalId).split('_')
        if (parts[0] && parts[0] !== 'none') userId = parts[0]
        if (parts[2] && parts[2] !== 'none') sessionId = parts[2]
      }

      // Strategy 2: Pending payment transaction by checkoutId
      if (!userId && checkoutId) {
        const pendingTx = await prisma.paymentTransaction.findUnique({
          where: { providerTransactionId: checkoutId },
          select: { userId: true },
        })
        if (pendingTx) userId = pendingTx.userId
      }

      // Strategy 3: Find user by billingCustomerId
      if (!userId && customerId) {
        const customerUser = await prisma.user.findFirst({
          where: { billingCustomerId: customerId },
          select: { id: true },
        })
        if (customerUser) userId = customerUser.id
      }

      // Strategy 4: Find user by existing subscriptionId (renewals)
      if (!userId) {
        const subUser = await prisma.user.findFirst({
          where: { subscriptionId },
          select: { id: true },
        })
        if (subUser) userId = subUser.id
      }

      // Strategy 5: By email
      if (!userId && customer?.email) {
        const emailUser = await prisma.user.findUnique({
          where: { email: String(customer.email).toLowerCase() },
          select: { id: true },
        })
        if (emailUser) userId = emailUser.id
      }

      if (!userId) {
        console.error(`[AbacatePay Webhook] Could not associate user for subscription ${subscriptionId}`)
        return NextResponse.json({ ok: true, message: 'User not found for subscription' })
      }

      // Determine tier
      let tier: BillingTier = 'pro'
      const rawCycle = typeof subscription?.frequency === 'string'
        ? subscription.frequency
        : subscription?.frequency?.cycle ?? subscription?.cycle
      if (checkout?.metadata?.tier) {
        tier = normalizeTier(checkout.metadata.tier)
      } else if (rawCycle) {
        tier = tierFromCycle(rawCycle) || 'pro'
      } else {
        tier = tierFromAmount(amountCents)
      }

      const activatedUser = await activateRecurringSubscription({
        userId,
        tier,
        subscriptionId,
        customerId,
        chargeId,
        checkoutId,
        amountCents,
      })

      // Send Funnel event and CAPI on initial purchase completion (only for real production payments, never devMode test sales)
      const isDevEvent = Boolean(event.devMode || subscription?.devMode || checkout?.devMode || process.env.ABACATEPAY_API_KEY?.startsWith('abc_dev_'))
      if (activatedUser && eventType === 'subscription.completed') {
        const effectiveSessionId = sessionId && sessionId !== 'none' ? sessionId : userId
        if (effectiveSessionId && !isDevEvent) {
          const recentDuplicate = await prisma.funnelEvent.findFirst({
            where: {
              userId,
              eventName: 'purchase',
              createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
            },
            select: { id: true },
          }).catch(() => null)
          if (!recentDuplicate) {
            await prisma.funnelEvent.create({
              data: {
                sessionId: effectiveSessionId,
                userId,
                eventName: 'purchase',
                metadata: {
                  subscriptionId,
                  chargeId,
                  amount: amountCents / 100,
                  tier,
                },
              },
            }).catch((err) => console.error('[AbacatePay Webhook] Funnel event error:', err))
          }
        }

        if (!isDevEvent) {
          try {
            const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? undefined
            const userAgent = req.headers.get('user-agent') ?? undefined

            await FacebookService.sendEvent('Purchase', {
              email: activatedUser.email,
              externalId: userId,
              value: amountCents / 100,
              currency: 'BRL',
              eventId: `purchase_${chargeId}`,
              clientIpAddress: ip,
              clientUserAgent: userAgent,
            }, 'https://www.vynta.digital/payment/return')
          } catch (e) {
            console.error('[AbacatePay Webhook] Meta CAPI Purchase error:', e)
          }
        } else {
          console.log(`[AbacatePay Webhook] Skipping Meta CAPI Purchase event (devMode test transaction: ${chargeId})`)
        }
      }

      return NextResponse.json({ ok: true, message: 'Subscription processed' }, { status: 200 })
    }

    // Handle subscription cancellation
    if (eventType === 'subscription.cancelled') {
      const subscriptionId = subscription?.id
      if (subscriptionId) {
        await cancelRecurringSubscription(subscriptionId, subscription?.cancelledDueTo === 'max_payment_retries_exceeded')
        console.log(`[AbacatePay Webhook] Subscription cancelled for ${subscriptionId} (${subscription?.cancelledDueTo ?? 'requested'})`)
      }
      return NextResponse.json({ ok: true, message: 'Cancellation processed' }, { status: 200 })
    }

    // Fallback: Handle standalone checkout.completed / billing.paid (e.g. standard PIX checkout)
    if (eventType === 'checkout.completed' || eventType === 'billing.paid') {
      const checkoutId = checkout?.id
      const amountCents = Number(checkout?.amount || payment?.amount || 0)
      const rawExternalId = checkout?.externalId || ''
      const parts = String(rawExternalId).split('_')
      let userId: string | null = (checkout?.metadata?.userId ? String(checkout.metadata.userId) : null) || (parts[0] && parts[0] !== 'none' ? parts[0] : null)
      const sessionId = parts[2] && parts[2] !== 'none' ? parts[2] : null

      if (!userId && checkoutId) {
        const pendingTx = await prisma.paymentTransaction.findUnique({
          where: { providerTransactionId: checkoutId },
          select: { userId: true },
        })
        if (pendingTx) userId = pendingTx.userId
      }

      if (checkoutId && userId) {
        const sub = await findSubscriptionByCheckout(checkoutId).catch(() => null)
        const tier = normalizeTier(checkout?.metadata?.tier || tierFromAmount(amountCents))

        const activatedUser = await activateRecurringSubscription({
          userId,
          tier,
          subscriptionId: sub?.id || `sub_checkout_${checkoutId}`,
          customerId: sub?.customerId || checkout?.customerId || null,
          chargeId: checkoutId,
          checkoutId,
          amountCents,
        })

        const isDevCheckout = Boolean(event.devMode || checkout?.devMode || process.env.ABACATEPAY_API_KEY?.startsWith('abc_dev_'))
        const effectiveSessionId = sessionId && sessionId !== 'none' ? sessionId : userId
        if (activatedUser && effectiveSessionId && !isDevCheckout) {
          const recentDuplicate = await prisma.funnelEvent.findFirst({
            where: {
              userId,
              eventName: 'purchase',
              createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
            },
            select: { id: true },
          }).catch(() => null)
          if (!recentDuplicate) {
            await prisma.funnelEvent.create({
              data: {
                sessionId: effectiveSessionId,
                userId,
                eventName: 'purchase',
                metadata: { checkoutId, amount: amountCents / 100, tier },
              },
            }).catch(() => {})
          }

          try {
            const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? undefined
            const userAgent = req.headers.get('user-agent') ?? undefined

            await FacebookService.sendEvent('Purchase', {
              email: activatedUser.email,
              externalId: userId,
              value: amountCents / 100,
              currency: 'BRL',
              eventId: `purchase_${checkoutId}`,
              clientIpAddress: ip,
              clientUserAgent: userAgent,
            }, 'https://www.vynta.digital/payment/return')
          } catch (e) {
            console.error('[AbacatePay Webhook] Meta CAPI Purchase error:', e)
          }
        }
      }

      return NextResponse.json({ ok: true, message: 'Checkout processed' }, { status: 200 })
    }

    return NextResponse.json({ ok: true, message: `Event ${eventType} acknowledged` }, { status: 200 })
  } catch (err: any) {
    console.error('[AbacatePay Webhook] Error processing webhook:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
