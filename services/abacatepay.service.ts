import { AbacatePay } from '@abacatepay/sdk'
import { prisma } from '@/lib/prisma'
import { PLANS, PLAN_NAME, type BillingTier } from '@/lib/plans'

const API_BASE = 'https://api.abacatepay.com/v2'

function apiKey(): string {
  const key = process.env.ABACATEPAY_API_KEY
  if (!key) throw new Error('ABACATEPAY_API_KEY is not set')
  return key
}

export function createAbacateClient() {
  return AbacatePay({ secret: apiKey() })
}

async function abacateRequest<T>(path: string, init?: { method?: 'GET' | 'POST'; body?: unknown; query?: Record<string, string> }): Promise<T> {
  const url = new URL(`${API_BASE}${path}`)
  for (const [k, v] of Object.entries(init?.query ?? {})) url.searchParams.set(k, v)

  const res = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  })

  const json = await res.json().catch(() => null)
  if (!res.ok || json?.success === false || json?.error) {
    const message = json?.error ?? `HTTP ${res.status}`
    throw new Error(`[AbacatePay] ${path} failed: ${typeof message === 'string' ? message : JSON.stringify(message)}`)
  }
  return json?.data as T
}

interface AbacateProduct { id: string; externalId: string; cycle?: string | null }
interface AbacateCheckout { id: string; url: string; status: string; customerId?: string | null; amount?: number }
export interface AbacateSubscription {
  id: string
  checkoutId?: string | null
  customerId?: string | null
  amount: number
  status: string
  frequency?: string | { cycle?: string } | null
  cycle?: string | null
}

/**
 * Returns the AbacatePay product with a recurring cycle for the tier, creating it if needed.
 * The price is part of the externalId, so a price change automatically creates a new product.
 */
async function ensureSubscriptionProduct(tier: BillingTier): Promise<string> {
  const plan = PLANS[tier]
  const externalId = `vynta-sub-${tier}-${plan.priceCents}`

  const products = await abacateRequest<AbacateProduct[]>('/products/list', { query: { limit: '100' } })
  const existing = products?.find((p) => p.externalId === externalId)
  if (existing) return existing.id

  const created = await abacateRequest<AbacateProduct>('/products/create', {
    method: 'POST',
    body: {
      externalId,
      name: `${PLAN_NAME} — ${plan.name}`,
      description: `Acesso completo ao Vynta (${plan.name.toLowerCase()})`,
      price: plan.priceCents,
      currency: 'BRL',
      cycle: plan.cycle,
    },
  })
  return created.id
}

/**
 * Returns a one-time AbacatePay product (no recurring cycle) for stores where only standard PIX
 * checkout (/checkouts/create) is enabled in production.
 */
async function ensureOneTimeProduct(tier: BillingTier): Promise<string> {
  const plan = PLANS[tier]
  const externalId = `vynta-pix-${tier}-${plan.priceCents}`

  const products = await abacateRequest<AbacateProduct[]>('/products/list', { query: { limit: '100' } })
  const existing = products?.find((p) => p.externalId === externalId)
  if (existing) return existing.id

  const created = await abacateRequest<AbacateProduct>('/products/create', {
    method: 'POST',
    body: {
      externalId,
      name: `${PLAN_NAME} — ${plan.name}`,
      description: `Acesso completo ao Vynta (${plan.name.toLowerCase()})`,
      price: plan.priceCents,
      currency: 'BRL',
    },
  })
  return created.id
}

export interface CreateSubscriptionCheckoutInput {
  userId: string
  tier: BillingTier
  appUrl: string
  sessionId?: string | null
}

