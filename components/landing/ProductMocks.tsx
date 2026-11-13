import { Car, Check, Coffee, ShoppingCart } from 'lucide-react'

// Illustrative UI previews of real Vynta features, rendered in code (crisp at any size, zero JS).
// `pop-in` children animate in sequence when the parent [data-reveal] scrolls into view.

// Faithful preview of the mobile quick-add sheet (the + button in the bottom bar).
export function QuickAddMock() {
  return (
    <div className="mx-auto w-full max-w-[300px] rounded-[1.6rem] border border-white/10 bg-[#07080c] p-1.5 shadow-2xl shadow-black/60">
      <div className="overflow-hidden rounded-[1.4rem] bg-surface-900">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-surface-700" />
        <div className="space-y-3.5 p-4">
          <div className="flex gap-1.5 rounded-xl bg-surface-800 p-1 text-[11px] font-semibold">
            <span className="flex-1 rounded-lg bg-surface-700 py-1.5 text-center text-rose-400">Gasto</span>
            <span className="flex-1 py-1.5 text-center text-surface-500">Entrada</span>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-surface-500">Quanto foi?</p>
            <p className="font-display text-[1.7rem] font-bold leading-tight tracking-tight text-white">R$ 32,50</p>
          </div>
          <div className="rounded-xl border border-surface-700 bg-surface-800 px-3 py-2.5 text-xs text-white">Uber até o metrô<span className="ml-px inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-brand-300" /></div>
          <div className="flex gap-1.5">
            {['Mercado', 'iFood', 'Academia'].map((s) => (
              <span key={s} className="rounded-full border border-surface-700 bg-surface-800 px-2.5 py-1 text-[10px] font-medium text-surface-300">{s}</span>
            ))}
          </div>
          <div className="flex gap-1.5">
            {[
              { Icon: Car, label: 'Transporte', active: true },
              { Icon: Coffee, label: 'Restaurante', active: false },
              { Icon: ShoppingCart, label: 'Mercado', active: false },
            ].map(({ Icon, label, active }) => (
              <span key={label} className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-semibold ${active ? 'border-brand-500 bg-brand-500/15 text-brand-200' : 'border-surface-700 text-surface-400'}`}>
                <Icon className="h-3 w-3" /> {label}
              </span>
            ))}
          </div>
          <div className="pop-in flex items-center justify-between rounded-2xl bg-brand-600 px-4 py-3 text-sm font-bold text-white" style={{ ['--d' as string]: '0.5s' }}>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Salvar gasto</span>
            <span>R$ 32,50</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const PUSHES = [
  { time: '08:02', title: 'Conta vence hoje', body: 'Hoje: Internet, Fatura Nubank' },
  { time: '08:02', title: 'Sua agenda de hoje', body: 'Reunião com cliente às 14:00' },
  { time: '20:15', title: 'Gastou algo hoje?', body: 'Registre os gastos de hoje para acompanhar o mês.', actions: ['Anotar gasto', 'Anotar entrada'] },
  { time: '21:40', title: 'Falta 1 hábito hoje: Ler 20 minutos', body: 'Você já fez 3 de 4. Mantenha a sequência.' },
]

export function NotificationsMock() {
  return (
    <div className="relative mx-auto w-full max-w-[340px] overflow-hidden rounded-[2.2rem] border border-white/15 bg-gradient-to-b from-[#1b1f3b] via-[#121428] to-[#07080c] p-4 pb-6 shadow-2xl shadow-black/60">
      <div className="pt-4 text-center text-white">
        <p className="text-xs font-medium text-white/60">segunda-feira, 12 de maio</p>
        <p className="font-display text-6xl font-semibold leading-none tracking-tight">21:41</p>
      </div>
      <ul className="mt-6 space-y-2">
        {PUSHES.map((p, i) => (
          <li key={p.title} className="pop-in rounded-2xl bg-white/[0.12] p-3 backdrop-blur-md" style={{ ['--d' as string]: `${0.25 + i * 0.35}s` }}>
            <div className="flex items-start gap-2.5">
              <img src="/icons/broto-v2-icon-192.png" alt="" width={28} height={28} className="mt-0.5 h-7 w-7 shrink-0 rounded-lg bg-[#07080c]" loading="lazy" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[13px] font-semibold text-white">{p.title}</p>
                  <span className="shrink-0 text-[10px] text-white/50">{p.time}</span>
                </div>
                <p className="text-[12px] leading-snug text-white/75">{p.body}</p>
                {p.actions && (
                  <div className="mt-2 flex gap-1.5">
                    {p.actions.map((a) => (
                      <span key={a} className="rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/90">{a}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
