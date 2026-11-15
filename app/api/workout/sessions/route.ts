import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { isAllowedMutationOrigin } from '@/lib/requestPolicy'
import { enforceRateLimits } from '@/lib/rateLimit'
import { offlineRecordId } from '@/lib/offlineMutation'
import { completeWorkoutSession, getWorkoutSessions, WorkoutSessionError } from '@/services/workoutSession.service'

const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
function failure(error: unknown) {
  if (error instanceof WorkoutSessionError) return json({ error: error.message }, error.status)
  if (error instanceof z.ZodError || error instanceof SyntaxError) return json({ error: 'Confira os dados do treino: séries, repetições e cargas.' }, 400)
  return json({ error: 'Não foi possível salvar ou carregar o treino. Tente novamente.' }, 503)
}
async function authorize(request: Request) {
  if (!isAllowedMutationOrigin(request)) return { response: json({ error: 'Origem não permitida.' }, 403) }
  const session = await getSession()
  if (!session) return { response: json({ error: 'Entre novamente para sincronizar seu treino.' }, 401) }
  if (!session.canUseWorkout) return { response: json({ error: 'O módulo de treinos não está disponível nesta conta.' }, 403) }
  const owner = request.headers.get('x-vynta-owner')
  if (owner && owner !== session.userId) return { response: json({ error: 'Este treino pertence a outra conta.' }, 403) }
  return { userId: session.userId }
}
export async function GET(request: Request) {
  try {
    const auth = await authorize(request)
    if (auth.response) return auth.response
    const query = new URL(request.url).searchParams
    return json({ sessions: await getWorkoutSessions(auth.userId!, query.get('dayId') || undefined, query.get('before') || undefined) })
  } catch (error) { return failure(error) }
}
export async function POST(request: Request) {
  try {
    const auth = await authorize(request)
    if (auth.response) return auth.response
    const limited = await enforceRateLimits([{ key: `workout-session:${auth.userId}`, limit: 60, windowSec: 900 }])
    if (limited) return limited
    const key = request.headers.get('x-vynta-mutation-id')
    if (key && !z.string().uuid().safeParse(key).success) return json({ error: 'Identificador inválido.' }, 400)
    const id = offlineRecordId(request, auth.userId!)
    return json({ workoutSession: await completeWorkoutSession(auth.userId!, await request.json(), id) }, 201)
  } catch (error) { return failure(error) }
}
