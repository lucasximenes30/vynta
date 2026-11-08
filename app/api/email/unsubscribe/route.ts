import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyUnsubscribeToken } from '@/services/email.service'

export const dynamic = 'force-dynamic'

async function optOut(request: NextRequest) {
  const userId = await verifyUnsubscribeToken(request.nextUrl.searchParams.get('t') ?? '')
  if (userId) await prisma.user.updateMany({ where: { id: userId }, data: { emailOptOut: true } })
  return !!userId
}

const page = (ok: boolean) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vynta</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#07080c;color:#e2e8f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:24px">
<div style="max-width:420px;text-align:center"><h1 style="color:#fff;font-size:22px">${ok ? 'Pronto, você não vai mais receber esses e-mails.' : 'Link inválido.'}</h1>
<p style="color:#94a3b8">${ok ? 'E-mails importantes da conta (como redefinição de senha) continuam chegando normalmente.' : 'Abra o link mais recente que você recebeu por e-mail.'}</p>
<a href="/dashboard" style="display:inline-block;margin-top:12px;padding:12px 24px;border-radius:12px;background:#4258F9;color:#fff;text-decoration:none;font-weight:600">Abrir o Vynta</a></div></body></html>`

export async function GET(request: NextRequest) {
  return new NextResponse(page(await optOut(request)), { headers: { 'content-type': 'text/html; charset=utf-8' } })
}

// RFC 8058 one-click unsubscribe (Gmail/Apple "Cancelar inscrição" button).
export async function POST(request: NextRequest) {
  return NextResponse.json({ ok: await optOut(request) })
}
