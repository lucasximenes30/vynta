'use client'

import { useState, useEffect } from 'react'
import * as Lucide from 'lucide-react'

export default function TransactionModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  goal 
}: { 
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  goal: any | null
}) {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form')
  const [balance, setBalance] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    amount: '',
    type: 'DEPOSIT',
    description: '',
    syncWithBalance: true,
  })

  useEffect(() => {
    if (isOpen) {
      setFormData({
        amount: '',
        type: 'DEPOSIT',
        description: '',
        syncWithBalance: true,
      })
      setErrorMsg('')
      setActiveTab('form')
      fetchBalance()
    }
  }, [isOpen, goal])

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/transactions')
      if (res.ok) {
        const data = await res.json()
        setBalance(data.balance?.balance ?? 0)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setFormData({ ...formData, amount: '' });
      return;
    }
    const amount = (parseInt(digits, 10) / 100).toFixed(2);
    setFormData({ ...formData, amount: amount });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goal) return
    setErrorMsg('')
    try {
      setLoading(true)
      const res = await fetch(`/api/goals/${goal.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        onSuccess()
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Erro ao processar transação')
      }
    } catch (error) {
      console.error(error)
      setErrorMsg('Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <>
      {isOpen && goal && (
        <div className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="animate-in fade-in absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <div
            className="animate-in fade-in slide-in-from-bottom w-full max-w-md bg-surface-50 dark:bg-surface-950 sm:rounded-[2.5rem] rounded-t-[2.5rem] p-1.5 shadow-2xl relative border border-white/10"
          >
            <div className="bg-white dark:bg-surface-900 rounded-t-[calc(2.5rem-0.375rem)] sm:rounded-[calc(2.5rem-0.375rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col overflow-hidden relative max-h-[85vh]">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500 z-10 opacity-70" />
              
              {/* Mobile Drag Pill */}
              <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0 relative z-20">
                <div className="w-12 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full" />
              </div>
              
              {/* Header */}
              <div className="flex-shrink-0 flex justify-between items-center px-6 sm:px-8 pt-4 sm:pt-8 pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold tracking-tight text-surface-900 dark:text-white leading-tight">
                    Gerenciar Meta
                  </h2>
                  <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 truncate max-w-[200px] sm:max-w-[250px] font-medium">
                    {goal.title}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={onClose}
                  className="p-2 -mr-2 rounded-full text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-200 transition-colors"
                >
                  <Lucide.X strokeWidth={1.5} className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-6 sm:px-8 border-b border-surface-100 dark:border-surface-800 flex gap-4">
                <button
                  onClick={() => setActiveTab('form')}
                  className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'form' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'}`}
                >
                  Transação
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'history' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'}`}
                >
                  Histórico
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 scrollbar-thin">
                {activeTab === 'form' ? (
                  <form id="tx-form" onSubmit={handleSubmit} className="space-y-6">
                    <>
                      {errorMsg && (
                        <div
                          className="animate-in fade-in slide-in-from-top-2 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-semibold border border-red-100 dark:border-red-500/20"
                        >
                          {errorMsg}
                        </div>
                      )}
                    </>

                    {balance !== null && (
                      <div className="flex justify-between items-center p-3.5 rounded-2xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700">
                        <span className="text-xs font-semibold text-surface-500 dark:text-surface-400">Saldo Livre Atual:</span>
                        <span className={`font-mono text-sm font-bold ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(balance)}
                        </span>
                      </div>
                    )}

                    <div className="flex bg-surface-100/50 dark:bg-surface-800/50 p-1.5 rounded-2xl border border-surface-200 dark:border-surface-700/50">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'DEPOSIT' })}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${formData.type === 'DEPOSIT' ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm' : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'}`}
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'WITHDRAW' })}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${formData.type === 'WITHDRAW' ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm' : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'}`}
                      >
                        Retirar
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-2">
                        Valor (R$)
                      </label>
                      <input
                        required
                        type="text"
                        inputMode="numeric"
                        value={formData.amount ? Number(formData.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                        onChange={handleAmountChange}
                        className="w-full font-mono text-2xl font-bold tracking-tight rounded-2xl border border-surface-200 dark:border-surface-700/80 bg-surface-50 dark:bg-surface-800 px-5 py-4 text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600 transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        placeholder="0,00"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-2">
                        Descrição (Opcional)
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full rounded-2xl border border-surface-200 dark:border-surface-700/80 bg-surface-50 dark:bg-surface-800 px-5 py-3.5 text-base font-medium text-surface-900 dark:text-white placeholder:text-surface-400 transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        placeholder="Ex: Bônus do mês"
                      />
                    </div>

                    <label className="flex items-start gap-3 p-4 rounded-2xl border border-surface-200 dark:border-surface-700/80 bg-surface-50 dark:bg-surface-800/50 cursor-pointer group hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
                      <div className="relative flex items-center pt-0.5">
                        <input
                          type="checkbox"
                          checked={formData.syncWithBalance}
                          onChange={e => setFormData({ ...formData, syncWithBalance: e.target.checked })}
                          className="peer sr-only"
                        />
                        <div className="w-5 h-5 rounded border-2 border-surface-300 dark:border-surface-600 peer-checked:bg-brand-500 peer-checked:border-brand-500 flex items-center justify-center transition-all">
                          <Lucide.Check className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 scale-50 peer-checked:scale-100 transition-all" strokeWidth={3} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-surface-900 dark:text-white">
                          {formData.type === 'DEPOSIT' ? 'Descontar do meu saldo livre' : 'Adicionar ao meu saldo livre'}
                        </p>
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 leading-relaxed">
                          {formData.type === 'DEPOSIT' 
                            ? 'Cria uma despesa nas suas finanças para manter o saldo consistente.' 
                            : 'Cria uma receita nas suas finanças para devolver o valor ao saldo.'}
                        </p>
                      </div>
                    </label>

                  </form>
                ) : (
                  <div className="space-y-3">
                    {goal.transactions && goal.transactions.length > 0 ? (
                      goal.transactions.map((t: any) => (
                        <div key={t.id} className="flex justify-between items-center p-4 rounded-2xl bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-800">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'}`}>
                              {t.type === 'DEPOSIT' ? <Lucide.ArrowUpRight strokeWidth={2} className="w-5 h-5" /> : <Lucide.ArrowDownRight strokeWidth={2} className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-surface-900 dark:text-white">
                                {t.type === 'DEPOSIT' ? 'Guardou' : 'Retirou'}
                              </p>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-surface-500 dark:text-surface-400">
                                <span>{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                                {t.description && (
                                  <>
                                    <span className="hidden sm:inline text-surface-300 dark:text-surface-600">•</span>
                                    <span className="truncate max-w-[150px]">{t.description}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className={`font-mono text-base font-bold tracking-tight ${t.type === 'DEPOSIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-surface-900 dark:text-white'}`}>
                            {t.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(t.amount)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 px-4 rounded-2xl bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-800 border-dashed">
                        <div className="w-12 h-12 bg-surface-100 dark:bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Lucide.History className="w-6 h-6 text-surface-400 dark:text-surface-500" />
                        </div>
                        <p className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1">Nenhuma transação</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400 max-w-[200px] mx-auto">Você ainda não guardou ou retirou dinheiro desta meta.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              {activeTab === 'form' && (
                <div className="flex-shrink-0 p-6 sm:p-8 pt-4 border-t border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/50 flex gap-3 pb-safe">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 py-3.5 rounded-xl border border-surface-200 dark:border-surface-700 font-bold text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors active:scale-[0.98]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    form="tx-form"
                    disabled={loading}
                    className={`flex-1 py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${formData.type === 'WITHDRAW' ? 'bg-surface-800 hover:bg-surface-900 dark:bg-surface-100 dark:hover:bg-white dark:text-surface-900 shadow-lg shadow-black/10' : 'bg-brand-600 hover:bg-brand-700 shadow-[0_8px_16px_-6px_rgba(48,64,235,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(48,64,235,0.6)]'}`}
                  >
                    {loading ? (
                      <>
                        <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${formData.type === 'WITHDRAW' ? 'border-white dark:border-surface-900' : 'border-white'}`} />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <span>Confirmar</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
