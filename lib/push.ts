// Client-side Web Push helpers (browser only).
// Each browser/device keeps its own subscription; the server stores all of them per account
// (no device limit), so phone + computer + tablet all receive the same notifications.

export type PushSupport = 'supported' | 'ios-needs-install' | 'unsupported'
export type PushState = { support: PushSupport; permission: NotificationPermission | 'unsupported'; subscribed: boolean }

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const SYNC_KEY = 'vynta_push_synced_at'
const OPTOUT_KEY = 'vynta_push_optout'
export const PUSH_CHANGED_EVENT = 'vynta:push-changed'

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

function isBrave() {
  return typeof (navigator as any).brave?.isBrave === 'function'
}

export function getPushSupport(): PushSupport {
  if (typeof window === 'undefined' || !VAPID_PUBLIC_KEY) return 'unsupported'
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  // iOS/iPadOS (16.4+) only exposes Web Push to apps added to the home screen.
  if (isIOS && !isStandalone()) return 'ios-needs-install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  return 'supported'
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then((v) => { clearTimeout(timer); resolve(v) }, (e) => { clearTimeout(timer); reject(e) })
  })
}

async function getReadyRegistration() {
  if (!(await navigator.serviceWorker.getRegistration())) await navigator.serviceWorker.register('/sw.js')
  return withTimeout(navigator.serviceWorker.ready, 10000, 'O serviço de notificações do navegador não iniciou. Recarregue a página e tente de novo.')
}

/** A subscription created with an older VAPID key is rejected (403) by the push service. */
function usesCurrentKey(sub: PushSubscription, key: Uint8Array) {
  const current = sub.options?.applicationServerKey
  if (!current) return true
  const bytes = new Uint8Array(current)
  return bytes.length === key.length && bytes.every((b, i) => b === key[i])
}

function friendlyPushError(err: unknown): Error {
  const name = (err as any)?.name
  const msg = String((err as any)?.message || '')
  if (isBrave()) {
    return new Error('O Brave bloqueia notificações por padrão. Abra brave://settings/privacy, ative "Usar os serviços do Google para mensagens push", reinicie o navegador e tente de novo.')
  }
  if (name === 'NotAllowedError') return new Error('O navegador bloqueou as notificações. Libere em Configurações do site → Notificações.')
  if (name === 'AbortError' || /push service/i.test(msg)) {
    return new Error('O serviço de push do navegador recusou a inscrição. Verifique se as notificações do navegador estão liberadas no sistema (Windows: Configurações → Sistema → Notificações) e tente de novo.')
  }
  return new Error('Não foi possível ativar as notificações neste aparelho. Tente novamente.')
}

async function subscribe() {
  const reg = await getReadyRegistration()
  const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  try {
    const existing = await reg.pushManager.getSubscription()
    if (existing && usesCurrentKey(existing, key)) return existing
    if (existing) await existing.unsubscribe().catch(() => {})
    return await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
  } catch (err) {
    throw friendlyPushError(err)
  }
}

async function sendToServer(subscription: PushSubscription) {
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
  })
  if (!res.ok) throw new Error('Não foi possível salvar este aparelho. Verifique sua conexão e tente de novo.')
  localStorage.setItem(SYNC_KEY, String(Date.now()))
}

export async function getPushState(): Promise<PushState> {
  const support = getPushSupport()
  if (support !== 'supported') return { support, permission: 'unsupported', subscribed: false }
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = reg ? await reg.pushManager.getSubscription() : null
  const valid = !!sub && usesCurrentKey(sub, urlBase64ToUint8Array(VAPID_PUBLIC_KEY))
  return { support, permission: Notification.permission, subscribed: valid && Notification.permission === 'granted' }
}

/** Must be called from a user gesture (tap/click). */
export async function enablePush(): Promise<PushState> {
  if (getPushSupport() !== 'supported') return getPushState()

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    window.dispatchEvent(new Event(PUSH_CHANGED_EVENT))
    return getPushState()
  }

  await sendToServer(await subscribe())
  localStorage.removeItem(OPTOUT_KEY)
  window.dispatchEvent(new Event(PUSH_CHANGED_EVENT))
  return getPushState()
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = reg ? await reg.pushManager.getSubscription() : null
  if (sub) {
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {})
    await sub.unsubscribe().catch(() => {})
  }
  localStorage.removeItem(SYNC_KEY)
  localStorage.setItem(OPTOUT_KEY, '1')
  window.dispatchEvent(new Event(PUSH_CHANGED_EVENT))
  return getPushState()
}

/**
 * Called on the login/register screens: unlinks this device from whatever account used it,
 * so a logged-out phone stops getting someone's reminders. The next app load re-links it.
 */
export async function detachPushFromAccount() {
  if (getPushSupport() !== 'supported') return
  localStorage.removeItem(SYNC_KEY)
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = reg ? await reg.pushManager.getSubscription() : null
  if (!sub) return
  await fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint }),
    keepalive: true,
  }).catch(() => {})
}

/**
 * Re-sends the subscription to the server at most once a day (or right after login): keeps the
 * device tied to the account currently logged in and recovers from server-side pruning.
 * `force` skips the daily throttle (used by the notification settings screen).
 */
export async function syncPushSubscription(force = false) {
  if (getPushSupport() !== 'supported' || Notification.permission !== 'granted') return
  if (localStorage.getItem(OPTOUT_KEY)) return
  if (!force && Date.now() - Number(localStorage.getItem(SYNC_KEY) || 0) < 24 * 60 * 60 * 1000) return
  // Permission is already granted, so (re)subscribing needs no prompt.
  await subscribe().then(sendToServer).catch(() => {})
}