async function tryCreateCheckoutForUser(
  userId: string,
  tier: BillingTier,
  appUrl: string,
  sessionId: string | null | undefined,
  customerId: string | null,
): Promise<AbacateCheckout> {
  const productId = await ensureSubscriptionProduct(tier)
  const externalId = `${userId}_${Date.now()}_${sessionId || 'none'}`

  const basePayload = {
    items: [{ id: productId, quantity: 1 }],
    ...(customerId ? { customerId } : {}),
    externalId,
    returnUrl: `${appUrl}/subscription`,
    completionUrl: `${appUrl}/payment/return`,
    retryPolicy: { maxRetry: 3, retryEvery: 2 },
    metadata: { userId, tier },
  }

  // 1. Try recurring subscription with both PIX and CARD
  try {
    return await abacateRequest<AbacateCheckout>('/subscriptions/create', {
      method: 'POST',
      body: { ...basePayload, methods: ['PIX', 'CARD'] },
    })
  } catch (err1: any) {
    const msg1 = String(err1?.message || '').toLowerCase()

    // If customerId is from devMode or invalid in production, bubble up so caller retries without customerId
    if (customerId && (msg1.includes('customer') || msg1.includes('not found'))) {
      throw err1
    }

    // 2. If CARD is not available on this store (common on newly approved production accounts), try PIX-only subscription
    if (msg1.includes('card')) {
      try {
        return await abacateRequest<AbacateCheckout>('/subscriptions/create', {
          method: 'POST',
          body: { ...basePayload, methods: ['PIX'] },
        })
      } catch (errPixSub: any) {
        // 3. If PIX Automático is also not enabled on /subscriptions/create, fall back to standard PIX checkout (/checkouts/create)
        const oneTimeProductId = await ensureOneTimeProduct(tier)
        return await abacateRequest<AbacateCheckout>('/checkouts/create', {
          method: 'POST',
          body: {
            items: [{ id: oneTimeProductId, quantity: 1 }],
            ...(customerId ? { customerId } : {}),
            externalId,
            returnUrl: `${appUrl}/subscription`,
            completionUrl: `${appUrl}/payment/return`,
            methods: ['PIX'],
            metadata: { userId, tier },
          },
        })
      }
    }

    // 4. If PIX Automático is not enabled (e.g. devMode where only CARD is enabled on /subscriptions/create), try CARD-only
    if (msg1.includes('pix')) {
      try {
        return await abacateRequest<AbacateCheckout>('/subscriptions/create', {
          method: 'POST',
          body: { ...basePayload, methods: ['CARD'] },
        })
      } catch {
        const oneTimeProductId = await ensureOneTimeProduct(tier)
        return await abacateRequest<AbacateCheckout>('/checkouts/create', {
          method: 'POST',
          body: {
            items: [{ id: oneTimeProductId, quantity: 1 }],
            ...(customerId ? { customerId } : {}),
            externalId,
            returnUrl: `${appUrl}/subscription`,
            completionUrl: `${appUrl}/payment/return`,
            methods: ['PIX'],
            metadata: { userId, tier },
          },
        })
      }
    }

    throw err1
  }
}

/**
 * Creates a hosted recurring checkout (Pix or card), gracefully falling back to available store methods.
 */
export async function createSubscriptionCheckout({ userId, tier, appUrl, sessionId }: CreateSubscriptionCheckoutInput) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { billingCustomerId: true } })
  let customerId = user?.billingCustomerId ?? null

  // Never send a dev-mode customerId when running with a production key (or vice versa)
  const isDevKey = apiKey().startsWith('abc_dev_')
  if (customerId) {
    const isDevCustomer = customerId.startsWith('cust_dev_')
    if (isDevKey !== isDevCustomer) {
      customerId = null
      await prisma.user.update({ where: { id: userId }, data: { billingCustomerId: null } }).catch(() => {})
    }
  }

  let checkout: AbacateCheckout
  try {
    checkout = await tryCreateCheckoutForUser(userId, tier, appUrl, sessionId, customerId)
  } catch (err: any) {
    // If stored customerId was rejected (e.g. from another environment/store), clear it and retry once without customerId
    if (customerId) {
      await prisma.user.update({ where: { id: userId }, data: { billingCustomerId: null } }).catch(() => {})
      checkout = await tryCreateCheckoutForUser(userId, tier, appUrl, sessionId, null)
    } else {
      throw err
    }
  }

  await prisma.paymentTransaction.create({
    data: {
      userId,
      provider: 'abacatepay',
      providerTransactionId: checkout.id,
      amount: PLANS[tier].priceCents / 100,
      status: 'PENDING',
      rawStatus: 'subscription_checkout_created',
    },
  })

  return { id: checkout.id, url: checkout.url }
}

export async function getSubscriptionCheckout(checkoutId: string) {
  try {
    return await abacateRequest<AbacateCheckout>('/subscriptions/checkouts/get', { query: { id: checkoutId } })
  } catch {
    return await abacateRequest<AbacateCheckout>('/checkouts/get', { query: { id: checkoutId } })
  }
}

export async function getSubscription(subscriptionId: string) {
  return abacateRequest<AbacateSubscription>('/subscriptions/get', { query: { id: subscriptionId } })
}

export async function findSubscriptionByCheckout(checkoutId: string): Promise<AbacateSubscription | null> {
  const list = await abacateRequest<AbacateSubscription[]>('/subscriptions/list', { query: { checkoutId } }).catch(() => null)
  return list?.[0] ?? null
}

/** Link to AbacatePay's customer portal (cancel, change card, receipts, refunds). */
export async function createCustomerPortalLink(customerId: string, checkoutId: string): Promise<string> {
  const portal = await abacateRequest<{ url: string }>('/customer-portal/create', {
    method: 'POST',
    body: { customerId, checkoutId },
  })
  return portal.url
}

/** Cancels an active recurring subscription immediately at AbacatePay. */
export async function cancelAbacateSubscription(subscriptionId: string) {
  return abacateRequest<{ id: string; status: string }>('/subscriptions/cancel', {
    method: 'POST',
    body: { id: subscriptionId },
  })
}
