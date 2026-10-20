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
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-20 flex-col items-center border-r border-surface-200/80 bg-white pt-6 pb-6 transition-colors duration-300 dark:border-surface-800 dark:bg-surface-900 md:flex overflow-x-hidden">
      {/* Brand mark */}
      <div className="mb-6 shrink-0">
        <BrandLogo showText={false} size="md" />
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-2 w-full px-3 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        {NAV_ITEMS.map(({ Icon, label, href, match }) => {
          const isActive = match(pathname)
          return (
            <div key={href} className="relative group flex items-center justify-center w-full">
              {/* Active neon dot/indicator */}
              {isActive && (
                <div className="absolute left-0 w-1 h-8 rounded-r-full bg-brand-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
              )}
              
              <Link
                href={href}
                className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20 dark:bg-brand-600 dark:shadow-brand-500/20'
                    : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800/60 hover:text-surface-800 dark:hover:text-surface-200'
                }`}
                title={label}
              >
                <Icon className="h-5 w-5" />
              </Link>

              {/* Collapsed Tooltip (Desktop) */}
              <div className="pointer-events-none absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-surface-900/90 dark:bg-surface-800/95 text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 shadow-xl z-50 border border-white/10 backdrop-blur-md translate-x-1 group-hover:translate-x-0">
                {label}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-surface-900/90 dark:border-r-surface-800/95" />
              </div>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
