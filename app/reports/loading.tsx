export default function ReportsLoading() {
  return <div className="min-h-screen bg-surface-50 dark:bg-surface-950" role="status" aria-label="Carregando relatórios">
    <div className="h-[73px] border-b border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900" />
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-8">
      <div className="skeleton h-64 rounded-3xl sm:h-56" />
      <div className="skeleton h-12 w-64 rounded-xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[0, 1, 2].map((index) => <div key={index} className={`skeleton h-36 rounded-2xl ${index === 2 ? 'col-span-2 sm:col-span-1' : ''}`} />)}</div>
      <div className="skeleton h-72 rounded-2xl" />
      <div className="grid gap-5 lg:grid-cols-2"><div className="skeleton h-96 rounded-2xl" /><div className="skeleton h-96 rounded-2xl" /></div>
    </div>
  </div>
}
