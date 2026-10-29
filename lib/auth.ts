import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { JWT_SECRET } from './constants'

export interface JWTPayload {
  userId: string
  email: string
  name: string
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

const secret = new TextEncoder().encode(JWT_SECRET)

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function setSession(payload: JWTPayload, preSignedToken?: string) {
  const token = preSignedToken ?? (await signToken(payload))
  const cookieStore = await cookies()

  const isSecure = process.env.NODE_ENV === 'production' && process.env.ALLOW_INSECURE_COOKIES !== 'true';

  cookieStore.set('session', token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  })

  return token
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function removeSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

export async function requireAuth(): Promise<JWTPayload> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}
