import { createHash, timingSafeEqual } from 'crypto'
import { compare } from 'bcryptjs'

// Server-only password helpers (Node runtime).

/** Constant-time string comparison (hashing first makes lengths equal and hides them). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export const MIN_ADMIN_MASTER_PASSWORD = 16

/**
 * The ADMIN_PASSWORD env works as a master password for ADMIN accounts. It is ignored unless it is
 * long enough to resist brute force, so a weak value can't become a backdoor.
 */
export function matchesAdminMasterPassword(input: string): boolean {
  const master = process.env.ADMIN_PASSWORD
  if (!master || master.length < MIN_ADMIN_MASTER_PASSWORD) return false
  return safeEqual(input, master)
}

const isBcrypt = (stored: string) => /^\$2[aby]\$/.test(stored)

/** Checks against a bcrypt hash, or a legacy plaintext value (upgraded to bcrypt on login). */
export async function verifyStoredPassword(input: string, stored: string): Promise<boolean> {
  return isBcrypt(stored) ? compare(input, stored).catch(() => false) : safeEqual(input, stored)
}

// Hash of a random value nobody knows; used to spend the same time when the account doesn't exist.
const DUMMY_HASH = '$2b$10$J2YyVsHInJIvDLVAQYIgSux5fRaASa2Se4NtjnXC6gu7F/vNYsC6m'

/** Equalizes response time for unknown e-mails, so timing doesn't reveal which accounts exist. */
export async function spendPasswordCheck(input: string) {
  await compare(input, DUMMY_HASH).catch(() => false)
}
