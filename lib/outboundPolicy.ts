/** Destinations used by the product, not arbitrary user-supplied HTTP servers. */
function httpsDestination(value: string): URL | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return null
    return url
  } catch { return null }
}

export function isAllowedCalendarUrl(value: string): boolean {
  const url = httpsDestination(value)
  return !!url && url.hostname === 'calendar.google.com' && url.pathname.startsWith('/calendar/ical/') && url.pathname.endsWith('.ics')
}

export function isAllowedPushEndpoint(value: string): boolean {
  const url = httpsDestination(value)
  if (!url) return false
  return url.hostname === 'fcm.googleapis.com'
    || url.hostname === 'updates.push.services.mozilla.com'
    || url.hostname === 'web.push.apple.com'
    || url.hostname.endsWith('.notify.windows.com')
}
