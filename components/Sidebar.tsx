'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
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

export default function Sidebar({ collapsed = false, onToggle }: { collapsed?: boolean; onToggle?: () => void }) {
  const pathname = usePathname()
  const activeIndex = NAV_ITEMS.findIndex(item => item.match(pathname))
  const [hoverIndex, setHoverIndex] = useState(-1)

  return (
    <aside className={`app-sidebar fixed inset-y-0 left-0 z-40 hidden w-20 flex-col border-r border-surface-200/70 bg-surface-100/80 p-3 dark:border-[#342e42] dark:bg-[#1b1724] md:flex ${collapsed ? '' : 'lg:w-56 lg:p-4'}`}>
      <Link href="/dashboard" aria-label="Vynta — painel" className={`mb-6 mt-3 flex justify-center ${collapsed ? '' : 'lg:justify-start lg:px-3'}`}>
        <span className={collapsed ? '' : 'lg:hidden'}><BrandLogo showText={false} size="md" /></span>
        <span className={collapsed ? 'hidden' : 'hidden lg:block'}><BrandLogo size="lg" /></span>
      </Link>
      <button type="button" onClick={onToggle} aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'} aria-expanded={!collapsed} title={collapsed ? 'Expandir menu' : 'Recolher menu'} className="mb-4 hidden h-9 shrink-0 items-center justify-center gap-2 rounded-xl text-xs text-surface-500 transition-colors hover:bg-white/70 hover:text-brand-700 dark:hover:bg-white/5 dark:hover:text-sprout-lime lg:flex">
        <Lucide.PanelLeft className="h-4 w-4 shrink-0" />{!collapsed && <span>Recolher menu</span>}
      </button>
      <nav aria-label="Navegação principal" onPointerLeave={() => setHoverIndex(-1)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setHoverIndex(-1) }} className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto no-scrollbar">
        <div className="relative flex flex-col gap-1.5">
          <span aria-hidden className="nav-active-indicator pointer-events-none absolute inset-x-0 top-0 h-12 rounded-2xl bg-white shadow-sm dark:bg-[#30283e]" style={{ transform: `translateY(${Math.max(0, activeIndex) * 54}px)`, opacity: activeIndex < 0 ? 0 : 1 }} />
          <span aria-hidden className="nav-hover-indicator pointer-events-none absolute inset-x-0 top-0 h-12 rounded-2xl bg-brand-500/10 dark:bg-sprout-lavender/10" style={{ transform: `translateY(${Math.max(0, hoverIndex) * 54}px)`, opacity: hoverIndex < 0 ? 0 : 1 }} />
        {NAV_ITEMS.map(({ Icon, label, href, match }, index) => {
          const isActive = match(pathname)
          return (
            <Link key={href} href={href} aria-current={isActive ? 'page' : undefined} title={label}
              onPointerEnter={event => { if (event.pointerType !== 'touch') setHoverIndex(index) }} onFocus={() => setHoverIndex(index)}
              className={`group relative flex h-12 shrink-0 items-center justify-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors duration-200 ${collapsed ? '' : 'lg:justify-start'} ${isActive
                ? 'text-brand-700 dark:text-sprout-lime'
                : 'text-surface-600 hover:text-brand-700 dark:text-surface-400 dark:hover:text-surface-100'}`}>
              <Icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-active:scale-90" strokeWidth={isActive ? 2.2 : 1.7} />
              <span className={collapsed ? 'hidden' : 'hidden lg:block'}>{label}</span>
              {isActive && <span aria-hidden className="absolute right-2 h-1.5 w-1.5 rounded-full bg-brand-500 dark:bg-sprout-lime lg:right-3" />}
            </Link>
          )
        })}
        </div>
      </nav>
      <p className={`mt-5 hidden px-3 text-xs leading-relaxed text-surface-500 ${collapsed ? '' : 'lg:block'}`}>Seu dinheiro e sua rotina.<br />Um passo de cada vez.</p>
    </aside>
  )
}
