import { cookies } from 'next/headers'
import { cache } from 'react'
import { after } from 'next/server'
import { signToken, verifyToken, type JWTPayload } from './authToken'
import { prisma } from './prisma'
import { credentialStamp } from './sessionCredentials'
import { safeEqual } from './password'
import { sessionPayloadFromUser } from './sessionPayload'
import { APP_SESSION_SECONDS, SESSION_RENEW_AFTER_SECONDS } from './sessionPolicy'
export { signToken, verifyToken, type JWTPayload } from './authToken'
export async function setSession(payload: JWTPayload, preSignedToken?: string) {
  if (payload.userId === 'admin-system') {
    const master = process.env.ADMIN_PASSWORD
    if (!master || master.length < 16) throw new Error('Admin credential unavailable')
    payload = { ...payload, credentialStamp: credentialStamp('admin-system', master) }
  }
  const token = preSignedToken ?? (await signToken(payload))
  const signed = await verifyToken(token)
  if (!signed?.sessionId || !signed.exp || signed.userId !== payload.userId) throw new Error('Invalid session token')
  // Only fresh authentication creates a session. A deleted session must never be upserted.
  await prisma.authSession.create({ data: { id: signed.sessionId, userId: signed.userId, expiresAt: new Date(signed.exp * 1000) } })
  await writeSessionCookie(token, signed.exp)
  // Expired entries are never accepted, even before this optional cleanup runs.
  after(() => prisma.authSession.deleteMany({ where: { expiresAt: { lte: new Date() } } }).then(() => {}).catch(() => {}))
  return token
}

async function writeSessionCookie(token: string, expiresAt: number) {
  const cookieStore = await cookies()

  const isSecure = process.env.NODE_ENV === 'production' && process.env.ALLOW_INSECURE_COOKIES !== 'true';

  cookieStore.set('session', token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: Math.max(0, expiresAt - Math.floor(Date.now() / 1000)),
    path: '/',
  })

}

async function activeSession(session: JWTPayload) {
  if (!session.sessionId || !session.exp) return null
  return prisma.authSession.findFirst({
    where: { id: session.sessionId, userId: session.userId, expiresAt: { gt: new Date(), gte: new Date(session.exp * 1000) } },
    select: { id: true },
  })
}

/** Refresh claims after billing, keeping the same revocable session and absolute expiry. */
export async function refreshSession(payload: JWTPayload, current: JWTPayload) {
  if (payload.userId !== current.userId || !await activeSession(current)) throw new Error('Session expired')
  const token = await signToken({ ...payload, sessionId: current.sessionId }, current.exp)
  await writeSessionCookie(token, current.exp!)
  return token
}

/** Called only after getSession authorizes an online app heartbeat. Never creates a row. */
export async function renewActiveSession(current: JWTPayload) {
  if (current.role === 'ADMIN' || !current.sessionId || !current.exp) return false
  const now = Math.floor(Date.now() / 1000)
  if (current.exp <= now || current.exp > now + APP_SESSION_SECONDS - SESSION_RENEW_AFTER_SECONDS) return false
  const expiresAt = now + APP_SESSION_SECONDS
  // Atomic update of an existing, still-active session: logout wins regardless of ordering.
  // The upper bound also prevents concurrent renewal requests from shortening expiry.
  const result = await prisma.authSession.updateMany({
    where: {
      id: current.sessionId, userId: current.userId,
      expiresAt: { gt: new Date(now * 1000), gte: new Date(current.exp * 1000), lt: new Date(expiresAt * 1000) },
    },
    data: { expiresAt: new Date(expiresAt * 1000) },
  })
  if (!result.count) return false
  const token = await signToken(current, expiresAt)
  await writeSessionCookie(token, expiresAt)
  return true
}

export const getSession = cache(async (): Promise<JWTPayload | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null
  const session = await verifyToken(token)
  if (!session || typeof session.credentialStamp !== 'string') return null
  if (session.userId === 'admin-system') {
    const master = process.env.ADMIN_PASSWORD
    return master && master.length >= 16 && safeEqual(session.credentialStamp, credentialStamp('admin-system', master)) && await activeSession(session) ? session : null
  }
  const [registered, user] = await Promise.all([activeSession(session), prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true, email: true, name: true, password: true, role: true, plan: true,
      subscriptionStatus: true, hasWorkoutModule: true, forcePasswordChange: true,
      createdAt: true, subscriptionEndDate: true, subscriptionExpiresAt: true,
      canUseFinance: true, canUseHabits: true, canUseWorkout: true, canUseGoals: true,
      canUseNotes: true, canUseAgenda: true, usedUpgradeOffer: true,
    },
  })])
  if (!registered || !user || !safeEqual(session.credentialStamp, credentialStamp(user.id, user.password))) return null
  return { ...sessionPayloadFromUser(user), sessionId: session.sessionId, exp: session.exp }
})

export async function removeSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await verifyToken(token) : null
  if (session?.sessionId) {
    // Commit revocation before reporting success or deleting the local cookie.
    // A database outage leaves the cookie intact so the user can retry.
    await prisma.authSession.deleteMany({ where: { id: session.sessionId, userId: session.userId } })
  }
  cookieStore.delete('session')
}

export async function requireAuth(): Promise<JWTPayload> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}
