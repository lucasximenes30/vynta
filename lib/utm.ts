const UTM_STORAGE_KEY = 'vynta_utm'
const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const

export type UtmParams = Partial<Record<(typeof UTM_PARAMS)[number], string>>

function readStored(): UtmParams | null {
  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as UtmParams) : null
  } catch {
    return null
  }
}

// Reads UTM tags from the current URL and keeps the newest tagged visit
// (last touch). No-ops when the URL carries no utm_* params, so direct
// visits never erase a previous tagged source.
export function captureUtmFromLocation(): void {
  if (typeof window === 'undefined') return
  try {
    const params = new URLSearchParams(window.location.search)
    const utm: UtmParams = {}
    for (const key of UTM_PARAMS) {
      const value = params.get(key)
      if (value) utm[key] = value.slice(0, 200)
    }
    if (Object.keys(utm).length > 0) {
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm))
    }
  } catch {}
}

// Attached to funnel event metadata so signup/purchase rows in funnel_events
// carry the campaign that brought the session (queried in admin/analytics).
export function getUtmMetadata(): UtmParams | undefined {
  if (typeof window === 'undefined') return undefined
  const stored = readStored()
  return stored && Object.keys(stored).length > 0 ? stored : undefined
}
