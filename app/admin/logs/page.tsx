'use client'

import { useState, useEffect, useCallback } from 'react'
import * as Lucide from 'lucide-react'
import { getIconByName } from '@/lib/icons'

type AdminLog = {
  id: string
  action: string
  description: string | null
  createdAt: string
  metadata: Record<string, unknown> | null
  admin: { id: string; name: string; email: string }
  targetUser: { id: string; name: string; email: string } | null
}

type PageData = {
  logs: AdminLog[]
  total: number
  page: number
  totalPages: number
}

const ACTION_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  USER_CREATED: { label: 'Usuário Criado', icon: 'UserPlus', color: 'emerald' },
  USER_UPDATED: { label: 'Usuário Editado', icon: 'Edit2', color: 'blue' },
  USER_DELETED: { label: 'Usuário Deletado', icon: 'Trash2', color: 'red' },
  PASSWORD_RESET: { label: 'Senha Redefinida', icon: 'Key', color: 'amber' },
  ACCESS_CHANGED: { label: 'Acesso Alterado', icon: 'ShieldAlert', color: 'brand' },
  STATUS_CHANGED: { label: 'Status Alterado', icon: 'Power', color: 'violet' },
  PLAN_CHANGED: { label: 'Plano Alterado', icon: 'Crown', color: 'brand' },
  WHATSAPP_OPENED: { label: 'WhatsApp Aberto', icon: 'MessageCircle', color: 'emerald' },
  PAYMENT_STATUS_UPDATED: { label: 'Pagamento Atualizado', icon: 'CreditCard', color: 'blue' },
}

const COLOR_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  brand: 'bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

// Dynamic icon lookup
function ActionIcon({ name, className }: { name: string; className?: string }) {
  const Icon = getIconByName(name, Lucide.Activity)
  return <Icon className={className} />
}

export default function AdminLogsPage() {
  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/logs?page=${page}`)
      if (!res.ok) throw new Error('Erro ao carregar logs')
      setData(await res.json())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-surface-900 dark:text-white">
            Logs de Ações
          </h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            Rastreabilidade de todas as ações realizadas no painel admin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <div className="px-4 py-2 bg-surface-100 dark:bg-surface-800 rounded-lg text-sm font-medium text-surface-600 dark:text-surface-300">
              Total: {data.total}
            </div>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2.5 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50 text-sm"
          >
            <Lucide.RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-surface-400">
            <Lucide.Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <p className="text-sm">Carregando logs...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl">
          {error}
        </div>
      )}

      {/* Content */}
      {!loading && !error && data && (
        <>
          {data.logs.length === 0 ? (
            <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-16 text-center">
              <div className="w-14 h-14 bg-surface-100 dark:bg-surface-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lucide.ClipboardList className="w-7 h-7 text-surface-400" />
              </div>
              <p className="font-semibold text-surface-700 dark:text-surface-300">Nenhuma ação registrada ainda.</p>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                As ações do admin aparecem aqui em tempo real.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
              <div className="divide-y divide-surface-100 dark:divide-surface-800">
                {data.logs.map((log) => {
                  const cfg = ACTION_CONFIG[log.action] ?? { label: log.action, icon: 'Activity', color: 'blue' }
                  const colorClass = COLOR_CLASSES[cfg.color] ?? COLOR_CLASSES.blue

                  return (
                    <div key={log.id} className="p-4 sm:p-5 flex items-start gap-4 hover:bg-surface-50/50 dark:hover:bg-surface-800/20 transition-colors">
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <ActionIcon name={cfg.icon} className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold text-surface-900 dark:text-surface-100 text-sm">
                            {cfg.label}
                          </span>
                          {log.targetUser && (
                            <>
                              <span className="text-surface-400 text-sm">→</span>
                              <span className="text-sm text-surface-600 dark:text-surface-300 font-medium truncate max-w-[200px]">
                                {log.targetUser.name}
                              </span>
                              <span className="text-xs text-surface-400 hidden sm:inline truncate max-w-[180px]">
                                ({log.targetUser.email})
                              </span>
                            </>
                          )}
                        </div>
                        {log.description && (
                          <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">{log.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                          <span className="text-xs text-surface-400 flex items-center gap-1">
                            <Lucide.User className="w-3 h-3" />
                            {log.admin.name}
                          </span>
                          <span className="text-xs text-surface-400 flex items-center gap-1">
                            <Lucide.Clock className="w-3 h-3" />
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-surface-500">
                Página {data.page} de {data.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-50 transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages}
                  className="px-4 py-2 text-sm bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-50 transition-colors"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
