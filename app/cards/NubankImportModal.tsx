'use client'

import { useMemo, useRef, useState } from 'react'
import * as Lucide from 'lucide-react'
import {
  parseNubankCsv,
  invoiceDueDateFromFilename,
  estimateCommittedFromItems,
  type ParsedInvoiceItem,
} from '@/lib/invoice'
import { guessCategory, QUICK_EXPENSE_CATEGORIES } from '@/lib/quickCategorize'

interface CardRef {
  id: string
  name: string
  lastFourDigits: string
  dueDay: number
  closingDay: number
}

interface ReviewRow {
  include: boolean
  date: string
  title: string
  amount: string
  isInstallment: boolean
  isRecurring: boolean
  currentInstallment: string
  totalInstallments: string
  category: string
}

// Assinaturas/serviços que quase sempre são cobrança fixa mensal no cartão
const SUBSCRIPTION_RE =
  /netflix|spotify|hbo ?max|hbomax|disney|prime ?video|amazon ?prime|amazonprime|amazonmusic|youtube ?(premium|music)|apple|icloud|google ?(one|storage|play)|deezer|globoplay|paramount|crunchyroll|meli ?mais|melimais|smart ?fit|bluefit|chatgpt|openai|microsoft|office ?365|adobe|dropbox|tinder|audible|kindle|xbox|playstation|nintendo|lastpass|1password|canva|duolingo|claude|github/i

interface ImportResult {
  card: {
    id: string
    name: string
    lastFourDigits: string
    dueDay: number
    closingDay: number
    color: string
    limitAmount: string
    provider: string | null
  }
  imported: number
  skippedDuplicates: number
  limitAmount: string | null
}

interface Props {
  /** Existing card → import attaches to it. Undefined → a Nubank card is created on import. */
  card?: CardRef | null
  onClose: () => void
  onDone: (result: ImportResult) => void
}

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const TUTORIAL_STEPS = [
  { Icon: Lucide.Smartphone, text: 'Abra o app do Nubank e toque no seu cartão de crédito.' },
  { Icon: Lucide.ReceiptText, text: 'Toque na fatura do mês que você quer importar (a fatura aberta ou uma já fechada).' },
  { Icon: Lucide.FileText, text: 'Toque em “Acessar fatura” para abrir os detalhes.' },
  { Icon: Lucide.Share2, text: 'Toque em “Compartilhar” (ou ⋯) e escolha a opção de exportar em CSV — o Nubank envia para o seu e-mail.' },
  { Icon: Lucide.Download, text: 'Abra o e-mail, baixe o arquivo Nubank_AAAA-MM-DD.csv e faça o upload aqui.' },
]

