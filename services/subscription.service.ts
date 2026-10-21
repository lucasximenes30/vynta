import { UserSubscriptionStatus, UserPlan } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PLANS, type BillingTier } from '@/lib/plans'

interface ActivateVipInput {
  userId: string
  transactionId?: string
  planTier?: 'VIP' | 'PRO' | 'PRO_YEARLY'
  usedUpgradeOffer?: boolean
}

/**
 * Shared helper to activate a user's subscription.
 * Sets the user to ACTIVE, assigns the plan, and sets the subscription window to 30 days from now.
 */
export async function activateVipAccess({ userId, transactionId, planTier = 'PRO', usedUpgradeOffer }: ActivateVipInput) {
  const now = new Date()
  const daysToAdd = planTier === 'PRO_YEARLY' ? 365 : 30
  const endDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000)

  const isProTier = planTier === 'PRO' || planTier === 'PRO_YEARLY'

  const updateData: any = {
    subscriptionStatus: UserSubscriptionStatus.ACTIVE,
    plan: planTier,
    billingProvider: 'abacatepay',
    billingApprovedAt: now,
    subscriptionStartDate: now,
    subscriptionEndDate: endDate,
    canUseFinance: true,
    canUseHabits: true,
    canUseWorkout: true,
    canUseNotes: true,
    canUseAgenda: true,
    canUseGoals: true,
  }

  if (usedUpgradeOffer !== undefined) {
    updateData.usedUpgradeOffer = usedUpgradeOffer;
  }

  if (transactionId) {
    updateData.caktoOrderId = transactionId
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  })

  console.log(`[Subscription Service] User ${updatedUser.email} ACTIVATED: subscriptionStatus=ACTIVE, plan=${planTier}. Ends at ${endDate.toISOString()}`)
  return updatedUser
}

// Extra days of access after each billing date, covering AbacatePay's automatic retries (3 × every 2 days).
const RENEWAL_GRACE_DAYS = 7

interface ActivateRecurringInput {
  userId: string
  tier: BillingTier
  subscriptionId: string
  customerId?: string | null
  /** Unique id of this charge (payment id); used for idempotency. */
  chargeId: string
  /** Subscription checkout (bill_...) that created the subscription, when known. */
  checkoutId?: string | null
  amountCents: number
}

/**
 * Activates or renews a recurring subscription. Safe to call multiple times for the same charge.
 * Returns `null` when the charge was already processed.
 */
export async function activateRecurringSubscription({
  userId, tier, subscriptionId, customerId, chargeId, checkoutId, amountCents,
}: ActivateRecurringInput) {
  const alreadyProcessed = await prisma.paymentTransaction.findFirst({
    where: { status: 'ACTIVE', OR: [{ providerTransactionId: chargeId }, { rawStatus: `charge:${chargeId}` }] },
    select: { id: true },
  })
  if (alreadyProcessed) return null

  const plan = PLANS[tier]
  const now = new Date()
  const endDate = new Date(now.getTime() + (plan.accessDays + RENEWAL_GRACE_DAYS) * 24 * 60 * 60 * 1000)

  const pendingCheckout = checkoutId
    ? await prisma.paymentTransaction.findUnique({ where: { providerTransactionId: checkoutId }, select: { id: true, status: true } })
    : null

  // First charge already activated by /api/subscription/status: only attach the real ids.
  if (pendingCheckout?.status === 'ACTIVE') {
    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionId, ...(customerId ? { billingCustomerId: customerId } : {}) },
    })
    return null
  }

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: UserSubscriptionStatus.ACTIVE,
        plan: plan.dbPlan as UserPlan,
        billingProvider: 'abacatepay',
        billingApprovedAt: now,
        subscriptionId,
        ...(customerId ? { billingCustomerId: customerId } : {}),
        subscriptionEndDate: endDate,
        subscriptionExpiresAt: null,
        canUseFinance: true,
        canUseHabits: true,
        canUseWorkout: true,
        canUseNotes: true,
        canUseAgenda: true,
        canUseGoals: true,
      },
    }),
    // First charge: promote the pending checkout record; renewals: store a new charge record.
    pendingCheckout
      ? prisma.paymentTransaction.update({
          where: { id: pendingCheckout.id },
          data: { status: 'ACTIVE', rawStatus: `charge:${chargeId}`, paidAt: now, amount: amountCents / 100 },
        })
      : prisma.paymentTransaction.upsert({
          where: { providerTransactionId: chargeId },
          update: { status: 'ACTIVE', paidAt: now },
          create: {
            userId,
            provider: 'abacatepay',
            providerTransactionId: chargeId,
            amount: amountCents / 100,
            status: 'ACTIVE',
            rawStatus: 'subscription_charge',
            paidAt: now,
          },
        }),
  ])

  if (!updatedUser.subscriptionStartDate) {
    await prisma.user.update({ where: { id: userId }, data: { subscriptionStartDate: now } })
  }

  console.log(`[Subscription Service] ${updatedUser.email} ${plan.dbPlan} active until ${endDate.toISOString()} (subscription ${subscriptionId})`)
  return updatedUser
}

/**
 * Handles a cancelled subscription. A requested cancellation keeps access until the paid period
 * ends (minus the renewal grace); a cancellation for unpaid charges ends access immediately.
 */
export async function cancelRecurringSubscription(subscriptionId: string, unpaid: boolean) {
  const users = await prisma.user.findMany({
    where: { subscriptionId },
    select: { id: true, subscriptionEndDate: true },
  })
  const now = Date.now()

  await Promise.all(users.map((user) => {
    const paidUntil = (user.subscriptionEndDate?.getTime() ?? now) - RENEWAL_GRACE_DAYS * 24 * 60 * 60 * 1000
    const keepsAccess = !unpaid && paidUntil > now
    return prisma.user.update({
      where: { id: user.id },
      data: keepsAccess
        ? { subscriptionEndDate: new Date(paidUntil) }
        : { subscriptionStatus: UserSubscriptionStatus.CANCELED, subscriptionEndDate: new Date(now) },
    })
  }))
}

/** The checkout that started the user's current subscription (needed by the customer portal). */
export async function getSubscriptionCheckoutId(userId: string): Promise<string | null> {
  const tx = await prisma.paymentTransaction.findFirst({
    where: { userId, provider: 'abacatepay', status: 'ACTIVE', providerTransactionId: { startsWith: 'bill_' } },
    orderBy: { createdAt: 'desc' },
    select: { providerTransactionId: true },
  })
  return tx?.providerTransactionId ?? null
}

