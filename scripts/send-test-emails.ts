// Usage: npx tsx --env-file=.env scripts/send-test-emails.ts voce@exemplo.com
import * as T from '../lib/emailTemplates'
import { sendEmail } from '../services/email.service'

async function main() {
  const to = process.argv[2]
  if (!to) throw new Error('Informe o e-mail de destino')
  const name = 'Lucas Teste'
  const unsub = 'https://www.vynta.digital/api/email/unsubscribe?t=teste'
  const emails = [
    ['welcome', T.welcomeEmail(name)],
    ['password-reset', T.passwordResetEmail(name, 'https://www.vynta.digital/redefinir-senha?token=teste')],
    ['never-used', T.neverUsedEmail(name, unsub)],
    ['inactive', T.inactiveEmail(name, 3, unsub)],
    ['trial-last-day', T.trialLastDayEmail(name, unsub)],
    ['trial-expired', T.trialExpiredEmail(name, unsub)],
    ['promo-ending', T.promoEndingEmail(name, 3, unsub)],
  ] as const
  for (const [tag, e] of emails) {
    const ok = await sendEmail({ to: { email: to, name }, ...e, subject: `[TESTE] ${e.subject}`, tag: `test-${tag}` })
    console.log(ok ? 'OK  ' : 'FAIL', tag)
  }
}

main()
