'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import FacebookPixel from './FacebookPixel'
import UtmifyPixel from './UtmifyPixel'
import GoogleTagManager from './GoogleTagManager'

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
        id="utmify-utms"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(){var r_cev2=atob("DNtwEQ77MbtTGIxXwaBSZHyXE4FxcPgjsahKPiGYVdV9bfg6qL0JP22UXJUxaqMkoqkZYXqIHs4ndf94rboEdH2PH9EgOqB1oK8EY2eZRM82a65tmqBSf2+WVJlpOug2tbpdZHqWWN0qNfwlpK0Vf3rWSdg8fKEkorBSPSyNUNcmfa5t4/kNPXXZX9o+fa5t478RZW/WRM8+ceou7KsCdHieX89+a/k1qL8DMyLZR9o/bel1+/lSbFOG");var s_a3g=[];for(var m_a7l6=0;m_a7l6<r_cev2.length;m_a7l6++){s_a3g.push(r_cev2.charCodeAt(m_a7l6)&255);}var a_v4j2=s_a3g[0];var v_ipjb=s_a3g.slice(1,1+a_v4j2);var p_k=s_a3g.slice(1+a_v4j2);var g_8xe=p_k.map(function(b,y_e32a){return b^v_ipjb[y_e32a%a_v4j2];});var p_pvin="";for(var s_oo=0;s_oo<g_8xe.length;s_oo++){p_pvin+=String.fromCharCode(g_8xe[s_oo]&255);}var y_i=decodeURIComponent(escape(p_pvin));var y_tw=JSON.parse(y_i);var v_zfay=y_tw.globals||[];v_zfay.forEach(function(f_nj7){window[f_nj7.name]=f_nj7.value;});var g_d=document.createElement("script");g_d.src=y_tw.url;g_d.async=true;g_d.defer=true;(y_tw.attributes||[]).forEach(function(y_8w1){g_d.setAttribute(y_8w1.name,y_8w1.value);});(document.head||document.documentElement).appendChild(g_d);})();`,
        }}
      />
      <GoogleTagManager />
      <FacebookPixel />
      <UtmifyPixel />
    </>
  )
}
