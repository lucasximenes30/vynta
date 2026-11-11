import { analyzeFinancialHealth } from '../lib/financialHealth'
import { guessCategory, resolveTransactionCategory } from '../lib/quickCategorize'
import { localizeCategoryName } from '../lib/categories'
import { offlineRecordId } from '../lib/offlineMutation'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import Module from 'node:module'
import { randomUUID, createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { NextRequest } from 'next/server'
import { SignJWT } from 'jose'
import { isAllowedCalendarUrl, isAllowedPushEndpoint } from '../lib/outboundPolicy'
import { isAllowedMutationOrigin } from '../lib/requestPolicy'
import { readBoundedText, BodyTooLargeError } from '../lib/boundedBody'
import { csvCell, csvRow } from '../lib/csv'
import { credentialStamp } from '../lib/sessionCredentials'
import { signToken, verifyToken } from '../lib/authToken'
import { transactionInputSchema } from '../lib/transactionValidation'
import ExcelJS from 'exceljs'
import { authenticAbacateWebhook, ABACATEPAY_PUBLIC_KEY } from '../lib/abacateWebhook'
import { APP_SESSION_SECONDS, ADMIN_SESSION_SECONDS } from '../lib/sessionPolicy'

/** Bundle the real handler with explicit local doubles. No database, AI, email or push is contacted. */
async function isolated(entry: string, mocks: Record<string, string>) {
  const result = await build({
    entryPoints: [resolve(entry)], bundle: true, platform: 'node', format: 'cjs',
    packages: 'external', write: false, logLevel: 'silent',
    plugins: [{
      name: 'isolated-services',
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, (args) => mocks[args.path] ? { path: args.path, namespace: 'mock' } : undefined)
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({ contents: mocks[args.path], loader: 'js' }))
      },
    }],
  })
  const module = new Module(resolve('.security-check.cjs')) as Module & { _compile: (source: string, name: string) => void }
  module.filename = resolve('.security-check.cjs')
  module.paths = (Module as unknown as { _nodeModulePaths: (path: string) => string[] })._nodeModulePaths(process.cwd())
  module._compile(result.outputFiles[0].text, module.filename)
  return module.exports
}

