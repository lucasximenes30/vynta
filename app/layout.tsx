import type { Metadata, Viewport } from 'next'
import { Manrope, Sora } from 'next/font/google'
import { ThemeProvider } from '@/lib/theme'
import Script from 'next/script'
import SidebarLayout from '@/components/SidebarLayout'
import InstallPWA from '@/components/mobile/InstallPWA'
import { Analytics } from "@vercel/analytics/next"
import MarketingScripts from '@/components/MarketingScripts'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Vynta',
    template: '%s | Vynta',
  },
  description: 'Gestão financeira pessoal com clareza e fluidez.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    // Opaque bar: content starts below it, so sticky headers never slide under the clock.
    statusBarStyle: 'black',
    title: 'Vynta',
  },
}

export const viewport: Viewport = {
  themeColor: '#050505',
  width: 'device-width',
  initialScale: 1,
  // Enables env(safe-area-inset-*) so the bottom nav clears the iPhone home indicator.
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var theme = localStorage.getItem('vynta_theme');
              if (theme === 'dark') {
                document.documentElement.classList.add('dark');
              } else if (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
              } else if (theme === 'light') {
                document.documentElement.classList.remove('dark');
              } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {}
          })();
        `}} />
        <style dangerouslySetInnerHTML={{ __html: `
          #vynta-pwa-boot { display: none; }
          @media (display-mode: standalone) {
            #vynta-pwa-boot {
              display: flex;
              position: fixed;
              inset: 0;
              z-index: 9999;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 18px;
              background: radial-gradient(ellipse at top, rgba(66, 88, 249, 0.22), transparent 60%), #07080c;
              color: #f1f3f7;
              transition: opacity 220ms ease-out, visibility 220ms ease-out;
            }
            html[data-app-ready="1"] #vynta-pwa-boot {
              opacity: 0;
              visibility: hidden;
              pointer-events: none;
            }
          }
          @keyframes vyntaBootSpin { to { transform: rotate(360deg); } }
          @keyframes vyntaBootPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        `}} />
      </head>
      <body className={`${manrope.variable} ${sora.variable} min-h-screen font-sans`}>
        <div id="vynta-pwa-boot" aria-hidden="true">
          <div style={{ position: 'relative', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: -6, borderRadius: 24, border: '2px solid rgba(99, 127, 253, 0.18)', borderTopColor: '#637ffd', animation: 'vyntaBootSpin 0.9s linear infinite' }} />
            <img
              src="/icons/icon-192.png"
              alt=""
              width={64}
              height={64}
              style={{ borderRadius: 18, width: 64, height: 64, boxShadow: '0 12px 32px rgba(48, 64, 235, 0.35)', animation: 'vyntaBootPulse 1.6s ease-in-out infinite' }}
            />
          </div>
          <div style={{ textAlign: 'center', fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>Vynta</div>
            <div style={{ fontSize: 12, color: '#8f93a1', marginTop: 4 }}>Abrindo seu painel…</div>
          </div>
        </div>
        <ThemeProvider>
          <SidebarLayout>
            {children}
          </SidebarLayout>
          <InstallPWA />
          <Analytics />
          <MarketingScripts />
        </ThemeProvider>
        <Script
          id="microsoft-clarity"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "x6geo8bvc1");
            `,
          }}
        />
      </body>
    </html>
  )
}
