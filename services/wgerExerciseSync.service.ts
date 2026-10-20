import { prisma } from '@/lib/prisma'
import { type ExerciseMuscleGroupValue } from '@/lib/exerciseCatalog'
import { ensureSystemExercisesSeeded } from '@/services/exercise.service'
import { enrichExerciseNames } from '@/services/exerciseNameEnrichment.service'

interface ExerciseRecord {
  id: string
  externalId: string | null
}

interface ExerciseDelegate {
  findMany(args: {
    where?: Record<string, unknown>
  }): Promise<ExerciseRecord[]>
  count(args: {
    where?: Record<string, unknown>
  }): Promise<number>
  create(args: {
    data: Record<string, unknown>
  }): Promise<ExerciseRecord>
  update(args: {
    where: Record<string, unknown>
    data: Record<string, unknown>
  }): Promise<ExerciseRecord>
}

function exerciseDelegate(client: unknown): ExerciseDelegate {
  return (client as { exercise: ExerciseDelegate }).exercise
}

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

interface WgerImage {
  id: number
  image: string
  is_main: boolean
}

interface WgerTranslation {
  id: number
  language: number
  name: string
}

interface WgerExerciseInfo {
  id: number
  uuid: string | null
  category?: { id: number; name: string } | null
  muscles?: WgerMuscle[]
  muscles_secondary?: WgerMuscle[]
  equipment?: WgerEquipment[]
  images?: WgerImage[]
  translations?: WgerTranslation[]
}

interface NormalizedWgerExercise {
  externalId: string
  namePt: string
  nameEn: string
  muscleGroup: ExerciseMuscleGroupValue
  equipment: string | null
  imageUrl: string | null
}

export interface SyncWgerExercisesInput {
  pageSize?: number
  maxPages?: number
}

export interface SyncWgerExercisesResult {
  source: 'wger'
  fetched: number
  imported: number
  updated: number
  skipped: number
  pages: number
}

const WGER_ENGLISH_LANGUAGE_ID = 2
const WGER_PORTUGUESE_LANGUAGE_ID = 7
const DEFAULT_PAGE_SIZE = 50
const DEFAULT_MAX_PAGES = 30
const MAX_PAGE_SIZE = 100
const MAX_MAX_PAGES = 200
const BOOTSTRAP_MAX_PAGES = 40

let hasSuccessfulBootstrap = false
let bootstrapPromise: Promise<void> | null = null

function getWgerBaseUrl(): string {
  const fromEnv = process.env.WGER_API_BASE_URL?.trim()
  const raw = fromEnv || 'https://wger.de/api/v2/'

  return raw.endsWith('/') ? raw : `${raw}/`
}

function normalizePositiveInt(value: number | undefined, fallback: number, max: number): number {
  if (value === undefined) return fallback
  if (!Number.isInteger(value) || value < 1) return fallback
  if (value > max) return max
  return value
}

function truncateToMaxLength(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return value.slice(0, maxLength)
}

function normalizeNonEmptyName(value: string | null | undefined): string | null {
  if (!value) return null

  const normalized = value.trim()
  if (!normalized) return null

  return truncateToMaxLength(normalized, 80)
}

function normalizeOptionalEquipment(value: string | null | undefined): string | null {
  if (!value) return null

  const normalized = value.trim()
  if (!normalized) return null

  return truncateToMaxLength(normalized, 80)
}

function pickTranslationName(
  translations: WgerTranslation[] | undefined,
  languageId: number
): string | null {
  if (!translations || translations.length === 0) return null

  for (const item of translations) {
    if (item.language !== languageId) continue

    const normalized = normalizeNonEmptyName(item.name)
    if (normalized) return normalized
  }

  return null
}

