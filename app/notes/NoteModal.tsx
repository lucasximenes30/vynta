'use client'

import { useState, useEffect } from 'react'
import * as Lucide from 'lucide-react'

const COLORS = [
  { value: 'default', label: 'Padrão' },
  { value: 'brand', label: 'Roxo' },
  { value: 'emerald', label: 'Verde' },
  { value: 'orange', label: 'Laranja' },
  { value: 'blue', label: 'Azul' },
  { value: 'rose', label: 'Rosa' },
]

export default function NoteModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  note 
}: { 
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  note: any | null
}) {
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    color: 'default',
    isPinned: false,
  })

  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title || '',
        content: note.content || '',
        category: note.category || '',
        color: note.color || 'default',
        isPinned: note.isPinned || false,
      })
    } else {
      setFormData({
        title: '',
        content: '',
        category: '',
        color: 'default',
        isPinned: false,
      })
    }
    setShowDeleteConfirm(false)
  }, [note, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const url = note ? `/api/notes/${note.id}` : '/api/notes'
      const method = note ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        onSuccess()
      } else {
        console.error('Erro ao salvar nota')
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!note) return
    try {
      setLoading(true)
      const res = await fetch(`/api/notes/${note.id}`, { method: 'DELETE' })
      if (res.ok) {
        onSuccess()
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Define background map for preview
  let bgClassPreview = 'bg-white dark:bg-surface-900'
  if (formData.color === 'brand') bgClassPreview = 'bg-brand-50/80 dark:bg-[#1a1c38]'
  if (formData.color === 'emerald') bgClassPreview = 'bg-emerald-50/80 dark:bg-[#132c25]'
  if (formData.color === 'orange') bgClassPreview = 'bg-orange-50/80 dark:bg-[#332214]'
  if (formData.color === 'blue') bgClassPreview = 'bg-blue-50/80 dark:bg-[#142336]'
  if (formData.color === 'rose') bgClassPreview = 'bg-rose-50/80 dark:bg-[#361623]'

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="animate-in fade-in absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <div
            className={`animate-in fade-in slide-in-from-bottom w-full max-w-2xl sm:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative border border-surface-200 dark:border-surface-700/50 transition-colors duration-500 ${bgClassPreview}`}
            style={{ maxHeight: 'min(96vh, 48rem)', height: '80vh' }}
          >
            {/* Soft inner glow */}
            <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] pointer-events-none z-10 rounded-[inherit]" />

            {/* Mobile Drag Pill */}
            <div className="sm:hidden flex justify-center pt-3 shrink-0 relative z-20">
              <div className="w-12 h-1.5 bg-surface-300 dark:bg-surface-600 rounded-full" />
            </div>

            {/* Header Toolbar */}
            <div className="flex-shrink-0 flex justify-between items-center p-4 sm:p-6 pb-2 pt-2 sm:pt-6 relative z-20">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isPinned: !formData.isPinned })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${formData.isPinned ? 'bg-brand-500 text-white shadow-md' : 'bg-surface-200/50 dark:bg-surface-800/50 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-800'}`}
                >
                  <Lucide.Pin strokeWidth={2} className={`w-3.5 h-3.5 ${formData.isPinned ? 'fill-current' : ''}`} />
                  {formData.isPinned ? 'Fixada' : 'Fixar'}
                </button>

                <div className="h-4 w-px bg-surface-300 dark:bg-surface-700 mx-2" />

                <div className="flex gap-1.5 bg-surface-200/30 dark:bg-surface-800/30 p-1 rounded-full backdrop-blur-sm">
                  {COLORS.map(c => {
                    let btnBg = 'bg-surface-200 dark:bg-surface-700'
                    if (c.value === 'brand') btnBg = 'bg-brand-500'
                    if (c.value === 'emerald') btnBg = 'bg-emerald-500'
                    if (c.value === 'orange') btnBg = 'bg-orange-500'
                    if (c.value === 'blue') btnBg = 'bg-blue-500'
                    if (c.value === 'rose') btnBg = 'bg-rose-500'

                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: c.value })}
                        className={`w-5 h-5 rounded-full ${btnBg} transition-all duration-300 ${formData.color === c.value ? 'scale-125 ring-2 ring-offset-1 ring-surface-900 dark:ring-white dark:ring-offset-surface-900' : 'hover:scale-110 opacity-60 hover:opacity-100'}`}
                        title={c.label}
                      />
                    )
                  })}
                </div>
              </div>

              <button 
                type="button"
                onClick={onClose}
                className="p-2 -mr-2 rounded-full text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-800 hover:text-surface-700 dark:hover:text-surface-200 transition-colors"
              >
                <Lucide.X strokeWidth={1.5} className="w-5 h-5" />
              </button>
            </div>

            {/* Editor Body */}
            <div className="flex-1 flex flex-col px-6 sm:px-12 py-4 relative z-20">
              <form id="note-form" onSubmit={handleSubmit} className="flex flex-col h-full space-y-6">
                
                {/* Category & Date */}
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="text-xs uppercase tracking-widest bg-transparent border-none p-0 font-bold text-surface-400 dark:text-surface-500 focus:ring-0 placeholder:text-surface-300 dark:placeholder:text-surface-600 w-32"
                    placeholder="CATEGORIA"
                  />
                  <span className="text-[10px] uppercase tracking-widest text-surface-400 dark:text-surface-600 font-bold">
                    {note ? new Date(note.updatedAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}
                  </span>
                </div>

                {/* Title */}
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-transparent text-4xl sm:text-5xl font-display font-bold tracking-tighter text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-700 border-none focus:ring-0 p-0 leading-tight"
                  placeholder="Título da nota"
                />

                {/* Content */}
                <textarea
                  required
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  className="flex-1 w-full bg-transparent text-lg text-surface-700 dark:text-surface-300 placeholder:text-surface-400/50 dark:placeholder:text-surface-600 border-none focus:ring-0 p-0 resize-none leading-relaxed scrollbar-thin"
                  placeholder="Comece a digitar..."
                />
              </form>
            </div>

            {/* Footer Overlay Actions */}
            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center pointer-events-none z-30 pb-safe">
              <div className="pointer-events-auto">
                {note && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={loading}
                    className="w-12 h-12 rounded-full flex items-center justify-center bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border border-red-100 dark:border-red-500/20 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all shadow-lg active:scale-95"
                    title="Excluir nota"
                  >
                    <Lucide.Trash2 strokeWidth={1.5} className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="pointer-events-auto flex gap-3">
                <>
                  {showDeleteConfirm && (
                    <div
                      className="animate-in fade-in slide-in-from-right-4 flex items-center gap-2 bg-white/90 dark:bg-surface-900/90 backdrop-blur-xl p-1.5 rounded-full border border-surface-200 dark:border-surface-700 shadow-xl"
                    >
                      <span className="text-xs font-semibold px-3 text-surface-600 dark:text-surface-300">
                        Confirmar exclusão?
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 rounded-full text-xs font-bold bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                      >
                        Não
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="px-4 py-2 rounded-full text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        Sim
                      </button>
                    </div>
                  )}
                </>

                {!showDeleteConfirm && (
                  <button
                    type="submit"
                    form="note-form"
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-surface-900 dark:bg-white text-white dark:text-surface-900 font-bold shadow-[0_8px_16px_-6px_rgba(0,0,0,0.3)] dark:shadow-[0_8px_16px_-6px_rgba(255,255,255,0.2)] hover:shadow-[0_12px_20px_-8px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_12px_20px_-8px_rgba(255,255,255,0.3)] transition-all active:scale-95"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-surface-200/30 dark:border-surface-700/30 border-t-current rounded-full animate-spin" />
                    ) : (
                      <Lucide.Check strokeWidth={2} className="w-4 h-4" />
                    )}
                    <span>Salvar</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
