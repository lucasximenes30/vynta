import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sem conexão' }

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-50 px-6 text-center dark:bg-surface-950">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-600/10">
        <svg viewBox="0 0 24 24" className="h-10 w-10 text-brand-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <circle cx="12" cy="20" r="1" />
        </svg>
      </div>
      <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">Você está sem internet</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-surface-500 dark:text-surface-400">
        O Vynta precisa de conexão para mostrar seus dados. Assim que a internet voltar, tente de novo — os gastos que você
        anotou sem internet ficam salvos no aparelho e são enviados sozinhos.
      </p>
      <a
        href="/dashboard"
        className="mt-8 rounded-2xl bg-brand-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/25"
      >
        Tentar novamente
      </a>
    </div>
  )
}
