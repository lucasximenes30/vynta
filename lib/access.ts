// Pure access rules (edge/client/server safe). Mirrors the checks done in middleware.ts,
// but evaluated against the database row so stale JWTs can be detected and refreshed.

export interface AccessUser {
  role?: string | null
  plan?: string | null
  subscriptionStatus?: string | null
  subscriptionEndDate?: Date | string | null
  subscriptionExpiresAt?: Date | string | null
}

function isPast(date: Date | string | null | undefined, now: number): boolean {
  if (!date) return false
  return new Date(date).getTime() < now
}

export function isPrivilegedUser(user: AccessUser): boolean {
  return user.role === 'ADMIN' || user.role === 'COURTESY' || user.plan === 'ADMIN' || user.plan === 'COURTESY'
}

/** True when the user can use the app right now (trial running, paid period active or privileged role). */
export function userHasAccess(user: AccessUser, now: number = Date.now()): boolean {
  if (isPrivilegedUser(user)) return true
  if (user.subscriptionStatus !== 'ACTIVE') return false

  if (user.plan === 'FREE_TRIAL') {
    return !!user.subscriptionExpiresAt && !isPast(user.subscriptionExpiresAt, now)
  }
  if (user.plan === 'PRO' || user.plan === 'PRO_YEARLY' || user.plan === 'VIP') {
    return !isPast(user.subscriptionEndDate, now)
  }
  return false
}

/** True when the user has a paid recurring plan that is currently active. */
export function hasActivePaidPlan(user: AccessUser, now: number = Date.now()): boolean {
  return (user.plan === 'PRO' || user.plan === 'PRO_YEARLY') && userHasAccess(user, now) && !isPrivilegedUser(user)
}

/** Whole days left in the free trial (0 when expired or not on trial). */
export function trialDaysLeft(user: AccessUser, now: number = Date.now()): number {
  if (user.plan !== 'FREE_TRIAL' || !user.subscriptionExpiresAt) return 0
  const ms = new Date(user.subscriptionExpiresAt).getTime() - now
  return ms > 0 ? Math.ceil(ms / (24 * 60 * 60 * 1000)) : 0
}
