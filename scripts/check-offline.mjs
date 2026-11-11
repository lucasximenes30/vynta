import { gzipSync } from 'node:zlib'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
let owner = 'alice',
  status = 200,
  writes = [],
  records = new Map()
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (['/sw.js', '/offline-queue.js'].includes(url.pathname)) {
    res.setHeader('Content-Type', 'text/javascript')
    res.end(await readFile('public' + url.pathname))
    return
  }
  if (url.pathname === '/api/auth/me') {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ user: { id: owner } }))
    return
  }
  if (url.pathname === '/offline-assets.json') {
    res.end('[]')
    return
  }
  if (req.headers.rsc === '1') {
    res.setHeader('Content-Type', 'text/x-component')
    res.end(JSON.stringify({query: url.searchParams.get('period'), tree: req.headers['next-router-state-tree']}))
    return
  }
  if (url.pathname.startsWith('/api/') && req.method !== 'GET') {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
    res.setHeader('Content-Type', 'application/json')
    if (url.pathname.startsWith('/api/auth/')) {
      res.end('{}')
      return
    }
    if (req.headers['x-vynta-owner'] !== owner) {
      res.writeHead(401)
      res.end('{}')
      return
    }
    if (status !== 200) {
      res.writeHead(status)
      res.end('{}')
      return
    }
    const key = req.headers['x-vynta-mutation-id']
    const id = 'remote-' + key
    records.set(key, id)
    writes.push({ url: url.pathname, body, owner })
    res.end(JSON.stringify({ success: true, transaction: { id } }))
    return
  }
  if (url.pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ owner }))
    return
  }
  if (url.pathname === '/_next/static/test.js') {
    res.setHeader('Content-Type', 'text/javascript')
    res.end('window.fixtureReady = true')
    return
  }
  res.setHeader('Content-Type', 'text/html')
  res.setHeader('Content-Encoding', 'gzip')
  res.end(gzipSync(
    `<!doctype html><html><head><script src="/_next/static/test.js"></script></head><body><h1>${url.pathname}</h1><p>${owner}</p></body></html>`,
  ))
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const context = await browser.newContext()
  let page = await context.newPage()
  await page.goto(origin + '/dashboard')
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
  })
  await page.waitForFunction(() => navigator.serviceWorker.controller)
  const rpc = (action, item) =>
    page.evaluate(
      ({ action, item }) =>
        new Promise((resolve, reject) => {
          const channel = new MessageChannel()
          channel.port1.onmessage = (e) =>
            e.data.error
              ? reject(new Error(e.data.error))
              : resolve(e.data.result)
          navigator.serviceWorker.controller.postMessage(
            { type: 'vynta:queue', action, item },
            [channel.port2],
          )
        }),
      { action, item },
    )
  await rpc('bind')
  await context.serviceWorkers()[0].evaluate(() => warmOfflinePages())
  assert.equal(
    await page.evaluate(
      async () =>
        (await (await caches.open('vynta-data-v7')).keys()).filter((k) =>
          k.url.includes('/__html__/'),
        ).length,
    ),
    11,
    'all prepared routes have HTML snapshots',
  )
  for (const tree of ['tree-a', 'tree-b']) await page.evaluate(async ({tree}) => {
    await fetch('/reports?period=2026-10&_rsc=initial', {headers:{rsc:'1','next-router-state-tree':tree}})
  }, {tree})
  await context.setOffline(true)
  await page.goto(origin + '/dashboard?source=pwa')
  assert.equal(await page.locator('h1').textContent(), '/dashboard')
  assert(
    await page.evaluate(() => window.fixtureReady),
    'cold start loads cached JS',
  )
  for (const tree of ['tree-a', 'tree-b']) {
    const cached = await page.evaluate(async ({tree}) => (await fetch('/reports?period=2026-10&_rsc=changed', {headers:{rsc:'1','next-router-state-tree':tree}})).json(), {tree})
    assert.equal(cached.tree, tree, 'RSC payloads stay isolated by router tree and retain the report query')
    assert.equal(cached.query, '2026-10')
  }
  await page.goto(origin + '/finances')
  assert.equal(
    await page.locator('h1').textContent(),
    '/finances',
    'unvisited but warmed route opens offline',
  )
  const localId = randomUUID()
  await rpc('enqueue', {
    localId,
    url: '/api/transactions',
    method: 'POST',
    body: JSON.stringify({ title: 'Gasolina', amount: 50 }),
    queuedAt: Date.now() - 72 * 60 * 60 * 1000,
  })
  assert.equal(
    (await rpc('list')).length,
    1,
    'pending writes survive beyond the 48h read cache',
  )
  await page.close()
  page = await context.newPage()
  await page.goto(origin + '/notes')
  assert.equal(
    (await rpc('list')).length,
    1,
    'pending writes survive closing the app',
  )
  status = 429
  await context.setOffline(false)
  await assert.rejects(rpc('sync'))
  assert.equal((await rpc('list')).length, 1, '429 keeps pending data')
  status = 400
  await assert.rejects(rpc('sync'))
  assert.equal(
    (await rpc('list')).length,
    1,
    'validation failure keeps pending data',
  )
  status = 200
  await rpc('sync')
  assert.equal((await rpc('list')).length, 0)
  assert.equal(records.size, 1)
  await rpc('sync')
  assert.equal(
    records.size,
    1,
    'foreground and background retries do not duplicate acknowledged writes',
  )
  await context.setOffline(true)
  const createId = randomUUID()
  await rpc('enqueue', {
    localId: createId,
    url: '/api/transactions',
    method: 'POST',
    body: JSON.stringify({ title: 'Pizza', amount: 30 }),
    queuedAt: Date.now(),
  })
  await rpc('enqueue', {
    localId: randomUUID(),
    url: `/api/transactions/${createId}`,
    method: 'PUT',
    body: JSON.stringify({ title: 'Pizza alterada' }),
    queuedAt: Date.now() + 1,
  })
  await page.close()
  status = 200
  await context.setOffline(false)
  // Invoke the same worker routine registered with the native sync event, without an app window.
  const worker = context.serviceWorkers()[0]
  await worker.evaluate(() => replayOfflineQueue())
  assert(
    writes.some((w) => w.url === `/api/transactions/remote-${createId}`),
    'dependent edits use the server ID',
  )
  page = await context.newPage()
  await page.goto(origin + '/dashboard')
  assert.equal((await rpc('list')).length, 0)
  await context.setOffline(true)
  await rpc('enqueue', {
    localId: randomUUID(),
    url: '/api/transactions',
    method: 'POST',
    body: '{"title":"Private Alice"}',
    queuedAt: Date.now(),
  })
  await context.setOffline(false)
  owner = 'bob'
  await page.evaluate(() => fetch('/api/auth/login', { method: 'POST' }))
  await rpc('bind')
  assert.equal(
    (await rpc('list')).length,
    0,
    'another account cannot see pending entries',
  )
  assert.equal(
    await page.evaluate(
      async () => (await (await caches.open('vynta-data-v7')).keys()).length,
    ),
    0,
    'account changes purge saved screens',
  )
  await rpc('sync')
  assert(
    !writes.some((w) => w.owner === 'bob'),
    'another account cannot replay private entries',
  )
  owner = 'alice'
  await rpc('bind')
  assert.equal(
    (await rpc('list')).length,
    1,
    'original account recovers its pending entries',
  )
  // Force an expired page and verify that it never escapes the 48h read limit.
  await page.evaluate(async () => {
    const cache = await caches.open('vynta-data-v7')
    await cache.put(
      '/__html__/%2Ffinances',
      new Response('<h1>expired</h1>', {
        headers: {
          'Content-Type': 'text/html',
          'x-vynta-cached-at': String(Date.now() - 49 * 60 * 60 * 1000),
        },
      }),
    )
  })
  await context.setOffline(true)
  await page.goto(origin + '/finances')
  assert.notEqual(await page.locator('h1').textContent(), 'expired')
  await context.close()
  console.log(
    'Offline browser checks passed: cold start, unvisited routes, cached assets, 48h TTL, durable queue, failures, closed-window replay, dependent IDs and account isolation.',
  )
} finally {
  await browser.close()
  await new Promise((resolve) => server.close(resolve))
}
