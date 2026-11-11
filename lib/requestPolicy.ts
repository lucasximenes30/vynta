const MACHINE_CALLBACKS = new Set(['/api/webhooks/abacatepay', '/api/billing/cakto/webhook'])
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function isAllowedMutationOrigin(request: Request): boolean {
  const target = new URL(request.url)
  if (SAFE_METHODS.has(request.method) || MACHINE_CALLBACKS.has(target.pathname)) return true
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false
  const origin = request.headers.get('origin')
  // Browser mutations require an exact origin. Cron GET requests never enter this
  // branch, and their Bearer authentication stays in the cron handler.
  if (!origin || origin === 'null') return false
  try { return new URL(origin).origin === target.origin } catch { return false }
}

export function apiBodyLimit(path: string): number {
  return path === '/api/cards/import' ? 1024 * 1024 : 256 * 1024
}
