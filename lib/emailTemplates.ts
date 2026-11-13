import { PLANS, PROMO_FIRST_MONTH, formatBRL } from '@/lib/plans'
import { INSTAGRAM_URL } from '@/lib/social'

// Two styles on purpose:
//  - `card`: branded layout for account e-mails (welcome, password reset).
//  - `letter`: plain personal-looking e-mail for lifecycle/remarketing. Gmail's tabs classifier
//    sends heavy layouts, big buttons, prices in the subject and bulk headers to "Promoções";
//    a short letter with one inline link is what lands in "Principal" most often.

const APP_URL = (process.env.APP_URL || 'https://www.vynta.digital').replace(/\/$/, '')
const BRAND = '#32685B'

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function firstName(name: string) {
  return esc(name.trim().split(/\s+/)[0] || '')
}

function link(path: string) {
  return new URL(path, APP_URL).toString()
}

const strip = (s: string) => s.replace(/<[^<>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')

// ── card (account e-mails) ───────────────────────────────────────────────────

interface CardInput {
  preheader: string
  title: string
  paragraphs: string[]
  cta?: { label: string; url: string }
  footnote?: string
}

function card(subject: string, { preheader, title, paragraphs, cta, footnote }: CardInput): RenderedEmail {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155">${p}</p>`).join('')
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#0b0c12;padding:24px 32px">
<a href="${APP_URL}" style="text-decoration:none"><img src="${APP_URL}/icons/broto-icon-192.png" width="36" height="36" alt="" style="vertical-align:middle;border-radius:8px;border:0">
<span style="vertical-align:middle;color:#ffffff;font-size:20px;font-weight:700;margin-left:10px">Vynta</span></a>
</td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:#0f172a">${title}</h1>
${body}
${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="border-radius:12px;background:${BRAND}">
<a href="${cta.url}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none">${esc(cta.label)}</a></td></tr></table>` : ''}
${footnote ? `<p style="margin:0;font-size:13px;line-height:1.6;color:#64748b">${footnote}</p>` : ''}
</td></tr>
<tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
<p style="margin:0;font-size:12px;color:#94a3b8">Vynta · organização financeira e pessoal</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`
  const text = [strip(title), '', ...paragraphs.map(strip), cta ? `${cta.label}: ${cta.url}` : '', footnote ? strip(footnote) : '']
    .filter(Boolean).join('\n\n')
  return { subject, html, text }
}

// ── letter (lifecycle / remarketing) ─────────────────────────────────────────

interface LetterInput {
  name: string
  paragraphs: string[]
  /** Single inline link, written as a sentence ("Clique aqui para..."). */
  linkText: string
  linkUrl: string
  after?: string[]
  unsubscribeUrl?: string
}

function letter(subject: string, { name, paragraphs, linkText, linkUrl, after = [], unsubscribeUrl }: LetterInput): RenderedEmail {
  const p = (s: string) => `<p style="margin:0 0 14px">${s}</p>`
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 16px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#222222">
<div style="max-width:560px">
${p(`Oi, ${firstName(name)}!`)}
${paragraphs.map(p).join('\n')}
${p(`<a href="${linkUrl}" style="color:${BRAND};font-weight:bold">${esc(linkText)}</a>`)}
${after.map(p).join('\n')}
${p('Um abraço,<br>Equipe Vynta')}
<p style="margin:18px 0 0;font-size:14px;color:#555555">P.S.: a gente posta dicas de organização no Instagram, <a href="${INSTAGRAM_URL}" style="color:${BRAND}">@somosvynta</a>.</p>
${unsubscribeUrl ? `<p style="margin:24px 0 0;font-size:12px;color:#999999">Não quer mais receber esses lembretes? <a href="${unsubscribeUrl}" style="color:#999999">Clique aqui</a>.</p>` : ''}
</div>
</body></html>`
  const text = [
    `Oi, ${strip(firstName(name))}!`,
    ...paragraphs.map(strip),
    `${linkText}: ${linkUrl}`,
    ...after.map(strip),
    'Um abraço,\nEquipe Vynta',
    `P.S.: dicas no Instagram: ${INSTAGRAM_URL}`,
    unsubscribeUrl ? `Não quer mais receber? ${unsubscribeUrl}` : '',
  ].filter(Boolean).join('\n\n')
  return { subject, html, text }
}

const PROMO = formatBRL(PROMO_FIRST_MONTH.priceCents)
const FULL = formatBRL(PLANS.pro.priceCents)

// ── account e-mails ──────────────────────────────────────────────────────────

export function welcomeEmail(name: string): RenderedEmail {
  return card('Bem-vindo ao Vynta! Seu teste grátis começou', {
    preheader: 'Comece anotando seu primeiro gasto: leva 5 segundos.',
    title: `Oi, ${firstName(name)}! Que bom ter você aqui.`,
    paragraphs: [
      'Seu teste grátis de 7 dias do Vynta já está valendo, com tudo liberado: finanças, cartões, hábitos, agenda, metas e treinos.',
      'O jeito mais rápido de sentir a diferença: <strong>anote o primeiro gasto de hoje</strong> e cadastre as contas fixas do mês. Em poucos dias você enxerga pra onde o dinheiro está indo.',
      'Dica: instale o Vynta na tela inicial do celular e ative as notificações, assim a gente te lembra das contas antes de vencer.',
    ],
    cta: { label: 'Abrir o Vynta', url: link('/dashboard') },
  })
}

export function passwordResetEmail(name: string, resetUrl: string): RenderedEmail {
  return card('Redefinição de senha do Vynta', {
    preheader: 'Use o link para criar uma nova senha. Ele vale por 1 hora.',
    title: 'Redefinir sua senha',
    paragraphs: [
      `Oi, ${firstName(name)}. Recebemos um pedido para redefinir a senha da sua conta no Vynta.`,
      'Clique no botão abaixo para criar uma nova senha. O link vale por <strong>1 hora</strong> e só pode ser usado uma vez.',
    ],
    cta: { label: 'Criar nova senha', url: resetUrl },
    footnote: 'Se não foi você que pediu, pode ignorar este e-mail: sua senha continua a mesma.',
  })
}

// ── lifecycle / remarketing ──────────────────────────────────────────────────

export function neverUsedEmail(name: string, unsubscribeUrl?: string): RenderedEmail {
  return letter(`${strip(firstName(name))}, ficou alguma dúvida para começar?`, {
    name,
    paragraphs: [
      'Vi que você criou sua conta no Vynta, mas ainda não anotou nada por lá. Seu teste já está correndo, então queria te ajudar a aproveitar.',
      'O começo mais simples leva 1 minuto: anote um gasto de hoje e cadastre uma conta fixa, tipo aluguel, internet ou o cartão. A partir daí o Vynta te avisa antes de cada vencimento.',
    ],
    linkText: 'Clique aqui para anotar seu primeiro gasto',
    linkUrl: link('/dashboard?add=expense'),
    unsubscribeUrl,
  })
}

export function inactiveEmail(name: string, days: number, unsubscribeUrl?: string): RenderedEmail {
  return letter(`Tudo certo por aí, ${strip(firstName(name))}?`, {
    name,
    paragraphs: [
      `Faz ${days} dias que você não abre o Vynta, então passei para saber se está tudo bem.`,
      'Tudo que você organizou continua salvo. Em 2 minutos dá para colocar os gastos dos últimos dias em dia e voltar a ter controle do mês.',
    ],
    linkText: 'Abrir o Vynta e colocar o mês em dia',
    linkUrl: link('/dashboard'),
    unsubscribeUrl,
  })
}

export function trialLastDayEmail(name: string, unsubscribeUrl?: string): RenderedEmail {
  return letter(`${strip(firstName(name))}, seu teste do Vynta termina hoje`, {
    name,
    paragraphs: [
      'Passando para avisar que o seu teste grátis do Vynta acaba nas próximas horas.',
      `Para você não perder o que já organizou, deixei uma condição só para quem está no teste: o primeiro mês sai por ${PROMO} (o normal é ${FULL}). É um pagamento único, via Pix ou cartão, e o acesso continua na hora.`,
    ],
    linkText: `Continuar no Vynta por ${PROMO}`,
    linkUrl: link('/subscription?offer=promo'),
    after: ['Seus dados ficam guardados mesmo se o teste acabar.'],
    unsubscribeUrl,
  })
}

export function trialExpiredEmail(name: string, unsubscribeUrl?: string): RenderedEmail {
  return letter(`${strip(firstName(name))}, seus dados no Vynta continuam salvos`, {
    name,
    paragraphs: [
      'Seu teste grátis terminou, mas tudo que você cadastrou continua lá, do jeito que você deixou.',
      `Se quiser voltar, ainda dá tempo de aproveitar o primeiro mês por ${PROMO}, pagamento único via Pix ou cartão. Essa condição vale só por mais alguns dias.`,
    ],
    linkText: 'Reativar meu acesso',
    linkUrl: link('/subscription?offer=promo'),
    unsubscribeUrl,
  })
}

export function promoEndingEmail(name: string, daysLeft: number, unsubscribeUrl?: string): RenderedEmail {
  const when = daysLeft === 1 ? 'amanhã' : `em ${daysLeft} dias`
  return letter('Seu primeiro mês no Vynta está acabando', {
    name,
    paragraphs: [
      `Seu primeiro mês no Vynta termina ${when}.`,
      `Para continuar com os lembretes de contas, relatórios e hábitos sem interrupção, é só escolher um plano: mensal por ${FULL} ou anual com desconto. Os dias que faltam do mês atual são somados ao plano.`,
    ],
    linkText: 'Escolher meu plano',
    linkUrl: link('/subscription'),
    unsubscribeUrl,
  })
}
