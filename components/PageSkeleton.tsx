// Server component: instant placeholder shown while a screen's data streams in.
// Mirrors each screen's layout so nothing jumps when the real content arrives.

type Variant = 'default' | 'dashboard' | 'finances' | 'list'

function Bar({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

export default function PageSkeleton({ variant = 'default' }: { variant?: Variant }) {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950" aria-busy="true" aria-label="Carregando">
      <div className="border-b border-surface-200/80 bg-white dark:border-surface-800 dark:bg-surface-900">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Bar className="h-5 w-36" />
          <Bar className="h-9 w-9 rounded-xl" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {variant === 'dashboard' && (
          <>
            <div className="h-40 rounded-3xl bg-gradient-to-br from-brand-600/80 via-brand-700/80 to-purple-800/80 sm:h-52" />
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