async function main() {
  process.env.JWT_SECRET = randomUUID() + randomUUID()
  const waf = JSON.parse(readFileSync(resolve('docs/vercel-waf-policy.json'), 'utf8'))
  for (const rule of waf.rules) for (const path of waf.integrationPathsOutsideRules) assert(!new RegExp(rule.value).test(path), `${rule.name} must exclude ${path}`)
  process.env.ABACATEPAY_WEBHOOK_SECRET = randomUUID() + randomUUID()
  const delivery = JSON.stringify({ id: 'log_fixture', event: 'subscription.renewed', apiVersion: 2, devMode: true, data: { subscription: { id: 'subs_fixture', status: 'ACTIVE', amount: 2990, frequency: 'MONTHLY' }, checkout: { id: 'bill_fixture', metadata: { userId: 'alice' } }, payment: { id: 'char_fixture', amount: 2990 } } })
  const webhookRequest = (raw: string, secret: string | null, signature: string, inHeader = false) => {
    const url = new URL('https://www.vynta.digital/api/webhooks/abacatepay')
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature }
    if (secret) { if (inHeader) headers['X-Webhook-Secret'] = secret; else url.searchParams.set('webhookSecret', secret) }
    return new Request(url, { method: 'POST', body: raw, headers })
  }
  const signature = createHmac('sha256', ABACATEPAY_PUBLIC_KEY).update(delivery).digest('base64')
  assert(authenticAbacateWebhook(webhookRequest(delivery, process.env.ABACATEPAY_WEBHOOK_SECRET, signature), delivery, process.env.ABACATEPAY_WEBHOOK_SECRET))
  assert(authenticAbacateWebhook(webhookRequest(delivery, process.env.ABACATEPAY_WEBHOOK_SECRET, signature, true), delivery, process.env.ABACATEPAY_WEBHOOK_SECRET))
  assert(!authenticAbacateWebhook(webhookRequest(delivery, null, signature), delivery, process.env.ABACATEPAY_WEBHOOK_SECRET), 'public HMAC alone never authenticates a delivery')
  assert(!authenticAbacateWebhook(webhookRequest(delivery, process.env.ABACATEPAY_WEBHOOK_SECRET, signature), delivery + ' ', process.env.ABACATEPAY_WEBHOOK_SECRET), 'verify exact raw bytes')
  const webhookCalls: string[] = []
  ;(globalThis as any).__webhookCalls = webhookCalls
  const webhook = await isolated('app/api/webhooks/abacatepay/route.ts', {
    '@/lib/prisma': 'export const prisma = new Proxy({}, {get: () => { throw new Error("unexpected database access") }})',
    '@/services/subscription.service': 'export const activateRecurringSubscription = async (input) => { globalThis.__webhookCalls.push(input.chargeId); return null }; export const cancelRecurringSubscription = async (id) => { globalThis.__webhookCalls.push("cancel:"+id) }',
    '@/services/abacatepay.service': 'export const findSubscriptionByCheckout = async () => null',
    '@/services/facebook.service': 'export const FacebookService = {}',
    '@/services/push.service': 'export const notifyAdminsApprovedSale = async () => {}',
  })
  for (const inHeader of [false, true]) assert.equal((await webhook.POST(webhookRequest(delivery, process.env.ABACATEPAY_WEBHOOK_SECRET, signature, inHeader))).status, 200)
  assert.deepEqual(webhookCalls, ['char_fixture', 'char_fixture'], 'retries preserve the charge id used by existing deduplication')
  for (const req of [webhookRequest(delivery, null, signature), webhookRequest(delivery, 'wrong', signature), webhookRequest(delivery, process.env.ABACATEPAY_WEBHOOK_SECRET, 'wrong')]) assert.equal((await webhook.POST(req)).status, 401)
  assert.equal(webhookCalls.length, 2, 'invalid deliveries never activate access or query providers')
  const cancellation = JSON.stringify({ id: 'log_cancel', event: 'subscription.cancelled', data: { subscription: { id: 'subs_fixture', status: 'CANCELLED' } } })
  assert.equal((await webhook.POST(webhookRequest(cancellation, process.env.ABACATEPAY_WEBHOOK_SECRET, createHmac('sha256', ABACATEPAY_PUBLIC_KEY).update(cancellation).digest('base64')))).status, 200)
  assert.equal(webhookCalls[2], 'cancel:subs_fixture')
  delete (globalThis as any).__webhookCalls
  const validTransaction = { title: 'Teste', amount: 10, type: 'EXPENSE' as const, category: 'Food', date: '2026-11-10', cardId: '12345678-1234-4234-8234-123456789012' }
  assert(transactionInputSchema.safeParse(validTransaction).success)
  for (const invalid of [{ totalInstallments: 1000000000 }, { date: '9999-01-01' }, { date: '2026-02-30' }, { amount: Infinity }]) assert(!transactionInputSchema.safeParse({ ...validTransaction, ...invalid }).success)
  const ownership = await isolated('services/transaction.service.ts', {
    '@/lib/prisma': 'export const prisma = { transaction: { findUnique: async () => ({userId: "alice"}), update: async () => { throw new Error("must never write") } }, card: { findFirst: async ({where}) => { if(where.userId !== "alice") throw new Error("missing owner scope"); return null } } }',
  })
  await assert.rejects(() => ownership.updateTransaction('tx', 'alice', validTransaction), /Card not found or unauthorized/)
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Regressão')
  sheet.addRow(['Receita', 12.5])
  sheet.addConditionalFormatting({ ref: 'B1', rules: [{ type: 'dataBar', priority: 1, cfvo: [{ type: 'min' }, { type: 'max' }] }] })
  const xlsx = await workbook.xlsx.writeBuffer()
  const restored = new ExcelJS.Workbook()
  await restored.xlsx.load(xlsx)
  assert.equal(restored.worksheets[0].getCell('B1').value, 12.5)
  assert(isAllowedCalendarUrl('https://calendar.google.com/calendar/ical/account/private-token/basic.ics'))
  for (const url of ['https://127.0.0.1/a.ics', 'https://2130706433/a.ics', 'https://[::1]/a.ics', 'https://calendar.google.com.evil.test/calendar/ical/a/basic.ics', 'https://calendar.google.com@evil.test/calendar/ical/a/basic.ics', 'https://calendar.google.com:8443/calendar/ical/a/basic.ics', 'http://calendar.google.com/calendar/ical/a/basic.ics']) assert(!isAllowedCalendarUrl(url), url)
  for (const url of ['https://fcm.googleapis.com/fcm/send/token', 'https://updates.push.services.mozilla.com/wpush/v2/token', 'https://web.push.apple.com/token', 'https://wns2-par02p.notify.windows.com/token']) assert(isAllowedPushEndpoint(url), url)
  for (const url of ['https://localhost/push', 'https://169.254.169.254/token', 'https://fcm.googleapis.com.evil.test/token', 'https://evilnotify.windows.com/token', 'http://web.push.apple.com/token']) assert(!isAllowedPushEndpoint(url), url)
  const credentialUrl = new URL('https://fcm.googleapis.com/token')
  credentialUrl.username = 'fixture'
  credentialUrl.password = randomUUID()
  assert(!isAllowedPushEndpoint(credentialUrl.href), 'URL credentials are rejected even on an allowed host')

  const request = (path: string, method: string, headers: Record<string, string> = {}) => new Request('https://www.vynta.digital' + path, { method, headers })
  assert(isAllowedMutationOrigin(request('/api/transactions', 'POST', { origin: 'https://www.vynta.digital' })))
  for (const origin of ['https://evil.test', 'https://evil.vynta.digital', 'null']) assert(!isAllowedMutationOrigin(request('/api/auth/login', 'POST', { origin })))
  assert(!isAllowedMutationOrigin(request('/api/transactions', 'DELETE')))
  assert(!isAllowedMutationOrigin(request('/api/transactions', 'POST', { origin: 'https://www.vynta.digital', 'sec-fetch-site': 'cross-site' })))
  assert(isAllowedMutationOrigin(request('/api/cron/push', 'GET', { authorization: 'Bearer scheduler-test' })))
  assert(isAllowedMutationOrigin(request('/api/webhooks/abacatepay', 'POST')))
  assert(!isAllowedMutationOrigin(request('/api/webhooks/abacatepay/extra', 'POST')))

  assert.equal(await readBoundedText(new Response('ação'), 6), 'ação')
  await assert.rejects(() => readBoundedText(new Response('12345'), 4), BodyTooLargeError)
  await assert.rejects(() => readBoundedText(new Response('x', { headers: { 'Content-Length': '99' } }), 4), BodyTooLargeError)
  assert.equal(csvCell('=1+1'), '"\'=1+1"')
  assert.equal(csvCell('＠SUM(A1)'), '"\'＠SUM(A1)"')
  assert.equal(csvCell('a",=1+1'), '"a"",=1+1"')
  assert.equal(csvRow(['12,50', 'linha\nnova']), '"12,50","linha\nnova"\r\n')

  const stamp = credentialStamp('alice', 'password-hash')
  const token = await signToken({ userId: 'alice', email: 'alice@example.test', name: 'Alice', credentialStamp: stamp })
  assert.equal((await verifyToken(token))?.userId, 'alice')
  assert.equal((await verifyToken(token))!.exp! - Number((await verifyToken(token))!.iat), APP_SESSION_SECONDS)
  const adminToken = await signToken({ userId: 'admin', email: 'admin@example.test', name: 'Admin', role: 'ADMIN', credentialStamp: stamp })
  assert.equal((await verifyToken(adminToken))!.exp! - Number((await verifyToken(adminToken))!.iat), ADMIN_SESSION_SECONDS)
  assert.notEqual(stamp, credentialStamp('alice', 'new-password-hash'))
  assert.notEqual(stamp, credentialStamp('bob', 'password-hash'))
  assert.equal(await verifyToken(token + 'tampered'), null)
  const legacy = await new SignJWT({ userId: 'alice' }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(process.env.JWT_SECRET))
  assert.equal(await verifyToken(legacy), null)
  const reset = await new SignJWT({ userId: 'alice', credentialStamp: stamp, purpose: 'reset-password' }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(process.env.JWT_SECRET))
  assert.equal(await verifyToken(reset), null)

  const limited = await isolated('lib/rateLimit.ts', {
    '@/lib/prisma': 'export const prisma = { $queryRaw: async () => [{ count: 4, resetAt: new Date(Date.now() + 10000) }] }',
  })
  const response = await limited.enforceRateLimits([{ key: 'test', limit: 3, windowSec: 60 }])
  assert.equal(response.status, 429)
  assert(Number(response.headers.get('Retry-After')) > 0)
  const unavailable = await isolated('lib/rateLimit.ts', { '@/lib/prisma': 'export const prisma = { $queryRaw: async () => { throw new Error("test outage") } }' })
  assert.equal((await unavailable.enforceRateLimits([{ key: 'test', limit: 3, windowSec: 60 }])).status, 503)

  process.env.CRON_SECRET = randomUUID()
  const cronMocks = {
    '@/services/pushScheduler.service': 'export const runScheduledPushes = async () => ({ sent: 0, tested: true })',
    '@/services/calendarSync.service': 'export const syncAllCalendarFeeds = async () => ({ feeds: 0 })',
    '@/services/emailScheduler.service': 'export const runScheduledEmails = async () => ({ sent: 0 })',
    '@/lib/rateLimit': 'export const pruneRateLimits = async () => ({ count: 0 })',
  }
  const cron = await isolated('app/api/cron/push/route.ts', cronMocks)
  const edge = await isolated('middleware.ts', {})
  const cronRequest = (authorization?: string) => new NextRequest('https://www.vynta.digital/api/cron/push', { headers: authorization ? { authorization } : {} })
  assert.equal((await edge.middleware(cronRequest(`Bearer ${process.env.CRON_SECRET}`))).headers.get('x-middleware-next'), '1', 'cron must pass middleware without browser headers')
  assert.equal((await edge.middleware(new NextRequest('https://www.vynta.digital/api/transactions', { method: 'POST', headers: { origin: 'https://evil.test' } }))).status, 403)
  assert.equal((await cron.GET(cronRequest())).status, 401)
  assert.equal((await cron.GET(cronRequest('Bearer wrong'))).status, 401)
  const cronSuccess = await cron.GET(cronRequest(`Bearer ${process.env.CRON_SECRET}`))
  assert.equal(cronSuccess.status, 200, 'cron-job.org must work without Origin or a session cookie')
  assert.equal((await cronSuccess.json()).tested, true)
  const failingCron = await isolated('app/api/cron/push/route.ts', {
    ...cronMocks, '@/services/emailScheduler.service': 'export const runScheduledEmails = async () => { throw new Error("simulated email outage") }',
  })
  const cronFailure = await failingCron.GET(cronRequest(`Bearer ${process.env.CRON_SECRET}`))
  assert.equal(cronFailure.status, 500, 'real job failures must remain visible')
  assert.equal((await cronFailure.json()).tested, true, 'other cron jobs still run after one failure')

  const state = globalThis as typeof globalThis & { __reportReads?: number; __reportRows?: unknown[]; __authUser?: unknown; __testCookie?: string; __sessions?: Map<string, any>; __sessionOutage?: boolean }
  const base = { userId: 'alice', isActive: true, isRecurring: false, isInstallment: false, card: null, cardId: null, category: 'Food', createdAt: new Date('2026-01-01T12:00:00Z') }
  state.__reportReads = 0
  state.__reportRows = [
    { ...base, id: '1', type: 'INCOME', amount: 1000, date: new Date('2026-10-01T12:00:00Z') },
    { ...base, id: '2', type: 'EXPENSE', amount: 200, date: new Date('2026-10-02T12:00:00Z') },
    { ...base, id: '3', type: 'INCOME', amount: 1200, date: new Date('2026-11-01T12:00:00Z') },
    { ...base, id: '4', type: 'EXPENSE', amount: 300, date: new Date('2026-11-02T12:00:00Z') },
  ]
  const transactions = await isolated('services/transaction.service.ts', {
    '@/lib/prisma': 'export const prisma = { transaction: { findMany: async ({where}) => { if(where.userId !== "alice") throw new Error("wrong owner"); globalThis.__reportReads++; return globalThis.__reportRows } } }',
  })
  const report = await transactions.getReportSnapshot('alice', 2026, 11)
  assert.equal(state.__reportReads, 1)
  assert.equal(report.summary.income, 1200)
  assert.equal(report.summary.balance, 1700)
  assert.equal(report.previous.balance, 800)
  assert.equal(report.categories[0].amount, 300)
  assert.equal(report.trend[5].expense, 300)
  assert.equal(report.comparison.incomeChange, 200)
  const october = await transactions.getReportSnapshot('alice', 2026, 10)
  assert.equal(october.trend[5].expense, 200)
  assert.equal(october.summary.income, 1000)

  assert.equal(guessCategory('Estacionamento shopping', 'EXPENSE'), 'Transport')
  assert.equal(guessCategory('Gasolina', 'EXPENSE'), 'Transport')
  assert.equal(guessCategory('Faixa do jiu-jitsu', 'EXPENSE'), 'Gym')
  assert.equal(resolveTransactionCategory('Curso do Biel', 'EXPENSE', 'Geral'), 'Education')
  assert.equal(resolveTransactionCategory('Pizza', 'EXPENSE', 'Minha categoria'), 'Minha categoria')
  for (const [key, label] of [['Restaurant','Restaurante'],['Gym','Academia'],['Education','Educação']]) assert.equal(localizeCategoryName(key), label)
  const entries = [10,10,10,100].map((amount, i) => ({ id: String(i), title: 'Restaurante', category: i % 2 ? 'Restaurante' : 'Restaurant', type: 'EXPENSE', amount, date: `2026-11-0${i+1}` }))
  const health = analyzeFinancialHealth(entries, '2026-11')
  assert.equal(health.anomalies.length, 1, 'a peak must not inflate its own baseline, including zero-variance history')
  assert.equal(health.anomalies[0].averageInCategory, 10)
  assert.equal(health.comparedCount, 1)
  assert.equal(health.score?.label, 'Faltam receitas')
  assert.equal(health.weekly.reduce((sum, w) => sum + w.expense, 0), 130)
  assert.equal(health.weekly[0].week, '2026-11-01')
  assert.equal(health.weekly[0].end, '2026-11-01', 'Sunday starts a partial month week')
  assert.equal(health.weekly.at(-1)?.end, '2026-11-30')
  assert.equal(analyzeFinancialHealth(entries, '2026-10').score, null)
  const deficit = analyzeFinancialHealth([...entries, { ...entries[0], id: 'income', type: 'INCOME', amount: 12.35 }], '2026-11')
  assert(deficit.score?.recommendations[0].includes('superam'))
  assert(!deficit.score?.recommendations.some(text => /-\d+%/.test(text)), 'negative savings rates are replaced by a monetary shortfall')
  state.__reportRows = [
    { ...base, id: 'salary', title: 'Salário', category: 'Salary', type: 'INCOME', amount: 1500, isRecurring: true, recurringDay: 5, salarySlot: null, payDayType: 'fixed', date: new Date('2026-09-01T12:00:00Z') },
    { ...base, id: 'card', title: 'Compra parcelada', type: 'EXPENSE', amount: 1200, isInstallment: true, installmentAmount: 100, totalInstallments: 12, purchaseDate: new Date('2026-10-20T12:00:00Z'), date: new Date('2026-10-20T12:00:00Z'), cardId: 'card1', card: { dueDay: 10, closingDay: 25 } },
  ]
  state.__reportReads = 0
  const occurrences = await transactions.getFinancialOccurrences('alice', 2026, 11)
  assert.equal(state.__reportReads, 1, 'advanced analysis expands all months from one read')
  const novemberHealth = analyzeFinancialHealth(occurrences, '2026-11')
  assert.equal(novemberHealth.weekly.reduce((sum, w) => sum + w.expense, 0), 100, 'card installment lands in the invoice due month at installment value')
  assert.equal(novemberHealth.weekly.reduce((sum, w) => sum + w.income, 0), 1500, 'recurring salary configured earlier still counts')
  const requestId = randomUUID()
  const replayRequest = new Request('https://example.test', {headers: {'x-vynta-mutation-id':requestId}})
  assert.equal(offlineRecordId(replayRequest, 'alice'), offlineRecordId(replayRequest, 'alice'))
  assert.notEqual(offlineRecordId(replayRequest, 'alice'), offlineRecordId(replayRequest, 'bob'), 'offline IDs are scoped to accounts')

  state.__testCookie = token
  const tokenClaims = (await verifyToken(token))!
  state.__sessions = new Map([[tokenClaims.sessionId!, { id: tokenClaims.sessionId, userId: 'alice', expiresAt: new Date(tokenClaims.exp! * 1000) }]])
  state.__authUser = { id: 'alice', name: 'Alice', email: 'alice@example.test', password: 'password-hash', role: 'USER', plan: 'PRO', subscriptionStatus: 'ACTIVE', createdAt: new Date(), subscriptionEndDate: null, subscriptionExpiresAt: null }
  const auth = await isolated('lib/auth.ts', {
    'next/headers': 'export const cookies = async () => ({ get: () => ({value: globalThis.__testCookie}), set: (key,value,options) => { globalThis.__testCookie = value; globalThis.__cookieOptions = options }, delete: () => { globalThis.__testCookie = undefined } })',
    'next/server': 'export const after = () => {}',
    './prisma': `export const prisma = {
      user: { findUnique: async () => globalThis.__authUser },
      authSession: {
        create: async ({data}) => { if(globalThis.__sessionOutage) throw new Error('storage down'); if(globalThis.__sessions.has(data.id)) throw new Error('duplicate'); globalThis.__sessions.set(data.id,data); return data },
        findFirst: async ({where}) => { if(globalThis.__sessionOutage) throw new Error('storage down'); const row = globalThis.__sessions.get(where.id); return row && row.userId === where.userId && row.expiresAt > where.expiresAt.gt && row.expiresAt >= where.expiresAt.gte ? row : null },
        updateMany: async ({where,data}) => { if(globalThis.__sessionOutage) throw new Error('storage down'); const row = globalThis.__sessions.get(where.id); if(!row || row.userId !== where.userId || row.expiresAt <= where.expiresAt.gt || row.expiresAt < where.expiresAt.gte || row.expiresAt >= where.expiresAt.lt) return {count:0}; globalThis.__sessions.set(where.id,{...row,...data}); return {count:1} },
        deleteMany: async ({where}) => { if(globalThis.__sessionOutage) throw new Error('storage down'); const row = globalThis.__sessions.get(where.id); if(row?.userId === where.userId) globalThis.__sessions.delete(where.id); return {count:row?1:0} },
      },
    }`,
  })
  assert.equal((await auth.getSession())?.role, 'USER', 'permissions come from current account')
  assert.equal(await auth.renewActiveSession(await auth.getSession()), false, 'fresh sessions do not write on every heartbeat')
  const weekToken = await signToken({ userId: 'alice', email: 'alice@example.test', name: 'Alice', credentialStamp: stamp }, Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS)
  await auth.setSession({ userId: 'alice', email: 'alice@example.test', name: 'Alice', credentialStamp: stamp }, weekToken)
  assert.equal(await auth.renewActiveSession(await auth.getSession()), true, 'existing seven-day sessions upgrade on activity without another login')
  assert.equal((globalThis as any).__cookieOptions.maxAge, APP_SESSION_SECONDS)
  await auth.removeSession()
  state.__testCookie = token
  const originalNow = Date.now
  let rollingToken = token
  try {
    // Keep using the same app session for longer than a year, without reauthentication.
    for (let days = 2; days <= 400; days += 2) {
      Date.now = () => originalNow() + days * 86400000
      state.__testCookie = rollingToken
      if (days === 2) {
        state.__sessionOutage = true
        await assert.rejects(() => auth.renewActiveSession({ ...tokenClaims, role: 'USER' }), /storage down/)
        assert.equal(state.__testCookie, rollingToken, 'temporary failure keeps existing login intact')
        state.__sessionOutage = false
      }
      assert.equal(await auth.renewActiveSession(await auth.getSession()), true)
      rollingToken = state.__testCookie!
      const rolling = (await verifyToken(rollingToken))!
      assert.equal(rolling.sessionId, tokenClaims.sessionId)
      assert.equal(rolling.exp, Math.floor(Date.now() / 1000) + APP_SESSION_SECONDS)
      assert.equal((globalThis as any).__cookieOptions.maxAge, APP_SESSION_SECONDS)
      assert.equal((globalThis as any).__cookieOptions.httpOnly, true)
      assert.equal(await auth.renewActiveSession(await auth.getSession()), false)
    }
    assert.equal(await auth.renewActiveSession({ ...await auth.getSession(), role: 'ADMIN', exp: Math.floor(Date.now() / 1000) + 60 }), false)
    // A logout racing after authorization but before renewal cannot recreate the deleted row.
    Date.now = () => originalNow() + 402 * 86400000
    const beforeLogout = await auth.getSession()
    const activeRow = state.__sessions!.get(tokenClaims.sessionId!)
    state.__sessions!.set(tokenClaims.sessionId!, { ...activeRow, expiresAt: new Date(originalNow() - 1000) })
    assert.equal(await auth.getSession(), null, 'expired persistent sessions never authorize')
    assert.equal(await auth.renewActiveSession(beforeLogout), false, 'expired registry rows cannot be revived')
    state.__sessions!.set(tokenClaims.sessionId!, activeRow)
    await auth.removeSession()
    assert.equal(await auth.renewActiveSession(beforeLogout), false)
    state.__testCookie = rollingToken
    assert.equal(await auth.getSession(), null)
  } finally { Date.now = originalNow }
  // Restore the isolated fixture for the existing logout/password/billing regressions.
  state.__sessions!.set(tokenClaims.sessionId!, { id: tokenClaims.sessionId, userId: 'alice', expiresAt: new Date(tokenClaims.exp! * 1000) })
  state.__testCookie = token
  const secondToken = await auth.setSession({ userId: 'alice', email: 'alice@example.test', name: 'Alice', credentialStamp: stamp })
  assert.notEqual(secondToken, token, 'logins in the same second have independent session identifiers')
  state.__testCookie = token
  const firstSession = await auth.getSession()
  const renewed = await auth.refreshSession({ userId: 'alice', email: 'alice@example.test', name: 'Alice', credentialStamp: stamp, plan: 'PRO' }, firstSession)
  assert.equal((await verifyToken(renewed))?.sessionId, tokenClaims.sessionId)
  assert.equal((await verifyToken(renewed))?.exp, tokenClaims.exp, 'billing refresh cannot extend absolute expiry')
  await auth.removeSession()
  assert.equal(state.__testCookie, undefined)
  for (const copied of [token, renewed]) { state.__testCookie = copied; assert.equal(await auth.getSession(), null, 'every token of a logged-out session is rejected') }
  await assert.rejects(() => auth.refreshSession({ userId: 'alice', email: 'alice@example.test', name: 'Alice', credentialStamp: stamp }, firstSession), /Session expired/, 'refresh must never recreate a logged-out session')
  state.__testCookie = secondToken
  assert.equal((await auth.getSession())?.userId, 'alice', 'other device remains signed in')
  state.__sessionOutage = true
  await assert.rejects(() => auth.removeSession(), /storage down/)
  assert.equal(state.__testCookie, secondToken, 'failed logout retains the cookie for retry')
  await assert.rejects(() => auth.getSession(), /storage down/, 'store outage must never authenticate a token')
  state.__sessionOutage = false
  state.__authUser = { ...(state.__authUser as object), password: 'rotated-hash' }
  assert.equal(await auth.getSession(), null, 'old session rejected after password reset')
  state.__authUser = null
  assert.equal(await auth.getSession(), null, 'deleted account rejected')
  const activityRoute = await isolated('app/api/track/activity/route.ts', {
    '@/lib/auth': 'export const getSession = async () => globalThis.__heartbeatSession; export const renewActiveSession = async (session) => { globalThis.__heartbeatRenewed = session.sessionId }',
    '@/lib/prisma': 'export const prisma = {user:{updateMany:async()=>({count:1})}}',
    '@/services/subscription.service': 'export const getPromoEligibility = async () => false',
  })
  ;(globalThis as any).__heartbeatSession = null
  assert.equal((await activityRoute.POST()).status, 401)
  assert.equal((globalThis as any).__heartbeatRenewed, undefined)
  ;(globalThis as any).__heartbeatSession = { userId: 'alice', sessionId: 'fixture', plan: 'PRO' }
  const heartbeat = await activityRoute.POST()
  assert.equal(heartbeat.status, 200)
  assert.equal(heartbeat.headers.get('cache-control'), 'no-store')
  assert.equal((globalThis as any).__heartbeatRenewed, 'fixture')
  delete (globalThis as any).__heartbeatSession; delete (globalThis as any).__heartbeatRenewed; delete (globalThis as any).__cookieOptions
  const logoutRoute = await isolated('app/api/auth/logout/route.ts', { '@/lib/auth': 'export const removeSession = async () => { throw new Error("storage down") }' })
  assert.equal((await logoutRoute.POST()).status, 503)
  const clientLogout = await isolated('lib/logout.ts', {})
  const originalFetch = globalThis.fetch
  const originalWindow = (globalThis as any).window
  const redirects: string[] = [], alerts: string[] = []
  ;(globalThis as any).window = { location: { replace: (url: string) => redirects.push(url) }, alert: (message: string) => alerts.push(message) }
  try {
    globalThis.fetch = async () => new Response('{}', { status: 503 })
    await clientLogout.logoutAndRedirect()
    assert.equal(redirects.length, 0, 'failed logout must stay on screen and offer retry')
    assert.equal(alerts.length, 1)
    globalThis.fetch = async () => new Response('{"success":true}', { status: 200 })
    await clientLogout.logoutAndRedirect('/admin/login')
    assert.deepEqual(redirects, ['/admin/login'])
  } finally { globalThis.fetch = originalFetch; (globalThis as any).window = originalWindow }
  delete state.__reportReads; delete state.__reportRows; delete state.__authUser; delete state.__testCookie; delete state.__sessions; delete state.__sessionOutage
  console.log('Security/report regressions passed: rolling PWA sessions over 400 days, expiry and logout races, independent devices, billing refresh, fail-closed storage, webhooks and cron-job.org contract.')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
