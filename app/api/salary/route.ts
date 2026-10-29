import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSalaryConfig, setSalaryConfig, clearSalaryConfig } from '@/services/salary.service'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  return NextResponse.json({ payments: await getSalaryConfig(session.userId) })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let body: { payments?: { amount?: unknown; day?: unknown; payDayType?: unknown }[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const payments = Array.isArray(body.payments) ? body.payments : []
  const parsed = payments.map((p) => ({
    amount: Number(p.amount),
    day: Number(p.day),
    payDayType: p.payDayType === 'business_day' ? 'business_day' as const : 'fixed' as const,
  }))

  try {
    await setSalaryConfig(session.userId, parsed)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Dados inválidos' }, { status: 400 })
  }
  return NextResponse.json({ success: true, payments: await getSalaryConfig(session.userId) })
}

export async function DELETE() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  await clearSalaryConfig(session.userId)
  return NextResponse.json({ success: true })
}
