'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import FacebookPixel from './FacebookPixel'
import UtmifyPixel from './UtmifyPixel'

// Ad/attribution pixels only matter on the acquisition and checkout funnel. Keeping them off the
// logged-in app screens frees the main thread on phones (PWA cold start goes straight to /dashboard).
const MARKETING_ROUTES = ['/', '/login', '/register', '/sucesso', '/payment', '/subscription', '/unlock', '/esqueci-a-senha']

export default function MarketingScripts() {
  const pathname = usePathname()
  const enabled = MARKETING_ROUTES.some((r) => pathname === r || (r !== '/' && pathname.startsWith(`${r}/`)))
  if (!enabled) return null

  return (
    <>
      <Script
        src="https://cdn.utmify.com.br/scripts/utms/latest.js"
        data-utmify-prevent-xcod-sck
        data-utmify-prevent-subids
        strategy="lazyOnload"
      />
      <FacebookPixel />
      <UtmifyPixel />
    </>
  )
}
