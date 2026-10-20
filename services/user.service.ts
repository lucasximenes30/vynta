import { prisma } from '@/lib/prisma'
import { hash, compare } from 'bcryptjs'
import { SALT_ROUNDS } from '@/lib/constants'
import { signToken, JWTPayload } from '@/lib/auth'
import { TRIAL_DAYS } from '@/lib/plans'

type SessionUser = {
  id: string
  email: string
  name: string
  subscriptionStatus: string
  hasWorkoutModule: boolean
  forcePasswordChange: boolean
  role: string
  plan: string
  createdAt: Date
  canUseFinance: boolean
  canUseHabits: boolean
  canUseWorkout: boolean
  canUseGoals: boolean
  canUseNotes: boolean
  canUseAgenda: boolean
  usedUpgradeOffer: boolean
  subscriptionEndDate: Date | null
  subscriptionExpiresAt: Date | null
}

/** JWT session payload built from the user row (single source for login, register and billing refreshes). */
export function sessionPayloadFromUser(user: SessionUser): JWTPayload {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    subscriptionStatus: user.subscriptionStatus,
    hasWorkoutModule: user.hasWorkoutModule,
    forcePasswordChange: user.forcePasswordChange,
    role: user.role,
    plan: user.plan,
    createdAt: user.createdAt.toISOString(),
    canUseFinance: user.canUseFinance,
    canUseHabits: user.canUseHabits,
    canUseWorkout: user.canUseWorkout,
    canUseGoals: user.canUseGoals,
    canUseNotes: user.canUseNotes,
    canUseAgenda: user.canUseAgenda,
    usedUpgradeOffer: user.usedUpgradeOffer,
    subscriptionEndDate: user.subscriptionEndDate ? user.subscriptionEndDate.toISOString() : undefined,
    subscriptionExpiresAt: user.subscriptionExpiresAt ? user.subscriptionExpiresAt.toISOString() : undefined,
  }
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  document?: string
  planTier?: 'vip' | 'pro' | 'trial' | 'pro_yearly'
}

export interface LoginInput {
  email: string
  password: string
}

export async function registerUser(input: RegisterInput) {
  const hashedPassword = await hash(input.password, SALT_ROUNDS)

  try {
    let plan: 'VIP' | 'PRO' | 'PRO_YEARLY' | 'FREE_TRIAL' = 'VIP'
    let subscriptionStatus: 'ACTIVE' | 'INACTIVE' = 'INACTIVE'
    let canUseAgenda = false
    let canUseNotes = false
    let canUseGoals = false
    let subscriptionExpiresAt: Date | undefined = undefined

    if (input.planTier === 'trial') {
      // The trial unlocks the full product (same features as the paid plan)
      plan = 'FREE_TRIAL'
      subscriptionStatus = 'ACTIVE'
      canUseAgenda = true
      canUseNotes = true
      canUseGoals = true
      subscriptionExpiresAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
    } else if (input.planTier === 'pro' || input.planTier === 'pro_yearly') {
      plan = input.planTier === 'pro_yearly' ? 'PRO_YEARLY' : 'PRO'
      subscriptionStatus = 'INACTIVE'
      canUseAgenda = true
      canUseNotes = true
    } else {
      // vip default
      plan = 'VIP'
      subscriptionStatus = 'INACTIVE'
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        password: hashedPassword,
        document: input.document || null,
        plan,
        subscriptionStatus,
        canUseAgenda,
        canUseNotes,
        canUseGoals,
        subscriptionExpiresAt,
      },
    })

    const payload = sessionPayloadFromUser(user)

    const token = await signToken(payload)

    return { user: { id: user.id, name: user.name, email: user.email, subscriptionStatus: user.subscriptionStatus, hasWorkoutModule: user.hasWorkoutModule, role: user.role, plan: user.plan, forcePasswordChange: user.forcePasswordChange, createdAt: user.createdAt, canUseFinance: user.canUseFinance, canUseHabits: user.canUseHabits, canUseWorkout: user.canUseWorkout, canUseGoals: user.canUseGoals, canUseNotes: user.canUseNotes, canUseAgenda: user.canUseAgenda, usedUpgradeOffer: user.usedUpgradeOffer, subscriptionEndDate: user.subscriptionEndDate, subscriptionExpiresAt: user.subscriptionExpiresAt }, token, session: payload }
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new Error('Email already registered')
    }
    throw error
  }
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  })

  if (!user) {
    throw new Error('Invalid email or password')
  }

  const validPassword = await compare(input.password, user.password)
  if (!validPassword) {
    throw new Error('Invalid email or password')
  }

  const payload = sessionPayloadFromUser(user)
  const token = await signToken(payload)

  return { user: { id: user.id, name: user.name, email: user.email, subscriptionStatus: user.subscriptionStatus, hasWorkoutModule: user.hasWorkoutModule, role: user.role, plan: user.plan, forcePasswordChange: user.forcePasswordChange, createdAt: user.createdAt, canUseFinance: user.canUseFinance, canUseHabits: user.canUseHabits, canUseWorkout: user.canUseWorkout, canUseGoals: user.canUseGoals, canUseNotes: user.canUseNotes, canUseAgenda: user.canUseAgenda, usedUpgradeOffer: user.usedUpgradeOffer, subscriptionEndDate: user.subscriptionEndDate, subscriptionExpiresAt: user.subscriptionExpiresAt }, token, session: payload }
}
