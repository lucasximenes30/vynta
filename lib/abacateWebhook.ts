import { createHmac } from 'node:crypto'
import { safeEqual } from './password'

// Public integrity key from AbacatePay's documentation; this is NOT a credential.
export const ABACATEPAY_PUBLIC_KEY = 't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9'

export function authenticAbacateWebhook(request: Request, rawBody: string, secret: string): boolean {
  const received = request.headers.get('x-webhook-secret') ?? new URL(request.url).searchParams.get('webhookSecret') ?? ''
  const signature = request.headers.get('x-webhook-signature')?.trim() ?? ''
  if (!secret || !received || !safeEqual(received, secret)) return false
  const expected = createHmac('sha256', ABACATEPAY_PUBLIC_KEY).update(rawBody, 'utf8').digest('base64')
  return !!signature && safeEqual(signature, expected)
}
