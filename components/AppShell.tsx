'use client'

import { logoutAndRedirect } from '@/lib/logout'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import RouteMotion from './RouteMotion'
import BrandLogo from './BrandLogo'
import NavigationHint from './NavigationHint'
import QuickAddHost from './quick-add/QuickAddHost'
import PushBridge from './push/PushBridge'
import RouterCacheSync from './RouterCacheSync'
import { openQuickAdd } from '@/lib/quickAdd'
import { startTour } from '@/lib/tour'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '@/lib/social'
import InstagramIcon from './icons/InstagramIcon'
import dynamic from 'next/dynamic'
import * as Lucide from 'lucide-react'

// Guided first-steps tour (only rendered while active; loaded lazily to keep the shell light)
const TourHost = dynamic(() => import('./tour/TourHost'), { ssr: false })
// Activity heartbeat + first-month offer + Instagram prompt
const EngagementHost = dynamic(() => import('./engagement/EngagementHost'), { ssr: false })

// Main app routes prefetched once the shell is mounted so screen switches are instant
const PREFETCH_ROUTES = ['/dashboard', '/finances', '/habits']

// Logged-in app chrome (sidebar, bottom nav, quick add, push, tour…). Loaded only on app routes via
// SidebarLayout, so the landing/login pages never download it.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const router = useRouter()
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [quickActionsClosing, setQuickActionsClosing] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const closeQuickActions = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setShowQuickActions(false)
    else setQuickActionsClosing(true)
  }, [])

  useEffect(() => {
    if (!quickActionsClosing) return
    const timeout = setTimeout(() => { setShowQuickActions(false); setQuickActionsClosing(false) }, 180)
    return () => clearTimeout(timeout)
  }, [quickActionsClosing])

  useEffect(() => {
    if (!showQuickActions) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeQuickActions()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [showQuickActions, closeQuickActions])

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    if (connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '')) return
    const prefetchAll = () => PREFETCH_ROUTES.forEach((route) => router.prefetch(route))
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(prefetchAll)
      return () => window.cancelIdleCallback(id)
    }
    const timeout = setTimeout(prefetchAll, 1500)
    return () => clearTimeout(timeout)
  }, [router])

  const MOBILE_NAV_ITEMS = [
    { Icon: Lucide.Home, label: 'Painel', href: '/dashboard' },
    { Icon: Lucide.Wallet, label: 'Finanças', href: '/finances' },
    { isAction: true },
    { Icon: Lucide.CheckSquare, label: 'Hábitos', href: '/habits' },
    { Icon: Lucide.LayoutGrid, label: 'Mais', opensMenu: true },
  ]
  const mobileActiveIndex = showQuickActions && !quickActionsClosing ? 4 : pathname === '/dashboard' ? 0
    : pathname.startsWith('/finances') || pathname.startsWith('/cards') ? 1 : pathname.startsWith('/habits') ? 3 : 4

  return (
    <div data-sidebar-collapsed={sidebarCollapsed} className="app-shell flex min-h-[100dvh] w-full relative pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 bg-surface-50 dark:bg-surface-950 transition-colors duration-300">
      {/* Desktop Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(value => !value)} />
      
      {/* Main Content Area */}
      {/* Offset content on desktop (pl-20 for collapsed sidebar) */}
      <div className="app-content flex-1 min-w-0 md:pl-20 lg:pl-56">
        <RouteMotion>{children}</RouteMotion>
      </div>

      {/* Quick-add transaction sheet, toast and offline queue sync */}
      <QuickAddHost />
      <PushBridge />
      <RouterCacheSync />
      <TourHost />
      <EngagementHost />

      {/* Quick Actions Overlay (Mobile) */}
      {showQuickActions && (
        <div data-closing={quickActionsClosing} className="mobile-navigation-overlay md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div 
            className="mobile-navigation-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeQuickActions}
          />
          <div role="dialog" aria-modal="true" aria-labelledby="quick-navigation-title" inert={quickActionsClosing || undefined} className="mobile-navigation-sheet relative max-h-[calc(100dvh-env(safe-area-inset-top))] overflow-y-auto overscroll-contain bg-white dark:bg-[#1e1a28] rounded-t-[2rem] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl border-t border-surface-200 dark:border-sprout-lavender/20">
            {/* Drawer Indicator */}
            <div className="mx-auto w-10 h-1 rounded-full bg-brand-200 dark:bg-sprout-lavender/30 mb-5" />
            
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3"><BrandLogo size="sm" showText={false} /><div><p className="text-[10px] font-semibold uppercase tracking-widest text-brand-600 dark:text-sprout-lavender">Seu Vynta</p><h3 id="quick-navigation-title" className="font-display text-base font-semibold text-surface-900 dark:text-white">Navegação Rápida</h3></div></div>
              <button 
                aria-label="Fechar navegação rápida"
                onClick={closeQuickActions}
                className="mobile-touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-50 dark:bg-white/5 text-surface-500 dark:text-sprout-lavender"
              >
                <Lucide.X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Anotar gasto', icon: Lucide.Banknote, color: 'text-white', bg: 'bg-brand-600', action: () => { setShowQuickActions(false); openQuickAdd('EXPENSE') } },
                { label: 'Treino', icon: Lucide.Dumbbell, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10', href: '/workout' },
                { label: 'Agenda', icon: Lucide.CalendarDays, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-500/10', href: '/calendar' },
                { label: 'Metas', icon: Lucide.Target, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', href: '/goals' },
                { label: 'Notas', icon: Lucide.StickyNote, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10', href: '/notes' },
                { label: 'Relatórios', icon: Lucide.BarChart3, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10', href: '/reports' },
                { label: 'Cartões', icon: Lucide.CreditCard, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-500/10', href: '/cards' },
                { label: 'Ajustes', icon: Lucide.Settings, color: 'text-surface-500', bg: 'bg-surface-100 dark:bg-surface-800', href: '/settings' },
                { label: 'Tutorial', icon: Lucide.GraduationCap, color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-500/10', action: () => { setShowQuickActions(false); startTour() } },
              ].map((action, i) => (
                'action' in action && action.action ? (
                  <button
                    key={i}
                    onClick={action.action}
                    className="mobile-menu-item relative flex flex-col items-center gap-2 rounded-2xl py-2 group"
                  >
                    <div className={`mobile-menu-icon w-14 h-14 rounded-2xl flex items-center justify-center ${action.bg} shadow-sm`}>
                      <action.icon className={`w-6 h-6 ${action.color}`} />
                    </div>
                    <span className="text-xs font-semibold text-surface-700 dark:text-surface-300">{action.label}</span>
                  </button>
                ) : (
                  <Link
                    key={i}
                    href={action.href as string}
                    onClick={closeQuickActions}
                    aria-current={pathname === action.href ? 'page' : undefined}
                    className="mobile-menu-item relative flex flex-col items-center gap-2 rounded-2xl py-2 group"
                  >
                    <div className="mobile-menu-icon w-14 h-14 rounded-2xl flex items-center justify-center bg-brand-50 text-brand-700 dark:bg-sprout-lavender/10 dark:text-sprout-lavender shadow-sm">
                      <action.icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold text-surface-700 dark:text-surface-300">{action.label}</span>
                    <NavigationHint label={action.label} />
                  </Link>
                )
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-surface-100 dark:border-surface-800 space-y-2">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowQuickActions(false)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-pink-500/20 bg-pink-500/10 py-3 text-xs font-bold text-pink-600 dark:text-pink-400 transition-all active:scale-95"
              >
                <InstagramIcon className="w-4 h-4" />
                Siga {INSTAGRAM_HANDLE} no Instagram
              </a>
              <button
                onClick={async () => {
                  setShowQuickActions(false)
                  await logoutAndRedirect('/login')
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 py-3 text-xs font-bold text-rose-600 dark:text-rose-400 transition-all active:scale-95 hover:bg-rose-500/15"
              >
                <Lucide.LogOut className="w-4 h-4" />
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav aria-label="Navegação inferior" className="mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1e1a28]/95 backdrop-blur-lg border-t border-surface-200/80 dark:border-sprout-lavender/15 pb-safe">
        <div className="relative mx-2 grid h-16 grid-cols-5 items-center">
          <span aria-hidden className="nav-active-indicator pointer-events-none absolute left-0 top-1 flex h-8 w-1/5 justify-center" style={{ transform: `translateX(${mobileActiveIndex * 100}%)` }}><span className="h-full w-12 rounded-xl bg-brand-100/60 dark:bg-sprout-lavender/10" /></span>
          {MOBILE_NAV_ITEMS.map((item) => {
            if (item.isAction) {
              return (
                <div key="action" className="relative -top-5 flex justify-center w-full">
                  <button
                    onClick={() => openQuickAdd('EXPENSE')}
                    aria-label="Anotar gasto"
                    className="mobile-touch-target flex items-center justify-center w-14 h-14 rounded-full bg-brand-600 text-white dark:bg-sprout-lime dark:text-brand-950 shadow-lg shadow-brand-950/20 border border-brand-500/20"
                  >
                    <Lucide.Plus className="w-7 h-7" />
                  </button>
                </div>
              )
            }

            if (item.opensMenu) {
              return (
                <button
                  key="menu"
                  onClick={() => { setQuickActionsClosing(false); setShowQuickActions(true) }}
                  aria-expanded={showQuickActions}
                  aria-haspopup="dialog"
                  data-active={mobileActiveIndex === 4}
                  className="mobile-nav-item relative flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors group"
                >
                  <item.Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">
                    {item.label}
                  </span>
                </button>
              )
            }

            const isActive = pathname === item.href || (item.href === '/finances' && pathname.startsWith('/cards'))
            const Icon = item.Icon!

            return (
              <Link
                key={item.href}
                href={item.href as string}
                aria-current={isActive ? 'page' : undefined}
                data-active={isActive}
                className="mobile-nav-item relative flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors group"
              >
                <Icon className="relative w-5 h-5" />
                <span className="relative text-[10px] font-semibold">
                  {item.label}
                </span>
                <NavigationHint label={item.label!} />
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
