// Shown inside the admin shell while a screen's queries run (e.g. right after the admin login).
export default function AdminLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2">
        <div className="skeleton h-8 w-40 rounded-xl" />
        <div className="skeleton h-4 w-72 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-[104px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-40 rounded-2xl" />
      </div>
      <div className="skeleton h-96 rounded-2xl" />
    </div>
  )
}
