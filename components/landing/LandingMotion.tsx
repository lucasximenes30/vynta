'use client'

import { useEffect } from 'react'

// Scroll animations for the landing, without an animation library (~1 kB):
// - [data-reveal] gets `.is-in` when it enters the viewport (CSS in globals.css does the rest)
// - [data-reveal-stagger="80"] staggers its [data-reveal] children by 80ms each
// - [data-parallax="0.08"] drifts with the scroll (half the strength on phones)
// Only active when the inline script in app/page.tsx added `html.motion` (not for reduced motion).
export default function LandingMotion() {
  useEffect(() => {
    const root = document.documentElement
    if (!root.classList.contains('motion')) return
    root.dataset.motionReady = ''

    for (const group of document.querySelectorAll<HTMLElement>('[data-reveal-stagger]')) {
      const step = Number(group.dataset.revealStagger) || 80
      group.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el, i) => {
        if (!el.dataset.revealDelay) el.dataset.revealDelay = String(i * step)
      })
    }

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          el.style.transitionDelay = `${el.dataset.revealDelay ?? 0}ms`
          el.classList.add('is-in')
          reveal.unobserve(el)
          el.addEventListener('transitionend', () => { el.style.transitionDelay = '' }, { once: true })
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    document.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el))

    const parallax = [...document.querySelectorAll<HTMLElement>('[data-parallax]')]
    const visible = new Set<HTMLElement>()
    const mobile = window.matchMedia('(max-width: 767px)')
    let queued = false
    const update = () => {
      queued = false
      const mid = window.innerHeight / 2
      const k = mobile.matches ? 0.5 : 1
      for (const el of visible) {
        const box = (el.parentElement ?? el).getBoundingClientRect()
        const offset = (box.top + box.height / 2 - mid) * Number(el.dataset.parallax) * k
        el.style.translate = `0 ${offset.toFixed(1)}px`
      }
    }
    const schedule = () => {
      if (!queued) { queued = true; requestAnimationFrame(update) }
    }
    const watch = new IntersectionObserver((entries) => {
      for (const e of entries) e.isIntersecting ? visible.add(e.target as HTMLElement) : visible.delete(e.target as HTMLElement)
      schedule()
    }, { rootMargin: '20% 0px' })
    parallax.forEach((el) => watch.observe(el))
    if (parallax.length) {
      window.addEventListener('scroll', schedule, { passive: true })
      window.addEventListener('resize', schedule, { passive: true })
    }

    return () => {
      root.classList.remove('motion')
      delete root.dataset.motionReady
      reveal.disconnect()
      watch.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return null
}
