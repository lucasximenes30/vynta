import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isIP } from 'node:net'

// Fixed-window rate limiting backed by the `rate_limits` table, so the limit holds across every
// serverless instance (in-memory counters reset on each cold start and differ per instance).

export interface RateRule {
  /** Namespaced key, e.g. `login:ip:1.2.3.4`. */
  key: string
  limit: number
  windowSec: number
}

/** Client IP from Vercel's trusted forwarding header. */
export function clientIp(req: Request): string {
  // Vercel overwrites this header at its trusted edge. Outside Vercel, do not trust
  // arbitrary forwarding headers: use a shared bucket until a proxy is explicitly configured.
  const value = process.env.VERCEL === '1' ? req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : undefined
  return value && isIP(value) ? value : 'unknown'
}

/** Counts one hit for the key and reports whether it is still within the limit. */
export async function hit({ key, limit, windowSec }: RateRule): Promise<{ ok: boolean; retryAfter: number; unavailable?: boolean }> {
  try {
    const [row] = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO rate_limits ("key", "count", "resetAt")
      VALUES (${key}, 1, now() + ${windowSec} * interval '1 second')
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN rate_limits."resetAt" <= now() THEN 1 ELSE rate_limits."count" + 1 END,
        "resetAt" = CASE WHEN rate_limits."resetAt" <= now() THEN now() + ${windowSec} * interval '1 second' ELSE rate_limits."resetAt" END
      RETURNING "count", "resetAt"`
    const retryAfter = Math.max(1, Math.ceil((new Date(row.resetAt).getTime() - Date.now()) / 1000))
    return { ok: Number(row.count) <= limit, retryAfter }
  } catch (err) {
    console.error('[rateLimit] storage unavailable')
    return { ok: false, retryAfter: 30, unavailable: true }
  }
}

/** Applies every rule; returns a 429 response when any of them is exceeded, otherwise null. */
export async function enforceRateLimits(rules: RateRule[]): Promise<NextResponse | null> {
  const results = await Promise.all(rules.map(hit))
  if (results.some((r) => r.unavailable)) {
    return NextResponse.json({ error: 'Serviço temporariamente indisponível. Tente novamente em instantes.' },
      { status: 503, headers: { 'Retry-After': '30', 'Cache-Control': 'no-store' } })
  }
  const blocked = results.filter((r) => !r.ok)
  if (!blocked.length) return null
  const retryAfter = Math.max(...blocked.map((r) => r.retryAfter))
  const minutes = Math.ceil(retryAfter / 60)
  return NextResponse.json(
    { error: `Muitas tentativas. Tente novamente em ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.` },
    { status: 429, headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' } },
  )
}

/** Clears a counter (e.g. the per-account login counter after a successful login). */
export async function resetRateLimit(key: string) {
  await prisma.rateLimit.deleteMany({ where: { key } }).catch(() => {})
}

/** Deletes expired counters; called from the cron. */
export async function pruneRateLimits() {
  return prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } }).catch(() => ({ count: 0 }))
}
