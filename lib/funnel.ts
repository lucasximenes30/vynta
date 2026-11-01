const SESSION_COOKIE_NAME = 'vynta_session_id'

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

function setCookie(name: string, value: string, days: number = 30) {
  if (typeof document === 'undefined') return
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/;SameSite=Lax`
}

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server'

  let sessionId = getCookie(SESSION_COOKIE_NAME)
  if (!sessionId) {
    try {
      sessionId = localStorage.getItem(SESSION_COOKIE_NAME)
    } catch {}
  }

  if (!sessionId) {
    sessionId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  setCookie(SESSION_COOKIE_NAME, sessionId, 30)
  try {
    localStorage.setItem(SESSION_COOKIE_NAME, sessionId)
  } catch {}

  return sessionId
}

export async function trackFunnelEvent(eventName: string, metadata?: Record<string, any>) {
  try {
    const sessionId = getOrCreateSessionId()

    await fetch('/api/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        eventName,
        metadata,
      }),
      keepalive: true,
    }).catch(() => {
      // Ignore network errors silently for analytics
    })
  } catch {
    // Failsafe so analytics never break the app
  }
}
