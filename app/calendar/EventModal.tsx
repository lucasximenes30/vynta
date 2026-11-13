'use client'

import { useState, useEffect } from 'react'
import * as Lucide from 'lucide-react'
import { format } from 'date-fns'

const COLORS = [
  { value: 'bg-brand-500', label: 'Roxo (Padrão)' },
  { value: 'bg-blue-500', label: 'Azul' },
  { value: 'bg-emerald-500', label: 'Verde' },
  { value: 'bg-orange-500', label: 'Laranja' },
  { value: 'bg-pink-500', label: 'Rosa' },
  { value: 'bg-yellow-500', label: 'Amarelo' },
  { value: 'bg-red-500', label: 'Vermelho' },
  { value: 'bg-surface-500', label: 'Cinza' },
  { value: 'bg-indigo-500', label: 'Índigo' },
  { value: 'bg-violet-500', label: 'Violeta' },
  { value: 'bg-cyan-500', label: 'Ciano' },
  { value: 'bg-teal-500', label: 'Teal' },
]

const CATEGORIES = ['Trabalho', 'Pessoal', 'Estudos', 'Saúde', 'Finanças', 'Outros']

const REMINDER_OPTIONS = [
  { value: 5, label: '5 min antes' },
  { value: 15, label: '15 min antes' },
  { value: 30, label: '30 min antes' },
  { value: 60, label: '1 hora antes' },
  { value: 1440, label: '1 dia antes' },
  { value: 10080, label: '1 semana antes' },
]

