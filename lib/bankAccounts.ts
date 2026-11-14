export interface BankAccountView {
  id: string
  name: string
  balanceCents: number
  balanceDate: string
  isPrimary: boolean
}

/** Accept Brazilian currency input without silently truncating malformed values. */
export function parseBankBalance(value: string): number | null {
  const normalized = value.trim()
  if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(normalized)) return null
  const [whole, fraction = ''] = normalized.replace(/\./g, '').replace('-', '').split(',')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) && cents <= 999_999_999_999 ? (normalized.startsWith('-') ? -cents : cents) : null
}

export function formatBankDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}
