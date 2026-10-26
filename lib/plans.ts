// Single source of truth for pricing, trial and plan copy (client + server safe).

export const TRIAL_DAYS = 7

export type BillingTier = 'pro' | 'pro_yearly'
export type BillingCycle = 'MONTHLY' | 'ANNUALLY'

export interface PlanOption {
  tier: BillingTier
  dbPlan: 'PRO' | 'PRO_YEARLY'
  name: string
  cycle: BillingCycle
  priceCents: number
  periodLabel: string
  accessDays: number
}

export const PLAN_NAME = 'Vynta Completo'

export const PLANS: Record<BillingTier, PlanOption> = {
  pro: {
    tier: 'pro',
    dbPlan: 'PRO',
    name: 'Mensal',
    cycle: 'MONTHLY',
    priceCents: 2490,
    periodLabel: 'mês',
    accessDays: 30,
  },
  pro_yearly: {
    tier: 'pro_yearly',
    dbPlan: 'PRO_YEARLY',
    name: 'Anual',
    cycle: 'ANNUALLY',
    priceCents: 17990,
    periodLabel: 'ano',
    accessDays: 365,
  },
}

export const YEARLY_MONTHLY_EQUIVALENT_CENTS = Math.round(PLANS.pro_yearly.priceCents / 12)
export const YEARLY_SAVINGS_CENTS = PLANS.pro.priceCents * 12 - PLANS.pro_yearly.priceCents
export const YEARLY_DISCOUNT_PERCENT = Math.round((YEARLY_SAVINGS_CENTS / (PLANS.pro.priceCents * 12)) * 100)

export const PLAN_FEATURES = [
  'Finanças completas: contas, cartões, parcelas e assinaturas',
  'Notificações no celular: contas, fatura, agenda e hábitos',
  'Relatórios mensais com insights de IA',
  'Metas financeiras com acompanhamento',
  'Hábitos com sequência e pontuação',
  'Agenda e notas integradas',
  'Planos de treino com histórico de evolução',
  'Exportação em PDF, Excel e CSV',
  'App instalável, com lançamento de gastos até sem internet',
]

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

export function isBillingTier(value: unknown): value is BillingTier {
  return value === 'pro' || value === 'pro_yearly'
}

export function tierFromCycle(cycle: string | null | undefined): BillingTier | null {
  if (cycle === 'MONTHLY') return 'pro'
  if (cycle === 'ANNUALLY' || cycle === 'YEARLY') return 'pro_yearly'
  return null
}

/** Best-effort tier from a charged amount (cents), used when the cycle is missing. */
export function tierFromAmount(amountCents: number): BillingTier {
  return amountCents >= PLANS.pro_yearly.priceCents * 0.8 ? 'pro_yearly' : 'pro'
}

/** Maps any requested tier (including legacy 'vip'/'promo') to a sellable tier. */
export function normalizeTier(value: unknown): BillingTier {
  if (isBillingTier(value)) return value
  if (value === 'yearly' || value === 'annual') return 'pro_yearly'
  return 'pro'
}
