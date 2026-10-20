'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import * as Lucide from 'lucide-react'

// Routes where the sidebar/bottom nav should NOT appear
const NO_SIDEBAR_ROUTES = ['/', '/login', '/register', '/admin']

// Main app routes prefetched once the shell is mounted so screen switches are instant
const PREFETCH_ROUTES = ['/dashboard', '/finances', '/habits', '/workout', '/calendar', '/goals', '/notes', '/reports', '/settings', '/cards']

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const router = useRouter()
  const [showQuickActions, setShowQuickActions] = useState(false)

  const showSidebar = !NO_SIDEBAR_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  )

  useEffect(() => {
    if (!showSidebar) return
    const prefetchAll = () => PREFETCH_ROUTES.forEach((route) => router.prefetch(route))
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(prefetchAll)
      return () => window.cancelIdleCallback(id)
    }
    const timeout = setTimeout(prefetchAll, 1500)
    return () => clearTimeout(timeout)
  }, [showSidebar, router])

  if (!showSidebar) return <>{children}</>

  const MOBILE_NAV_ITEMS = [
    { Icon: Lucide.Home, label: 'Painel', href: '/dashboard' },
    { Icon: Lucide.CalendarDays, label: 'Agenda', href: '/calendar' },
    { isAction: true },
    { Icon: Lucide.BarChart3, label: 'Relatórios', href: '/reports' },
    { Icon: Lucide.Settings, label: 'Ajustes', href: '/settings' },
  ]

  return (
    <div className="flex min-h-screen relative pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 bg-surface-50 dark:bg-surface-950 transition-colors duration-300">
      {/* Desktop Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      {/* Offset content on desktop (pl-20 for collapsed sidebar) */}
      <div className="flex-1 min-w-0 md:pl-20">
        {children}
      </div>

      {/* Quick Actions Overlay (Mobile) */}
      {showQuickActions && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setShowQuickActions(false)}
          />
          <div className="relative bg-white dark:bg-surface-900 rounded-t-[2.5rem] p-6 pb-24 shadow-2xl animate-in slide-in-from-bottom duration-300 border-t border-surface-200 dark:border-surface-800/80">
            {/* Drawer Indicator */}
            <div className="mx-auto w-12 h-1.5 rounded-full bg-surface-200 dark:bg-surface-800 mb-6" />
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-lg font-bold text-surface-900 dark:text-white">Navegação Rápida</h3>
              <button 
                onClick={() => setShowQuickActions(false)}
                className="p-2 rounded-xl bg-surface-50 dark:bg-surface-800 text-surface-500 hover:bg-surface-150 transition-colors"
              >
                <Lucide.X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Finanças', icon: Lucide.Wallet, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-500/10', href: '/finances' },
                { label: 'Hábito', icon: Lucide.CheckSquare, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', href: '/habits' },
                { label: 'Treino', icon: Lucide.Dumbbell, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10', href: '/workout' },
                { label: 'Meta', icon: Lucide.Target, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', href: '/goals' },
                { label: 'Agenda', icon: Lucide.CalendarDays, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-500/10', href: '/calendar' },
                { label: 'Nota', icon: Lucide.StickyNote, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10', href: '/notes' },
              ].map((action, i) => (
                <Link
                  key={i}
                  href={action.href}
                  onClick={() => setShowQuickActions(false)}
                  className="flex flex-col items-center gap-2 group transition-all"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${action.bg} transition-all active:scale-95 group-hover:scale-105 shadow-sm`}>
                    <action.icon className={`w-6 h-6 ${action.color}`} />
                  </div>
                  <span className="text-xs font-semibold text-surface-700 dark:text-surface-300">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-surface-900/80 backdrop-blur-lg border-t border-surface-200/80 dark:border-surface-800/80 pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {MOBILE_NAV_ITEMS.map((item, idx) => {
            if (item.isAction) {
              return (
                <div key="action" className="relative -top-5 flex justify-center w-16">
                  <button
                    onClick={() => setShowQuickActions(true)}
                    className="flex items-center justify-center w-14 h-14 rounded-full bg-brand-600 text-white shadow-lg shadow-brand-500/30 transition-transform active:scale-90 hover:scale-105 border border-brand-500/20"
                  >
                    <Lucide.Plus className="w-7 h-7" />
                  </button>
                </div>
              )
            }

            const isActive = pathname === item.href
            const Icon = item.Icon!

            return (
              <Link
                key={item.href}
                href={item.href as string}
                className="flex flex-col items-center justify-center w-16 h-full gap-0.5 transition-colors group"
              >
                <Icon className={`w-5 h-5 transition-transform group-active:scale-90 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-surface-400 dark:text-surface-500'}`} />
                <span className={`text-[9px] font-semibold transition-colors uppercase tracking-wider ${isActive ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-surface-400 dark:text-surface-500'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
