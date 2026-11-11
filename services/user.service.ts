import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { matchesAdminMasterPassword, spendPasswordCheck, verifyStoredPassword } from '@/lib/password'
import { SALT_ROUNDS } from '@/lib/constants'
import { signToken, JWTPayload } from '@/lib/auth'
import { TRIAL_DAYS } from '@/lib/plans'

import { sessionPayloadFromUser } from '@/lib/sessionPayload'
export { sessionPayloadFromUser } from '@/lib/sessionPayload'

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

/** Looks up the account for a login attempt (exported so the route can run it alongside the rate limit). */
export function findLoginUser(email: string) {
  return prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
}

export async function loginUser(input: LoginInput, userLookup?: ReturnType<typeof findLoginUser>) {
  const user = await (userLookup ?? findLoginUser(input.email))

  if (!user) {
    await spendPasswordCheck(input.password)
    throw new Error('Invalid email or password')
  }

  const isBcryptHash = /^\$2[aby]\$/.test(user.password)
  const matchesDbPassword = await verifyStoredPassword(input.password, user.password)
  const matchesAdminEnvPassword = user.role === 'ADMIN' && matchesAdminMasterPassword(input.password)
  const validPassword = matchesDbPassword || matchesAdminEnvPassword
  if (!validPassword) {
    throw new Error('Invalid email or password')
  }

  // Upgrade plaintext before signing: a background password update would revoke the new session.
  // Existing bcrypt hashes retain their work factor.
  if (matchesDbPassword && !isBcryptHash) {
    user.password = await hash(input.password, SALT_ROUNDS)
    await prisma.user.update({ where: { id: user.id }, data: { password: user.password } })
  }

  const payload = sessionPayloadFromUser(user)
  const token = await signToken(payload)

  return { user: { id: user.id, name: user.name, email: user.email, subscriptionStatus: user.subscriptionStatus, hasWorkoutModule: user.hasWorkoutModule, role: user.role, plan: user.plan, forcePasswordChange: user.forcePasswordChange, createdAt: user.createdAt, canUseFinance: user.canUseFinance, canUseHabits: user.canUseHabits, canUseWorkout: user.canUseWorkout, canUseGoals: user.canUseGoals, canUseNotes: user.canUseNotes, canUseAgenda: user.canUseAgenda, usedUpgradeOffer: user.usedUpgradeOffer, subscriptionEndDate: user.subscriptionEndDate, subscriptionExpiresAt: user.subscriptionExpiresAt }, token, session: payload }
}
