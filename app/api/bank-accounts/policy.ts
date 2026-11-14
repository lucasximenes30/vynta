import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { isAllowedMutationOrigin } from '@/lib/requestPolicy'
import { enforceRateLimits } from '@/lib/rateLimit'
import { BankAccountError } from '@/services/bankAccount.service'

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

export async function authorize(request: Request) {
  if (!isAllowedMutationOrigin(request)) return { response: json({ error: 'Origem não permitida' }, 403) }
  const session = await getSession()
  if (!session) return { response: json({ error: 'Não autenticado' }, 401) }
  if (request.method !== 'GET') {
    const limited = await enforceRateLimits([{ key: `bank-accounts:${session.userId}`, limit: 30, windowSec: 900 }])
    if (limited) return { response: limited }
  }
  return { userId: session.userId }
}

export function failure(error: unknown) {
  if (error instanceof BankAccountError) return json({ error: error.message }, error.status)
  if (error instanceof z.ZodError) return json({ error: error.issues[0]?.message ?? 'Dados inválidos' }, 400)
  if (error instanceof SyntaxError) return json({ error: 'Dados inválidos' }, 400)
  return json({ error: 'Não foi possível acessar suas contas. Tente novamente.' }, 503)
}
