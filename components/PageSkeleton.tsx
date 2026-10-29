// Server component: instant placeholder shown while a screen's data streams in.
// Mirrors each screen's layout so nothing jumps when the real content arrives.

import BrandLogo from './BrandLogo'

type Variant = 'default' | 'dashboard' | 'finances' | 'list'

function Bar({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

export default function PageSkeleton({ variant = 'default' }: { variant?: Variant }) {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950" aria-busy="true" aria-label="Carregando">
      <div className="border-b border-surface-200/80 bg-white dark:border-surface-800 dark:bg-surface-900">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="sm" showText={false} priority />
            <span className="font-display text-sm font-semibold tracking-tight text-surface-900 dark:text-surface-100">
              Vynta
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[11px] font-medium text-brand-600 dark:text-brand-300">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
              Abrindo…
            </span>
          </div>
          <Bar className="h-9 w-9 rounded-xl" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {variant === 'dashboard' && (
          <>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-purple-800 p-5 text-white shadow-xl sm:p-8">
              <div className="space-y-3">
                <div className="h-4 w-36 rounded-full bg-white/15 animate-pulse" />
                <div className="h-8 w-56 rounded-xl bg-white/20 animate-pulse sm:h-10 sm:w-72" />
                <div className="h-11 w-40 rounded-2xl bg-white/25 animate-pulse" />
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Bar className="h-56 rounded-3xl" />
              <Bar className="h-56 rounded-3xl" />
            </div>
            <Bar className="h-40 rounded-3xl" />
          </>
        )}

        {variant === 'finances' && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {Array.from({ length: 4 }, (_, i) => <Bar key={i} className="h-24 rounded-2xl" />)}
            </div>
            <Bar className="h-11 w-full rounded-xl sm:w-80" />
            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, i) => <Bar key={i} className="h-16 rounded-2xl" />)}
            </div>
          </>
        )}

        {variant === 'list' && (
          <>
            <Bar className="h-24 rounded-2xl" />
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => <Bar key={i} className="h-20 rounded-2xl" />)}
            </div>
          </>
        )}

        {variant === 'default' && (
          <>
            <Bar className="h-8 w-56" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => <Bar key={i} className="h-36 rounded-2xl" />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
