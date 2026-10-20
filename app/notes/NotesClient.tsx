'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Lucide from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import NoteModal from './NoteModal'

export default function NotesClient({ initialNotes }: { initialNotes: any[] }) {
  const router = useRouter()
  const [notes, setNotes] = useState<any[]>(initialNotes)
  const [loading, setLoading] = useState(false)
  
  const [isNoteModalOpen, setNoteModalOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<any | null>(null)

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/notes')
      if (res.ok) {
        const data = await res.json()
        setNotes(data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (note: any) => {
    setSelectedNote(note)
    setNoteModalOpen(true)
  }

  const handleTogglePin = async (e: React.MouseEvent, note: any) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...note, isPinned: !note.isPinned })
      })
      if (res.ok) fetchNotes()
    } catch (error) {
      console.error(error)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
    show: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { type: 'spring' as const, stiffness: 100, damping: 20 },
    },
  }

  return (
    <div className="min-h-[100dvh] bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 transition-colors duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
      {/* Header */}
      <header className="border-b border-surface-200/80 bg-white/80 dark:bg-surface-900/80 dark:border-surface-800 sticky top-0 z-30 transition-colors duration-300 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="group flex h-10 w-10 items-center justify-center rounded-full text-surface-500 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100 transition-all duration-300 active:scale-95"
              title="Voltar ao Dashboard"
            >
              <Lucide.ArrowLeft strokeWidth={1.5} className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <h1 className="font-display text-base font-semibold tracking-tight">Smart Notes</h1>
          </div>
          <button
            onClick={() => {
              setSelectedNote(null)
              setNoteModalOpen(true)
            }}
            className="group relative inline-flex items-center justify-center rounded-full bg-surface-900 dark:bg-white px-6 py-2.5 text-sm font-semibold text-white dark:text-surface-900 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.3)] dark:shadow-[0_8px_16px_-6px_rgba(255,255,255,0.2)] transition-all duration-300 hover:shadow-[0_12px_20px_-8px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_12px_20px_-8px_rgba(255,255,255,0.3)] active:scale-[0.98]"
          >
            <span className="flex items-center gap-2">
              <Lucide.PenLine strokeWidth={2} className="w-4 h-4" />
              Nova Nota
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-24 space-y-12">
        <motion.div 
          initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6"
        >
          <div>
            <div className="mb-4 inline-flex items-center rounded-full border border-surface-200 dark:border-surface-800 bg-white/50 dark:bg-surface-900/50 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-surface-600 dark:text-surface-400 backdrop-blur-sm">
              Conhecimento
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tighter text-surface-900 dark:text-white leading-tight">
              Sua Base de Ideias
            </h1>
            <p className="text-base text-surface-500 dark:text-surface-400 mt-3 max-w-[65ch] leading-relaxed">
              Anotações fluidas, elegantes e perfeitamente integradas à sua rotina financeira e organização pessoal.
            </p>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-surface-900/30 dark:border-white/30 border-t-surface-900 dark:border-t-white rounded-full animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
            className="p-1.5 rounded-[2.5rem] bg-surface-100/50 dark:bg-surface-800/30 border border-surface-200 dark:border-surface-700/50"
          >
            <div className="rounded-[calc(2.5rem-0.375rem)] bg-white dark:bg-surface-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] text-center py-24 px-6 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-[1.5rem] bg-surface-50 dark:bg-surface-950 border border-surface-100 dark:border-surface-800 flex items-center justify-center mb-6 shadow-sm rotate-3 hover:rotate-0 transition-transform duration-500">
                <Lucide.StickyNote strokeWidth={1} className="w-10 h-10 text-surface-400 dark:text-surface-500" />
              </div>
              <h3 className="font-display text-2xl font-bold tracking-tight mb-3 text-surface-900 dark:text-white">Sua mente está limpa</h3>
              <p className="text-base text-surface-500 dark:text-surface-400 max-w-sm mb-8 leading-relaxed">
                Capture ideias brilhantes, pequenos lembretes ou conecte notas diretamente às suas metas.
              </p>
              <button
                onClick={() => {
                  setSelectedNote(null)
                  setNoteModalOpen(true)
                }}
                className="group relative inline-flex items-center justify-center rounded-full bg-surface-900 dark:bg-white px-8 py-3.5 text-base font-semibold text-white dark:text-surface-900 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)] dark:shadow-[0_8px_20px_-6px_rgba(255,255,255,0.2)] transition-all duration-300 active:scale-[0.98]"
              >
                Escrever Primeira Nota
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6"
          >
            <AnimatePresence>
              {notes.map((note) => {
                let bgClass = 'bg-white dark:bg-surface-900'
                let borderClass = 'border-surface-200 dark:border-surface-800'
                let highlightClass = ''
                
                if (note.color === 'brand') { bgClass = 'bg-brand-50/50 dark:bg-brand-500/5'; borderClass = 'border-brand-200/50 dark:border-brand-500/20'; highlightClass = 'text-brand-900 dark:text-brand-100'; }
                if (note.color === 'emerald') { bgClass = 'bg-emerald-50/50 dark:bg-emerald-500/5'; borderClass = 'border-emerald-200/50 dark:border-emerald-500/20'; highlightClass = 'text-emerald-900 dark:text-emerald-100'; }
                if (note.color === 'orange') { bgClass = 'bg-orange-50/50 dark:bg-orange-500/5'; borderClass = 'border-orange-200/50 dark:border-orange-500/20'; highlightClass = 'text-orange-900 dark:text-orange-100'; }
                if (note.color === 'blue') { bgClass = 'bg-blue-50/50 dark:bg-blue-500/5'; borderClass = 'border-blue-200/50 dark:border-blue-500/20'; highlightClass = 'text-blue-900 dark:text-blue-100'; }
                if (note.color === 'rose') { bgClass = 'bg-rose-50/50 dark:bg-rose-500/5'; borderClass = 'border-rose-200/50 dark:border-rose-500/20'; highlightClass = 'text-rose-900 dark:text-rose-100'; }

                return (
                  <motion.div 
                    key={note.id} 
                    layoutId={`note-${note.id}`}
                    variants={itemVariants}
                    onClick={() => handleEdit(note)}
                    className={`break-inside-avoid relative group cursor-pointer transition-all duration-500 rounded-[1.5rem] border ${borderClass} ${bgClass} p-6 shadow-sm hover:shadow-[0_16px_32px_-12px_rgba(0,0,0,0.1)] dark:hover:shadow-none hover:-translate-y-1 overflow-hidden flex flex-col`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent dark:from-white/5 pointer-events-none" />

                    <div className="relative z-10 flex items-start justify-between mb-4">
                      {note.category ? (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/60 dark:bg-surface-800/60 backdrop-blur-md text-surface-600 dark:text-surface-300 uppercase tracking-widest border border-surface-200/50 dark:border-surface-700/50">
                          {note.category}
                        </span>
                      ) : (
                        <div />
                      )}

                      <button
                        onClick={(e) => handleTogglePin(e, note)}
                        className={`p-2 rounded-full transition-all duration-300 active:scale-90 ${note.isPinned ? 'text-brand-500 bg-brand-50 dark:bg-brand-500/10 opacity-100' : 'text-surface-300 dark:text-surface-600 hover:text-surface-600 dark:hover:text-surface-300 opacity-0 group-hover:opacity-100 hover:bg-surface-100 dark:hover:bg-surface-800'}`}
                      >
                        <Lucide.Pin strokeWidth={1.5} className={`w-4 h-4 ${note.isPinned ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    {note.title && (
                      <h3 className={`relative z-10 font-display text-lg font-bold mb-3 leading-tight tracking-tight ${highlightClass || 'text-surface-900 dark:text-white'}`}>
                        {note.title}
                      </h3>
                    )}
                    
                    <p className={`relative z-10 text-sm whitespace-pre-wrap leading-relaxed line-clamp-8 ${highlightClass ? 'opacity-80' : 'text-surface-600 dark:text-surface-400'}`}>
                      {note.content}
                    </p>

                    {(note.financialGoalId || note.eventId) && (
                      <div className="relative z-10 mt-5 pt-4 border-t border-surface-200/50 dark:border-surface-700/50 flex gap-2 flex-wrap">
                        {note.financialGoalId && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/60 dark:bg-surface-800/60 backdrop-blur-md text-xs font-medium text-surface-600 dark:text-surface-300 border border-surface-200/50 dark:border-surface-700/50">
                            <Lucide.Target strokeWidth={2} className="w-3.5 h-3.5 text-brand-500" />
                            Meta Vinculada
                          </span>
                        )}
                        {note.eventId && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/60 dark:bg-surface-800/60 backdrop-blur-md text-xs font-medium text-surface-600 dark:text-surface-300 border border-surface-200/50 dark:border-surface-700/50">
                            <Lucide.Calendar strokeWidth={2} className="w-3.5 h-3.5 text-brand-500" />
                            Evento Vinculado
                          </span>
                        )}
                      </div>
                    )}

                    <div className="relative z-10 mt-5 pt-4 border-t border-surface-200/50 dark:border-surface-700/50 flex items-center justify-between text-[11px] font-medium text-surface-400 dark:text-surface-500 tracking-wider">
                      <span>
                        {new Date(note.updatedAt).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1 text-surface-900 dark:text-white">
                        <Lucide.ArrowRight strokeWidth={1.5} className="w-3.5 h-3.5 -translate-x-2 group-hover:translate-x-0 transition-transform duration-300" />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        note={selectedNote}
        onSuccess={() => {
          setNoteModalOpen(false)
          fetchNotes()
        }}
      />
    </div>
  )
}