export default function NubankImportModal({ card, onClose, onDone }: Props) {
  const [step, setStep] = useState<'how' | 'file' | 'review' | 'done'>('how')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // New-card fields (only when no existing card was provided)
  const [name, setName] = useState('Nubank')
  const [lastFourDigits, setLastFourDigits] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [closingDay, setClosingDay] = useState('')

  const [availableLimit, setAvailableLimit] = useState('')
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [skippedPayments, setSkippedPayments] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)

  const toRow = (item: ParsedInvoiceItem): ReviewRow => ({
    include: true,
    date: item.date,
    title: item.title,
    amount: item.amount.toFixed(2),
    isInstallment: item.isInstallment,
    isRecurring: !item.isInstallment && SUBSCRIPTION_RE.test(item.title),
    currentInstallment: item.currentInstallment?.toString() ?? '',
    totalInstallments: item.totalInstallments?.toString() ?? '',
    category: guessCategory(item.title, 'EXPENSE') ?? 'General',
  })

  const handleFile = async (file: File) => {
    setError('')
    const text = await file.text()
    const parsed = parseNubankCsv(text)
    if (parsed.items.length === 0) {
      setError(parsed.invalidLines > 0 || parsed.skippedPayments > 0
        ? 'Não encontrei lançamentos nesse arquivo. Confirme que é o CSV da fatura do cartão (não o extrato da conta).'
        : 'Arquivo vazio ou formato inválido. Exporte o CSV da fatura no app do Nubank.')
      return
    }
    setFileName(file.name)
    setRows(parsed.items.map(toRow))
    setSkippedPayments(parsed.skippedPayments)

    // Prefill card fields from the file: due date comes in the filename,
    // closing day is at least the last posting day that made this invoice.
    if (!card) {
      const due = invoiceDueDateFromFilename(file.name)
      if (due) setDueDay(String(Number(due.slice(8, 10))))
      const maxDay = Math.max(...parsed.items.map((i) => Number(i.date.slice(8, 10))))
      if (!closingDay) setClosingDay(String(Math.min(Math.max(maxDay, 1), 31)))
    }
    setStep('review')
  }

  const updateRow = (idx: number, patch: Partial<ReviewRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const included = useMemo(() => rows.filter((r) => r.include), [rows])
  const invoiceTotal = included.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  const committed = included.reduce(
    (s, r) =>
      s +
      estimateCommittedFromItems([
        {
          amount: parseFloat(r.amount) || 0,
          isInstallment: r.isInstallment,
          totalInstallments: r.isInstallment ? parseInt(r.totalInstallments) || 2 : null,
        },
      ]),
    0,
  )
  const available = parseFloat(availableLimit)
  const estimatedLimit = Number.isFinite(available) ? available + committed : null

  const canImport =
    included.length > 0 &&
    (card ? true : name.trim().length > 0 && lastFourDigits.length === 4 && dueDay !== '' && closingDay !== '')

  const submit = async () => {
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/cards/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(card
            ? { cardId: card.id }
            : {
                card: {
                  name: name.trim(),
                  lastFourDigits,
                  dueDay: parseInt(dueDay),
                  closingDay: parseInt(closingDay),
                  color: 'purple',
                  limitAmount: 0,
                  provider: 'nubank',
                },
              }),
          availableLimit: Number.isFinite(available) ? available : null,
          items: included.map((r) => ({
            title: r.title.trim(),
            amount: parseFloat(r.amount),
            date: r.date,
            category: r.category,
            isInstallment: r.isInstallment,
            currentInstallment: r.isInstallment ? parseInt(r.currentInstallment) || 1 : null,
            totalInstallments: r.isInstallment ? parseInt(r.totalInstallments) || 2 : null,
            isRecurring: r.isRecurring,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Falha ao importar a fatura')
        return
      }
      setResult(data as ImportResult)
      setStep('done')
    } catch {
      setError('Erro de conexão')
    } finally {
      setSubmitting(false)
    }
  }

  const monthName = (d: string) => {
    const date = new Date(`${d}T12:00:00`)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 transition-all duration-300 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-surface-900 w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92vh] transition-transform animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-center justify-between border-b border-surface-100 p-4 sm:p-6 dark:border-surface-800/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md">
              <Lucide.FileUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                Importar fatura Nubank
              </h2>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                {step === 'how' && 'Como exportar o CSV da fatura'}
                {step === 'file' && 'Selecione o arquivo CSV'}
                {step === 'review' && `${fileName || 'Fatura'} — revise antes de salvar`}
                {step === 'done' && 'Importação concluída'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 -mr-2 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800 dark:hover:text-surface-300 transition-colors"
          >
            <Lucide.X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          {step === 'how' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-purple-200/60 bg-purple-50/60 dark:border-purple-900/40 dark:bg-purple-950/20 p-4">
                <ol className="space-y-4">
                  {TUTORIAL_STEPS.map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <div className="flex items-start gap-2.5 min-w-0">
                        <s.Icon className="h-4 w-4 mt-0.5 shrink-0 text-purple-600 dark:text-purple-400" />
                        <p className="text-sm text-surface-700 dark:text-surface-300 leading-relaxed">{s.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-xl border border-surface-200 dark:border-surface-700/60 bg-surface-50 dark:bg-surface-800/40 p-3.5 flex gap-3">
                <Lucide.Info className="h-4 w-4 mt-0.5 shrink-0 text-surface-400" />
                <p className="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
                  A exportação em CSV é liberada gradualmente pelo Nubank. Se não aparecer, atualize o app
                  ou peça no chat: <em>“quero minha fatura em CSV”</em>.
                </p>
              </div>
            </div>
          )}

          {step === 'file' && (
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-2xl border-2 border-dashed border-purple-300 dark:border-purple-800/60 bg-purple-50/40 dark:bg-purple-950/10 p-8 flex flex-col items-center gap-3 hover:border-purple-500 dark:hover:border-purple-600 transition-colors"
              >
                <div className="h-12 w-12 rounded-2xl bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Lucide.Upload className="h-6 w-6" />
                </div>
                <div className="text-sm font-medium text-surface-700 dark:text-surface-200">
                  Toque para escolher o arquivo CSV
                </div>
                <div className="text-xs text-surface-400">Nubank_AAAA-MM-DD.csv</div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                  e.target.value = ''
                }}
              />
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-5">
              {!card && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-surface-200 dark:border-surface-700/60 p-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-surface-600 dark:text-surface-300">Apelido</label>
                    <input type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className="input-field" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-surface-600 dark:text-surface-300">Últimos 4 dígitos</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={lastFourDigits}
                      onChange={(e) => setLastFourDigits(e.target.value.replace(/\D/g, ''))}
                      placeholder="9421"
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-surface-600 dark:text-surface-300">Fechamento (dia)</label>
                    <input type="number" min={1} max={31} value={closingDay} onChange={(e) => setClosingDay(e.target.value)} className="input-field" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-surface-600 dark:text-surface-300">Vencimento (dia)</label>
                    <input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="input-field" />
                  </div>
                  <p className="sm:col-span-2 text-[11px] text-surface-400">
                    Sugeridos a partir do arquivo — ajuste se estiver diferente no app do Nubank.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-surface-600 dark:text-surface-300">
                  Limite disponível agora no app do Nubank (opcional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">R$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={availableLimit}
                    onChange={(e) => setAvailableLimit(e.target.value)}
                    placeholder="2500.00"
                    className="input-field pl-9"
                  />
                </div>
                <p className="text-[11px] text-surface-400">
                  Com ele a gente calcula seu limite total automaticamente
                  {estimatedLimit != null && (
                    <strong className="text-surface-600 dark:text-surface-300"> — estimado em R$ {fmtBRL(estimatedLimit)}</strong>
                  )}
                  .
                </p>
              </div>

              {skippedPayments > 0 && (
                <div className="rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-700/60 px-3.5 py-2.5 text-xs text-surface-500 dark:text-surface-400 flex gap-2">
                  <Lucide.CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  {skippedPayments === 1
                    ? '1 pagamento/estorno ignorado (pagamentos não viram despesa).'
                    : `${skippedPayments} pagamentos/estornos ignorados (pagamentos não viram despesa).`}
                </div>
              )}

              <div className="rounded-2xl border border-surface-200 dark:border-surface-700/60 overflow-hidden">
                <div className="divide-y divide-surface-100 dark:divide-surface-800/60">
                  {rows.map((r, i) => (
                    <div key={i} className={`p-3.5 space-y-2.5 transition-opacity ${r.include ? '' : 'opacity-45'}`}>
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <input
                          type="checkbox"
                          checked={r.include}
                          onChange={(e) => updateRow(i, { include: e.target.checked })}
                          className="h-4 w-4 rounded accent-purple-600 shrink-0"
                        />
                        <input
                          type="text"
                          value={r.title}
                          onChange={(e) => updateRow(i, { title: e.target.value })}
                          className="flex-1 min-w-0 bg-transparent text-sm font-medium text-surface-800 dark:text-surface-100 border-b border-transparent focus:border-purple-400 focus:outline-none py-0.5"
                        />
                        <div className="relative shrink-0 w-24 sm:w-28">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-surface-400 text-xs">R$</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={r.amount}
                            onChange={(e) => updateRow(i, { amount: e.target.value })}
                            className="w-full bg-transparent text-sm font-semibold text-right text-surface-800 dark:text-surface-100 border-b border-transparent focus:border-purple-400 focus:outline-none py-0.5 pl-5"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pl-7 flex-wrap">
                        <span className="text-[11px] font-semibold text-surface-400 uppercase tracking-wide shrink-0">
                          {monthName(r.date)}
                        </span>
                        <select
                          value={r.category}
                          onChange={(e) => updateRow(i, { category: e.target.value })}
                          className="text-[11px] rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 px-2 py-1"
                        >
                          {QUICK_EXPENSE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <label className="flex items-center gap-1.5 text-[11px] text-surface-500 dark:text-surface-400">
                          <input
                            type="checkbox"
                            checked={r.isInstallment}
                            onChange={(e) => updateRow(i, { isInstallment: e.target.checked, isRecurring: e.target.checked ? false : r.isRecurring })}
                            className="h-3.5 w-3.5 accent-purple-600"
                          />
                          Parcelado
                        </label>
                        {r.isInstallment && (
                          <span className="flex items-center gap-1 text-[11px] text-surface-500 dark:text-surface-400">
                            <input
                              type="number"
                              min={1}
                              max={99}
                              value={r.currentInstallment}
                              onChange={(e) => updateRow(i, { currentInstallment: e.target.value })}
                              className="w-10 text-center rounded-md border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-1 py-0.5"
                            />
                            de
                            <input
                              type="number"
                              min={2}
                              max={99}
                              value={r.totalInstallments}
                              onChange={(e) => updateRow(i, { totalInstallments: e.target.value })}
                              className="w-10 text-center rounded-md border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-1 py-0.5"
                            />
                            parcelas
                          </span>
                        )}
                        <label className="flex items-center gap-1.5 text-[11px] text-surface-500 dark:text-surface-400">
                          <input
                            type="checkbox"
                            checked={r.isRecurring}
                            onChange={(e) => updateRow(i, { isRecurring: e.target.checked, isInstallment: e.target.checked ? false : r.isInstallment })}
                            className="h-3.5 w-3.5 accent-emerald-600"
                          />
                          Fixo (todo mês)
                        </label>
                        {r.isRecurring && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-full px-1.5 py-0.5">
                            <Lucide.Repeat className="h-3 w-3" />
                            Assinatura
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-surface-50 dark:bg-surface-800/50 px-4 py-3 flex items-center justify-between text-sm border-t border-surface-200 dark:border-surface-700/60">
                  <span className="font-medium text-surface-500 dark:text-surface-400">
                    {included.length} {included.length === 1 ? 'item' : 'itens'} · Fatura
                  </span>
                  <span className="font-bold text-surface-900 dark:text-white">R$ {fmtBRL(invoiceTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {step === 'done' && result && (
            <div className="flex flex-col items-center text-center py-8 space-y-4">
              <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Lucide.Check className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                {result.imported === 1 ? '1 lançamento importado' : `${result.imported} lançamentos importados`}
              </h3>
              <p className="text-sm text-surface-500 dark:text-surface-400 max-w-sm">
                {result.skippedDuplicates > 0 &&
                  `${result.skippedDuplicates} ${result.skippedDuplicates === 1 ? 'item já existia e foi ignorado' : 'itens já existiam e foram ignorados'}. `}
                {result.limitAmount && Number(result.limitAmount) > 0 &&
                  `Limite total atualizado para R$ ${fmtBRL(Number(result.limitAmount))}. `}
                Abra as faturas do cartão para ver o mês importado e as próximas parcelas.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-4 sm:mx-6 mb-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 flex items-start gap-2.5">
            <Lucide.AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex-shrink-0 border-t border-surface-100 p-4 sm:p-6 dark:border-surface-800/50 bg-surface-50 dark:bg-surface-900/50 rounded-b-3xl sm:rounded-b-2xl">
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            {step === 'how' && (
              <button
                type="button"
                onClick={() => setStep('file')}
                className="btn-primary py-2.5 px-6 rounded-xl shadow-sm w-full sm:w-auto flex items-center justify-center gap-2"
              >
                Já tenho o arquivo
                <Lucide.ArrowRight className="h-4 w-4" />
              </button>
            )}
            {step === 'file' && (
              <>
                <button
                  type="button"
                  onClick={() => setStep('how')}
                  className="px-4 py-2.5 text-sm font-medium text-surface-700 bg-white border border-surface-300 rounded-xl hover:bg-surface-50 dark:bg-surface-800 dark:text-surface-300 dark:border-surface-600 dark:hover:bg-surface-700 transition-colors w-full sm:w-auto"
                >
                  Voltar ao tutorial
                </button>
              </>
            )}
            {step === 'review' && (
              <>
                <button
                  type="button"
                  onClick={() => setStep('file')}
                  className="px-4 py-2.5 text-sm font-medium text-surface-700 bg-white border border-surface-300 rounded-xl hover:bg-surface-50 dark:bg-surface-800 dark:text-surface-300 dark:border-surface-600 dark:hover:bg-surface-700 transition-colors w-full sm:w-auto"
                >
                  Trocar arquivo
                </button>
                <button
                  type="button"
                  disabled={!canImport || submitting}
                  onClick={submit}
                  className="btn-primary py-2.5 px-6 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Lucide.Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Lucide.Check className="h-4 w-4" />
                      Importar {included.length} {included.length === 1 ? 'lançamento' : 'lançamentos'}
                    </>
                  )}
                </button>
              </>
            )}
            {step === 'done' && (
              <button
                type="button"
                onClick={() => result && onDone(result)}
                className="btn-primary py-2.5 px-6 rounded-xl shadow-sm w-full sm:w-auto text-center"
              >
                Concluir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
