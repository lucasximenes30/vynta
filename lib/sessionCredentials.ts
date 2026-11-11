import { createHmac } from 'node:crypto'
import { getJwtSecretKey } from './constants'

/** Bind a session to the current credential without exposing its password hash. */
export function credentialStamp(userId: string, passwordHash: string): string {
  return createHmac('sha256', getJwtSecretKey()).update(JSON.stringify(['session-v1', userId, passwordHash])).digest('base64url')
}
