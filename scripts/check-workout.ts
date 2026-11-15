import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import Module from 'node:module'
import { build } from 'esbuild'
import { workoutSessionSchema } from '../lib/workoutSession'
import { workoutDateKey, workoutDayBounds, parseWorkoutReps, parseWorkoutWeight } from '../lib/workoutTime'
import { elapsedSeconds, newWorkoutDraft, readWorkoutDraft, writeWorkoutDraft } from '../lib/workoutDraft'

async function isolated(entry: string, mocks: Record<string, string>) {
  const result = await build({ entryPoints: [resolve(entry)], bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false, logLevel: 'silent', plugins: [{ name: 'workout-mocks', setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => mocks[args.path] ? { path: args.path, namespace: 'mock' } : undefined)
    builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: mocks[args.path], loader: 'js' }))
  } }] })
  const mod = new Module(resolve('.workout-check.cjs')) as Module & { _compile: (source: string, path: string) => void }
  mod.filename = resolve('.workout-check.cjs')
  mod.paths = (Module as unknown as { _nodeModulePaths: (path: string) => string[] })._nodeModulePaths(process.cwd())
  mod._compile(result.outputFiles[0].text, mod.filename)
  return mod.exports
}

export async function checkWorkout() {
  assert.equal(parseWorkoutReps('0'), 0)
  assert.equal(parseWorkoutReps('1000'), 1000)
  assert.equal(parseWorkoutReps(''), null)
  for (const input of ['1.5', '1e2', '-1', '1001', '10-12']) assert.throws(() => parseWorkoutReps(input))
  assert.equal(parseWorkoutWeight('20,25'), 20.25)
  for (const input of ['-1', 'NaN', '1e2', '9999999', '1.234']) assert.throws(() => parseWorkoutWeight(input))
  assert.equal(workoutDateKey(new Date('2026-11-15T02:59:59Z')), '2026-11-14')
  assert.equal(workoutDateKey(new Date('2026-11-15T03:00:00Z')), '2026-11-15')
  assert.equal(workoutDayBounds(new Date('2026-11-15T02:00:00Z')).start.toISOString(), '2026-11-14T03:00:00.000Z')
  const state = globalThis as any
  const originalStorage = state.localStorage
  const storage = new Map<string, string>()
  state.localStorage = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) }
  try {
    const draft = newWorkoutDraft('alice', { id: 'day', name: 'A', planId: 'plan', exercises: [{ id: 'planned', exerciseId: 'exercise', sets: 2, reps: '12', targetWeight: '20', exercise: { namePt: 'Teste' } }] })
    const saved = writeWorkoutDraft(draft)
    assert.equal(readWorkoutDraft('alice')!.id, saved.id)
    assert.equal(readWorkoutDraft('bob'), null, 'drafts never cross accounts')
    assert.throws(() => writeWorkoutDraft(draft), /outra aba/)
    assert.equal(elapsedSeconds({ ...saved, elapsed: 5, runningSince: 1000 }, 61000), 65)
    assert.equal(elapsedSeconds({ ...saved, elapsed: 5, runningSince: null }, 61000), 5)
    const newer = writeWorkoutDraft({ ...saved, notes: 'persistido' }, saved.revision)
    assert.equal(readWorkoutDraft('alice')!.notes, 'persistido')
    assert.throws(() => writeWorkoutDraft(saved, saved.revision), /outra aba/)
    assert.notEqual(newer.revision, saved.revision)
  } finally { state.localStorage = originalStorage }

  state.__workoutRecords = new Map()
  state.__workoutAwards = 0
  state.__workoutLocks = 0
  const day = { id: 'day', planId: 'plan', name: 'Treino A', plan: { name: 'Ficha' }, exercises: [{ id: 'planned', exerciseId: 'exercise', sets: 2, archivedAt: null, exercise: { namePt: 'Agachamento' } }] }
  state.__workoutDay = day
  const prismaMock = `
    let tail=Promise.resolve();
    const db={
      $queryRaw:async()=>{globalThis.__workoutLocks++},
      workoutDay:{findFirst:async({where})=>where.plan.userId==='alice'?globalThis.__workoutDay:null},
      workoutSession:{
        findFirst:async({where})=>{const row=globalThis.__workoutRecords.get(where.id);return row?.userId===where.userId?row:null},
        findMany:async(args)=>{globalThis.__workoutRead=args;return []},
        create:async({data})=>{const row={...data,id:data.id||'generated',plan:{name:'Ficha'},workoutDay:{name:'Treino A'},exercises:data.exercises.create.map((e,i)=>({...e,id:'exercise'+i,exercise:{namePt:'Agachamento'},sets:e.sets.create}))};globalThis.__workoutRecords.set(row.id,row);return row}
      }
    };export const prisma={...db,$transaction:async(fn)=>{const previous=tail;let release;tail=new Promise(r=>release=r);await previous;try{return await fn(db)}finally{release()}}};`
  const service = await isolated('services/workoutSession.service.ts', {
    '@/lib/prisma': prismaMock,
    '@/services/userStats.service': 'export const registerWorkoutCompletion=async()=>{globalThis.__workoutAwards++}',
  })
  const input = { planId: 'plan', workoutDayId: 'day', date: '2026-01-14T22:00:00.000Z', durationSeconds: 60, exercises: [{ exerciseId: 'exercise', workoutDayExerciseId: 'planned', completed: true, sets: [{ setNumber: 1, actualReps: 100, weight: 20.25, completed: true }, { setNumber: 2, actualReps: 0, weight: 0, completed: false }] }] }
  assert.equal(workoutSessionSchema.safeParse(input).success, true)
  const replies = await Promise.all(Array.from({ length: 8 }, () => service.completeWorkoutSession('alice', input, 'same-key')))
  assert.equal(state.__workoutRecords.size, 1, 'concurrent retry creates one session')
  assert.equal(state.__workoutAwards, 1, 'retry cannot award again')
  assert.equal(replies[0].completed, false, 'unchecked series override claimed completion')
  assert.equal(replies[0].exercises[0].setsDone, 1)
  assert.equal(replies[0].exercises[0].name, 'Agachamento')
  assert.equal(replies[0].exercises[0].sets[0].actualReps, 100)
  await service.completeWorkoutSession('alice', input, 'second-session')
  assert.equal(state.__workoutRecords.size, 2, 'two sessions on the same day remain distinct')
  await assert.rejects(() => service.completeWorkoutSession('bob', input, 'same-key'), /não encontrado/)
  await assert.rejects(() => service.completeWorkoutSession('alice', { ...input, date: '2999-01-01T12:00:00.000Z' }), /futuro/)
  await assert.rejects(() => service.completeWorkoutSession('alice', { ...input, exercises: [input.exercises[0], input.exercises[0]] }), /repetido/)
  await assert.rejects(() => service.completeWorkoutSession('alice', { ...input, exercises: [{ ...input.exercises[0], sets: [input.exercises[0].sets[0], input.exercises[0].sets[0]] }] }), /repetido/)
  await assert.rejects(() => service.completeWorkoutSession('alice', { ...input, exercises: [{ ...input.exercises[0], completed: true, sets: [{ setNumber: 1, completed: false }] }] }), /ao menos/)
  day.exercises[0].archivedAt = new Date() as any
  const all = { ...input, exercises: [{ ...input.exercises[0], sets: input.exercises[0].sets.map(s => ({ ...s, completed: true })) }] }
  assert.equal((await service.completeWorkoutSession('alice', all, 'archived-day')).completed, true, 'offline draft may finish after archival')
  await service.getWorkoutSessions('alice', 'day', 'same-key')
  assert.equal(state.__workoutRead.where.userId, 'alice')
  assert.equal(state.__workoutRead.take, 20)
  assert.equal(state.__workoutRead.where.OR[1].id.lt, 'same-key', 'stable pagination handles equal timestamps')
  await assert.rejects(() => service.getWorkoutSessions('bob', undefined, 'same-key'), /inválida/)

  const archive = { updates: [] as any[] }
  state.__workoutArchive = archive
  const archiveMock = `const ownership=async({where})=>where.userId==='bob'?null:{id:where.id,planId:'plan'};export const prisma={
    workoutPlan:{findFirst:ownership,updateMany:async(args)=>globalThis.__workoutArchive.updates.push(args)},
    workoutDay:{findFirst:ownership,update:async(args)=>globalThis.__workoutArchive.updates.push(args)},
    workoutDayExercise:{findFirst:ownership,update:async(args)=>globalThis.__workoutArchive.updates.push(args)}
  }`
  const planService = await isolated('services/workoutPlan.service.ts', { '@/lib/prisma': archiveMock })
  const dayService = await isolated('services/workoutDay.service.ts', { '@/lib/prisma': archiveMock })
  const exerciseService = await isolated('services/workoutDayExercise.service.ts', { '@/lib/prisma': archiveMock, '@/services/exercise.service': 'export const ensureExerciseAccess=async()=>{}' })
  await planService.deleteWorkoutPlan('plan', 'alice')
  await dayService.deleteWorkoutDay('alice', 'day')
  await exerciseService.deleteWorkoutDayExercise('alice', 'planned')
  assert.equal(archive.updates[0].data.isActive, false)
  assert.ok(archive.updates[1].data.archivedAt instanceof Date)
  assert.ok(archive.updates[2].data.archivedAt instanceof Date)
  await assert.rejects(() => planService.deleteWorkoutPlan('plan', 'bob'), /não encontrado/)
  await assert.rejects(() => dayService.deleteWorkoutDay('bob', 'day'), /não encontrado/)
  assert.equal(archive.updates.length, 3, 'archival uses updates, never cascaded deletes')

  state.__workoutStats = { id: 'stats', userId: 'alice', currentStreak: 2, longestStreak: 2, score: 20, lastWorkoutDate: new Date('2026-11-14T00:00:00Z'), createdAt: new Date(), updatedAt: new Date() }
  const statsService = await isolated('services/userStats.service.ts', { '@/lib/prisma': `export const prisma={userStats:{upsert:async()=>globalThis.__workoutStats,update:async({data})=>Object.assign(globalThis.__workoutStats,data)}}` })
  assert.equal((await statsService.registerWorkoutCompletion('alice', { workoutDate: new Date('2026-11-15T02:59:00Z'), completedAllExercises: true })).applied, false, 'legacy midnight day label is preserved')
  const nextDay = await statsService.registerWorkoutCompletion('alice', { workoutDate: new Date('2026-11-15T03:01:00Z'), completedAllExercises: true })
  assert.equal(nextDay.stats.currentStreak, 3)
  assert.equal(nextDay.pointsEarned, 15)

  state.__workoutAuth = null; state.__workoutLimited = false; state.__workoutCall = null
  const route = await isolated('app/api/workout/sessions/route.ts', {
    '@/lib/auth': 'export const getSession=async()=>globalThis.__workoutAuth',
    '@/lib/rateLimit': 'export const enforceRateLimits=async()=>globalThis.__workoutLimited?Response.json({}, {status:429}):null',
    '@/services/workoutSession.service': 'export class WorkoutSessionError extends Error{}; export const getWorkoutSessions=async()=>[]; export const completeWorkoutSession=async(user,input,id)=>{globalThis.__workoutCall={user,input,id};return {id}}',
  })
  const key = randomUUID()
  const request = (origin = 'https://www.vynta.digital', owner = 'alice') => new Request('https://www.vynta.digital/api/workout/sessions', { method: 'POST', headers: { Origin: origin, 'x-vynta-owner': owner, 'x-vynta-mutation-id': key }, body: JSON.stringify({ ...input, userId: 'bob' }) })
  assert.equal((await route.POST(request())).status, 401)
  state.__workoutAuth = { userId: 'alice', canUseWorkout: false }
  assert.equal((await route.POST(request())).status, 403)
  state.__workoutAuth.canUseWorkout = true
  assert.equal((await route.POST(request('https://evil.test'))).status, 403)
  assert.equal((await route.POST(request(undefined, 'bob'))).status, 403)
  assert.equal((await route.POST(request())).status, 201)
  assert.equal(state.__workoutCall.user, 'alice')
  const derivedId = state.__workoutCall.id
  assert.notEqual(derivedId, key)
  assert.equal((await route.POST(request())).headers.get('cache-control'), 'private, no-store')
  assert.equal(state.__workoutCall.id, derivedId)
  state.__workoutLimited = true
  assert.equal((await route.POST(request())).status, 429)
  for (const name of Object.keys(state).filter(k => k.startsWith('__workout'))) delete state[name]
  console.log('Workout regressions passed: validation, account isolation, draft conflicts, timezones, partial sessions, retries, history and authorization.')
}
if (process.argv[1]?.endsWith('check-workout.ts')) checkWorkout().catch(error => { console.error(error); process.exitCode = 1 })
