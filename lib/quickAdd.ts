'use client'

// Client-side helpers for the quick-add sheet and the universal 48h offline mutation queue:
// transactions, habit check-ins/creations, agenda events, notes, goals and workouts made while
// offline are saved on the device and synced in order when connectivity returns.

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
const QUEUE_TTL_MS = 48 * 60 * 60 * 1000 // 48 hours

export function openQuickAdd(type: QuickAddType = 'EXPENSE') {
  window.dispatchEvent(new CustomEvent(QUICK_ADD_OPEN_EVENT, { detail: { type } }))
}

/** Local date at noon UTC: the convention used by every transaction date in the app. */
export function todayDateValue(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  return `${local}T12:00:00.000Z`
}

export function readQueue(): QueuedTransaction[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    const now = Date.now()
    return parsed.filter((item) => !item?.queuedAt || now - item.queuedAt <= QUEUE_TTL_MS)
  } catch {
    return []
  }
}

function writeQueue(queue: QueuedTransaction[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_CHANGED_EVENT))
}

export function readMutationQueue(): QueuedMutation[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(MUTATION_QUEUE_KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    const now = Date.now()
    return parsed.filter((item) => !item?.queuedAt || now - item.queuedAt <= QUEUE_TTL_MS)
  } catch {
    return []
  }
}

function writeMutationQueue(queue: QueuedMutation[]) {
  localStorage.setItem(MUTATION_QUEUE_KEY, JSON.stringify(queue))
  window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_CHANGED_EVENT))
}

export function getTotalQueuedCount(): number {
  return readQueue().length + readMutationQueue().length
}

export function enqueueTransaction(tx: Omit<QueuedTransaction, 'localId' | 'queuedAt'>) {
  writeQueue([...readQueue(), { ...tx, localId: crypto.randomUUID(), queuedAt: Date.now() }])
}

export function enqueueMutation(entry: Omit<QueuedMutation, 'localId' | 'queuedAt'>) {
  const current = readMutationQueue()
  // Collapse duplicate habit check-in toggles on the same (habitId, date) while offline
  if (entry.url === '/api/habits/checkin' && entry.body) {
    try {
      const parsed = JSON.parse(entry.body)
      const filtered = current.filter((m) => {
        if (m.url !== '/api/habits/checkin' || !m.body) return true
        try {
          const prev = JSON.parse(m.body)
          return !(prev.habitId === parsed.habitId && prev.date === parsed.date)
        } catch {
          return true
        }
      })
      writeMutationQueue([...filtered, { ...entry, localId: crypto.randomUUID(), queuedAt: Date.now() }])
      return
    } catch {}
  }
  writeMutationQueue([...current, { ...entry, localId: crypto.randomUUID(), queuedAt: Date.now() }])
}

export async function postTransaction(tx: Pick<QueuedTransaction, 'title' | 'amount' | 'type' | 'category' | 'date'>) {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-vynta-sync': '1' },
    body: JSON.stringify(tx),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.success || data.offlineQueued) {
    const error = new Error(data.error || `HTTP ${res.status}`) as Error & { status?: number }
    error.status = data.offlineQueued ? 0 : res.status
    throw error
  }
  return data.transaction as { id: string }
}

let syncing = false

/** Sends queued transactions and offline mutations; returns how many were synced. */
export async function syncQueue(): Promise<number> {
  if (syncing || !navigator.onLine) return 0
  const txQueue = readQueue()
  const mutQueue = readMutationQueue()
  if (txQueue.length === 0 && mutQueue.length === 0) return 0

  syncing = true
  let synced = 0
  let syncedTx = 0
  try {
    for (const item of txQueue) {
      try {
        await postTransaction(item)
        synced++
        syncedTx++
      } catch (err: any) {
        if (!err?.status || err.status >= 500 || err.status === 401) break
      }
      writeQueue(readQueue().filter((q) => q.localId !== item.localId))
    }

    for (const item of readMutationQueue()) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: { 'Content-Type': 'application/json', 'x-vynta-sync': '1' },
          body: item.body,
        })
        if (!res.ok && (res.status >= 500 || res.status === 401)) break
        synced++
      } catch {
        break
      }
      writeMutationQueue(readMutationQueue().filter((q) => q.localId !== item.localId))
    }
  } finally {
    syncing = false
  }
  if (syncedTx > 0) window.dispatchEvent(new CustomEvent(TRANSACTION_CREATED_EVENT))
  return synced
}
