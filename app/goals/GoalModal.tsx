'use client'

import { useState, useEffect } from 'react'
import * as Lucide from 'lucide-react'

const COLORS = [
  { value: 'bg-brand-500', label: 'Roxo (Padrão)' },
  { value: 'bg-blue-500', label: 'Azul' },
  { value: 'bg-emerald-500', label: 'Verde' },
  { value: 'bg-orange-500', label: 'Laranja' },
  { value: 'bg-pink-500', label: 'Rosa' },
  { value: 'bg-yellow-500', label: 'Amarelo' },
  { value: 'bg-indigo-500', label: 'Índigo' },
  { value: 'bg-violet-500', label: 'Violeta' },
  { value: 'bg-cyan-500', label: 'Ciano' },
  { value: 'bg-teal-500', label: 'Teal' },
]

const CATEGORIES = ['Viagem', 'Reserva de Emergência', 'Educação', 'Investimento', 'Veículo', 'Imóvel', 'Geral']

export default function GoalModal({ 
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    targetAmount: '',
    deadline: '',
    category: 'Geral',
    description: '',
    color: 'bg-brand-500',
  })

  useEffect(() => {
    if (goal) {
      setFormData({
        title: goal.title,
        targetAmount: goal.targetAmount,
        deadline: goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '',
        category: goal.category || 'Geral',
        description: goal.description || '',
        color: goal.color || 'bg-brand-500',
      })
    } else {
      setFormData({
        title: '',
        targetAmount: '',
        deadline: '',
        category: 'Geral',
        description: '',
        color: 'bg-brand-500',
      })
    }
    setShowDeleteConfirm(false)
  }, [goal, isOpen])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setFormData({ ...formData, targetAmount: '' });
      return;
    }
    const amount = (parseInt(digits, 10) / 100).toFixed(2);
    setFormData({ ...formData, targetAmount: amount });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const url = goal ? `/api/goals/${goal.id}` : '/api/goals'
      const method = goal ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        onSuccess()
      } else {
        console.error('Erro ao salvar meta')
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!goal) return
    try {
      setLoading(true)
      const res = await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' })
      if (res.ok) {
        onSuccess()
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="animate-in fade-in absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <div
            className="animate-in fade-in slide-in-from-bottom w-full max-w-lg bg-surface-50 dark:bg-surface-950 sm:rounded-[2.5rem] rounded-t-[2.5rem] p-1.5 shadow-2xl relative border border-white/10"
            style={{ maxHeight: 'min(96vh, 48rem)' }}
          >
            <div className="bg-white dark:bg-surface-900 rounded-t-[calc(2.5rem-0.375rem)] sm:rounded-[calc(2.5rem-0.375rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-pink-500 z-10 opacity-70" />
              
              {/* Mobile Drag Pill */}
              <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0 relative z-20">
                <div className="w-12 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full" />
              </div>
              
              {/* Header */}
              <div className="flex-shrink-0 flex justify-between items-center p-6 sm:p-8 pb-4 pt-2 sm:pt-8 relative">
                <h2 className="font-display text-2xl font-bold tracking-tight text-surface-900 dark:text-white mt-2 sm:mt-0">
                  {goal ? 'Editar Meta' : 'Nova Meta'}
                </h2>
                <button 
                  type="button"
                  onClick={onClose}
                  className="p-2 -mr-2 rounded-full text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-200 transition-colors"
                >
                  <Lucide.X strokeWidth={1.5} className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-6 scrollbar-thin">
                <form id="goal-form" onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-2">
                      Título da Meta
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full rounded-2xl border border-surface-200 dark:border-surface-700/80 bg-surface-50 dark:bg-surface-800 px-5 py-3.5 text-base font-medium text-surface-900 dark:text-white placeholder:text-surface-400 transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      placeholder="Ex: Viagem para Europa"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-2">
                        Valor Alvo (R$)
                      </label>
                      <input
                        required
                        type="text"
                        inputMode="numeric"
                        value={formData.targetAmount ? Number(formData.targetAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                        onChange={handleAmountChange}
                        className="w-full font-mono rounded-2xl border border-surface-200 dark:border-surface-700/80 bg-surface-50 dark:bg-surface-800 px-5 py-3.5 text-base font-medium text-surface-900 dark:text-white placeholder:text-surface-400 transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        placeholder="0,00"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-2">
                        Prazo (Opcional)
                      </label>
                      <input
                        type="date"
                        value={formData.deadline}
                        onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                        className="w-full rounded-2xl border border-surface-200 dark:border-surface-700/80 bg-surface-50 dark:bg-surface-800 px-5 py-3.5 text-base font-medium text-surface-900 dark:text-white transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-2">
                      Categoria
                    </label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full rounded-2xl border border-surface-200 dark:border-surface-700/80 bg-surface-50 dark:bg-surface-800 px-5 py-3.5 text-base font-medium text-surface-900 dark:text-white transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-2">
                      Cor de Destaque
                    </label>
                    <div className="flex gap-3 flex-wrap">
                      {COLORS.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: c.value })}
                          className={`w-10 h-10 rounded-full ${c.value} transition-all duration-300 relative ${formData.color === c.value ? 'scale-110 shadow-lg' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                          title={c.label}
                        >
                          {formData.color === c.value && (
                            <div
                              className="absolute inset-0 flex items-center justify-center text-white"
                            >
                              <Lucide.Check strokeWidth={3} className="w-4 h-4" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-2">
                      Descrição (Opcional)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full rounded-2xl border border-surface-200 dark:border-surface-700/80 bg-surface-50 dark:bg-surface-800 px-5 py-3.5 text-base font-medium text-surface-900 dark:text-white placeholder:text-surface-400 transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none min-h-[100px]"
                      placeholder="Por que essa meta é importante?"
                    />
                  </div>
                </form>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 p-6 sm:p-8 pt-6 border-t border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-md pb-safe">
                <>
                  {showDeleteConfirm ? (
                    <div
                      key="delete-confirm"
                      className="animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4"
                    >
                      <div className="flex gap-3 items-start text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-4 rounded-2xl border border-red-100 dark:border-red-500/20">
                        <Lucide.AlertTriangle strokeWidth={1.5} className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-sm font-medium leading-relaxed">
                          Tem certeza que deseja excluir esta meta? O progresso será perdido, mas as transações originais não serão apagadas.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={loading}
                          className="flex-1 py-3.5 rounded-full border border-surface-200 dark:border-surface-700 font-semibold text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={loading}
                          className="flex-1 py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors shadow-lg shadow-red-500/20 active:scale-[0.98]"
                        >
                          {loading ? 'Excluindo...' : 'Excluir Meta'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key="actions"
                      className="animate-in fade-in slide-in-from-bottom-2 flex gap-3"
                    >
                      {goal && (
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          disabled={loading}
                          className="w-14 h-14 rounded-full flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          title="Excluir meta"
                        >
                          <Lucide.Trash2 strokeWidth={1.5} className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-3.5 rounded-full border border-surface-200 dark:border-surface-700 font-semibold text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors active:scale-[0.98]"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        form="goal-form"
                        disabled={loading}
                        className="flex-1 py-3.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_8px_16px_-6px_rgba(48,64,235,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(48,64,235,0.6)] active:scale-[0.98]"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Salvando...</span>
                          </>
                        ) : (
                          <span>{goal ? 'Salvar Edição' : 'Criar Meta'}</span>
                        )}
                      </button>
                    </div>
                  )}
                </>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
