import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { enforceRateLimits } from '@/lib/rateLimit'
import { isAllowedMutationOrigin } from '@/lib/requestPolicy'
import { RELEASE_ID } from '@/lib/release'
import { claimReleaseNotice } from '@/services/releaseNotice.service'

export async function POST(request: Request) {
  const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
  if (!isAllowedMutationOrigin(request)) return json({ error: 'Origem inválida' }, 403)
  const session = await getSession()
  if (!session) return json({ error: 'Não autenticado' }, 401)
  // A Vercel preview must not consume a real user's production announcement.
  if (process.env.VERCEL_ENV === 'preview') return json({ show: false, releaseId: RELEASE_ID })
  const limited = await enforceRateLimits([{ key: `release-notice:${session.userId}`, limit: 30, windowSec: 300 }])
  if (limited) return limited
  try {
    return json({ show: await claimReleaseNotice(session.userId), releaseId: RELEASE_ID })
  } catch {
    return json({ error: 'Aviso indisponível no momento' }, 503)
  }
}
