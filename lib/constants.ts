export const SALT_ROUNDS = 10

const DEV_JWT_SECRET = 'dev-secret-change-in-production'
let jwtKey: Uint8Array | null = null

/**
 * HMAC key for every signed token (session, password reset, unsubscribe). Fails closed in
 * production: without a strong JWT_SECRET anyone could forge an ADMIN session with the dev key.
 */
export function getJwtSecretKey(): Uint8Array {
  if (jwtKey) return jwtKey
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET ausente ou curto demais (mínimo 32 caracteres).')
    jwtKey = new TextEncoder().encode(secret || DEV_JWT_SECRET)
    return jwtKey
  }
  jwtKey = new TextEncoder().encode(secret)
  return jwtKey
}
