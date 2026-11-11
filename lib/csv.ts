/** All fields are quoted; spreadsheet formula prefixes are always emitted as text. */
export function csvCell(value: unknown): string {
  let text = String(value ?? '')
  if (/^[\s]*[=+\-@＝＋－＠]/u.test(text) || text.startsWith('\t') || text.startsWith('\r')) text = "'" + text
  return '"' + text.replace(/"/g, '""') + '"'
}

export const csvRow = (values: unknown[]) => values.map(csvCell).join(',') + '\r\n'
