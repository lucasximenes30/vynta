// Client-side Web Push helpers (browser only).

export type PushSupport = 'supported' | 'ios-needs-install' | 'unsupported'
export type PushState = { support: PushSupport; permission: NotificationPermission | 'unsupported'; subscribed: boolean }

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const SYNC_KEY = 'vynta_push_synced_at'
const OPTOUT_KEY = 'vynta_push_optout'
export const PUSH_CHANGED_EVENT = 'vynta:push-changed'

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
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

async function getRegistration() {
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register('/sw.js')
}

async function subscribe() {
  await getRegistration()
  const reg = await navigator.serviceWorker.ready
  return (await reg.pushManager.getSubscription()) ?? reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
}

async function sendToServer(subscription: PushSubscription) {
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
  })
  if (!res.ok) throw new Error('Não foi possível salvar a inscrição de notificações')
  localStorage.setItem(SYNC_KEY, String(Date.now()))
}

export async function getPushState(): Promise<PushState> {
  const support = getPushSupport()
  if (support !== 'supported') return { support, permission: 'unsupported', subscribed: false }
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = reg ? await reg.pushManager.getSubscription() : null
  return { support, permission: Notification.permission, subscribed: !!sub && Notification.permission === 'granted' }
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
 */
export async function syncPushSubscription() {
  if (getPushSupport() !== 'supported' || Notification.permission !== 'granted') return
  if (localStorage.getItem(OPTOUT_KEY)) return
  if (Date.now() - Number(localStorage.getItem(SYNC_KEY) || 0) < 24 * 60 * 60 * 1000) return
  // Permission is already granted, so (re)subscribing needs no prompt.
  await subscribe().then(sendToServer).catch(() => {})
}
