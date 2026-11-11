// Ordinary app sessions stay signed in while used; admin sessions retain a shorter lifetime.
export const APP_SESSION_SECONDS = 90 * 24 * 60 * 60
export const ADMIN_SESSION_SECONDS = 7 * 24 * 60 * 60
export const SESSION_RENEW_AFTER_SECONDS = 24 * 60 * 60

export function sessionLifetimeSeconds(role: unknown) {
  return role === 'ADMIN' ? ADMIN_SESSION_SECONDS : APP_SESSION_SECONDS
}
