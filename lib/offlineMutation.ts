import { createHash } from 'node:crypto'

/** Scope client-generated IDs to the account. No schema or receipt table is needed. */
export function offlineRecordId(
  request: Request,
  userId: string,
): string | undefined {
  const key = request.headers.get('x-vynta-mutation-id')
  if (!key) return undefined
  if (!/^[0-9a-f-]{36}$/i.test(key))
    throw new Error('Identificador de sincronização inválido')
  const hex = createHash('sha256').update(`${userId}:${key}`).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}
