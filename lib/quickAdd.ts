'use client'

// Client-side helpers for the quick-add sheet: open/close events and an offline queue,
// so an expense typed with no signal is saved on the device and synced later.

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

export const QUICK_ADD_OPEN_EVENT = 'vynta:quick-add'
export const TRANSACTION_CREATED_EVENT = 'vynta:transaction-created'
export const QUEUE_KEY = 'vynta_tx_queue'

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
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(queue: QueuedTransaction[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function enqueueTransaction(tx: Omit<QueuedTransaction, 'localId' | 'queuedAt'>) {
  writeQueue([...readQueue(), { ...tx, localId: crypto.randomUUID(), queuedAt: Date.now() }])
}

export async function postTransaction(tx: Pick<QueuedTransaction, 'title' | 'amount' | 'type' | 'category' | 'date'>) {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tx),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.success) {
    const error = new Error(data.error || `HTTP ${res.status}`) as Error & { status?: number }
    error.status = res.status
    throw error
  }
  return data.transaction as { id: string }
}

let syncing = false

/** Sends queued transactions; returns how many were synced. Stops at the first network failure. */
export async function syncQueue(): Promise<number> {
  if (syncing || !navigator.onLine) return 0
  const queue = readQueue()
  if (queue.length === 0) return 0

  syncing = true
  let synced = 0
  try {
    for (const item of queue) {
      try {
        await postTransaction(item)
        synced++
      } catch (err: any) {
        // Network/server down or logged out: keep the rest for later. Validation errors drop the item.
        if (!err?.status || err.status >= 500 || err.status === 401) break
      }
      writeQueue(readQueue().filter((q) => q.localId !== item.localId))
    }
  } finally {
    syncing = false
  }
  if (synced > 0) window.dispatchEvent(new CustomEvent(TRANSACTION_CREATED_EVENT))
  return synced
}
