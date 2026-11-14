'use client'

import { useState, useEffect } from 'react'
import * as Lucide from 'lucide-react'
import { format } from 'date-fns'
import { useVisibleViewport } from '@/lib/useVisibleViewport'

const COLORS = [
  { value: 'bg-brand-500', label: 'Verde Vynta (Padrão)' },
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
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hora' },
  { value: 1440, label: '1 dia' },
  { value: 10080, label: '1 semana' },
]

export default function MobileEventModal({ 
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
  const viewport = useVisibleViewport()
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

  useEffect(() => {
    if (!isOpen || !window.matchMedia('(max-width: 639px)').matches) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [isOpen])

  if (!isOpen) return null

  // Mobile-first full screen/bottom sheet approach with safe areas and sticky footer
  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex h-[100dvh] max-w-full flex-col bg-surface-50 dark:bg-surface-950 sm:hidden animate-in slide-in-from-bottom-full duration-300" style={{ top: viewport.top, height: viewport.height || undefined }} role="dialog" aria-modal="true" aria-labelledby="mobile-event-title">
      
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-4 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 pt-safe">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            aria-label="Fechar evento"
            onClick={onClose}
            className="p-2 -ml-2 rounded-full text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <Lucide.ChevronDown className="w-6 h-6" />
          </button>
          <h2 id="mobile-event-title" className="font-display text-xl font-bold text-surface-900 dark:text-white">
            {event ? 'Editar Evento' : 'Novo Evento'}
          </h2>
        </div>
        {event && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 -mr-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <Lucide.Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 bg-surface-50 dark:bg-surface-950 pb-6">
        
        {showDeleteConfirm && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <div className="flex items-start gap-3 mb-4">
              <Lucide.AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Tem certeza que deseja excluir? Essa ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 text-sm font-semibold border border-surface-200 dark:border-surface-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold flex items-center justify-center disabled:opacity-50"
              >
                {loading ? <Lucide.Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir'}
              </button>
            </div>
          </div>
        )}

        <form id="mobile-event-form" onSubmit={handleSubmit} className="min-w-0 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-surface-700 dark:text-surface-300">Título</label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl px-4 py-3.5 text-base focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="Ex: Reunião de Alinhamento"
            />
          </div>

          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-surface-100 dark:border-surface-800">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-surface-700 dark:text-surface-300">Dia inteiro</label>
                <div 
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${formData.isAllDay ? 'bg-brand-500' : 'bg-surface-200 dark:bg-surface-700'}`}
                  onClick={() => setFormData({ ...formData, isAllDay: !formData.isAllDay })}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.isAllDay ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-surface-100 dark:border-surface-800">
              <label className="text-sm font-semibold text-surface-700 dark:text-surface-300 block mb-2" htmlFor="mobile-event-date">Data</label>
              <input
                required
                type="date"
                id="mobile-event-date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="native-date-control block min-w-0 max-w-full w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded-xl px-4 py-3 text-base outline-none"
              />
            </div>

            {!formData.isAllDay && (
              <div className="grid min-w-0 grid-cols-2 gap-3 p-4">
                <div className="min-w-0">
                  <label className="text-sm font-semibold text-surface-700 dark:text-surface-300 block mb-2" htmlFor="mobile-event-startTime">Início</label>
                  <input
                    type="time"
                    id="mobile-event-startTime"
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    className="native-date-control block min-w-0 max-w-full w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded-xl px-4 py-3 text-base outline-none"
                  />
                </div>
                <div className="min-w-0">
                  <label className="text-sm font-semibold text-surface-700 dark:text-surface-300 block mb-2" htmlFor="mobile-event-endTime">Fim</label>
                  <input
                    type="time"
                    id="mobile-event-endTime"
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    className="native-date-control block min-w-0 max-w-full w-full bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded-xl px-4 py-3 text-base outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {!formData.isAllDay && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-surface-700 dark:text-surface-300 flex items-center gap-1.5">
                <Lucide.Bell className="w-4 h-4" />
                Lembretes
              </label>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, reminders: formData.reminders.includes(-1) ? [60] : [-1] })}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-full border transition-colors ${formData.reminders.includes(-1) ? 'bg-surface-700 text-white border-surface-700 dark:bg-surface-200 dark:text-surface-900 dark:border-surface-200' : 'border-surface-300 text-surface-500 dark:border-surface-700 dark:text-surface-400'}`}
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
                      className={`px-3.5 py-2 text-xs font-semibold rounded-full border transition-colors ${active ? 'bg-brand-500 text-white border-brand-500' : 'border-surface-300 text-surface-600 dark:border-surface-700 dark:text-surface-300'}`}
                    >
                      {o.label} antes
                    </button>
                  )
                })}
              </div>
              {!formData.reminders.includes(-1) && formData.reminders.filter(r => r > 0).length === 0 && (
                <p className="text-[11px] text-surface-400">Nada marcado = lembrete padrão de 1h antes.</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-surface-700 dark:text-surface-300">Categoria</label>
            <select
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl px-4 py-3.5 text-base focus:ring-2 focus:ring-brand-500 outline-none appearance-none"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-surface-700 dark:text-surface-300">Cor de identificação</label>
            <div className="flex gap-4 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: c.value })}
                  className={`w-10 h-10 rounded-full ${c.value} transition-all ${formData.color === c.value ? 'scale-110 ring-4 ring-offset-2 ring-brand-500 dark:ring-offset-surface-950 shadow-lg' : 'opacity-80'}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-surface-700 dark:text-surface-300">Descrição / Notas</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl px-4 py-3.5 text-base min-h-[100px] outline-none"
              placeholder="Detalhes adicionais..."
            />
          </div>
        </form>
      </div>

      {/* Sticky Footer */}
      <div className="shrink-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-surface-200 dark:border-surface-800 bg-white/90 dark:bg-surface-900/90 backdrop-blur-md">
        <button
          type="submit"
          form="mobile-event-form"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-4 font-bold text-base flex items-center justify-center gap-2 shadow-xl shadow-brand-500/20 disabled:opacity-70"
        >
          {loading ? (
            <Lucide.Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <span>{event ? 'Salvar Edição' : 'Criar Evento'}</span>
          )}
        </button>
      </div>
    </div>
  )
}
