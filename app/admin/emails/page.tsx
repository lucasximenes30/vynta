import { redirect } from 'next/navigation'
import Link from 'next/link'
import * as Lucide from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { EMAIL_CAMPAIGNS, campaignLabel } from '@/lib/emailCampaigns'
import { getEmailCampaignStats, listEmailLogs, type EmailStatusFilter } from '@/services/admin/email.admin.service'
import { AdminPageHeader, StatCard, Panel } from '../ui'

export const dynamic = 'force-dynamic'

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—')

function fmt(d: Date | null) {
  return d ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(d) : '—'
}

const PERIODS: Record<string, { label: string; days: number | null }> = {
  '7': { label: 'Últimos 7 dias', days: 7 },
  '30': { label: 'Últimos 30 dias', days: 30 },
  all: { label: 'Desde o início', days: null },
}

export default async function AdminEmailsPage({ searchParams }: { searchParams: Promise<{ tag?: string; status?: string; search?: string; period?: string }> }) {
  const session = await requireAuth().catch(() => null)
  if (!session || session.role !== 'ADMIN') redirect('/admin/login')

  const sp = await searchParams
  const tag = sp.tag || 'all'
  const status = (['clicked', 'opened', 'not_opened'].includes(sp.status ?? '') ? sp.status : 'all') as EmailStatusFilter
  const search = sp.search?.trim() || ''
  const period = PERIODS[sp.period ?? ''] ? sp.period! : '30'
  const days = PERIODS[period].days
  const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined

  const [stats, logs] = await Promise.all([getEmailCampaignStats(since), listEmailLogs({ tag, status, search })])
  const total = stats.reduce((acc, s) => ({ sent: acc.sent + s.sent, opened: acc.opened + s.opened, clicked: acc.clicked + s.clicked }), { sent: 0, opened: 0, clicked: 0 })

  const selectCls = 'h-10 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950 px-3 text-sm text-surface-900 dark:text-white outline-none focus:border-brand-500'

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader
        title="E-mails"
        subtitle="Quem recebeu, abriu e clicou nos e-mails automáticos do Vynta."
        aside={
          <form className="flex gap-2">
            <select name="period" defaultValue={period} className={selectCls}>
              {Object.entries(PERIODS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
            </select>
            <button className="h-10 rounded-xl bg-surface-900 dark:bg-white px-4 text-sm font-semibold text-white dark:text-surface-900">Ver</button>
          </form>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="Send" label="Enviados" value={total.sent} tone="brand" />
        <StatCard icon="MailOpen" label="Abertos" value={total.opened} hint={`${pct(total.opened, total.sent)} de abertura`} tone="blue" />
        <StatCard icon="MousePointerClick" label="Clicaram" value={total.clicked} hint={`${pct(total.clicked, total.sent)} de clique`} tone="emerald" />
        <StatCard icon="MailX" label="Não abertos" value={total.sent - total.opened} tone="amber" />
      </div>

      <Panel title="Por campanha" subtitle={PERIODS[period].label}>
        {stats.length === 0 ? (
          <p className="py-10 text-center text-sm text-surface-500">Nenhum e-mail enviado neste período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-surface-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Campanha</th>
                  <th className="px-4 py-3 font-semibold text-right">Enviados</th>
                  <th className="px-4 py-3 font-semibold text-right">Abertura</th>
                  <th className="px-4 py-3 font-semibold text-right">Clique</th>
                  <th className="px-4 py-3 font-semibold w-40 hidden sm:table-cell" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {stats.map((s) => (
                  <tr key={s.tag ?? 'none'} className="hover:bg-surface-50 dark:hover:bg-surface-800/30">
                    <td className="px-4 py-3">
                      <Link href={`/admin/emails?tag=${s.tag}&period=${period}`} className="font-semibold text-surface-900 dark:text-white hover:text-brand-600">{campaignLabel(s.tag)}</Link>
                      <p className="text-xs text-surface-500">{(s.tag && EMAIL_CAMPAIGNS[s.tag]?.description) || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{s.sent}</td>
                    <td className="px-4 py-3 text-right"><span className="font-mono">{s.opened}</span> <span className="text-xs text-surface-500">({pct(s.opened, s.sent)})</span></td>
                    <td className="px-4 py-3 text-right"><span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{s.clicked}</span> <span className="text-xs text-surface-500">({pct(s.clicked, s.sent)})</span></td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden flex">
                        <div className="bg-emerald-500" style={{ width: pct(s.clicked, s.sent) }} />
                        <div className="bg-blue-400" style={{ width: pct(s.opened - s.clicked, s.sent) }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Envios recentes" subtitle="Clique é o sinal mais confiável; abertura é aproximada (alguns apps bloqueiam ou pré-carregam imagens).">
        <form className="mb-4 flex flex-col sm:flex-row gap-2">
          <input name="search" defaultValue={search} placeholder="Buscar por nome ou e-mail..." className={`${selectCls} flex-1`} />
          <select name="tag" defaultValue={tag} className={selectCls}>
            <option value="all">Todas as campanhas</option>
            {Object.entries(EMAIL_CAMPAIGNS).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
          </select>
          <select name="status" defaultValue={status} className={selectCls}>
            <option value="all">Todos os status</option>
            <option value="clicked">Clicou</option>
            <option value="opened">Abriu, não clicou</option>
            <option value="not_opened">Não abriu</option>
          </select>
          <input type="hidden" name="period" value={period} />
          <button className="h-10 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-500">Filtrar</button>
        </form>

        {logs.length === 0 ? (
          <p className="py-10 text-center text-sm text-surface-500">Nenhum e-mail encontrado.</p>
        ) : (
          <ul className="divide-y divide-surface-100 dark:divide-surface-800">
            {logs.map((l) => (
              <li key={l.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-surface-900 dark:text-white">{l.user.name} <span className="font-normal text-surface-500">· {l.user.email}</span></p>
                  <p className="truncate text-xs text-surface-500">{campaignLabel(l.tag)} · {l.subject}</p>
                </div>
                <div className="flex items-center gap-3 text-xs shrink-0">
                  <span className="text-surface-400">Enviado {fmt(l.sentAt)}</span>
                  <EmailStatusBadge openedAt={l.openedAt} clickedAt={l.clickedAt} clicks={l.clicks} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function EmailStatusBadge({ openedAt, clickedAt, clicks }: { openedAt: Date | null; clickedAt: Date | null; clicks: number }) {
  if (clickedAt) return (
    <span title={`1º clique em ${fmt(clickedAt)}`} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-700 dark:text-emerald-400">
      <Lucide.MousePointerClick className="h-3.5 w-3.5" /> Clicou{clicks > 1 ? ` (${clicks}x)` : ''}
    </span>
  )
  if (openedAt) return (
    <span title={`Aberto em ${fmt(openedAt)}`} className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-500/10 px-2.5 py-1 font-bold text-blue-700 dark:text-blue-400">
      <Lucide.MailOpen className="h-3.5 w-3.5" /> Abriu
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-100 dark:bg-surface-800 px-2.5 py-1 font-bold text-surface-500">
      <Lucide.Mail className="h-3.5 w-3.5" /> Não abriu
    </span>
  )
}
