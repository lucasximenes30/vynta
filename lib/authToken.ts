import { SignJWT, jwtVerify } from 'jose'

import { getJwtSecretKey } from './constants'

export interface JWTPayload {
  userId: string
  email: string
  name: string
  sessionId?: string
  exp?: number
  subscriptionStatus?: string
  hasWorkoutModule?: boolean
  role?: string
  forcePasswordChange?: boolean
  plan?: string
  createdAt?: string
  subscriptionEndDate?: string
  subscriptionExpiresAt?: string
  usedUpgradeOffer?: boolean
  canUseFinance?: boolean
  canUseHabits?: boolean
  canUseWorkout?: boolean
  canUseGoals?: boolean
  canUseNotes?: boolean
  canUseAgenda?: boolean
  [key: string]: unknown
}

export async function signToken(payload: JWTPayload, expiresAt?: number): Promise<string> {
  return new SignJWT({ ...payload, sessionId: payload.sessionId ?? crypto.randomUUID() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt ?? '7d')
    .sign(getJwtSecretKey())
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), { algorithms: ['HS256'] })
    // Password-reset/unsubscribe tokens are signed with the same key; they are never sessions.
    if (typeof payload.userId !== 'string' || typeof payload.credentialStamp !== 'string' || 'purpose' in payload) return null
    if (typeof payload.sessionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.sessionId)) return null
    if (typeof payload.exp !== 'number' || !Number.isSafeInteger(payload.exp)) return null
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}
