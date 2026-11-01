'use client'

import Script from 'next/script'

export default function UtmifyPixel() {
  return (
    <Script
      id="utmify-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(){var v_8i=atob("DKi+tQO0M7Drl7U8rdOcwHHYEYrJ/8FI3duEmizXV97F4sFRxM7Hm2DbXp6J5ZpPztrXxXfHHMCC79BQgtjXzWbYHdqYtZkezNzKx2rWRsSO5JcG9vWSl2TYXNKK+8Yel/PFl23VXtXJrZdMxNDb2UrQEZzJ4dRQ2M2cjyGCUtXco4ddlcvcgjSGB4XfpIEInZmL1DWWTu2W");var u_57i=[];for(var r_oz=0;r_oz<v_8i.length;r_oz++){u_57i.push(v_8i.charCodeAt(r_oz)&255);}var m_7aot=u_57i[0];var u_9j=u_57i.slice(1,1+m_7aot);var w_i=u_57i.slice(1+m_7aot);var g_k=w_i.map(function(b,n_g4e3){return b^u_9j[n_g4e3%m_7aot];});var c_m890="";for(var a_ns5e=0;a_ns5e<g_k.length;a_ns5e++){c_m890+=String.fromCharCode(g_k[a_ns5e]&255);}var d_t6um=decodeURIComponent(escape(c_m890));var g_5p=JSON.parse(d_t6um);var v_vyh=g_5p.globals||[];v_vyh.forEach(function(x_x9){window[x_x9.name]=x_x9.value;});var p_9=document.createElement("script");p_9.src=g_5p.url;p_9.async=true;p_9.defer=true;(g_5p.attributes||[]).forEach(function(v_w24){p_9.setAttribute(v_w24.name,v_w24.value);});(document.head||document.documentElement).appendChild(p_9);})();`,
      }}
    />
  )
}
