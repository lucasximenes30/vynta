import { type ExerciseMuscleGroupValue } from '@/lib/exerciseCatalog'
import { type ExerciseDTO } from '@/services/exercise.service'
import { enrichExternalExerciseForDisplay } from '@/services/exerciseNameEnrichment.service'

interface WgerPaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

interface WgerMuscle {
  id: number
  name: string
  name_en?: string
}

interface WgerEquipment {
  id: number
  name: string
}

interface WgerTranslation {
  id: number
  language: number
  name: string
}

interface WgerExerciseInfo {
  id: number
  uuid: string | null
  created?: string
  last_update?: string
  last_update_global?: string
  category?: { id: number; name: string } | null
  muscles?: WgerMuscle[]
  muscles_secondary?: WgerMuscle[]
  equipment?: WgerEquipment[]
  translations?: WgerTranslation[]
}

interface WgerBootstrapCache {
  items: ExerciseDTO[]
  timestamp: number
}

export interface ListWgerBootstrapExercisesInput {
  query?: string
  muscleGroup?: string
  limit?: number
}

const WGER_ENGLISH_LANGUAGE_ID = 2
const WGER_PORTUGUESE_LANGUAGE_ID = 7
const WGER_BOOTSTRAP_CACHE_TTL_MS = 15 * 60 * 1000
const WGER_BOOTSTRAP_PAGE_SIZE = 60
const WGER_BOOTSTRAP_MAX_PAGES = 2

let bootstrapCache: WgerBootstrapCache | null = null
let bootstrapPromise: Promise<ExerciseDTO[]> | null = null

function normalizePositiveInt(value: number | undefined, fallback: number, max: number): number {
  if (value === undefined) return fallback
  if (!Number.isInteger(value) || value < 1) return fallback
  if (value > max) return max
  return value
}

function normalizeString(value: string | null | undefined): string {
  if (!value) return ''
  return value.trim()
}

function getWgerBaseUrl(): string {
  const fromEnv = process.env.WGER_API_BASE_URL?.trim()
  const raw = fromEnv || 'https://wger.de/api/v2/'

  return raw.endsWith('/') ? raw : `${raw}/`
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term))
}

function mapMuscleGroupFromWger(item: WgerExerciseInfo): ExerciseMuscleGroupValue {
  const rawTokens: string[] = []

  if (item.category?.name) {
    rawTokens.push(item.category.name)
  }

  for (const muscle of item.muscles ?? []) {
    if (muscle.name) rawTokens.push(muscle.name)
    if (muscle.name_en) rawTokens.push(muscle.name_en)
  }

  for (const muscle of item.muscles_secondary ?? []) {
    if (muscle.name) rawTokens.push(muscle.name)
    if (muscle.name_en) rawTokens.push(muscle.name_en)
  }

  const normalizedText = rawTokens.map(normalizeToken).join(' ')

  if (!normalizedText) return 'OTHER'

  const matched = new Set<ExerciseMuscleGroupValue>()

  if (includesAny(normalizedText, ['cardio', 'aerobic', 'run', 'bike'])) matched.add('CARDIO')
  if (includesAny(normalizedText, ['pectoral', 'chest'])) matched.add('CHEST')
  if (includesAny(normalizedText, ['latissimus', 'back', 'trapezius', 'erector'])) matched.add('BACK')
  if (includesAny(normalizedText, ['quadriceps', 'hamstring', 'calves', 'legs', 'adductor', 'abductor'])) matched.add('LEGS')
  if (includesAny(normalizedText, ['deltoid', 'shoulder'])) matched.add('SHOULDERS')
  if (includesAny(normalizedText, ['biceps'])) matched.add('BICEPS')
  if (includesAny(normalizedText, ['triceps'])) matched.add('TRICEPS')
  if (includesAny(normalizedText, ['abdom', 'oblique', 'core', 'abs'])) matched.add('ABS')
  if (includesAny(normalizedText, ['glute'])) matched.add('GLUTES')

  if (matched.size === 0) {
    return 'OTHER'
  }

  if (matched.size >= 3) {
    return 'FULL_BODY'
  }

  const priority: ExerciseMuscleGroupValue[] = [
    'CARDIO',
    'CHEST',
    'BACK',
    'LEGS',
    'SHOULDERS',
    'BICEPS',
    'TRICEPS',
    'ABS',
    'GLUTES',
    'OTHER',
  ]

  for (const group of priority) {
    if (matched.has(group)) return group
  }

  return 'OTHER'
}

function pickTranslationName(
  translations: WgerTranslation[] | undefined,
  languageId: number
): string | null {
  if (!translations || translations.length === 0) return null

  for (const item of translations) {
    if (item.language !== languageId) continue

    const normalized = normalizeString(item.name)
    if (normalized) return normalized
  }

  return null
}

