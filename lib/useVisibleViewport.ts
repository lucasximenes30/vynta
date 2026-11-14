'use client'

import { useEffect, useState } from 'react'

/** Keep sheets inside the visible viewport when a mobile keyboard resizes or pans it. */
export function useVisibleViewport() {
  const read = () => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return { top: 0, height: typeof window !== 'undefined' ? window.innerHeight : 0, keyboard: false }
    return { top: vv.offsetTop, height: vv.height, keyboard: window.innerHeight - vv.height > 120 }
  }
  const [vp, setVp] = useState(read)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setVp(read()))
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => { cancelAnimationFrame(frame); vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update) }
  }, [])
  return vp
}
