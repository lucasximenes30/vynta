// Sends GA4 conversion events. The GTM container (GTM-TVT2XQSL) loads gtag.js
// on the acquisition routes, so gtag('event', ...) reaches the GA4 property
// without extra container configuration. dataLayer push is kept as a fallback
// so a future GTM trigger can also pick the events up. Safe no-op on routes
// where neither exists (logged-in app screens).
export function gtmEvent(eventName: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return
  try {
    const w = window as unknown as {
      gtag?: (...args: unknown[]) => void
      dataLayer?: Record<string, unknown>[]
    }
    if (typeof w.gtag === 'function') {
      w.gtag('event', eventName, params)
    } else {
      w.dataLayer = w.dataLayer || []
      w.dataLayer.push({ event: eventName, ...params })
    }
  } catch {}
}