function getNowIsoString(): string {
  return new Date().toISOString()
}

function normalizeTimestamp(value: string | undefined): string {
  if (!value) return getNowIsoString()

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return getNowIsoString()

  return parsed.toISOString()
}

async function toBootstrapExercise(item: WgerExerciseInfo): Promise<ExerciseDTO | null> {
  const ptName = pickTranslationName(item.translations, WGER_PORTUGUESE_LANGUAGE_ID)
  const enName = pickTranslationName(item.translations, WGER_ENGLISH_LANGUAGE_ID)
  const fallbackName =
    ptName ||
    enName ||
    (item.translations ?? [])
      .map((entry) => normalizeString(entry.name))
      .find((name) => Boolean(name)) ||
    null

  const externalId = normalizeString(item.uuid) || String(item.id)

  if (!externalId || !fallbackName) {
    return null
  }

  const muscleGroup = mapMuscleGroupFromWger(item)
  const equipment = normalizeString(item.equipment?.[0]?.name)

  const enrichedNames = await enrichExternalExerciseForDisplay({
    namePt: ptName,
    nameEn: enName,
    fallbackName,
    muscleGroup,
    equipment,
    allowAi: false,
  })

  return {
    id: `wger:${externalId}`,
    externalId,
    source: 'WGER',
    namePt: enrichedNames.namePt,
    nameEn: enrichedNames.nameEn,
    muscleGroup,
    equipment: equipment || null,
    imageUrl: null,
    isSystem: true,
    userId: null,
    createdAt: normalizeTimestamp(item.created),
    updatedAt: normalizeTimestamp(item.last_update_global ?? item.last_update),
  }
}

async function fetchWgerPage(url: string): Promise<WgerPaginatedResponse<WgerExerciseInfo>> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Falha ao consultar wger (${response.status})`)
  }

  const payload = (await response.json()) as WgerPaginatedResponse<WgerExerciseInfo>

  if (!Array.isArray(payload.results)) {
    throw new Error('Resposta invalida do wger')
  }

  return payload
}

function isCacheFresh(cache: WgerBootstrapCache | null): boolean {
  if (!cache) return false
  return Date.now() - cache.timestamp < WGER_BOOTSTRAP_CACHE_TTL_MS
}

async function buildBootstrapPool(): Promise<ExerciseDTO[]> {
  const baseUrl = getWgerBaseUrl()
  let nextUrl: string | null = new URL(`exerciseinfo/?limit=${WGER_BOOTSTRAP_PAGE_SIZE}`, baseUrl).toString()
  let pages = 0

  const byExternalId = new Map<string, ExerciseDTO>()

  while (nextUrl && pages < WGER_BOOTSTRAP_MAX_PAGES) {
    const page = await fetchWgerPage(nextUrl)
    pages += 1

    for (const item of page.results) {
      const normalized = await toBootstrapExercise(item)
      if (!normalized) continue

      if (!byExternalId.has(normalized.externalId ?? '')) {
        byExternalId.set(normalized.externalId ?? '', normalized)
      }
    }

    nextUrl = page.next ? new URL(page.next, baseUrl).toString() : null
  }

  return Array.from(byExternalId.values()).sort((a, b) => a.namePt.localeCompare(b.namePt))
}

async function getBootstrapPoolCached(): Promise<ExerciseDTO[]> {
  if (isCacheFresh(bootstrapCache)) {
    return bootstrapCache?.items ?? []
  }

  if (bootstrapPromise) {
    return bootstrapPromise
  }

  bootstrapPromise = buildBootstrapPool()
    .then((items) => {
      bootstrapCache = {
        items,
        timestamp: Date.now(),
      }

      return items
    })
    .finally(() => {
      bootstrapPromise = null
    })

  return bootstrapPromise
}

export async function listWgerBootstrapExercises(
  input?: ListWgerBootstrapExercisesInput
): Promise<ExerciseDTO[]> {
  const query = normalizeString(input?.query).toLowerCase()
  const muscleGroup = normalizeString(input?.muscleGroup).toUpperCase()
  const limit = normalizePositiveInt(input?.limit, 80, 200)

  const pool = await getBootstrapPoolCached()

  const filtered = pool.filter((item) => {
    if (muscleGroup && muscleGroup !== 'ALL' && item.muscleGroup !== muscleGroup) {
      return false
    }

    if (!query) return true

    return (
      item.namePt.toLowerCase().includes(query) ||
      item.nameEn.toLowerCase().includes(query)
    )
  })

  return filtered.slice(0, limit)
}
