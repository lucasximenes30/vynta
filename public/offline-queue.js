/* Single durable writer shared by foreground and Background Sync. Pending edits never expire. */
const QUEUE_CACHE = 'vynta-pending-v1'
const QUEUE_META = '/__offline_owner__'
let queueSync = null
let accountEpoch = 0

async function queueOwner() {
  const hit = await (await caches.open(QUEUE_CACHE)).match(QUEUE_META)
  return hit ? hit.json() : null
}
async function bindQueueOwner() {
  const epoch = accountEpoch
  const response = await fetch('/api/auth/me', { cache: 'no-store' })
  if (!response.ok)
    throw new Error('Entre novamente para sincronizar seus dados.')
  const { user } = await response.json()
  if (!user?.id || epoch !== accountEpoch) throw new Error('Conta alterada')
  const previous = await queueOwner()
  if (previous?.id !== user.id) await caches.delete(DATA_CACHE)
  if (epoch !== accountEpoch) throw new Error('Conta alterada')
  await (
    await caches.open(QUEUE_CACHE)
  ).put(QUEUE_META, Response.json({ id: user.id }))
  return user.id
}
async function queuedEntries() {
  const cache = await caches.open(QUEUE_CACHE)
  const owner = await queueOwner()
  const keys = (await cache.keys()).filter((k) =>
    new URL(k.url).pathname.startsWith('/__pending__/'),
  )
  const items = await Promise.all(
    keys.map(async (key) => (await cache.match(key)).json()),
  )
  return items
    .filter((item) => item.owner === owner?.id)
    .sort((a, b) => a.queuedAt - b.queuedAt)
}
async function enqueueOffline(item) {
  const owner = await queueOwner()
  if (!owner?.id)
    throw new Error(
      'Abra o Vynta com internet uma vez para preparar o modo offline.',
    )
  const url = new URL(item.url, self.location.origin)
  const allowed =
    /^\/api\/(?:transactions(?:\/[a-f0-9-]+)?|habits(?:\/checkin|\/[a-f0-9-]+)?|notes(?:\/[a-f0-9-]+)?|goals(?:\/[a-f0-9-]+)?|calendar\/events(?:\/[a-f0-9-]+)?)$/i
  const creates = [
    '/api/transactions',
    '/api/habits',
    '/api/habits/checkin',
    '/api/notes',
    '/api/goals',
    '/api/calendar/events',
  ]
  if (
    url.origin !== self.location.origin ||
    !allowed.test(url.pathname) ||
    !['POST', 'PUT', 'PATCH', 'DELETE'].includes(item.method) ||
    (item.method === 'POST' && !creates.includes(url.pathname)) ||
    (item.body && JSON.parse(item.body).goalId)
  )
    throw new Error('Esta ação precisa de internet. O rascunho continua salvo.')
  const entry = {
    ...item,
    owner: owner.id,
    queuedAt: item.queuedAt || Date.now(),
  }
  await (
    await caches.open(QUEUE_CACHE)
  ).put(`/__pending__/${item.localId}`, Response.json(entry))
  if (self.registration.sync)
    await self.registration.sync.register('vynta-mutations').catch(() => {})
  return entry
}
async function broadcastQueue(synced = 0) {
  const windows = await self.clients.matchAll({ type: 'window' })
  windows.forEach((client) =>
    client.postMessage({ type: 'vynta:queue-updated', synced }),
  )
}
async function replayOfflineQueue() {
  if (queueSync) return queueSync
  queueSync = (async () => {
    const items = await queuedEntries()
    if (!items.length) return 0
    const owner = await bindQueueOwner()
    const epoch = accountEpoch
    let synced = 0
    const cache = await caches.open(QUEUE_CACHE)
    for (const item of items) {
      if (item.owner !== owner || epoch !== accountEpoch) break
      const idMapResponse = await cache.match(`/__ids__/${owner}`)
      const idMap = idMapResponse ? await idMapResponse.json() : {}
      const replaceIds = (text) =>
        Object.entries(idMap).reduce(
          (s, [from, to]) => s.split(from).join(to),
          text,
        )
      const response = await fetch(replaceIds(item.url), {
        method: item.method,
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'x-vynta-sync': '1',
          'x-vynta-owner': owner,
          'x-vynta-mutation-id': item.localId,
        },
        body: item.body ? replaceIds(item.body) : undefined,
      })
      if (
        !response.ok &&
        !(item.method === 'DELETE' && response.status === 404)
      ) {
        item.error =
          response.status === 401
            ? 'Entre novamente para sincronizar.'
            : response.status === 429
              ? 'Limite temporário. Vamos tentar novamente.'
              : `Não foi possível enviar (HTTP ${response.status}). Seus dados continuam neste aparelho.`
        await cache.put(`/__pending__/${item.localId}`, Response.json(item))
        await broadcastQueue()
        throw new Error(item.error)
      }
      const data = await response.json().catch(() => ({}))
      const remoteId = data.transaction?.id || data.habit?.id || data.id
      if (remoteId && item.method === 'POST') {
        idMap[item.localId] = remoteId
        await cache.put(`/__ids__/${owner}`, Response.json(idMap))
      }
      await cache.delete(`/__pending__/${item.localId}`)
      synced++
    }
    await broadcastQueue(synced)
    return synced
  })().finally(() => {
    queueSync = null
  })
  return queueSync
}
self.addEventListener('sync', (event) => {
  if (event.tag === 'vynta-mutations') event.waitUntil(replayOfflineQueue())
})
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'vynta:queue') return
  event.waitUntil(
    (async () => {
      try {
        const { action, item } = event.data
        const result =
          action === 'bind'
            ? await bindQueueOwner()
            : action === 'enqueue'
              ? await enqueueOffline(item)
              : action === 'sync'
                ? await replayOfflineQueue()
                : await queuedEntries()
        event.ports[0]?.postMessage({ result })
      } catch (error) {
        event.ports[0]?.postMessage({ error: error.message })
      }
    })(),
  )
})
