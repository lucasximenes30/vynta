'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { generateNotifications, Notification } from '@/lib/notifications'
import * as Lucide from 'lucide-react'

interface Props {
  transactions: Array<{
    id: string
    title: string
    amount: string
    type: 'INCOME' | 'EXPENSE'
    isInstallment?: boolean
    isRecurring?: boolean
    dueDay?: number | null
    recurringDay?: number | null
    totalInstallments?: number | null
    purchaseDate?: string | null
    isActive?: boolean
    endDate?: string | null
    cardId?: string | null
    date?: string | null
    installmentAmount?: string | number | null
  }>
  cards?: Array<{
    id: string
    name: string
    lastFourDigits: string
    dueDay: number
    closingDay: number
    limitAmount?: string | number | null
  }>
  isBRL: boolean
}

export default function NotificationDropdown({ transactions, cards = [], isBRL }: Props) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [apiReady, setApiReady] = useState(false)
  const [notifications, setNotifications] = useState<Array<Notification & { read: boolean; paidAt: string | null }>>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const fallbackNotifications = useMemo<Array<Notification & { read: boolean; paidAt: string | null }>>(() => {
    const tx = transactions.map((t) => ({
      id: t.id,
      title: t.title,
      type: t.type,
      isInstallment: t.isInstallment ?? false,
      isRecurring: t.isRecurring ?? false,
      dueDay: t.dueDay ?? null,
      recurringDay: t.recurringDay ?? null,
      totalInstallments: t.totalInstallments ?? null,
      purchaseDate: t.purchaseDate ? new Date(t.purchaseDate) : null,
      isActive: t.isActive ?? true,
      endDate: t.endDate ? new Date(t.endDate) : null,
      cardId: t.cardId ?? null,
      amount: t.amount,
      installmentAmount: t.installmentAmount ?? null,
      date: t.date ? new Date(t.date) : null,
    }))
    return generateNotifications(tx, cards).map((notification) => ({
      ...notification,
      read: false,
      paidAt: null,
    }))
  }, [transactions, cards])

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) throw new Error('Failed to fetch notifications')

      const data = await res.json()
      const next = Array.isArray(data.notifications) ? data.notifications : []
      setNotifications(next)
      setApiReady(true)
    } catch {
      setNotifications(fallbackNotifications)
      setApiReady(false)
    } finally {
      setIsLoading(false)
    }
  }, [fallbackNotifications])

  const runNotificationAction = useCallback(
    async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Notification action failed')
      }

      const data = await res.json()
      if (Array.isArray(data.notifications)) {
        setNotifications(data.notifications)
      }
      setApiReady(true)
    },
    [],
  )

  useEffect(() => {
    void fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (!apiReady) {
      setNotifications(fallbackNotifications)
    }
  }, [apiReady, fallbackNotifications])

  useEffect(() => {
    if (open) {
      void fetchNotifications()
    }
  }, [open, fetchNotifications])

  const count = notifications.filter((notification) => !notification.read).length
  const lateCount = notifications.filter((notification) => notification.type === 'late' && !notification.read).length

  const groups = useMemo(() => {
    return {
      late: notifications.filter((notification) => notification.type === 'late'),
      today: notifications.filter((notification) => notification.type === 'today'),
      upcoming: notifications.filter((notification) => notification.type === 'upcoming'),
    }
  }, [notifications])

  useEffect(() => {
    if (!open || notifications.length === 0) return

    const unreadIds = notifications.filter((notification) => !notification.read).map((notification) => notification.id)
    if (unreadIds.length === 0) return

    const unreadIdSet = new Set(unreadIds)
    setNotifications((prev) =>
      prev.map((notification) =>
        unreadIdSet.has(notification.id) ? { ...notification, read: true } : notification,
      ),
    )

    if (apiReady) {
      void runNotificationAction({ action: 'mark-read', ids: unreadIds }).catch(() => {
        void fetchNotifications()
      })
    }
  }, [apiReady, fetchNotifications, notifications, open, runNotificationAction])

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((notification) => !notification.read).map((notification) => notification.id)
    if (unreadIds.length === 0) return

    const unreadIdSet = new Set(unreadIds)
    setNotifications((prev) =>
      prev.map((notification) =>
        unreadIdSet.has(notification.id) ? { ...notification, read: true } : notification,
      ),
    )

    if (!apiReady) return

    try {
      await runNotificationAction({ action: 'mark-all-read' })
    } catch {
      void fetchNotifications()
    }
  }

  const handleRegisterPayment = async (id: string) => {
    if (!apiReady) return

    setProcessingId(id)
    try {
      await runNotificationAction({ action: 'register-payment', id })
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      setFeedback(navigator.onLine ? 'Pagamento registrado com sucesso.' : 'Pagamento salvo no aparelho — sincroniza ao conectar.')
    } catch {
      setFeedback('Nao foi possivel registrar o pagamento.')
      void fetchNotifications()
    } finally {
      setProcessingId(null)
      window.setTimeout(() => setFeedback(null), 2200)
    }
  }

  const emptyState = notifications.length === 0

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200 transition-all duration-200"
        title={'Notificações'}
      >
        <Lucide.Bell className="h-5 w-5" />
        {count > 0 && (
          <span
            className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
              lateCount > 0
                ? 'bg-red-500'
                : 'bg-amber-500'
            }`}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 z-[60] mt-2 w-[min(22rem,calc(100vw-1.5rem))] origin-top-right rounded-2xl border border-surface-200 bg-white shadow-xl dark:border-surface-700/60 dark:bg-surface-900 transition-all duration-200 animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="border-b border-surface-100 px-4 py-3 dark:border-surface-700/60">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200">
                {'Notificacoes'}
              </h3>
              <span className="text-xs font-medium text-surface-400">
                {count > 0
                  ? `${count} ${isBRL ? (count === 1 ? 'nao lida' : 'nao lidas') : count === 1 ? 'unread' : 'unread'}`
                  : 'Tudo lido'}
              </span>
            </div>
            {count > 0 && (
              <button
                onClick={markAllAsRead}
                className="mt-2 text-[11px] font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                {'Marcar todas como lidas'}
              </button>
            )}
            {!apiReady && (
              <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                {'Sincronizacao indisponivel no momento.'}
              </p>
            )}
            {feedback && (
              <p className="mt-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                {feedback}
              </p>
            )}
          </div>

          {/* List */}
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-surface-500 dark:text-surface-400">
              <Lucide.Loader2 className="h-4 w-4 animate-spin" />
              {'Carregando notificacoes...'}
            </div>
          ) : emptyState ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8">
              <Lucide.CheckCircle2 className="h-8 w-8 text-emerald-400 dark:text-emerald-500" />
              <p className="text-sm text-surface-400 dark:text-surface-500 text-center">
                {'Tudo em dia!'}
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto py-2">
              {groups.late.length > 0 && (
                <NotificationSection
                  title={'Atrasadas'}
                  items={groups.late}
                  isBRL={isBRL}
                  onRegisterPayment={handleRegisterPayment}
                  processingId={processingId}
                  actionableEnabled={apiReady}
                />
              )}
              {groups.today.length > 0 && (
                <NotificationSection
                  title={'Hoje'}
                  items={groups.today}
                  isBRL={isBRL}
                  onRegisterPayment={handleRegisterPayment}
                  processingId={processingId}
                  actionableEnabled={apiReady}
                />
              )}
              {groups.upcoming.length > 0 && (
                <NotificationSection
                  title={'Em breve'}
                  items={groups.upcoming}
                  isBRL={isBRL}
                  onRegisterPayment={handleRegisterPayment}
                  processingId={processingId}
                  actionableEnabled={apiReady}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NotificationSection({
  title,
  items,
  isBRL,
  onRegisterPayment,
  processingId,
  actionableEnabled,
}: {
  title: string
  items: Array<Notification & { read: boolean; paidAt: string | null }>
  isBRL: boolean
  onRegisterPayment: (id: string) => void
  processingId: string | null
  actionableEnabled: boolean
}) {
  return (
    <section className="mb-2">
      <div className="px-4 pb-1 pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">{title}</p>
      </div>
      {items.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          isBRL={isBRL}
          onRegisterPayment={onRegisterPayment}
          processing={processingId === notification.id}
          actionableEnabled={actionableEnabled}
        />
      ))}
    </section>
  )
}

function NotificationItem({
  notification,
  isBRL,
  onRegisterPayment,
  processing,
  actionableEnabled,
}: {
  notification: Notification & { read: boolean; paidAt: string | null }
  isBRL: boolean
  onRegisterPayment: (id: string) => void
  processing: boolean
  actionableEnabled: boolean
}) {
  const { title, description, type } = notification
  const unread = !notification.read

  const iconMap = {
    late: (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
        <Lucide.AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      </div>
    ),
    today: (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
        <Lucide.Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      </div>
    ),
    upcoming: (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
        <Lucide.Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
    ),
  }

  const borderMap = {
    late: 'border-l-red-500',
    today: 'border-l-emerald-500',
    upcoming: 'border-l-amber-500',
  }

  const actionLabel =
    notification.sourceType === 'card_bill'
      ? 'Registrar pagamento'
      : 'Marcar como pago'

  return (
    <div
      className={`flex items-start gap-3 border-l-2 px-4 py-3 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50 ${
        unread ? 'bg-surface-50/80 dark:bg-surface-800/40' : 'opacity-80'
      } ${
        borderMap[type]
      }`}
    >
      {iconMap[type]}
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-semibold ${unread ? 'text-surface-900 dark:text-surface-100' : 'text-surface-700 dark:text-surface-300'}`}>
          {title}
        </p>
        <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
          {description}
        </p>

        {notification.actionable && (
          <div className="mt-2">
            <button
              onClick={() => onRegisterPayment(notification.id)}
              disabled={processing || !actionableEnabled}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-300/70 bg-brand-50 px-2.5 py-1.5 text-[11px] font-semibold text-brand-700 transition-all hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-700/60 dark:bg-brand-900/20 dark:text-brand-300 dark:hover:bg-brand-900/30 sm:w-auto"
            >
              {processing ? (
                <>
                  <Lucide.Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {'Registrando...'}
                </>
              ) : (
                <>
                  <Lucide.CheckCircle2 className="h-3.5 w-3.5" />
                  {actionLabel}
                </>
              )}
            </button>
          </div>
        )}
      </div>
      {/* Quick status dot */}
      <span
        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
          unread && type === 'late'
            ? 'bg-red-500'
            : unread && type === 'today'
            ? 'bg-emerald-500'
            : unread
            ? 'bg-amber-500'
            : 'bg-surface-300 dark:bg-surface-600'
        }`}
      />
    </div>
  )
}
