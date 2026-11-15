'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Clock3, Pause, Play, RotateCcw, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { WorkoutSessionDTO } from '@/services/workoutSession.service'
import { elapsedSeconds, newWorkoutDraft, readWorkoutDraft, workoutDraftKey, writeWorkoutDraft, type RunnerDay, type WorkoutDraft } from '@/lib/workoutDraft'
import { parseWorkoutReps, parseWorkoutWeight } from '@/lib/workoutTime'

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
const panel = 'rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900'
type Props = { showHistory: boolean; userId: string; requestedDay: RunnerDay | null; onConsumed: () => void; onSaved: () => void }

export default function WorkoutRunner({ showHistory, userId, requestedDay, onConsumed, onSaved }: Props) {
  const [draft, setDraft] = useState<WorkoutDraft | null>(null)
  const current = useRef<WorkoutDraft | null>(null)
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [canCorrect, setCanCorrect] = useState(false)
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null)
  const sending = useRef(false)
  const [now, setNow] = useState(Date.now())
  const [summary, setSummary] = useState<WorkoutSessionDTO | null>(null)
  const [previous, setPrevious] = useState<WorkoutSessionDTO | null>(null)
  const [previousError, setPreviousError] = useState('')
  const [review, setReview] = useState(false)
  const [discard, setDiscard] = useState(false)
  const [online, setOnline] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(true)
  const [history, setHistory] = useState<WorkoutSessionDTO[]>([])
  const [historyError, setHistoryError] = useState('')
  const [historyBusy, setHistoryBusy] = useState(false)
  const [moreHistory, setMoreHistory] = useState(false)
  const dialog = useRef<HTMLDivElement>(null)
  const callback = useRef(onSaved)
  callback.current = onSaved

  const adopt = useCallback((value: WorkoutDraft | null) => { current.current = value; setDraft(value) }, [])
  const change = useCallback((transform: (value: WorkoutDraft) => WorkoutDraft) => {
    const value = current.current
    if (!value || value.pending || sending.current) return
    try { adopt(writeWorkoutDraft(transform(value), value.revision)); setNow(Date.now()); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar neste aparelho.'); }
  }, [adopt])

  useEffect(() => {
    try { adopt(readWorkoutDraft(userId)) } catch (e) { setError((e as Error).message) }
    setReady(true); setOnline(navigator.onLine)
    const sync = () => {
      try {
        const value = readWorkoutDraft(userId)
        adopt(value)
        if (!value) setOpen(false)
      } catch (e) { setError((e as Error).message) }
    }
    const storage = (e: StorageEvent) => { if (e.key === workoutDraftKey(userId)) sync() }
    window.addEventListener('storage', storage)
    return () => window.removeEventListener('storage', storage)
  }, [adopt, userId])

  useEffect(() => {
    if (!ready || !requestedDay) return
    if (!current.current) {
      try { adopt(writeWorkoutDraft(newWorkoutDraft(userId, requestedDay))); setError('') }
      catch { setError('Não foi possível guardar o treino neste aparelho. Verifique o armazenamento antes de iniciar.'); onConsumed(); return }
    } else if (current.current.day.id !== requestedDay.id) {
      setError('Você já tem um treino em andamento. Finalize ou descarte esse rascunho antes de iniciar outro.')
    }
    setNow(Date.now()); setOpen(true); setSummary(null); setReview(false); onConsumed()
  }, [ready, requestedDay, userId, adopt, onConsumed])

  const loadHistory = useCallback(async (append = false, before?: string) => {
    setHistoryBusy(true); setHistoryError('')
    try {
      const res = await fetch(`/api/workout/sessions${before ? `?before=${encodeURIComponent(before)}` : ''}`, { cache: 'no-store', headers: { 'x-vynta-owner': userId } })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error)
      setHistory(rows => append ? [...rows, ...body.sessions] : body.sessions)
      setMoreHistory(body.sessions.length === 20)
    } catch { setHistoryError('Não foi possível carregar o histórico. Tente novamente quando estiver online.') }
    finally { setHistoryBusy(false) }
  }, [userId])

  useEffect(() => { if (showHistory) void loadHistory() }, [showHistory, summary?.id, loadHistory])

  const send = useCallback(async () => {
    const value = current.current
    if (!value?.pending || sending.current || !navigator.onLine) return
    sending.current = true; setBusy(true); setError('')
    try {
      const res = await fetch('/api/workout/sessions', { method: 'POST', headers: {
        'Content-Type': 'application/json', 'x-vynta-owner': userId, 'x-vynta-mutation-id': value.id,
      }, body: JSON.stringify(value.pending) })
      const body = await res.json()
      if (!res.ok) { setCanCorrect(res.status === 400); throw new Error(body.error || 'Não foi possível sincronizar.') }
      // Only an acknowledgement permits clearing. Repeated delivery uses the same UUID.
      const stored = readWorkoutDraft(userId)
      if (stored && stored.id !== value.id) { adopt(stored); callback.current(); return }
      if (stored?.id === value.id) localStorage.removeItem(workoutDraftKey(userId))
      adopt(null); setSummary(body.workoutSession); setReview(false); setOpen(true); setCanCorrect(false)
      callback.current()
      window.dispatchEvent(new Event('vynta:workout-saved'))
    } catch (e) { setError(`${e instanceof Error ? e.message : 'Conexão interrompida.'} O treino continua guardado neste aparelho.`) }
    finally { sending.current = false; setBusy(false) }
  }, [adopt, userId])

  useEffect(() => {
    const resume = () => {
      setOnline(navigator.onLine); setNow(Date.now())
      if (document.visibilityState === 'visible') void send()
    }
    window.addEventListener('online', resume); window.addEventListener('offline', resume)
    document.addEventListener('visibilitychange', resume)
    return () => { window.removeEventListener('online', resume); window.removeEventListener('offline', resume); document.removeEventListener('visibilitychange', resume) }
  }, [send])
  useEffect(() => { if (ready && draft?.pending) void send() }, [ready, draft?.id, send]) // retry once on reopening the module
  useEffect(() => {
    if (!open) return
    const resize = () => {
      const view = window.visualViewport
      setViewport(view && view.scale === 1 && window.innerWidth < 640 ? { height: view.height, top: view.offsetTop } : null)
    }
    resize()
    window.visualViewport?.addEventListener('resize', resize)
    window.visualViewport?.addEventListener('scroll', resize)
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => { window.clearInterval(tick); window.visualViewport?.removeEventListener('resize', resize); window.visualViewport?.removeEventListener('scroll', resize) }
  }, [open])

  useEffect(() => {
    if (!open || !draft) return
    let active = true
    setPrevious(null); setPreviousError('')
    fetch(`/api/workout/sessions?dayId=${encodeURIComponent(draft.day.id)}`, { cache: 'no-store', headers: { 'x-vynta-owner': userId } })
      .then(async res => { if (!res.ok) throw new Error(); return res.json() })
      .then(body => { if (active) setPrevious(body.sessions[0] ?? null) })
      .catch(() => { if (active) setPreviousError('Referência anterior indisponível offline. Você pode continuar registrando.') })
    return () => { active = false }
  }, [open, draft?.id, userId])

  useEffect(() => {
    if (!open) return
    const before = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.focus({ preventScroll: true })
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !sending.current) { setOpen(false); return }
      if (event.key !== 'Tab') return
      const nodes = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]') ?? []).filter(el => el.getClientRects().length)
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', keys)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keys); before?.focus({ preventScroll: true }) }
  }, [open])

  useEffect(() => {
    if (open) dialog.current?.focus({ preventScroll: true })
  }, [open, summary?.id, Boolean(draft?.pending)])

  const finish = () => {
    const value = current.current
    if (!value || value.pending) return
    try {
      const duration = Math.min(604800, elapsedSeconds(value))
      const pending = { planId: value.day.planId, workoutDayId: value.day.id, date: value.startedAt,
        durationSeconds: duration, dayNotes: value.notes,
        exercises: value.exercises.map(e => ({ exerciseId: e.exerciseId, workoutDayExerciseId: e.id, notes: e.notes,
          sets: e.sets.map((s, index) => ({ setNumber: index + 1, plannedReps: e.plannedReps, actualReps: parseWorkoutReps(s.reps), weight: parseWorkoutWeight(s.weight), completed: s.completed })),
        })),
      }
      if (!pending.exercises.some(e => e.sets.some(s => s.completed))) throw new Error('Marque ao menos uma série realizada.')
      adopt(writeWorkoutDraft({ ...value, pending, elapsed: duration, runningSince: null, restUntil: null }, value.revision))
      setReview(false); void send()
    } catch (e) { setError((e as Error).message); setReview(false) }
  }
  const done = draft?.exercises.reduce((n, e) => n + e.sets.filter(s => s.completed).length, 0) ?? 0
  const total = draft?.exercises.reduce((n, e) => n + e.sets.length, 0) ?? 0
  const rest = draft?.restUntil ? Math.max(0, Math.ceil((draft.restUntil - now) / 1000)) : 0

  return <>
    {draft && <section className={`${panel} flex flex-wrap items-center justify-between gap-3 border-brand-300 dark:border-brand-700`}>
      <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">{draft.pending ? 'Aguardando sincronização' : 'Seu treino está guardado'}</p><p className="mt-1 break-words font-semibold">{draft.day.name}</p><p className="mt-1 text-xs text-surface-500">{done}/{total} séries • rascunho neste aparelho</p></div>
      <button className="btn-primary" onClick={() => { setOpen(true); setReview(false); setSummary(null) }}>{draft.pending ? 'Ver envio pendente' : 'Retomar treino'}</button>
    </section>}
    {!open && error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}
    {showHistory && <section className={panel}>
      <button className="flex min-h-11 w-full items-center justify-between gap-3 text-left font-semibold" aria-expanded={historyOpen} onClick={() => { setHistoryOpen(!historyOpen); if (!historyOpen) void loadHistory() }}><span>Seu histórico de treinos</span><ChevronDown className={`h-5 w-5 transition-transform motion-reduce:transition-none ${historyOpen ? 'rotate-180' : ''}`} /></button>
      {historyOpen && <div className="mt-3 space-y-3">
        <p className="text-xs text-surface-500">Sessões com séries registradas. Check-ins antigos da lista de Hoje continuam preservados.</p>
        {historyError && <p role="alert" className="text-sm">{historyError} <button className="underline" onClick={() => void loadHistory()}>Tentar novamente</button></p>}
        {!historyBusy && !history.length && !historyError && <p className="text-sm text-surface-500">Sua próxima sessão começa este histórico.</p>}
        {history.map(item => <SessionDetails key={item.id} session={item} />)}
        {historyBusy && <p role="status" className="text-sm">Carregando sessões…</p>}
        {moreHistory && <button disabled={historyBusy} className="btn-secondary" onClick={() => void loadHistory(true, history.at(-1)?.id)}>Ver mais sessões</button>}
      </div>}
    </section>}
    {ready && open && (draft || summary) && createPortal(<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 sm:p-4" style={viewport ? { height: viewport.height, top: viewport.top, bottom: 'auto' } : undefined}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="runner-title" tabIndex={-1} style={{ animationFillMode: 'backwards', ...(viewport ? { height: '100%' } : {}) }} className="flex h-[100dvh] w-full flex-col overflow-hidden bg-surface-50 text-surface-900 shadow-xl outline-none dark:bg-surface-950 dark:text-surface-100 sm:h-[90dvh] sm:max-w-2xl sm:rounded-3xl animate-in fade-in slide-in-from-bottom-4">
        <header className="shrink-0 border-b border-surface-200 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] dark:border-surface-800 sm:px-6">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-300">{summary ? 'Treino registrado' : draft?.pending ? 'Envio pendente' : 'No seu ritmo'}</p><h2 id="runner-title" className="mt-1 break-words text-xl font-bold">{summary?.dayName ?? draft?.day.name}</h2></div><button aria-label="Fechar execução" disabled={busy} onClick={() => setOpen(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-200 dark:hover:bg-surface-800"><X className="h-5 w-5" /></button></div>
          {draft && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs"><span>{done}/{total} séries realizadas{rest > 0 ? ` • descanso ${clock(rest)}` : ''}</span><span>{online ? 'Salvo neste aparelho' : 'Offline • salvo neste aparelho'}</span></div>}
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
          {summary ? <><div className="flex items-center gap-4"><img src="/assets/mascot/celebrating-v1.webp" alt="Brotô celebrando" width={96} height={96} className="h-24 w-24 object-contain" /><div><p className="text-lg font-semibold">Mais um passo por você.</p><p className="mt-1 text-sm text-surface-500">{summary.completed ? 'Todas as séries concluídas.' : 'Treino parcial salvo. Cada série conta.'}</p></div></div><SessionDetails session={summary} expanded /><button className="btn-primary w-full" onClick={() => setOpen(false)}>Voltar aos treinos</button></> : draft?.pending ? <div className={panel}><Clock3 className="mb-3 h-7 w-7 text-brand-500" /><h3 className="font-semibold">Treino finalizado neste aparelho</h3><p className="mt-2 text-sm text-surface-500">As {done} séries estão guardadas. Ao abrir Treinos com conexão, tentaremos enviar novamente. Você também pode tentar agora. Não limpe os dados do navegador antes de sincronizar.</p><button className="btn-primary mt-4 w-full" disabled={busy || !online} onClick={() => void send()}>{busy ? 'Sincronizando…' : online ? 'Sincronizar agora' : 'Aguardando conexão'}</button>{canCorrect && <button className="btn-secondary mt-3 w-full" onClick={() => { try { const value = current.current!; adopt(writeWorkoutDraft({ ...value, pending: undefined }, value.revision)); setCanCorrect(false); setError('Revise os dados e finalize novamente.'); } catch (e) { setError((e as Error).message) } }}>Corrigir registro recusado</button>}<p className="mt-3 text-xs text-surface-500">O envio usa o mesmo identificador em cada tentativa para evitar sessões duplicadas.</p></div> : draft && <>
            <div className={`${panel} flex flex-wrap items-center justify-between gap-3`}><div className="max-w-[11rem]"><p className="text-xs text-surface-500">Tempo em atividade • inclui descanso</p><p className="mt-1 text-2xl font-semibold tabular-nums">{clock(elapsedSeconds(draft, now))}</p></div><button className="btn-secondary flex items-center gap-2" onClick={() => change(d => d.runningSince === null ? { ...d, runningSince: Date.now() } : { ...d, elapsed: elapsedSeconds(d), runningSince: null })}>{draft.runningSince === null ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}{draft.runningSince === null ? 'Continuar' : 'Pausar'}</button></div>
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900 dark:bg-brand-950/30">
              <div className="flex flex-wrap items-center justify-between gap-2"><label className="text-sm font-semibold">Descanso <select aria-label="Duração do descanso" value={draft.restSeconds} onChange={e => change(d => ({ ...d, restSeconds: Number(e.target.value) }))} className="ml-2 rounded-lg border border-surface-300 bg-white p-2 text-sm dark:border-surface-700 dark:bg-surface-900">{[30,60,90,120,180].map(n => <option key={n} value={n}>{n}s</option>)}</select></label><span className="text-xl font-bold tabular-nums">{draft.restUntil ? rest > 0 ? clock(rest) : 'Pronto' : clock(draft.restSeconds)}</span></div>
              <div className="mt-3 grid grid-cols-3 gap-2"><button className="btn-secondary min-w-0 px-2" onClick={() => change(d => ({ ...d, restUntil: Date.now() + d.restSeconds * 1000 }))}>Iniciar</button><button className="btn-secondary min-w-0 px-2" onClick={() => change(d => ({ ...d, restUntil: Math.max(Date.now(), d.restUntil ?? Date.now()) + 15000 }))}>+15s</button><button className="btn-secondary min-w-0 px-2" onClick={() => change(d => ({ ...d, restUntil: null }))}>Pular</button></div><p className="mt-2 text-xs text-surface-500">Começa ao marcar uma série. Ao voltar ao app, o tempo é atualizado; não há alarme com a tela bloqueada.</p>
            </div>
            {previousError && <p className="text-xs text-surface-500">{previousError}</p>}
            {draft.exercises.map((exercise, ei) => {
              const prior = previous?.exercises.filter(e => e.exerciseId === exercise.exerciseId)[draft.exercises.slice(0, ei).filter(e => e.exerciseId === exercise.exerciseId).length]
              const updateSet = (si: number, patch: Partial<WorkoutDraft['exercises'][number]['sets'][number]>) => change(d => ({ ...d, ...(patch.completed ? { restUntil: Date.now() + d.restSeconds * 1000 } : {}), exercises: d.exercises.map((e, index) => index !== ei ? e : { ...e, sets: e.sets.map((s, i) => i === si ? { ...s, ...patch } : s) }) }))
              return <article key={exercise.id} className={panel}><h3 className="break-words font-semibold">{ei + 1}. {exercise.name}</h3><p className="mt-1 text-xs text-surface-500">Planejado: {exercise.plannedSets} × {exercise.plannedReps}{draft.day.exercises[ei]?.targetWeight ? ` • ${draft.day.exercises[ei].targetWeight} kg` : ''}</p>
                {prior && <div className="mt-3 rounded-xl bg-surface-100 p-3 text-xs dark:bg-surface-800"><p>Último treino: {new Date(previous!.date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p><p className="mt-1 break-words">{prior.sets.filter(s => s.completed).map(s => `${s.actualReps ?? '—'} rep. / ${s.weight ?? '—'} kg`).join(' · ') || 'Sem séries detalhadas'}</p><button className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold text-brand-700 dark:text-brand-300" onClick={() => change(d => ({ ...d, exercises: d.exercises.map((e, i) => i === ei ? { ...e, sets: e.sets.map((s, n) => { const old = prior.sets.find(p => p.setNumber === n + 1 && p.completed); return old ? { ...s, reps: old.actualReps?.toString() ?? '', weight: old.weight ?? '' } : s }) } : e) }))}><RotateCcw className="h-4 w-4" />Repetir valores anteriores</button></div>}
                <div className="mt-4 grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-2 text-center text-xs text-surface-500"><span>#</span><span>Repetições</span><span>Carga (kg)</span><span>Feita</span></div>
                <div className="mt-2 space-y-2">{exercise.sets.map((set, si) => <div key={si} className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-2"><span className="text-center text-xs text-surface-500">{si + 1}</span><input aria-label={`${exercise.name}, série ${si + 1}, repetições`} inputMode="numeric" maxLength={4} className="input-field min-w-0 px-2 text-center" placeholder={exercise.plannedReps} value={set.reps} onChange={e => updateSet(si, { reps: e.target.value })} /><input aria-label={`${exercise.name}, série ${si + 1}, carga em kg`} inputMode="decimal" maxLength={9} className="input-field min-w-0 px-2 text-center" placeholder="—" value={set.weight} onChange={e => updateSet(si, { weight: e.target.value })} /><button aria-label={`Série ${si + 1} de ${exercise.name} realizada`} aria-pressed={set.completed} className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${set.completed ? 'border-brand-600 bg-brand-600 text-white' : 'border-surface-300 dark:border-surface-700'}`} onClick={() => { try { parseWorkoutReps(set.reps); parseWorkoutWeight(set.weight); updateSet(si, { completed: !set.completed }) } catch (e) { setError((e as Error).message) } }}><Check className={`h-5 w-5 ${set.completed ? '' : 'opacity-30'}`} /></button></div>)}</div>
                <button disabled={exercise.sets.length >= 50} className="mt-3 min-h-11 w-full rounded-xl border border-dashed border-surface-300 text-sm dark:border-surface-700 disabled:opacity-40" onClick={() => change(d => ({ ...d, exercises: d.exercises.map((e, i) => i === ei ? { ...e, sets: [...e.sets, { reps: '', weight: '', completed: false }] } : e) }))}>+ Adicionar série</button>
                <details className="mt-3 text-sm"><summary className="cursor-pointer py-2 text-surface-500">Observações do exercício</summary><textarea aria-label={`Observações de ${exercise.name}`} maxLength={600} value={exercise.notes} className="input-field mt-2" onChange={event => change(d => ({ ...d, exercises: d.exercises.map((e, i) => i === ei ? { ...e, notes: event.target.value } : e) }))} /></details>
              </article>
            })}
            <label className="block text-sm">Como foi o treino? <span className="text-surface-500">(opcional)</span><textarea maxLength={1000} className="input-field mt-2" value={draft.notes} onChange={e => change(d => ({ ...d, notes: e.target.value }))} /></label>
            {review ? <div className={`${panel} border-brand-300`}><h3 className="font-semibold">{done === total ? 'Tudo pronto para salvar' : 'Finalizar como treino parcial?'}</h3><p className="mt-2 text-sm text-surface-500">{done} de {total} séries realizadas • {clock(elapsedSeconds(draft, now))}. {done < total ? 'As séries não marcadas ficam como não realizadas.' : 'Os valores registrados irão para o histórico.'}</p><div className="mt-4 flex flex-wrap gap-2"><button className="btn-secondary flex-1" onClick={() => setReview(false)}>Revisar</button><button className="btn-primary flex-1" onClick={finish}>{online ? 'Salvar treino' : 'Guardar para enviar'}</button></div></div> : <button disabled={done === 0} className="btn-primary min-h-12 w-full disabled:opacity-40" onClick={() => { setReview(true); setError('') }}>Revisar e finalizar • {done}/{total}</button>}
            <button className="btn-secondary w-full" onClick={() => { change(d => ({ ...d, elapsed: elapsedSeconds(d), runningSince: null })); setOpen(false) }}>Pausar e continuar depois</button>
            {discard ? <div className={`${panel} text-sm`}><p>Descartar este rascunho? As séries ainda não enviadas serão perdidas.</p><div className="mt-3 flex gap-3"><button className="btn-secondary" onClick={() => setDiscard(false)}>Manter</button><button className="min-h-11 text-red-600" onClick={() => { const stored = readWorkoutDraft(userId); if (stored?.revision !== draft.revision) { setError('O treino mudou em outra aba. Reabra antes de descartar.'); return } localStorage.removeItem(workoutDraftKey(userId)); adopt(null); setOpen(false); setDiscard(false) }}>Descartar rascunho</button></div></div> : <button className="min-h-11 w-full text-xs text-surface-500" onClick={() => setDiscard(true)}>Descartar rascunho</button>}
          </>}
        </div>
      </div>
    </div>, document.body)}
  </>
}

function SessionDetails({ session, expanded = false }: { session: WorkoutSessionDTO; expanded?: boolean }) {
  return <details open={expanded || undefined} className="rounded-xl border border-surface-200 p-3 dark:border-surface-800"><summary className="cursor-pointer text-sm"><span className="font-semibold">{session.dayName}</span><span className="mt-1 block text-xs text-surface-500">{new Date(session.date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })} • {session.durationSeconds == null ? 'Registro antigo' : session.completed ? 'Completo' : 'Parcial'}{session.durationSeconds != null ? ` • ${clock(session.durationSeconds)}` : ''}</span></summary><div className="mt-3 space-y-3 text-sm">{session.exercises.map(e => <div key={e.id}><p className="font-medium">{e.name}</p><p className="mt-1 text-xs text-surface-500">{e.sets.filter(s => s.completed).map(s => `${s.actualReps ?? '—'} rep. × ${s.weight ?? '—'} kg`).join(' · ') || (e.completed ? 'Concluído sem detalhamento de séries' : 'Não realizado')}</p>{e.notes && <p className="mt-1 break-words text-xs">{e.notes}</p>}</div>)}{session.dayNotes && <p className="whitespace-pre-wrap break-words border-t border-surface-200 pt-3 dark:border-surface-800">{session.dayNotes}</p>}</div></details>
}
