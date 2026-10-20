'use client'

import { useEffect, useState } from 'react'
import * as Lucide from 'lucide-react'
import { getIconByName } from '@/lib/icons'
import { getWhatsappLink, getWhatsappMessage } from '@/lib/whatsapp'

export type UserDetails = {
  id: string
  name: string
  email: string
  plan: string
  role: string
  subscriptionStatus: string
  createdAt: string
  phone?: string | null
  subscriptionEndDate?: string | null
  subscriptionExpiresAt?: string | null
}

type FullUserDetails = UserDetails & {
  subscriptionStartDate?: string | null
  billingApprovedAt?: string | null
  billingProvider?: string | null
  paymentTransactions?: PaymentTx[]
}

type PaymentTx = {
  id: string
  provider: string
  providerTransactionId: string | null
  amount: number | null
  paymentMethod: string | null
  status: 'PENDING' | 'ACTIVE' | 'FAILED' | 'EXPIRED' | 'CANCELED'
  paidAt: string | null
  expiresAt: string | null
  createdAt: string
}

type Tab = 'account' | 'subscription' | 'payments' | 'actions'

const PAYMENT_STATUS_CONFIG = {
  ACTIVE: { label: 'Aprovado', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  PENDING: { label: 'Pendente', className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  FAILED: { label: 'Falhou', className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
  EXPIRED: { label: 'Expirado', className: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400' },
  CANCELED: { label: 'Cancelado', className: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400' },
}

const SUB_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Ativo', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  INACTIVE: { label: 'Inativo', className: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400' },
  PENDING: { label: 'Pendente', className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  CANCELED: { label: 'Cancelado', className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
  REFUSED: { label: 'Recusado', className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
  PAST_DUE: { label: 'Em atraso', className: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' },
}

function fmt(d: string | null | undefined) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
}

function fmtFull(d: string | null | undefined) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

function daysRemaining(d: string | null | undefined): number | null {
  if (!d) return null
  const diff = new Date(d).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">{label}</p>
      <div className="text-sm font-medium text-surface-900 dark:text-surface-100">{children}</div>
    </div>
  )
}

export default function UserDetailsModal({
  user,
  onClose,
  onOpenAccess,
  onOpenPassword,
  onOpenEdit,
  onOpenDelete,
}: {
  user: UserDetails | null
  onClose: () => void
  onOpenAccess?: () => void
  onOpenPassword?: () => void
  onOpenEdit?: () => void
  onOpenDelete?: () => void
}) {
  const [visible, setVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('account')
  const [fullDetails, setFullDetails] = useState<FullUserDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    if (user) {
      requestAnimationFrame(() => setVisible(true))
      setActiveTab('account')
      setFullDetails(null)
      // Fetch full details
      setLoadingDetails(true)
      fetch(`/api/admin/users/${user.id}/details`)
        .then((r) => r.json())
        .then((data) => setFullDetails(data))
        .catch(() => setFullDetails(null))
        .finally(() => setLoadingDetails(false))
    } else {
      setVisible(false)
    }
  }, [user])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  if (!user) return null

  const details = fullDetails ?? user
  const isActive = details.subscriptionStatus === 'ACTIVE'
  const accessLabel =
    user.role === 'ADMIN' ? 'Admin' :
    user.role === 'COURTESY' ? 'Courtesy' :
    user.plan === 'PRO' ? 'VIP' : 'Free'

  const expiresAt = (details as FullUserDetails).subscriptionEndDate ?? details.subscriptionExpiresAt
  const days = daysRemaining(expiresAt)
  const subStatusCfg = SUB_STATUS_CONFIG[details.subscriptionStatus] ?? { label: details.subscriptionStatus, className: '' }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'account', label: 'Conta', icon: 'User' },
    { key: 'subscription', label: 'Assinatura', icon: 'Crown' },
    { key: 'payments', label: 'Pagamentos', icon: 'CreditCard' },
    { key: 'actions', label: 'Ações', icon: 'Settings' },
  ]

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className={`w-full sm:max-w-xl max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-surface-900 shadow-2xl border border-surface-200 dark:border-surface-700/60 transition-all duration-300 ${visible ? 'translate-y-0 sm:scale-100 opacity-100' : 'translate-y-full sm:translate-y-0 sm:scale-95 opacity-0'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
              <Lucide.UserCircle className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-surface-900 dark:text-surface-100 leading-tight">{user.name}</h2>
              <p className="text-xs text-surface-500 dark:text-surface-400 truncate max-w-[220px]">{user.email}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:text-surface-300 dark:hover:bg-surface-800 transition-colors">
            <Lucide.X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-100 dark:border-surface-800 px-4 gap-1 flex-shrink-0 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = getIconByName(tab.icon)
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'account' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoRow label="Nome">{user.name}</InfoRow>
              <InfoRow label="E-mail">{user.email}</InfoRow>
              <InfoRow label="Telefone">
                {user.phone ? (
                  <div className="flex items-center gap-2">
                    <span>{user.phone}</span>
                    <a
                      href={getWhatsappLink(user.phone, getWhatsappMessage('generic', user as any)) || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 rounded text-xs font-semibold transition-colors"
                    >
                      <Lucide.MessageCircle className="w-3 h-3" />
                      WA
                    </a>
                  </div>
                ) : <span className="text-surface-400 italic text-sm">Não informado</span>}
              </InfoRow>
              <InfoRow label="Acesso">{accessLabel}</InfoRow>
              <InfoRow label="Status da Conta">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${subStatusCfg.className}`}>
                  {subStatusCfg.label}
                </span>
              </InfoRow>
              <InfoRow label="Cadastrado em">{fmtFull(user.createdAt)}</InfoRow>
              <div className="sm:col-span-2 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">ID do Usuário</p>
                <div className="font-mono text-xs text-surface-600 dark:text-surface-300 p-2.5 bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded-xl break-all">
                  {user.id}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="space-y-5">
              {loadingDetails && (
                <div className="flex items-center gap-3 py-4 text-surface-400">
                  <Lucide.Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Carregando dados de assinatura...</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InfoRow label="Status da Assinatura">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${subStatusCfg.className}`}>
                    {subStatusCfg.label}
                  </span>
                </InfoRow>
                <InfoRow label="Plano Atual">{accessLabel}</InfoRow>
                <InfoRow label="Início da Assinatura">
                  {fmt((details as FullUserDetails).subscriptionStartDate)}
                </InfoRow>
                <InfoRow label="Vencimento">
                  {expiresAt ? (
                    <div className="flex items-center gap-2">
                      <span>{fmt(expiresAt)}</span>
                      {days !== null && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          days <= 0 ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                          days <= 3 ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' :
                          days <= 7 ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                          'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                        }`}>
                          {days <= 0 ? 'Expirado' : `${days}d restantes`}
                        </span>
                      )}
                    </div>
                  ) : '—'}
                </InfoRow>
                <InfoRow label="Último Pagamento">
                  {fmt((details as FullUserDetails).billingApprovedAt)}
                </InfoRow>
                <InfoRow label="Provedor">
                  {(details as FullUserDetails).billingProvider || '—'}
                </InfoRow>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              {loadingDetails ? (
                <div className="flex items-center gap-3 py-4 text-surface-400">
                  <Lucide.Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Carregando pagamentos...</span>
                </div>
              ) : (fullDetails?.paymentTransactions ?? []).length === 0 ? (
                <div className="py-10 text-center border border-dashed border-surface-200 dark:border-surface-800 rounded-2xl">
                  <Lucide.CreditCard className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                  <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Nenhum pagamento registrado.</p>
                  <p className="text-xs text-surface-400 mt-1">Os pagamentos aparecem aqui via webhook.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(fullDetails?.paymentTransactions ?? []).map((tx) => {
                    const statusCfg = PAYMENT_STATUS_CONFIG[tx.status] ?? PAYMENT_STATUS_CONFIG.CANCELED
                    return (
                      <div key={tx.id} className="p-4 bg-surface-50 dark:bg-surface-950/50 border border-surface-200 dark:border-surface-800 rounded-2xl">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${statusCfg.className}`}>
                              {statusCfg.label}
                            </span>
                            <span className="font-mono font-bold text-surface-900 dark:text-surface-100">
                              {tx.amount != null ? tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                            </span>
                          </div>
                          <span className="text-xs text-surface-400">{fmt(tx.createdAt)}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-surface-500 dark:text-surface-400">
                          {tx.paymentMethod && <span className="capitalize">via {tx.paymentMethod}</span>}
                          {tx.paidAt && <span>Pago em {fmt(tx.paidAt)}</span>}
                          {tx.expiresAt && <span>Expira em {fmt(tx.expiresAt)}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-3">
              {user.phone && (
                <a
                  href={getWhatsappLink(user.phone, getWhatsappMessage('generic', user as any)) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium active:scale-[0.98] transition-transform"
                >
                  <div className="p-2 bg-emerald-200/50 dark:bg-emerald-500/20 rounded-xl">
                    <Lucide.MessageCircle className="w-5 h-5" />
                  </div>
                  Contato via WhatsApp
                </a>
              )}

              {onOpenEdit && (
                <button
                  onClick={() => { handleClose(); setTimeout(() => onOpenEdit(), 200) }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium active:scale-[0.98] transition-transform"
                >
                  <div className="p-2 bg-blue-200/50 dark:bg-blue-500/20 rounded-xl">
                    <Lucide.Edit2 className="w-5 h-5" />
                  </div>
                  Editar Dados do Usuário
                </button>
              )}

              {onOpenAccess && (
                <button
                  onClick={() => { handleClose(); setTimeout(() => onOpenAccess(), 200) }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 font-medium active:scale-[0.98] transition-transform"
                >
                  <div className="p-2 bg-brand-200/50 dark:bg-brand-500/20 rounded-xl">
                    <Lucide.ShieldAlert className="w-5 h-5" />
                  </div>
                  Alterar Nível de Acesso
                </button>
              )}

              {onOpenPassword && (
                <button
                  onClick={() => { handleClose(); setTimeout(() => onOpenPassword(), 200) }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium active:scale-[0.98] transition-transform"
                >
                  <div className="p-2 bg-amber-200/50 dark:bg-amber-500/20 rounded-xl">
                    <Lucide.Key className="w-5 h-5" />
                  </div>
                  Gerar Senha Temporária
                </button>
              )}

              {user.role !== 'ADMIN' && onOpenDelete && (
                <button
                  onClick={() => { handleClose(); setTimeout(() => onOpenDelete(), 200) }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 font-medium active:scale-[0.98] transition-transform"
                >
                  <div className="p-2 bg-red-200/50 dark:bg-red-500/20 rounded-xl">
                    <Lucide.Trash2 className="w-5 h-5" />
                  </div>
                  Excluir Usuário
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
