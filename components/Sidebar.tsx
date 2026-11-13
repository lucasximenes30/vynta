'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as Lucide from 'lucide-react'
import BrandLogo from './BrandLogo'

export const NAV_ITEMS = [
  {
    Icon: Lucide.LayoutDashboard,
    label: 'Painel',
    href: '/dashboard',
    match: (p: string) => p === '/dashboard',
  },
  {
    Icon: Lucide.Wallet,
    label: 'Finanças',
    href: '/finances',
    match: (p: string) => p.startsWith('/finances') || p.startsWith('/cards'),
  },
  {
    Icon: Lucide.CheckSquare,
    label: 'Hábitos',
    href: '/habits',
    match: (p: string) => p.startsWith('/habits'),
  },
  {
    Icon: Lucide.Dumbbell,
    label: 'Treinos',
    href: '/workout',
    match: (p: string) => p.startsWith('/workout'),
  },
  {
    Icon: Lucide.CalendarDays,
    label: 'Agenda',
    href: '/calendar',
    match: (p: string) => p.startsWith('/calendar'),
  },
  {
    Icon: Lucide.Target,
    label: 'Metas',
    href: '/goals',
    match: (p: string) => p.startsWith('/goals'),
  },
  {
    Icon: Lucide.StickyNote,
    label: 'Notas',
    href: '/notes',
    match: (p: string) => p.startsWith('/notes'),
  },
  {
    Icon: Lucide.BarChart3,
    label: 'Relatórios',
    href: '/reports',
    match: (p: string) => p.startsWith('/reports'),
  },
  {
    Icon: Lucide.Settings,
    label: 'Configurações',
    href: '/settings',
    match: (p: string) => p.startsWith('/settings'),
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-20 flex-col border-r border-surface-200/70 bg-surface-100/80 p-3 dark:border-[#342e42] dark:bg-[#1b1724] md:flex lg:w-56 lg:p-4">
      <Link href="/dashboard" aria-label="Vynta — painel" className="mb-8 mt-3 flex justify-center lg:justify-start lg:px-3">
        <span className="lg:hidden"><BrandLogo showText={false} size="md" /></span>
        <span className="hidden lg:block"><BrandLogo size="lg" /></span>
      </Link>
      <nav aria-label="Navegação principal" className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto no-scrollbar">
        {NAV_ITEMS.map(({ Icon, label, href, match }) => {
          const isActive = match(pathname)
          return (
            <Link key={href} href={href} aria-current={isActive ? 'page' : undefined} title={label}
              className={`group relative flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors duration-200 lg:justify-start ${isActive
                ? 'bg-white text-brand-700 shadow-sm dark:bg-[#30283e] dark:text-sprout-lime'
                : 'text-surface-600 hover:bg-white/70 hover:text-brand-700 dark:text-surface-400 dark:hover:bg-white/5 dark:hover:text-surface-100'}`}>
              <Icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-active:scale-90" strokeWidth={isActive ? 2.2 : 1.7} />
              <span className="hidden lg:block">{label}</span>
              {isActive && <span aria-hidden className="absolute right-2 h-1.5 w-1.5 rounded-full bg-brand-500 dark:bg-sprout-lime lg:right-3" />}
            </Link>
          )
        })}
      </nav>
      <p className="mt-5 hidden px-3 text-xs leading-relaxed text-surface-500 lg:block">Seu dinheiro e sua rotina.<br />Um passo de cada vez.</p>
    </aside>
  )
}
