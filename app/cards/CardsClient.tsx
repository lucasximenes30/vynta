'use client'

import dynamic from 'next/dynamic'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import * as Lucide from 'lucide-react'

import NotificationDropdown from '@/components/NotificationDropdown'
import NubankImportModal from './NubankImportModal'
import CardInvoicePanel from './CardInvoicePanel'
import { billMonthIndexForDate, getCardInvoiceTotal } from '@/lib/invoice'

const PRESET_COLORS = [
  { id: 'blue', label: 'Azul', hex: '#3b82f6', gradient: 'from-blue-500 via-blue-600 to-blue-800' },
  { id: 'purple', label: 'Roxo', hex: '#a855f7', gradient: 'from-purple-500 via-purple-600 to-purple-800' },
  { id: 'pink', label: 'Rosa', hex: '#ec4899', gradient: 'from-pink-500 via-pink-600 to-pink-800' },
  { id: 'red', label: 'Vermelho', hex: '#ef4444', gradient: 'from-red-500 via-red-600 to-red-800' },
  { id: 'orange', label: 'Laranja', hex: '#f97316', gradient: 'from-orange-500 via-orange-600 to-orange-800' },
  { id: 'black', label: 'Preto', hex: '#171717', gradient: 'from-neutral-800 via-neutral-900 to-black ring-white/20' },
  { id: 'gray', label: 'Cinza', hex: '#6b7280', gradient: 'from-gray-500 via-gray-600 to-gray-800' },
]

const CardsBarChart = dynamic(() => import('./CardsBarChart'), { ssr: false })


interface Card {
  id: string
  name: string
  lastFourDigits: string
  dueDay: number
  closingDay: number
  color: string
  limitAmount: string
  provider?: string | null
}

interface Props {
  session: { userId: string; name: string }
  initialCards: Card[]
  transactions?: any[]
}

