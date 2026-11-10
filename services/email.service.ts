import { SignJWT, jwtVerify } from 'jose'
import { getJwtSecretKey } from '@/lib/constants'
import { prisma } from '@/lib/prisma'

// Server-only module (no 'use server'). Transactional/remarketing e-mail via Brevo (ex-Sendinblue).

const BREVO_API = 'https://api.brevo.com/v3'

export const APP_URL = (process.env.APP_URL || 'https://www.vynta.digital').replace(/\/$/, '')

export function isEmailConfigured(): boolean {
  return !!process.env.BREVO_API_KEY
}

export interface EmailMessage {
  to: { email: string; name?: string }
  subject: string
  html: string
  text?: string
  /** Brevo tag (shows up in Brevo's statistics). */
  tag?: string
}

// ── Open/click tracking (own domain: no third-party redirect domain, friendlier to Gmail) ──

const INSTAGRAM_HOST = 'www.instagram.com'

/** Rewrites links to the app/Instagram through /api/email/c/:id and appends the open pixel. */
export function applyTracking(html: string, trackingId: string): string {
  const appHost = new URL(APP_URL).host
  const tracked = html.replace(/href="(https?:\/\/[^"]+)"/g, (match, url: string) => {
    let parsed: URL
    try { parsed = new URL(url.replace(/&amp;/g, '&')) } catch { return match }
    // Unsubscribe and password-reset links (carry tokens) are never routed through the tracker.
    if ((parsed.host !== appHost && parsed.host !== INSTAGRAM_HOST) || parsed.pathname.startsWith('/api/email/') || parsed.pathname.startsWith('/redefinir-senha')) return match
    return `href="${APP_URL}/api/email/c/${trackingId}?u=${encodeURIComponent(parsed.toString())}"`
  })
  const pixel = `<img src="${APP_URL}/api/email/o/${trackingId}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0">`
  return tracked.includes('</body>') ? tracked.replace('</body>', `${pixel}</body>`) : tracked + pixel
}

/** Only redirect to our own app or the Instagram profile (never an open redirect). */
export function isAllowedClickTarget(url: string): boolean {
  try {
    const { host, protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'http:' ? host === new URL(APP_URL).host || host === INSTAGRAM_HOST : false
  } catch {
    return false
  }
}

export interface TrackedEmailInput {
  user: { id: string; email: string; name: string }
  /** Dedup key: the same (user, key) e-mail is only ever sent once. */
  key: string
  tag: string
  /** Marketing e-mails get an unsubscribe link (and are skipped for opted-out users by the callers). */
  marketing?: boolean
  build: (ctx: { unsubscribeUrl?: string }) => { subject: string; html: string; text: string }
}

/**
 * Claims the (user, key) row in email_logs, sends with tracked links + open pixel and records
 * sentAt. Returns 'sent' | 'duplicate' | 'failed' ('failed' releases the claim so it can retry).
 */
export async function sendTrackedEmail({ user, key, tag, marketing, build }: TrackedEmailInput): Promise<'sent' | 'duplicate' | 'failed'> {
  const [row] = await prisma.emailLog.createManyAndReturn({
    data: [{ userId: user.id, key, tag }],
    skipDuplicates: true,
    select: { id: true },
  })
  if (!row) return 'duplicate'

  const email = build({ unsubscribeUrl: marketing ? await createUnsubscribeUrl(user.id) : undefined })
  const ok = await sendEmail({ to: { email: user.email, name: user.name }, ...email, html: applyTracking(email.html, row.id), tag })

  if (ok) await prisma.emailLog.update({ where: { id: row.id }, data: { sentAt: new Date(), subject: email.subject } })
  else await prisma.emailLog.delete({ where: { id: row.id } }).catch(() => {})
  return ok ? 'sent' : 'failed'
}

/** Sends one e-mail. Returns true when Brevo accepted it; never throws. */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.warn('[email] BREVO_API_KEY not set; skipping', msg.subject)
    return false
  }

  try {
    const res = await fetch(`${BREVO_API}/smtp/email`, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: process.env.EMAIL_FROM_NAME || 'Vynta', email: process.env.EMAIL_FROM || 'notificacoes@vynta.digital' },
        to: [msg.to],
        subject: msg.subject,
        htmlContent: msg.html,
        textContent: msg.text,
        tags: msg.tag ? [msg.tag] : undefined,
        // No List-Unsubscribe header on purpose: it's one of Gmail's strongest "Promoções" signals.
        // Marketing e-mails carry a plain unsubscribe link in the body instead.
      }),
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error('[email] Brevo error', res.status, await res.text().catch(() => ''))
      return false
    }
    return true
  } catch (err: any) {
    console.error('[email] send failed', err?.message || err)
    return false
  }
}

/** Adds/updates the contact in Brevo (optional list via BREVO_LIST_ID) so campaigns can target it. */
export async function upsertBrevoContact(contact: { email: string; name?: string; attributes?: Record<string, string | number | boolean> }) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return
  const listId = Number(process.env.BREVO_LIST_ID)
  try {
    const res = await fetch(`${BREVO_API}/contacts`, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        email: contact.email,
        updateEnabled: true,
        attributes: { FIRSTNAME: contact.name?.split(' ')[0], ...contact.attributes },
        ...(listId ? { listIds: [listId] } : {}),
      }),
      cache: 'no-store',
    })
    if (!res.ok && res.status !== 204) console.error('[email] Brevo contact error', res.status, await res.text().catch(() => ''))
  } catch (err: any) {
    console.error('[email] contact upsert failed', err?.message || err)
  }
}

// ── Signed links (password reset, unsubscribe) ───────────────────────────────

const secret = () => getJwtSecretKey()

async function fingerprint(passwordHash: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(passwordHash))
  return Buffer.from(digest).subarray(0, 12).toString('base64url')
}

/**
 * Password reset token: valid for 1h and bound to the current password hash, so it stops
 * working as soon as the password changes (single use, no table needed).
 */
export async function createPasswordResetToken(userId: string, passwordHash: string) {
  return new SignJWT({ sub: userId, purpose: 'pwd-reset', fp: await fingerprint(passwordHash) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret())
}

export async function verifyPasswordResetToken(token: string, getPasswordHash: (userId: string) => Promise<string | null>) {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] })
    if (payload.purpose !== 'pwd-reset' || typeof payload.sub !== 'string') return null
    const current = await getPasswordHash(payload.sub)
    if (!current || payload.fp !== (await fingerprint(current))) return null
    return payload.sub
  } catch {
    return null
  }
}

export async function createUnsubscribeUrl(userId: string) {
  const token = await new SignJWT({ sub: userId, purpose: 'unsub' }).setProtectedHeader({ alg: 'HS256' }).sign(secret())
  return `${APP_URL}/api/email/unsubscribe?t=${token}`
}

export async function verifyUnsubscribeToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] })
    return payload.purpose === 'unsub' && typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}
