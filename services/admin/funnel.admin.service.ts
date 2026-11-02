import { prisma } from '@/lib/prisma'

function getRangeStart(range: string): Date | null {
  const now = new Date()
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  }
  if (range === '7d') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }
  if (range === '30d') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }
  return null
}

export async function buildFunnelPayload(range: string = 'all') {
  const rangeStart = getRangeStart(range)

  // Check if admin reset the funnel recently so DB-backed counts respect the reset timestamp
  const lastReset = await prisma.adminActionLog.findFirst({
    where: { action: 'FUNNEL_RESET' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })

  const effectiveStart = (() => {
    if (rangeStart && lastReset?.createdAt) {
      return rangeStart > lastReset.createdAt ? rangeStart : lastReset.createdAt
    }
    return rangeStart ?? lastReset?.createdAt ?? null
  })()

  const dateFilter = effectiveStart ? { gte: effectiveStart } : undefined

  const [events, realSignups, realActivated, realCheckouts, realPurchases] = await Promise.all([
    prisma.funnelEvent.findMany({
      where: dateFilter ? { createdAt: dateFilter } : undefined,
      select: { sessionId: true, userId: true, eventName: true, metadata: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({
      where: {
        role: { notIn: ['ADMIN', 'COURTESY'] },
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
    }),
    prisma.user.count({
      where: {
        role: { notIn: ['ADMIN', 'COURTESY'] },
        hasSeenDashboard: true,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
    }),
    prisma.paymentTransaction.findMany({
      where: dateFilter ? { createdAt: dateFilter } : undefined,
      select: { userId: true, status: true, amount: true },
    }),
    prisma.paymentTransaction.findMany({
      where: {
        status: 'ACTIVE',
        ...(dateFilter ? { paidAt: dateFilter } : {}),
      },
      select: { userId: true, amount: true },
    }),
  ])

  const sets: Record<string, Set<string>> = {
    landing_view: new Set(),
    plan_viewed: new Set(),
    cta_click: new Set(),
    signup_started: new Set(),
    signup_completed: new Set(),
    dashboard_first_view: new Set(),
    checkout_started: new Set(),
    payment_attempted: new Set(),
    purchase: new Set(),
  }

  for (const ev of events) {
    const actor = ev.userId || ev.sessionId
    if (!actor) continue
    if (!sets[ev.eventName]) sets[ev.eventName] = new Set()
    sets[ev.eventName].add(actor)

    // Clicking a plan button on the landing page also counts as a CTA click towards signup
    const meta = (ev.metadata ?? {}) as Record<string, any>
    if (ev.eventName === 'checkout_started' && meta.source === 'landing_page') {
      sets.cta_click.add(actor)
    }
    // Attempting payment implies starting checkout
    if (ev.eventName === 'payment_attempted') {
      sets.checkout_started.add(actor)
    }
  }

  const distinctCheckoutUsers = new Set(realCheckouts.map((c) => c.userId)).size
  const distinctPurchaseUsers = new Set(realPurchases.map((p) => p.userId)).size
  const revenueInPeriod = realPurchases.reduce((acc, p) => acc + Number(p.amount ?? 0), 0)

  const landingCount = sets.landing_view.size
  const planViewedCount = sets.plan_viewed.size
  const ctaClickCount = sets.cta_click.size
  const signupStartedCount = Math.max(sets.signup_started.size, sets.signup_completed.size)
  const signupCompletedCount = Math.max(sets.signup_completed.size, realSignups)
  const dashboardActivatedCount = Math.max(sets.dashboard_first_view.size, realActivated)
  const checkoutAttemptedCount = Math.max(sets.payment_attempted.size, sets.checkout_started.size, distinctCheckoutUsers)
  const purchaseCount = Math.max(sets.purchase.size, distinctPurchaseUsers)

  const funnel1Data = [
    { key: 'landing_view', name: '1. Visita na Landing Page', value: landingCount },
    { key: 'plan_viewed', name: '2. Viu Planos / Preços', value: planViewedCount },
    { key: 'cta_click', name: '3. Clique no CTA', value: ctaClickCount },
    { key: 'signup_started', name: '4. Abriu Cadastro', value: signupStartedCount },
    { key: 'signup_completed', name: '5. Criou Conta (Trial)', value: signupCompletedCount },
    { key: 'dashboard_first_view', name: '6. Acessou o Painel', value: dashboardActivatedCount },
    { key: 'payment_attempted', name: '7. Iniciou Checkout', value: checkoutAttemptedCount },
    { key: 'purchase', name: '8. Venda Aprovada', value: purchaseCount },
  ]

  const funnel2Data = [
    { key: 'signup_completed', name: '1. Contas Criadas (Trial)', value: signupCompletedCount },
    { key: 'dashboard_first_view', name: '2. Ativaram no Painel', value: dashboardActivatedCount },
    { key: 'payment_attempted', name: '3. Iniciaram Checkout', value: checkoutAttemptedCount },
    { key: 'purchase', name: '4. Assinaram (Pagos)', value: purchaseCount },
  ]

  return {
    range,
    lastResetAt: lastReset?.createdAt ? lastReset.createdAt.toISOString() : null,
    totalEventsRecorded: events.length,
    revenueInPeriod,
    funnel1Data,
    funnel2Data,
  }
}

