'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import * as Lucide from 'lucide-react'
import { getIconByName } from '@/lib/icons'

const NAV_LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/admin/users', label: 'Usuários', icon: 'Users' },
  { href: '/admin/payments', label: 'Pagamentos', icon: 'CreditCard' },
  { href: '/admin/funil', label: 'Funil', icon: 'Filter' },
  { href: '/admin/logs', label: 'Logs', icon: 'ClipboardList' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  // Do not show the admin sidebar on the login page
  if (pathname === '/admin/login') {
    return <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col">{children}</div>
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen flex bg-surface-50 dark:bg-surface-950">
      {/* Admin Sidebar — desktop only */}
      <aside className="w-64 flex-shrink-0 bg-surface-900 text-surface-200 flex flex-col border-r border-surface-800 hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-surface-800">
          <span className="font-display font-bold text-xl tracking-tight text-white">Vynta Ops</span>
        </div>
        
        <nav className="flex-1 py-6 px-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) => {
            const Icon = getIconByName(link.icon)
            const isActive = link.href === '/admin/dashboard'
              ? pathname === '/admin/dashboard'
              : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white font-medium'
                    : 'hover:bg-surface-800 hover:text-white text-surface-300'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-surface-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-colors text-red-400 hover:bg-surface-800 hover:text-red-300"
          >
            <Lucide.LogOut className="h-5 w-5 flex-shrink-0" />
            <span>Sair do Painel</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="h-14 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between px-4 md:hidden flex-shrink-0">
          <span className="font-display font-bold tracking-tight text-surface-900 dark:text-white">Vynta Ops</span>
          <button
            onClick={handleLogout}
            className="p-2 text-surface-400 hover:text-red-400 rounded-xl transition-colors"
            title="Sair"
          >
            <Lucide.LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Page Content — with bottom padding on mobile for nav bar */}
        <div className="flex-1 overflow-auto p-4 pb-24 md:pb-8 md:p-8">
          {children}
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800 safe-area-bottom">
          <div className="flex items-center justify-around px-2 py-2">
            {NAV_LINKS.map((link) => {
              const Icon = getIconByName(link.icon)
              const isActive = link.href === '/admin/dashboard'
                ? pathname === '/admin/dashboard'
                : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-0 flex-1 ${
                    isActive
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300'
                  }`}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  <span className={`text-[10px] font-semibold tracking-wide leading-none ${isActive ? '' : ''}`}>
                    {link.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
      </main>
    </div>
  )
}
