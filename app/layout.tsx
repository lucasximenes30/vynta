import type { Metadata } from 'next'
import { Manrope, Sora } from 'next/font/google'
import { ThemeProvider } from '@/lib/theme'
import Script from 'next/script'
import SidebarLayout from '@/components/SidebarLayout'
import InstallPWA from '@/components/mobile/InstallPWA'
import { Analytics } from "@vercel/analytics/next"
import FacebookPixel from '@/components/FacebookPixel'
import UtmifyPixel from '@/components/UtmifyPixel'
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
    statusBarStyle: 'black-translucent',
    title: 'Vynta',
  },
}

export const viewport = {
  themeColor: '#050505',
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
      </head>
      <body className={`${manrope.variable} ${sora.variable} min-h-screen font-sans`}>
        <Script
          src="https://cdn.utmify.com.br/scripts/utms/latest.js"
          data-utmify-prevent-xcod-sck
          data-utmify-prevent-subids
          strategy="lazyOnload"
        />
        <ThemeProvider>
          <SidebarLayout>
            {children}
          </SidebarLayout>
          <InstallPWA />
          <Analytics />
          <FacebookPixel />
          <UtmifyPixel />
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
