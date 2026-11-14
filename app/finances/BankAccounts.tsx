'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Landmark, Plus, X } from 'lucide-react'
import { type BankAccountView, formatBankDate, parseBankBalance } from '@/lib/bankAccounts'
import { getLocalToday } from '@/lib/dateUtils'

const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function BankAccounts() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<BankAccountView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<BankAccountView | null>(null)
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [date, setDate] = useState('')
  const [primary, setPrimary] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  async function reload() {
    setError('')
    try {
      const response = await fetch('/api/bank-accounts', { cache: 'no-store' })
      if (!response.ok) throw Error('Não foi possível carregar suas contas. Tente novamente online.')
      setAccounts((await response.json()).accounts)
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar') }
    finally { setLoading(false) }
  }
  useEffect(() => { void reload() }, [])
  function open(account: BankAccountView | null) {
    setEditing(account); setName(account?.name ?? '')
    setBalance(account ? (account.balanceCents / 100).toFixed(2).replace('.', ',') : '')
    setDate(account?.balanceDate ?? getLocalToday()); setPrimary(account?.isPrimary ?? accounts.length === 0)
    setError(''); dialog.current?.showModal()
  }
  async function save(event: React.FormEvent) {
    event.preventDefault()
    const cents = parseBankBalance(balance)
    if (cents === null) { setError('Informe um valor como 129,12 ou -50,00.'); return }
    setSaving(true); setError('')
    try {
      const response = await fetch(`/api/bank-accounts${editing ? '/' + editing.id : ''}`, {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, balanceCents: cents, balanceDate: date, isPrimary: primary }),
      })
      const result = await response.json()
      if (!response.ok) throw Error(result.error ?? 'Não foi possível salvar')
      dialog.current?.close(); await reload(); router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro de conexão. Confira a lista antes de tentar novamente.') }
    finally { setSaving(false) }
  }
  async function remove(account: BankAccountView) {
    if (!window.confirm(`Remover o cadastro de ${account.name}? Seus lançamentos financeiros permanecem intactos.`)) return
    setSaving(true); setError('')
    try {
      const response = await fetch('/api/bank-accounts/' + account.id, { method: 'DELETE' })
      if (!response.ok) throw Error('Não foi possível remover a conta')
      await reload(); router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro de conexão') }
    finally { setSaving(false) }
  }
  const inputClass = 'mt-1 w-full min-w-0 rounded-xl border border-surface-300 bg-white px-3 py-3 text-base dark:border-surface-700 dark:bg-surface-900'
  return <section aria-labelledby="bank-accounts-title" className="rounded-2xl border border-surface-200 bg-white p-4 sm:p-6 dark:border-surface-800 dark:bg-surface-900">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="bank-accounts-title" className="flex items-center gap-2 font-display text-lg font-semibold"><Landmark className="h-5 w-5 text-brand-500" />Contas bancárias</h2>
      <button onClick={() => open(null)} disabled={loading || saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" />Adicionar conta</button>
    </div>
    <p className="mt-2 text-sm leading-relaxed text-surface-600 dark:text-surface-400">Saldos informados por você, na data indicada. Atualize após conferir o banco. Lançamentos, salários e faturas não alteram estes valores automaticamente.</p>
    {loading && <p role="status" className="mt-4 text-sm">Carregando contas…</p>}
    {error && !dialog.current?.open && <p role="alert" className="mt-3 text-sm text-red-600">{error} <button onClick={reload} className="underline">Tentar novamente</button></p>}
    {!loading && !error && accounts.length === 0 && <p className="mt-4 text-sm text-surface-500">Cadastre a conta que você usa no dia a dia. O saldo não será lançado como receita.</p>}
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {accounts.map(account => <article key={account.id} className="min-w-0 rounded-xl border border-surface-200 p-4 dark:border-surface-700">
        <div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-semibold">{account.name}</h3>{account.isPrimary && <span className="rounded-full bg-brand-100 px-2 py-1 text-xs text-brand-800 dark:bg-brand-900 dark:text-brand-200">Principal</span>}</div>
        <p className="mt-3 text-xs text-surface-500 dark:text-surface-400">Saldo informado</p>
        <p className="break-all text-2xl font-semibold">{money(account.balanceCents)}</p>
        <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">Conferido em {formatBankDate(account.balanceDate)}</p>
        <div className="mt-3 flex flex-wrap gap-3"><button disabled={saving} onClick={() => open(account)} className="min-h-11 text-sm font-semibold text-brand-600 dark:text-brand-300">Atualizar saldo</button><button disabled={saving} onClick={() => remove(account)} className="min-h-11 text-sm text-surface-500">Remover</button></div>
      </article>)}
    </div>
    <dialog ref={dialog} aria-labelledby="bank-form-title" onCancel={event => { if (saving) event.preventDefault() }} className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto overscroll-contain rounded-2xl bg-white p-5 text-surface-900 shadow-xl backdrop:bg-black/60 dark:bg-surface-900 dark:text-white">
      <form onSubmit={save} className="min-w-0 space-y-4">
        <div className="flex items-center justify-between gap-3"><h2 id="bank-form-title" className="text-lg font-semibold">{editing ? 'Atualizar conta' : 'Adicionar conta'}</h2><button type="button" aria-label="Fechar" disabled={saving} onClick={() => dialog.current?.close()} className="p-2"><X className="h-5 w-5" /></button></div>
        <p className="text-sm text-surface-500 dark:text-surface-400">Informe o saldo que aparece no banco. Isso não cria uma receita nem altera seu resultado mensal.</p>
        <label className="block text-sm">Nome da conta<input autoFocus required maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Itaú" className={inputClass} /></label>
        <label className="block text-sm">Saldo informado (R$)<input required inputMode="decimal" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0,00" className={inputClass} /></label>
        <label className="block min-w-0 text-sm">Data da conferência<input required type="date" max={getLocalToday()} value={date} onChange={e => setDate(e.target.value)} className={inputClass} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={primary} disabled={Boolean(editing?.isPrimary)} onChange={e => setPrimary(e.target.checked)} />Minha conta principal</label>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button disabled={saving} className="min-h-12 w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar conta'}</button>
      </form>
    </dialog>
  </section>
}
