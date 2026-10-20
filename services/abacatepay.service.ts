import { prisma } from '@/lib/prisma'
import { PLANS, PLAN_NAME, type BillingTier } from '@/lib/plans'

const API_BASE = 'https://api.abacatepay.com/v2'

function apiKey(): string {
  const key = process.env.ABACATEPAY_API_KEY
  if (!key) throw new Error('ABACATEPAY_API_KEY is not set')
  return key
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
  frequency?: string | null
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

export interface CreateSubscriptionCheckoutInput {
  userId: string
  tier: BillingTier
  appUrl: string
  sessionId?: string | null
}

/**
 * Creates a hosted recurring checkout (Pix or card). The checkout page collects the
 * customer's personal data, so we never need to ask for CPF inside the app.
 */
export async function createSubscriptionCheckout({ userId, tier, appUrl, sessionId }: CreateSubscriptionCheckoutInput) {
  const [productId, user] = await Promise.all([
    ensureSubscriptionProduct(tier),
    prisma.user.findUnique({ where: { id: userId }, select: { billingCustomerId: true } }),
  ])

  const checkout = await abacateRequest<AbacateCheckout>('/subscriptions/create', {
    method: 'POST',
    body: {
      items: [{ id: productId, quantity: 1 }],
      ...(user?.billingCustomerId ? { customerId: user.billingCustomerId } : {}),
      externalId: `${userId}_${Date.now()}_${sessionId || 'none'}`,
      returnUrl: `${appUrl}/subscription`,
      completionUrl: `${appUrl}/payment/return`,
      methods: ['PIX', 'CARD'],
      retryPolicy: { maxRetry: 3, retryEvery: 2 },
      metadata: { userId, tier },
    },
  })

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
  return abacateRequest<AbacateCheckout>('/subscriptions/checkouts/get', { query: { id: checkoutId } })
}

export async function getSubscription(subscriptionId: string) {
  return abacateRequest<AbacateSubscription>('/subscriptions/get', { query: { id: subscriptionId } })
}

export async function findSubscriptionByCheckout(checkoutId: string): Promise<AbacateSubscription | null> {
  const list = await abacateRequest<AbacateSubscription[]>('/subscriptions/list', { query: { checkoutId } })
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

