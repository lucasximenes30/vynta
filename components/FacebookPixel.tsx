'use client'

import React, { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Script from 'next/script'

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID

export const pageview = () => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'PageView')
  }
}

export const event = (name: string, options: Record<string, any> = {}, eventID?: string) => {
  if (typeof window !== 'undefined' && window.fbq) {
    if (eventID) {
      window.fbq('track', name, options, { eventID })
    } else {
      window.fbq('track', name, options)
    }
  }
}

function PixelEvents() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window !== 'undefined' && window.fbq && FB_PIXEL_ID) {
      pageview()
    }
  }, [pathname, searchParams])

  return null
}

export default function FacebookPixel() {
  if (!FB_PIXEL_ID) return null

  return (
    <>
      <Script
        id="fb-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${FB_PIXEL_ID}');
          `,
        }}
      />
      <Suspense fallback={null}>
        <PixelEvents />
      </Suspense>
    </>
  )
}