export default function EventModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  event,
  selectedDate 
}: { 
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  event: any | null
  selectedDate: Date
}) {
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: format(selectedDate, 'yyyy-MM-dd'),
    startTime: '',
    endTime: '',
    isAllDay: false,
    category: 'Pessoal',
    color: 'bg-brand-500',
    reminders: [60] as number[],
  })

  useEffect(() => {
    if (event) {
      let parsedDate = format(selectedDate, 'yyyy-MM-dd');
      if (event.date) {
        if (typeof event.date === 'string') {
          parsedDate = event.date.split('T')[0];
        } else if (event.date instanceof Date) {
          parsedDate = event.date.toISOString().split('T')[0];
        } else {
          parsedDate = new Date(event.date).toISOString().split('T')[0];
        }
      }
      setFormData({
        title: event.title,
        description: event.description || '',
        date: parsedDate,
        startTime: event.startTime || '',
        endTime: event.endTime || '',
        isAllDay: event.isAllDay,
        category: event.category || 'Pessoal',
        color: event.color || 'bg-brand-500',
        reminders: event.reminders?.length ? event.reminders : [60],
      })
    }
  }, [event, selectedDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const url = event ? `/api/calendar/events/${event.id}` : '/api/calendar/events'
      const method = event ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        onSuccess()
      } else {
        console.error('Erro ao salvar evento')
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!event) return
    try {
      setLoading(true)
      const res = await fetch(`/api/calendar/events/${event.id}`, { method: 'DELETE' })
      if (res.ok) {
        onSuccess()
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={`hidden sm:flex fixed inset-0 z-[60] items-center justify-center bg-black/60 p-4 transition-opacity duration-200 opacity-100 backdrop-blur-sm`}>
      <div 
        className="w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative border-t border-surface-100 dark:border-surface-800/80 animate-in fade-in duration-300" 
        style={{ maxHeight: 'min(92vh, 44rem)' }}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-pink-500 z-10" />
        
        {/* Mobile Drag Pill */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0 relative z-20">
          <div className="w-12 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full" />
        </div>

        {/* Header Fixo */}
        <div className="flex-shrink-0 flex justify-between items-center p-6 pb-4 pt-2 sm:pt-6 border-b border-surface-100 dark:border-surface-800">
          <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white mt-2 sm:mt-0">
            {event ? 'Editar Evento' : 'Novo Evento'}
          </h2>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-full text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800 dark:hover:text-surface-200 transition-colors"
          >
            <Lucide.X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo Rolável */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <form id="event-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1.5">Título *</label>
              <input
                required
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="input-field"
                placeholder="Ex: Reunião de Alinhamento"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1.5">Data *</label>
                <input
                  required
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="col-span-2 sm:col-span-1 flex items-center mt-6">
                <label className="flex items-center gap-2 cursor-pointer group p-2 -ml-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.isAllDay}
                    onChange={e => setFormData({ ...formData, isAllDay: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-600 border-surface-300 focus:ring-brand-500 dark:border-surface-600 dark:bg-surface-800 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-surface-700 dark:text-surface-300 group-hover:text-surface-900 dark:group-hover:text-white transition-colors">Dia inteiro</span>
                </label>
              </div>
            </div>

            {!formData.isAllDay && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1.5">Início</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1.5">Fim</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
            )}

            {!formData.isAllDay && (
              <div>
                <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1.5">
                  <Lucide.Bell className="w-4 h-4 inline-block mr-1 -mt-0.5" />
                  Lembretes
                </label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, reminders: formData.reminders.includes(-1) ? [60] : [-1] })}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${formData.reminders.includes(-1) ? 'bg-surface-700 text-white border-surface-700 dark:bg-surface-200 dark:text-surface-900 dark:border-surface-200' : 'border-surface-300 text-surface-500 hover:border-surface-400 dark:border-surface-700 dark:text-surface-400'}`}
                  >
                    Sem lembrete
                  </button>
                  {REMINDER_OPTIONS.map(o => {
                    const active = formData.reminders.includes(o.value)
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => {
                          const cur = formData.reminders.filter(r => r !== -1)
                          const next = cur.includes(o.value) ? cur.filter(r => r !== o.value) : [...cur, o.value].sort((a, b) => a - b)
                          setFormData({ ...formData, reminders: next })
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${active ? 'bg-brand-500 text-white border-brand-500' : 'border-surface-300 text-surface-600 hover:border-brand-400 hover:text-brand-600 dark:border-surface-700 dark:text-surface-300 dark:hover:border-brand-500'}`}
                      >
                        {o.label}
                      </button>
                    )
                  })}
                </div>
                {!formData.reminders.includes(-1) && formData.reminders.filter(r => r > 0).length === 0 && (
                  <p className="text-[11px] text-surface-400 mt-1.5">Nada marcado = lembrete padrão de 1h antes.</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1.5">Categoria</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="input-field"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1.5">Cor de identificação</label>
              <div className="flex gap-3 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c.value })}
                    className={`w-8 h-8 rounded-full ${c.value} transition-all duration-200 ${formData.color === c.value ? 'scale-110 ring-2 ring-offset-2 ring-brand-500 dark:ring-offset-surface-900 shadow-lg shadow-brand-500/20' : 'hover:scale-110 hover:shadow-md opacity-80 hover:opacity-100'}`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1.5">Descrição / Notas</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="input-field resize-none min-h-[80px]"
                placeholder="Detalhes adicionais, links..."
              />
            </div>
          </form>
        </div>

        {/* Footer Fixo */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-t border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/50 pb-safe">
          {showDeleteConfirm ? (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex gap-2 items-start text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-3 rounded-xl border border-red-100 dark:border-red-500/20">
                <Lucide.AlertTriangle className="w-5 h-5 shrink-0" />
                <p className="text-xs font-medium leading-relaxed">
                  Tem certeza que deseja excluir? Essa ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={loading}
                  className="btn-secondary flex-1"
                >
                  Manter
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="btn-primary flex-1 bg-red-600 hover:bg-red-700 hover:shadow-red-500/20 ring-red-500"
                >
                  {loading ? 'Excluindo...' : 'Excluir Evento'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              {event && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading}
                  className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50 border border-transparent hover:border-red-200 dark:hover:border-red-500/30"
                  title="Excluir evento"
                >
                  <Lucide.Trash2 className="w-5 h-5" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="event-form"
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>{event ? 'Salvar Edição' : 'Criar Evento'}</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
