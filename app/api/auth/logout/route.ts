import { NextResponse } from 'next/server'
import { removeSession } from '@/lib/auth'

export async function POST() {
  try {
    await removeSession()
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Não foi possível encerrar a sessão. Tente novamente.' }, {
      status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' },
    })
  }
}
