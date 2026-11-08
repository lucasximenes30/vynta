import {
  CreditCard, MailOpen, MailX, MousePointerClick, Send, Target, Users, UserCheck, UserX, Clock, type LucideIcon,
} from 'lucide-react'

// Shared building blocks for the admin screens (server-safe, no client JS).

const ICONS: Record<string, LucideIcon> = { CreditCard, MailOpen, MailX, MousePointerClick, Send, Target, Users, UserCheck, UserX, Clock }

const TONES = {
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
} as const

export type Tone = keyof typeof TONES

export function AdminPageHeader({ title, subtitle, aside }: { title: string; subtitle?: string; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-surface-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{subtitle}</p>}
      </div>
      {aside}
    </div>
  )
}

export function StatCard({ icon, label, value, hint, tone = 'brand', href }: { icon: keyof typeof ICONS | string; label: string; value: number | string; hint?: string; tone?: Tone; href?: string }) {
  const Icon = ICONS[icon] ?? Target
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONES[tone]}`}><Icon className="h-[18px] w-[18px]" /></span>
      </div>
      <div className="mt-3 font-display text-3xl font-bold tracking-tight text-surface-900 dark:text-white">{value}</div>
      {hint && <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">{hint}</p>}
    </>
  )
  const cls = 'block rounded-2xl border border-surface-200/80 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 shadow-sm'
  return href ? <a href={href} className={`${cls} transition hover:border-brand-300 dark:hover:border-brand-500/40 hover:shadow-md`}>{body}</a> : <div className={cls}>{body}</div>
}

export function Panel({ title, subtitle, children, aside }: { title: string; subtitle?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-surface-200/80 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold text-surface-900 dark:text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">{subtitle}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}
