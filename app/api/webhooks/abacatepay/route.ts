import { NextResponse } from 'next/server'
import { UserSubscriptionStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { activateRecurringSubscription } from '@/services/subscription.service'
import { findSubscriptionByCheckout } from '@/services/abacatepay.service'
import { FacebookService } from '@/services/facebook.service'
import { tierFromCycle, tierFromAmount, normalizeTier, type BillingTier } from '@/lib/plans'
import crypto from 'crypto'

// Public key provided in AbacatePay docs for HMAC signature verification
const ABACATEPAY_PUBLIC_KEY =
  't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9'

function verifySignature(rawBody: string, signature: string, secret?: string): boolean {
  if (!signature) return false
  const bodyBuffer = Buffer.from(rawBody, 'utf8')

  // Check 1: HMAC with ABACATEPAY_PUBLIC_KEY (Base64 or Hex)
  try {
    const expectedB64 = crypto.createHmac('sha256', ABACATEPAY_PUBLIC_KEY).update(bodyBuffer).digest('base64')
    if (signature.length === expectedB64.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedB64))) {
      return true
    }
  } catch {}

  // Check 2: HMAC with configured secret if present
  if (secret) {
    try {
      const expHex = crypto.createHmac('sha256', secret).update(bodyBuffer).digest('hex')
      const expB64 = crypto.createHmac('sha256', secret).update(bodyBuffer).digest('base64')

      if (signature.length === expHex.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expHex))) {
        return true
      }
      if (signature.length === expB64.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expB64))) {
        return true
      }
    } catch {}
  }

  return false
}

export async function POST(req: Request) {
  const signature = req.headers.get('x-webhook-signature')?.trim() || req.headers.get('x-abacatepay-signature')?.trim() || ''
  const rawBody = await req.text()
  const secret = process.env.ABACATEPAY_WEBHOOK_SECRET

  const url = new URL(req.url)
  const querySecret = url.searchParams.get('webhookSecret')
  const isQuerySecretMatch = !!(querySecret && secret && querySecret === secret)

  const isSignatureValid = verifySignature(rawBody, signature, secret)

  if (!isSignatureValid && !isQuerySecretMatch) {
    if (process.env.NODE_ENV !== 'production' || !secret) {
      console.warn('[AbacatePay Webhook] Signature not verified, but proceeding (dev or unconfigured secret).')
    } else {
      console.error('[AbacatePay Webhook] Unauthorized - signature mismatch and no valid secret query.')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const event = JSON.parse(rawBody)
    const eventType = event.event
    console.log(`[AbacatePay Webhook] Event received: ${eventType} (id: ${event.id})`)

    const data = event.data || {}
    const subscription = data.subscription
    const checkout = data.checkout
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
      const chargeId = payment?.id || checkoutId || subscriptionId
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
      if (checkout?.metadata?.tier) {
        tier = normalizeTier(checkout.metadata.tier)
      } else if (subscription?.frequency) {
        tier = tierFromCycle(subscription.frequency) || 'pro'
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

      // Send Funnel event and CAPI on initial purchase completion
      if (activatedUser && eventType === 'subscription.completed') {
        if (sessionId && sessionId !== 'none') {
          await prisma.funnelEvent.create({
            data: {
              sessionId,
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

        try {
          const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? undefined
          const userAgent = req.headers.get('user-agent') ?? undefined

          await FacebookService.sendEvent('Purchase', {
            email: activatedUser.email,
            value: amountCents / 100,
            currency: 'BRL',
            clientIpAddress: ip,
            clientUserAgent: userAgent,
          }, req.url)
        } catch (e) {
          console.error('[AbacatePay Webhook] Meta CAPI Purchase error:', e)
        }
      }

      return NextResponse.json({ ok: true, message: 'Subscription processed' }, { status: 200 })
    }

    // Handle subscription cancellation
    if (eventType === 'subscription.cancelled') {
      const subscriptionId = subscription?.id
      const customerId = customer?.id

      if (subscriptionId) {
        await prisma.user.updateMany({
          where: {
            OR: [
              { subscriptionId },
              ...(customerId ? [{ billingCustomerId: customerId }] : []),
            ],
          },
          data: {
            subscriptionStatus: UserSubscriptionStatus.CANCELED,
          },
        })
        console.log(`[AbacatePay Webhook] Subscription cancelled for ${subscriptionId}`)
      }
      return NextResponse.json({ ok: true, message: 'Cancellation processed' }, { status: 200 })
    }

    // Fallback: Handle standalone checkout.completed
    if (eventType === 'checkout.completed') {
      const checkoutId = checkout?.id
      const amountCents = Number(checkout?.amount || 0)
      const rawExternalId = checkout?.externalId || ''
      const parts = rawExternalId.split('_')
      const userId = parts[0] && parts[0] !== 'none' ? parts[0] : null
      const sessionId = parts[2] && parts[2] !== 'none' ? parts[2] : null

      if (checkoutId && userId) {
        // Check if there is an active recurring subscription associated with this checkout
        const sub = await findSubscriptionByCheckout(checkoutId).catch(() => null)
        const tier = normalizeTier(checkout?.metadata?.tier || tierFromAmount(amountCents))

        if (sub) {
          await activateRecurringSubscription({
            userId,
            tier,
            subscriptionId: sub.id,
            customerId: sub.customerId || checkout?.customerId,
            chargeId: checkoutId,
            checkoutId,
            amountCents,
          })
        } else {
          // If subscription object is not yet created, update paymentTransaction record to ACTIVE
          await prisma.paymentTransaction.upsert({
            where: { providerTransactionId: checkoutId },
            update: { status: 'ACTIVE', rawStatus: 'checkout.completed', paidAt: new Date() },
            create: {
              userId,
              provider: 'abacatepay',
              providerTransactionId: checkoutId,
              amount: amountCents / 100,
              status: 'ACTIVE',
              rawStatus: 'checkout.completed',
              paidAt: new Date(),
            },
          })
        }

        if (sessionId) {
          await prisma.funnelEvent.create({
            data: {
              sessionId,
              userId,
              eventName: 'purchase',
              metadata: { checkoutId, amount: amountCents / 100, tier },
            },
          }).catch(() => {})
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