export default function CardsClient({ session, initialCards, transactions = [] }: Props) {
  const router = useRouter()
  
  const isBRL = true;
  const [cards, setCards] = useState<Card[]>(initialCards)
  const [showModal, setShowModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit'; cardId?: string }>({ isOpen: false, mode: 'create' })
  const [importModal, setImportModal] = useState<{ isOpen: boolean; card?: Card | null }>({ isOpen: false })
  const [openInvoiceCardId, setOpenInvoiceCardId] = useState<string | null>(null)

  const toggleInvoicePanel = (cardId: string) => {
    const next = openInvoiceCardId === cardId ? null : cardId
    setOpenInvoiceCardId(next)
    if (next) {
      // Keep the freshly opened invoice section in view on small screens
      setTimeout(() => {
        document.getElementById(`invoice-panel-${cardId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 120)
    }
  }
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Confirmation Delete Modal
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [lastFourDigits, setLastFourDigits] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [closingDay, setClosingDay] = useState('')
  const [limitAmount, setLimitAmount] = useState('')
  const [color, setColor] = useState('blue')
  const [provider, setProvider] = useState<'' | 'nubank'>('')

  const resetForm = () => {
    setName('')
    setLastFourDigits('')
    setDueDay('')
    setClosingDay('')
    setLimitAmount('')
    setColor('blue')
    setProvider('')
  }

  const openCreateModal = () => {
    resetForm()
    setShowModal({ isOpen: true, mode: 'create' })
  }

  const openEditModal = (card: Card) => {
    setName(card.name)
    setLastFourDigits(card.lastFourDigits)
    setDueDay(card.dueDay.toString())
    setClosingDay(card.closingDay.toString())
    setLimitAmount(card.limitAmount)
    setColor(card.color)
    setProvider(card.provider === 'nubank' ? 'nubank' : '')
    setShowModal({ isOpen: true, mode: 'edit', cardId: card.id })
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const url = showModal.mode === 'create' ? '/api/cards' : `/api/cards/${showModal.cardId}`
      const method = showModal.mode === 'create' ? 'POST' : 'PATCH'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          lastFourDigits,
          dueDay: parseInt(dueDay),
          closingDay: parseInt(closingDay),
          limitAmount: limitAmount === '' ? 0 : parseFloat(limitAmount),
          color,
          provider: provider || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Falha ao processar cartão')
        return
      }

      const { card } = await res.json()

      if (showModal.mode === 'create') {
        setCards([...cards, card])
      } else {
        setCards(cards.map(c => c.id === card.id ? card : c))
      }

      resetForm()
      setShowModal({ isOpen: false, mode: 'create' })
      router.refresh()

      // A Nubank card was just created → go straight to the invoice import wizard
      if (showModal.mode === 'create' && card.provider === 'nubank') {
        setImportModal({ isOpen: true, card })
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClick = (id: string) => {
    setConfirmDeleteId(id)
  }

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    
    try {
      const res = await fetch(`/api/cards/${confirmDeleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha ao remover cartão')
      
      setCards(cards.filter(c => c.id !== confirmDeleteId))
      setConfirmDeleteId(null)
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Financial calculations
  const cardCalculations = useMemo(() => {
    const now = new Date()

    return cards.map(card => {
      const cardId = card.id
      const totalLimit = parseFloat(card.limitAmount)
      
      // Filter transactions for this card
      const cardTransactions = (transactions || []).filter(t => t.cardId === cardId && t.type === 'EXPENSE')

      // 1. Used Limit (Sum of all expenses/installments)
      const usedLimit = cardTransactions.reduce((acc, t) => acc + parseFloat(t.amount), 0)

      // 2. Current Invoice — bill cycle the open invoice belongs to (installment-aware)
      const billIdx = billMonthIndexForDate(now, card)
      const billYear = Math.floor(billIdx / 12)
      const billMonth0 = ((billIdx % 12) + 12) % 12
      const currentInvoiceAmount = getCardInvoiceTotal(card, cardTransactions, billYear, billMonth0)

      return {
        ...card,
        totalLimit,
        usedLimit,
        availableLimit: Math.max(totalLimit - usedLimit, 0),
        currentInvoiceAmount,
        usagePercent: totalLimit > 0 ? (usedLimit / totalLimit) * 100 : 0
      }
    })
  }, [cards, transactions])

  const chartData = cardCalculations.map(c => ({
    name: c.name,
    fatura: c.currentInvoiceAmount,
    color: PRESET_COLORS.find(p => p.id === c.color)?.hex || '#3b82f6'
  }))


  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 flex flex-col transition-colors duration-300 reports-page-enter">
      {/* Header */}
      <header className="border-b border-surface-200/80 bg-white dark:bg-surface-900 dark:border-surface-800 transition-colors duration-300">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200 transition-colors"
            >
              <Lucide.ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight text-surface-900 dark:text-surface-100">
                {'Cartões'}
              </h1>
              <p className="hidden text-xs text-surface-500 dark:text-surface-400 sm:block">
                {'Gestão de cartões e limites'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline text-sm text-surface-500 dark:text-surface-400">
              {`Olá`}, {session.name}
            </span>

            {/* Notification bell */}
            <NotificationDropdown transactions={transactions} cards={cards} isBRL={isBRL} />

            <button
              onClick={handleLogout}
              className="hidden text-sm text-surface-500 transition-colors hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200 sm:inline"
            >
              {"Sair"}
            </button>
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200 sm:hidden"
              aria-label={"Sair"}
            >
              <Lucide.LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl w-full flex-1 px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Error message */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 flex items-start gap-3">
            <Lucide.AlertCircle className="h-5 w-5 shrink-0" />
            <p className="mt-0.5">{error}</p>
          </div>
        )}

        {/* Add/Edit Card Modal */}
        {showModal.isOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 transition-all duration-300 backdrop-blur-sm"
            onClick={() => setShowModal({ isOpen: false, mode: 'create' })}
          >
            <div
              className="bg-white dark:bg-surface-900 w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col max-h-[90vh] transition-transform animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-shrink-0 flex items-center justify-between border-b border-surface-100 p-4 sm:p-6 dark:border-surface-800/50">
                <div>
                  <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                    {showModal.mode === 'create' ? 'Adicionar Cartão de Crédito' : 'Editar Cartão'}
                  </h2>
                  <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Preencha os dados básicos do seu cartão.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal({ isOpen: false, mode: 'create' })}
                  className="rounded-full p-2 -mr-2 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800 dark:hover:text-surface-300 transition-colors"
                >
                  <Lucide.X className="h-5 w-5" />
                </button>
              </div>
            
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {showModal.mode === 'create' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Tipo do cartão</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setProvider('')}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${provider === '' ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300' : 'border-surface-200 text-surface-500 hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800'}`}
                    >
                      <Lucide.CreditCard className="h-4 w-4" />
                      Outro cartão
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProvider('nubank')
                        setColor('purple')
                        if (!name) setName('Nubank')
                      }}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${provider === 'nubank' ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' : 'border-surface-200 text-surface-500 hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800'}`}
                    >
                      <Lucide.FileUp className="h-4 w-4" />
                      Nubank
                    </button>
                  </div>
                  {provider === 'nubank' && (
                    <p className="text-xs text-surface-500 dark:text-surface-400 flex items-center gap-1.5">
                      <Lucide.Sparkles className="h-3.5 w-3.5 text-purple-500" />
                      Permite importar a fatura em CSV — depois de criar, o passo a passo abre automaticamente.
                    </p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Apelido do Cartão</label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Nubank, Itaú Black..."
                    className="input-field"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Últimos 4 Dígitos</label>
                  <input
                    type="text"
                    required
                    pattern="\d{4}"
                    maxLength={4}
                    value={lastFourDigits}
                    onChange={(e) => setLastFourDigits(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 9421"
                    className="input-field"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Dia de Fechamento</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={31}
                    value={closingDay}
                    onChange={(e) => setClosingDay(e.target.value)}
                    placeholder="Ex: 1"
                    className="input-field"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Dia de Vencimento</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={31}
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    placeholder="Ex: 10"
                    className="input-field"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                    {provider === 'nubank' ? 'Limite total (opcional)' : 'Limite do Cartão'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">{'R$'}</span>
                    <input
                      type="number"
                      required={provider !== 'nubank'}
                      min={0}
                      step="0.01"
                      value={limitAmount}
                      onChange={(e) => setLimitAmount(e.target.value)}
                      placeholder="5000.00"
                      className="input-field pl-9"
                    />
                  </div>
                  {provider === 'nubank' && (
                    <p className="text-[11px] text-surface-400">Calculado automaticamente na importação da fatura.</p>
                  )}
                </div>
              </div>

              {/* Color Selection */}
              <div className="space-y-3 pt-2">
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Cor do Cartão</label>
                <div className="flex flex-wrap gap-3">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setColor(preset.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${color === preset.id ? 'ring-2 ring-offset-2 ring-brand-500 dark:ring-offset-surface-900 scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: preset.hex }}
                      title={preset.label}
                    >
                      {color === preset.id && <Lucide.Check className="w-4 h-4 text-white drop-shadow-sm" />}
                    </button>
                  ))}
                </div>
              </div>
                </div>
                
                <div className="flex-shrink-0 border-t border-surface-100 p-4 sm:p-6 dark:border-surface-800/50 bg-surface-50 dark:bg-surface-900/50 rounded-b-3xl sm:rounded-b-2xl">
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowModal({ isOpen: false, mode: 'create' })}
                      className="px-4 py-2.5 text-sm font-medium text-surface-700 bg-white border border-surface-300 rounded-xl hover:bg-surface-50 dark:bg-surface-800 dark:text-surface-300 dark:border-surface-600 dark:hover:bg-surface-700 transition-colors shadow-sm w-full sm:w-auto"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !name || lastFourDigits.length !== 4 || !dueDay || !closingDay || (provider !== 'nubank' && !limitAmount)}
                      className="btn-primary py-2.5 px-6 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto text-center justify-center flex"
                    >
                      {submitting ? (
                        <Lucide.Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      ) : showModal.mode === 'create' ? (
                        'Adicionar Cartão'
                      ) : (
                        'Salvar Alterações'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {confirmDeleteId && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 transition-all duration-300 backdrop-blur-sm"
            onClick={() => setConfirmDeleteId(null)}
          >
            <div
              className="bg-white dark:bg-surface-900 w-full sm:max-w-md rounded-3xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                  <Lucide.AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100">
                  Excluir Cartão
                </h2>
                <p className="text-surface-600 dark:text-surface-400">
                  Tem certeza que deseja remover este cartão? O histórico de transações será mantido, mas você não poderá mais adicionar novas transações a ele.
                </p>
              </div>
              <div className="bg-surface-50 dark:bg-surface-900/50 px-6 py-4 border-t border-surface-100 dark:border-surface-800/50 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-4 py-2.5 text-sm font-medium text-surface-700 bg-white border border-surface-300 rounded-xl hover:bg-surface-50 dark:bg-surface-800 dark:text-surface-300 dark:border-surface-600 dark:hover:bg-surface-700 transition-colors w-full sm:w-auto"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-sm transition-colors w-full sm:w-auto text-center"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Nubank invoice import wizard */}
        {importModal.isOpen && (
          <NubankImportModal
            card={importModal.card ?? undefined}
            onClose={() => setImportModal({ isOpen: false })}
            onDone={(result) => {
              // Offline-queued responses may not include the card — just refresh in that case
              if (result.card) {
                setCards((prev) => {
                  const exists = prev.some((c) => c.id === result.card.id)
                  return exists ? prev.map((c) => (c.id === result.card.id ? { ...c, ...result.card } : c)) : [...prev, result.card]
                })
              }
              setImportModal({ isOpen: false })
              router.refresh()
            }}
          />
        )}

        {/* Invoice viewer is inline inside each card tile (collapse-grid accordion) */}

        {/* Analytics Section */}
        {cards.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-dashboard-fade">
            <div className="lg:col-span-2 card p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">{'Fatura Atual por Cartão'}</h3>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">{'Visão geral do fechamento atual'}</p>
                </div>
                <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-500">
                  <Lucide.BarChart3 className="h-5 w-5" />
                </div>
              </div>
              <div className="h-56 w-full mt-2 -ml-2">
                <CardsBarChart chartData={chartData} />
              </div>
            </div>
            
            <div className="card p-6 flex flex-col justify-between bg-gradient-to-br from-surface-50 to-white dark:from-surface-900 dark:to-surface-800/80">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shadow-sm">
                    <Lucide.ShieldCheck className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">{'Limite Total'}</h3>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold tracking-tight text-surface-900 dark:text-white">
                    {'R$'}{cardCalculations.reduce((acc, c) => acc + c.totalLimit, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm font-medium text-surface-500 dark:text-surface-400">{'Somando todos os cartões'}</p>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-surface-200 dark:border-surface-700/50">
                 <div className="flex justify-between text-sm mb-2.5">
                    <span className="font-medium text-surface-500 dark:text-surface-400">{'Utilizado'}</span>
                    <span className="font-bold text-surface-900 dark:text-surface-100">
                      {'R$'}{cardCalculations.reduce((acc, c) => acc + c.usedLimit, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                 </div>
                 <div className="h-2.5 w-full bg-surface-200 dark:bg-surface-700/80 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-700 ease-out relative" 
                      style={{ width: `${Math.min((cardCalculations.reduce((acc, c) => acc + c.usedLimit, 0) / (cardCalculations.reduce((acc, c) => acc + c.totalLimit, 0) || 1)) * 100, 100)}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20" />
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* Cards List */}
        {cards.length === 0 && !showModal.isOpen ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-brand-50 p-4 dark:bg-brand-900/20">
              <Lucide.CreditCard className="h-8 w-8 text-brand-500" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Nenhum cartão adicionado</h3>
            <p className="mt-1 max-w-sm text-sm text-surface-500 dark:text-surface-400">
              Adicione seus cartões de crédito para registrar transações vinculadas e receber notificações de fatura.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-6 btn-primary flex items-center gap-2"
            >
              <Lucide.Plus className="h-4 w-4" />
              Adicionar Primeiro Cartão
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-surface-200/50 dark:border-surface-800/50">
              <h2 className="text-lg sm:text-xl font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2 min-w-0">
                <Lucide.CreditCard className="h-5 w-5 text-surface-500 shrink-0" />
                <span className="truncate">Seus Cartões Atuais</span>
              </h2>
              {!showModal.isOpen && (
                <button
                  onClick={openCreateModal}
                  className="btn-primary py-2 px-3 sm:px-4 text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Lucide.Plus className="w-4 h-4" />
                  Novo Cartão
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cardCalculations.map(card => {
                const preset = PRESET_COLORS.find(c => c.id === card.color) || PRESET_COLORS[0]
                return (
                  <div key={card.id} className="card p-2 flex flex-col animate-dashboard-fade group hover:shadow-lg dark:hover:shadow-black/40 transition-all duration-300">
                    <div className={`relative rounded-xl bg-gradient-to-br ${preset.gradient} p-5 text-white shadow-md ring-1 ring-white/10 overflow-hidden flex-shrink-0 min-h-[160px]`}>
                      {/* Subtle premium glows */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
                      <div className={`absolute -top-10 -right-10 w-24 h-24 bg-white/[0.07] rounded-full blur-2xl pointer-events-none`} />
                      <div className={`absolute -bottom-8 -left-8 w-24 h-24 bg-black/[0.12] rounded-full blur-xl pointer-events-none`} />
                      
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2 font-medium text-white/95 min-w-0">
                             <Lucide.CreditCard className="h-5 w-5 opacity-90 shrink-0" />
                             <span className="truncate max-w-[120px]">{card.name}</span>
                             {card.provider === 'nubank' && (
                               <span className="text-[9px] font-bold uppercase tracking-widest bg-white/20 rounded-full px-1.5 py-0.5 shrink-0">nu</span>
                             )}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(card)}
                              className="text-white/60 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-lg p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 outline-none backdrop-blur-sm"
                              title="Editar cartão"
                            >
                              <Lucide.Pen className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(card.id)}
                              className="text-white/60 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-lg p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 outline-none backdrop-blur-sm"
                              title="Excluir cartão"
                            >
                              <Lucide.Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="mb-4 flex gap-3 mt-auto">
                          <span className="text-lg tracking-widest text-white/50">••••</span>
                          <span className="text-lg tracking-widest text-white/50">••••</span>
                          <span className="text-lg tracking-widest text-white/50">••••</span>
                          <span className="text-lg tracking-widest font-mono text-white/95">{card.lastFourDigits}</span>
                        </div>
                        
                        <div className="flex justify-between text-[11px] font-medium text-white/75 pt-3 border-t border-white/15">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-white/60 uppercase tracking-widest text-[9px]">{'Fechamento'}</span>
                            <span>{'Dia'} {card.closingDay}</span>
                          </div>
                          <div className="flex flex-col gap-0.5 text-right">
                            <span className="text-white/60 uppercase tracking-widest text-[9px]">{'Vencimento'}</span>
                            <span>{'Dia'} {card.dueDay}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Stats Below */}
                    <div className="p-5 flex-1 flex flex-col justify-end space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800/60">
                        <span className="text-xs text-surface-500 dark:text-surface-400 font-bold uppercase tracking-wider">{'Fatura Atual'}</span>
                        <span className="text-lg font-bold text-surface-900 dark:text-white">
                          {'R$'}{card.currentInvoiceAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-surface-500 dark:text-surface-400">{'Limite Utilizado'}</span>
                          <span className="text-xs font-bold text-surface-800 dark:text-surface-200">
                            {'R$'}{card.usedLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-surface-100 dark:bg-surface-800/80 rounded-full overflow-hidden shadow-inner flex">
                          <div 
                            className={`h-full transition-all duration-700 ease-out ${card.usagePercent > 90 ? 'bg-red-500' : card.usagePercent > 70 ? 'bg-amber-500' : 'bg-brand-500'}`} 
                            style={{ width: `${Math.min(card.usagePercent, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-surface-400 dark:text-surface-500">{'Disponível'}: <strong className="font-semibold text-surface-600 dark:text-surface-300">{'R$'}{card.availableLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                          <span className="text-surface-400 dark:text-surface-500">{'Total'}: <strong className="font-semibold text-surface-600 dark:text-surface-300">{'R$'}{card.totalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => toggleInvoicePanel(card.id)}
                          aria-expanded={openInvoiceCardId === card.id}
                          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${openInvoiceCardId === card.id ? 'border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950/40 dark:text-brand-300' : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800'}`}
                        >
                          <Lucide.ReceiptText className="h-3.5 w-3.5" />
                          Faturas
                          <Lucide.ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${openInvoiceCardId === card.id ? 'rotate-180' : ''}`} />
                        </button>
                        {card.provider === 'nubank' && (
                          <button
                            type="button"
                            onClick={() => setImportModal({ isOpen: true, card })}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-xs font-medium text-white hover:bg-purple-700 transition-colors shadow-sm"
                          >
                            <Lucide.FileUp className="h-3.5 w-3.5" />
                            Importar CSV
                          </button>
                        )}
                      </div>

                      {/* Inline invoice viewer — slides open under the card */}
                      <div className="collapse-grid" data-open={openInvoiceCardId === card.id}>
                        <div>
                          <CardInvoicePanel
                            card={card}
                            transactions={transactions}
                            onImport={
                              card.provider === 'nubank'
                                ? () => setImportModal({ isOpen: true, card })
                                : undefined
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
              )})}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
