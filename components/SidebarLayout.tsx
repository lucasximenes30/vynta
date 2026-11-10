'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'

// The app chrome lives in its own chunk: public pages (landing, login, register) don't ship the
// sidebar, quick add, push and tour code. Still server-rendered, so app screens don't flash.
const AppShell = dynamic(() => import('./AppShell'))

// Routes where the sidebar/bottom nav should NOT appear
const NO_SIDEBAR_ROUTES = ['/', '/login', '/register', '/admin', '/offline']

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const showSidebar = !NO_SIDEBAR_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-app-ready', '1')
  }, [])

  if (!showSidebar) return <>{children}</>
  return <AppShell>{children}</AppShell>
}