function resolveExerciseNames(translations: WgerTranslation[] | undefined): {
  namePt: string
  nameEn: string
} | null {
  const ptName = pickTranslationName(translations, WGER_PORTUGUESE_LANGUAGE_ID)
  const enName = pickTranslationName(translations, WGER_ENGLISH_LANGUAGE_ID)

  const fallbackName =
    ptName ||
    enName ||
    translations?.map((item) => normalizeNonEmptyName(item.name)).find((value) => Boolean(value)) ||
    null

  if (!fallbackName) {
    return null
  }

  return {
    namePt: ptName || enName || fallbackName,
    nameEn: enName || ptName || fallbackName,
  }
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

function buildAbsoluteImageUrl(imagePath: string | null | undefined, publicOrigin: string): string | null {
  if (!imagePath) return null

  const normalized = imagePath.trim()
  if (!normalized) return null

  if (normalized.startsWith('https://') || normalized.startsWith('http://')) {
    return normalized
  }

  if (normalized.startsWith('/')) {
    return `${publicOrigin}${normalized}`
  }

  return `${publicOrigin}/${normalized}`
}

function normalizeWgerExercise(
  item: WgerExerciseInfo,
  publicOrigin: string
): NormalizedWgerExercise | null {
  const names = resolveExerciseNames(item.translations)
  if (!names) return null

  const externalId = normalizeNonEmptyName(item.uuid) || String(item.id)

  const primaryImage = (item.images ?? []).find((image) => image.is_main) ?? (item.images ?? [])[0] ?? null

  return {
    externalId,
    namePt: names.namePt,
    nameEn: names.nameEn,
    muscleGroup: mapMuscleGroupFromWger(item),
    equipment: normalizeOptionalEquipment(item.equipment?.[0]?.name ?? null),
    imageUrl: buildAbsoluteImageUrl(primaryImage?.image, publicOrigin),
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

export async function syncExercisesFromWger(
  input?: SyncWgerExercisesInput
): Promise<SyncWgerExercisesResult> {
  await ensureSystemExercisesSeeded()

  const pageSize = normalizePositiveInt(input?.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
  const maxPages = normalizePositiveInt(input?.maxPages, DEFAULT_MAX_PAGES, MAX_MAX_PAGES)

  const baseUrl = getWgerBaseUrl()
  const baseOrigin = new URL(baseUrl).origin

  let nextUrl: string | null = new URL(`exerciseinfo/?limit=${pageSize}`, baseUrl).toString()
  let pages = 0
  let fetched = 0
  let imported = 0
  let updated = 0
  let skipped = 0

  const existingImported = await exerciseDelegate(prisma).findMany({
    where: {
      source: 'WGER',
    },
  })

  const existingByExternalId = new Map<string, string>()
  for (const item of existingImported) {
    if (!item.externalId) continue
    if (!existingByExternalId.has(item.externalId)) {
      existingByExternalId.set(item.externalId, item.id)
    }
  }

  while (nextUrl && pages < maxPages) {
    const page = await fetchWgerPage(nextUrl)
    pages += 1

    for (const remoteExercise of page.results) {
      fetched += 1

      const normalized = normalizeWgerExercise(remoteExercise, baseOrigin)

      if (!normalized) {
        skipped += 1
        continue
      }

      const enriched = await enrichExerciseNames({
        source: 'WGER',
        namePt: normalized.namePt,
        nameEn: normalized.nameEn,
        fallbackName: normalized.nameEn,
        muscleGroup: normalized.muscleGroup,
        equipment: normalized.equipment,
        allowAi: true,
      })

      const existingId = existingByExternalId.get(normalized.externalId)

      if (!existingId) {
        const created = await exerciseDelegate(prisma).create({
          data: {
            externalId: normalized.externalId,
            source: 'WGER',
            namePt: enriched.namePt,
            nameEn: enriched.nameEn,
            muscleGroup: normalized.muscleGroup,
            equipment: normalized.equipment,
            imageUrl: normalized.imageUrl,
            isSystem: true,
            userId: null,
          },
        })

        existingByExternalId.set(normalized.externalId, created.id)
        imported += 1
        continue
      }

      await exerciseDelegate(prisma).update({
        where: { id: existingId },
        data: {
          namePt: enriched.namePt,
          nameEn: enriched.nameEn,
          muscleGroup: normalized.muscleGroup,
          equipment: normalized.equipment,
          imageUrl: normalized.imageUrl,
          isSystem: true,
          userId: null,
        },
      })

      updated += 1
    }

    nextUrl = page.next ? new URL(page.next, baseUrl).toString() : null
  }

  return {
    source: 'wger',
    fetched,
    imported,
    updated,
    skipped,
    pages,
  }
}

export async function ensureWgerExercisesBootstrapped(): Promise<void> {
  if (hasSuccessfulBootstrap) return

  if (bootstrapPromise) {
    await bootstrapPromise
    return
  }

  bootstrapPromise = (async () => {
    const existingWgerCount = await exerciseDelegate(prisma).count({
      where: {
        source: 'WGER',
      },
    })

    if (existingWgerCount > 0) {
      hasSuccessfulBootstrap = true
      return
    }

    await syncExercisesFromWger({
      pageSize: DEFAULT_PAGE_SIZE,
      maxPages: BOOTSTRAP_MAX_PAGES,
    })

    hasSuccessfulBootstrap = true
  })().finally(() => {
    bootstrapPromise = null
  })

  await bootstrapPromise
}
