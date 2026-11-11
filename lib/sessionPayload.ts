import type { JWTPayload } from './authToken'
import { credentialStamp } from './sessionCredentials'

type SessionUser = {
  id: string
  email: string
  name: string
  password: string
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
    credentialStamp: credentialStamp(user.id, user.password),
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
