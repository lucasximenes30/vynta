import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { enforceRateLimits } from '@/lib/rateLimit'
import { isPushConfigured, sendPushToUser } from '@/services/push.service'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const limited = await enforceRateLimits([{ key: `push-test:user:${session.userId}`, limit: 5, windowSec: 10 * 60 }])
  if (limited) return limited
  if (!isPushConfigured()) return NextResponse.json({ error: 'Notificações não configuradas no servidor' }, { status: 503 })

  const delivered = await sendPushToUser(session.userId, {
    title: 'Notificações ativadas',
    body: 'É assim que o Vynta vai te avisar de contas, hábitos e compromissos — mesmo com o app fechado.',
    url: '/dashboard?source=push-test',
    tag: 'test',
  })

  if (delivered === 0) return NextResponse.json({ error: 'Nenhum aparelho ativo recebeu a notificação' }, { status: 404 })
  return NextResponse.json({ ok: true, delivered })
}
