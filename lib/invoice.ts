// Credit-card invoice helpers shared by client (import wizard, invoice viewer, notification
// fallback) and server (card import dedupe, notification amounts). Pure — no DB, no Node APIs.
//
// Nubank CSV format (exported from the app: Fatura → Acessar fatura → Compartilhar → CSV por e-mail):
//   date,title,amount
//   2026-10-08,"Amazon - Parcela 6/10","390,14"
//   2026-10-15,Pagamento recebido,"- 1.123,60"
// Amounts are Brazilian format inside quotes; negative = payment received (skipped).
// Older exports include a `category` column — both layouts are supported.

export interface CardCycleDays {
  closingDay: number
  dueDay: number
}

export interface ParsedInvoiceItem {
  date: string // YYYY-MM-DD (posting date inside the invoice)
  title: string
  amount: number // value as it appears on the invoice (per-installment value for installments)
  isInstallment: boolean
  currentInstallment: number | null
  totalInstallments: number | null
}

export interface ParsedInvoice {
  items: ParsedInvoiceItem[]
  skippedPayments: number
  invalidLines: number
}

/** "1.234,56" / "- 1.123,60" / "19,90" / 1234.56 -> number */
export function parseBrazilianAmount(raw: string): number | null {
  if (!raw) return null
  let s = raw.replace(/["\sR$]/g, '')
  if (!s) return null
  const negative = s.startsWith('-')
  s = s.replace(/[^0-9.,]/g, '')
  if (!s) return null
  let value: number
  if (s.includes(',')) {
    value = parseFloat(s.replace(/\./g, '').replace(',', '.'))
  } else {
    value = parseFloat(s)
  }
  if (!Number.isFinite(value)) return null
  return negative ? -Math.abs(value) : value
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields.map((f) => f.trim())
}

const INSTALLMENT_RE = /\s*[-–—]?\s*parcela\s+(\d+)\s*[/de]+\s*(\d+)\s*$/i
const PAYMENT_RE = /pagamento\s+recebido|estorno|chargeback/i

/** Parses a Nubank invoice CSV. Accepts `date,title,amount` and `date,category,title,amount`. */
export function parseNubankCsv(text: string): ParsedInvoice {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const result: ParsedInvoice = { items: [], skippedPayments: 0, invalidLines: 0 }
  if (lines.length === 0) return result

  let startIndex = 0
  let amountCol = 2
  let titleCol = 1
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  if (header[0] === 'date') {
    startIndex = 1
    titleCol = header.findIndex((h) => h === 'title')
    amountCol = header.findIndex((h) => h === 'amount')
    if (titleCol < 0) titleCol = header.length - 2
    if (amountCol < 0) amountCol = header.length - 1
  }

  for (let i = startIndex; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    const date = cols[0]
    const titleRaw = cols[titleCol] ?? ''
    const amountRaw = cols[amountCol] ?? ''
    const amount = parseBrazilianAmount(amountRaw)

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !titleRaw || amount == null) {
      result.invalidLines++
      continue
    }

    if (amount <= 0 || PAYMENT_RE.test(titleRaw)) {
      result.skippedPayments++
      continue
    }

    let title = titleRaw.replace(/\s+/g, ' ').trim()
    let isInstallment = false
    let currentInstallment: number | null = null
    let totalInstallments: number | null = null

    const match = title.match(INSTALLMENT_RE)
    if (match) {
      isInstallment = true
      currentInstallment = parseInt(match[1], 10)
      totalInstallments = parseInt(match[2], 10)
      title = title.replace(match[0], '').replace(/[-–—\s]+$/, '').trim()
    }

    result.items.push({ date, title, amount, isInstallment, currentInstallment, totalInstallments })
  }

  return result
}

/** Extracts the invoice due date from the exported filename: Nubank_2026-11-15.csv -> 2026-11-15 */
export function invoiceDueDateFromFilename(filename: string): string | null {
  const m = filename.match(/(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

// ---------- Invoice cycle math (mirrors services/transaction.service.ts computeBalance) ----------

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function monthIndex(year: number, month0: number): number {
  return year * 12 + month0
}

function idxToYearMonth(idx: number): { year: number; month0: number } {
  return { year: Math.floor(idx / 12), month0: ((idx % 12) + 12) % 12 }
}

/** Bill (closing-cycle) month index for a purchase date, honoring the card closing day. */
export function billMonthIndexForDate(date: Date, card: CardCycleDays): number {
  let m = monthIndex(date.getFullYear(), date.getMonth())
  if (date.getDate() > card.closingDay) m += 1
  return m
}

/** The month index in which a bill month is paid (dueDay < closingDay pays the following month). */
export function dueMonthIndexForBill(billIdx: number, card: CardCycleDays): number {
  return card.dueDay < card.closingDay ? billIdx + 1 : billIdx
}

export function invoiceDueDate(card: CardCycleDays, billYear: number, billMonth0: number): Date {
  const { year, month0 } = idxToYearMonth(dueMonthIndexForBill(monthIndex(billYear, billMonth0), card))
  return new Date(year, month0, card.dueDay)
}

export function invoiceClosingDate(card: CardCycleDays, billYear: number, billMonth0: number): Date {
  return new Date(billYear, billMonth0, card.closingDay, 23, 59, 59, 999)
}

export interface InvoiceItemLike {
  id: string
  title: string
  type?: string
  amount: number | string
  installmentAmount?: number | string | null
  date: Date | string
  purchaseDate?: Date | string | null
  isInstallment?: boolean | null
  totalInstallments?: number | null
  isRecurring?: boolean | null
  recurringDay?: number | null
  isActive?: boolean | null
  endDate?: Date | string | null
  cardId?: string | null
}

export interface InvoiceItem {
  key: string
  title: string
  amount: number // value that lands on THIS invoice (per-installment value)
  day: number // day of month shown in the list
  date: Date
  installment: { current: number; total: number } | null
  recurring: boolean
}

/** All items that compose the invoice of a given bill cycle (year + 0-based month). */
export function getCardInvoiceItems(
  card: CardCycleDays & { id: string },
  transactions: InvoiceItemLike[],
  billYear: number,
  billMonth0: number,
): InvoiceItem[] {
  const target = monthIndex(billYear, billMonth0)
  const items: InvoiceItem[] = []

  for (const t of transactions) {
    if (t.cardId !== card.id) continue
    if (t.type && t.type !== 'EXPENSE') continue
    const date = toDate(t.date)
    if (!date) continue
    const amount = Number(t.amount) || 0

    if (t.isInstallment && t.totalInstallments && t.purchaseDate) {
      const pd = toDate(t.purchaseDate)
      if (!pd) continue
      const firstBill = billMonthIndexForDate(pd, card)
      const n = target - firstBill + 1
      if (n < 1 || n > t.totalInstallments) continue
      const instValue = t.installmentAmount != null ? Number(t.installmentAmount) : amount / t.totalInstallments
      items.push({
        key: `${t.id}:${n}`,
        title: t.title,
        amount: instValue,
        day: pd.getDate(),
        date: pd,
        installment: { current: n, total: t.totalInstallments },
        recurring: false,
      })
    } else if (t.isRecurring) {
      // Recurring card charges land on every invoice while active
      const start = date
      const firstIdx = billMonthIndexForDate(start, card)
      if (target < firstIdx) continue
      const end = toDate(t.endDate)
      if (end && billMonthIndexForDate(end, card) < target) continue
      if (t.isActive === false && !end) continue
      items.push({
        key: t.id,
        title: t.title,
        amount,
        day: t.recurringDay ?? start.getDate(),
        date: start,
        installment: null,
        recurring: true,
      })
    } else {
      if (billMonthIndexForDate(date, card) !== target) continue
      items.push({
        key: t.id,
        title: t.title,
        amount,
        day: date.getDate(),
        date,
        installment: null,
        recurring: false,
      })
    }
  }

  items.sort((a, b) => b.day - a.day || a.title.localeCompare(b.title))
  return items
}

export function getCardInvoiceTotal(
  card: CardCycleDays & { id: string },
  transactions: InvoiceItemLike[],
  billYear: number,
  billMonth0: number,
): number {
  return getCardInvoiceItems(card, transactions, billYear, billMonth0).reduce((s, i) => s + i.amount, 0)
}

/** Sorted bill-cycle indices ({year, month0}) that contain any item, plus the open invoice. */
export function listInvoiceMonths(
  card: CardCycleDays & { id: string },
  transactions: InvoiceItemLike[],
  now = new Date(),
): Array<{ year: number; month0: number }> {
  const months = new Set<number>()

  for (const t of transactions) {
    if (t.cardId !== card.id) continue
    if (t.type && t.type !== 'EXPENSE') continue
    const date = toDate(t.date)
    if (!date) continue

    if (t.isInstallment && t.totalInstallments && t.purchaseDate) {
      const pd = toDate(t.purchaseDate)
      if (!pd) continue
      const first = billMonthIndexForDate(pd, card)
      for (let i = 0; i < t.totalInstallments; i++) months.add(first + i)
    } else if (t.isRecurring) {
      const first = billMonthIndexForDate(date, card)
      const end = toDate(t.endDate)
      const last = end ? billMonthIndexForDate(end, card) : billMonthIndexForDate(now, card) + 6
      for (let i = first; i <= last; i++) months.add(i)
    } else {
      months.add(billMonthIndexForDate(date, card))
    }
  }

  // Always include the currently open invoice
  months.add(billMonthIndexForDate(now, card))

  return Array.from(months)
    .sort((a, b) => a - b)
    .map(idxToYearMonth)
}

export type InvoiceStatus = 'OPEN' | 'CLOSED' | 'DUE' | 'FUTURE'

export function invoiceStatus(
  card: CardCycleDays,
  billYear: number,
  billMonth0: number,
  now = new Date(),
): InvoiceStatus {
  const current = billMonthIndexForDate(now, card)
  const target = monthIndex(billYear, billMonth0)
  if (target > current) return 'FUTURE'
  if (now > invoiceDueDate(card, billYear, billMonth0)) return 'DUE'
  if (now > invoiceClosingDate(card, billYear, billMonth0)) return 'CLOSED'
  return 'OPEN'
}

/**
 * Estimated committed limit for imported items: each installment commits only its
 * REMAINING installments (amount × (total − current + 1)) — already-billed
 * installments were paid on previous invoices and released the limit.
 */
export function estimateCommittedFromItems(
  items: Array<{
    amount: number
    isInstallment: boolean
    currentInstallment?: number | null
    totalInstallments: number | null
  }>,
): number {
  return items.reduce((sum, i) => {
    if (i.isInstallment && i.totalInstallments) {
      const remaining = Math.max(i.totalInstallments - (i.currentInstallment ?? 1) + 1, 1)
      return sum + i.amount * remaining
    }
    return sum + i.amount
  }, 0)
}

/**
 * Credit limit actually committed, mirroring how Nubank computes "limite usado":
 * charges sitting on invoices not yet paid. An invoice is assumed paid at its due
 * date, so a charge occupies the limit only while its bill cycle's due date is
 * still in the future. For installments only the parcelas that haven't been
 * billed-and-due count; for recurring charges only the latest posted one does.
 */
export function computeCommittedLimit(
  card: CardCycleDays & { id: string },
  transactions: InvoiceItemLike[],
  now = new Date(),
): number {
  let committed = 0

  for (const t of transactions) {
    if (t.cardId !== card.id) continue
    if (t.type && t.type !== 'EXPENSE') continue
    const date = toDate(t.date)
    if (!date) continue
    const amount = Number(t.amount) || 0

    if (t.isInstallment && t.totalInstallments && t.purchaseDate) {
      const pd = toDate(t.purchaseDate)
      if (!pd) continue
      const first = billMonthIndexForDate(pd, card)
      const instValue = t.installmentAmount != null ? Number(t.installmentAmount) : amount / t.totalInstallments
      for (let i = 0; i < t.totalInstallments; i++) {
        const { year, month0 } = idxToYearMonth(first + i)
        if (invoiceDueDate(card, year, month0) >= now) committed += instValue
      }
    } else if (t.isRecurring) {
      const end = toDate(t.endDate)
      if (t.isActive === false && !end) continue
      const first = billMonthIndexForDate(date, card)
      // Most recent invoice the charge could have landed on
      const last = Math.min(
        billMonthIndexForDate(now, card),
        end ? billMonthIndexForDate(end, card) : Infinity,
      )
      if (last < first) continue
      const { year, month0 } = idxToYearMonth(last)
      if (invoiceDueDate(card, year, month0) >= now) committed += amount
    } else {
      const { year, month0 } = idxToYearMonth(billMonthIndexForDate(date, card))
      if (invoiceDueDate(card, year, month0) >= now) committed += amount
    }
  }

  return Math.round(committed * 100) / 100
}
