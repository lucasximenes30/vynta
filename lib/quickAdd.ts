'use client'

// Client helpers for the durable service-worker queue. Reads expire after 48h; pending writes do not.

export type QuickAddType = 'INCOME' | 'EXPENSE'

export interface QueuedTransaction {
  localId: string
  title: string
  amount: number
  type: QuickAddType
  category: string
  date: string
  queuedAt: number
}

export interface QueuedMutation {
  localId: string
  url: string
  method: string
  body?: string
  queuedAt: number
}

export const QUICK_ADD_OPEN_EVENT = 'vynta:quick-add'
export const TRANSACTION_CREATED_EVENT = 'vynta:transaction-created'
export const OFFLINE_QUEUE_CHANGED_EVENT = 'vynta:offline-queue-changed'
export const QUEUE_KEY = 'vynta_tx_queue'
export const MUTATION_QUEUE_KEY = 'vynta_mutation_queue'


export function openQuickAdd(type: QuickAddType = 'EXPENSE') {
  window.dispatchEvent(new CustomEvent(QUICK_ADD_OPEN_EVENT, { detail: { type } }))
}

/** Local date at noon UTC: the convention used by every transaction date in the app. */
export function todayDateValue(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  return `${local}T12:00:00.000Z`
}


export async function offlineQueueRequest(action: string, item?: QueuedMutation): Promise<any> {
  if (!('serviceWorker' in navigator)) throw new Error('Este navegador não permite salvar offline.')
  const registration = await navigator.serviceWorker.ready
  const worker = navigator.serviceWorker.controller || registration.active
  if (!worker) throw new Error('Abra o app com internet para preparar o modo offline.')
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Não foi possível acessar os dados offline. Tente novamente.')) }, action === 'sync' ? 60_000 : 15_000)
    channel.port1.onmessage = event => {
      clearTimeout(timer); channel.port1.close()
      event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.result)
    }
    worker.postMessage({ type: 'vynta:queue', action, item }, [channel.port2])
  })
}

export async function readMutationQueue(): Promise<(QueuedMutation & { error?: string })[]> {
  return offlineQueueRequest('list')
}
export async function readQueue() { return (await readMutationQueue()).filter(item => item.url === '/api/transactions') }
export async function getTotalQueuedCount() { return (await readMutationQueue()).length }

export async function enqueueMutation(entry: Omit<QueuedMutation, 'localId' | 'queuedAt'> & { localId?: string }) {
  const item = { ...entry, localId: entry.localId || crypto.randomUUID(), queuedAt: Date.now() }
  await offlineQueueRequest('enqueue', item)
  window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_CHANGED_EVENT))
  return item.localId
}
export async function enqueueTransaction(tx: Omit<QueuedTransaction, 'localId' | 'queuedAt'>, localId = crypto.randomUUID()) {
  return enqueueMutation({ url: '/api/transactions', method: 'POST', body: JSON.stringify(tx), localId })
}

export async function postTransaction(tx: Pick<QueuedTransaction, 'title' | 'amount' | 'type' | 'category' | 'date'>, mutationId = crypto.randomUUID()) {
  try {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-vynta-sync': '1', 'x-vynta-mutation-id': mutationId },
      body: JSON.stringify(tx),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.success) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status })
    return data.transaction as { id: string }
  } catch (error) { throw Object.assign(error as Error, { mutationId }) }
}

export async function syncQueue(): Promise<number> {
  if (!navigator.onLine) return 0
  const synced = await offlineQueueRequest('sync')
  if (synced > 0) window.dispatchEvent(new CustomEvent(TRANSACTION_CREATED_EVENT, { detail: { source: 'offline-sync' } }))
  return synced
}

/** Older drafts had no account ID. Show them for review instead of silently assigning another account's data. */
export function readLegacyDrafts(): QueuedMutation[] {
  const result: QueuedMutation[] = []
  for (const key of [QUEUE_KEY, MUTATION_QUEUE_KEY]) {
    try {
      const rows = JSON.parse(localStorage.getItem(key) || '[]')
      if (!Array.isArray(rows)) continue
      for (const item of rows) {
        if (!item?.localId) continue
        result.push(key === QUEUE_KEY ? { localId: item.localId, queuedAt: item.queuedAt, url: '/api/transactions', method: 'POST', body: JSON.stringify(item) } : item)
      }
    } catch {}
  }
  return result
}
export async function recoverLegacyDraft(item: QueuedMutation) {
  await offlineQueueRequest('enqueue', item)
  for (const key of [QUEUE_KEY, MUTATION_QUEUE_KEY]) {
    try {
      const rows = JSON.parse(localStorage.getItem(key) || '[]')
      if (Array.isArray(rows)) localStorage.setItem(key, JSON.stringify(rows.filter(row => row.localId !== item.localId)))
    } catch {}
  }
  window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_CHANGED_EVENT))
}
