'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ClipboardList, CreditCard, ExternalLink, Filter, LayoutDashboard, LogOut, Mail, Users, type LucideIcon,
} from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import PushBridge from '@/components/push/PushBridge'

type NavLink = { href: string; label: string; icon: LucideIcon; mobile?: boolean }

const NAV_GROUPS: { title: string; links: NavLink[] }[] = [
  { title: 'Visão geral', links: [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, mobile: true },
    { href: '/admin/funil', label: 'Funil', icon: Filter, mobile: true },
  ] },
  { title: 'Clientes', links: [
    { href: '/admin/users', label: 'Usuários', icon: Users, mobile: true },
    { href: '/admin/emails', label: 'E-mails', icon: Mail, mobile: true },
  ] },
  { title: 'Financeiro', links: [
    { href: '/admin/payments', label: 'Pagamentos', icon: CreditCard, mobile: true },
  ] },
  { title: 'Sistema', links: [
    { href: '/admin/logs', label: 'Logs', icon: ClipboardList },
  ] },
]

const ALL_LINKS = NAV_GROUPS.flatMap((g) => g.links)

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  // Do not show the admin sidebar on the login page
  if (pathname === '/admin/login') {
    return <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col">{children}</div>
  }

  const isActive = (href: string) => (href === '/admin/dashboard' ? pathname === href : pathname.startsWith(href))
  const current = ALL_LINKS.find((l) => isActive(l.href))

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen flex bg-surface-50 dark:bg-[#07080c]">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-64 flex-shrink-0 flex-col sticky top-0 h-screen bg-[#0b0c12] text-surface-300 border-r border-white/5">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-white/5">
          <BrandLogo size="sm" textClassName="font-display text-lg text-white" />
          <span className="rounded-md bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-300">Ops</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-surface-500">{group.title}</p>
              <div className="space-y-0.5">
                {group.links.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        active ? 'bg-white/[0.07] text-white font-semibold' : 'text-surface-400 hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-brand-400" />}
                      <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${active ? 'text-brand-300' : 'text-surface-500 group-hover:text-surface-300'}`} />
                      {label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5 space-y-0.5">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-surface-400 hover:bg-white/[0.04] hover:text-white transition-colors">
            <ExternalLink className="h-[18px] w-[18px]" /> Abrir o app
          </Link>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut className="h-[18px] w-[18px]" /> Sair do painel
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-14 md:h-16 flex items-center justify-between gap-3 px-4 md:px-8 border-b border-surface-200/80 dark:border-white/5 bg-white/80 dark:bg-[#07080c]/80 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <span className="md:hidden"><BrandLogo size="sm" showText={false} /></span>
            <span className="text-xs text-surface-400 hidden sm:inline">Painel</span>
            <span className="text-xs text-surface-300 dark:text-surface-600 hidden sm:inline">/</span>
            <span className="truncate font-display text-sm font-semibold text-surface-900 dark:text-white">{current?.label ?? 'Admin'}</span>
          </div>
          <div className="flex items-center gap-1 md:hidden">
            <Link href="/admin/logs" title="Logs" className={`p-2 rounded-xl ${isActive('/admin/logs') ? 'text-brand-600' : 'text-surface-400'}`}>
              <ClipboardList className="w-5 h-5" />
            </Link>
            <button onClick={handleLogout} className="p-2 text-surface-400 hover:text-red-400 rounded-xl" title="Sair">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <PushBridge />
        <div className="flex-1 p-4 pb-28 md:p-8">{children}</div>

        {/* Bottom nav — mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#0b0c12]/90 backdrop-blur-lg border-t border-surface-200 dark:border-white/5 pb-safe">
          <div className="flex items-center justify-around px-1 py-1.5">
            {ALL_LINKS.filter((l) => l.mobile).map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-1 min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors ${
                    active ? 'text-brand-600 dark:text-brand-400' : 'text-surface-400 dark:text-surface-500'
                  }`}
                >
                  <Icon className={`h-5 w-5 transition-transform ${active ? 'scale-110' : ''}`} />
                  <span className="text-[10px] font-semibold leading-none">{label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </main>
    </div>
  )
}
