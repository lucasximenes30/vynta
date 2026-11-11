export class BodyTooLargeError extends Error {
  constructor() { super('O conteúdo excede o tamanho permitido.') }
}

/** Enforce the actual byte count, even with chunked bodies or a lying Content-Length. */
export async function readBoundedText(source: Request | Response, maxBytes: number): Promise<string> {
  const declared = Number(source.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) throw new BodyTooLargeError()
  if (!source.body) return ''
  const reader = source.body.getReader()
  const decoder = new TextDecoder()
  let size = 0
  let text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel()
        throw new BodyTooLargeError()
      }
      text += decoder.decode(value, { stream: true })
    }
    return text + decoder.decode()
  } finally { reader.releaseLock() }
}
