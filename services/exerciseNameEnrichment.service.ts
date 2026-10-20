import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  type ExerciseNameEnrichmentInput,
  type ExerciseNameEnrichmentResult,
  buildExerciseNameEnrichmentBase,
  sanitizeEnrichedNames,
} from '@/lib/exerciseNameEnrichment'

interface CachedEnrichment {
  result: ExerciseNameEnrichmentResult
  timestamp: number
}

const cache = new Map<string, CachedEnrichment>()
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

function cacheKey(input: ExerciseNameEnrichmentInput): string {
  return JSON.stringify({
    source: input.source,
    pt: input.namePt ?? '',
    en: input.nameEn ?? '',
    fallback: input.fallbackName ?? '',
    muscleGroup: input.muscleGroup ?? '',
    equipment: input.equipment ?? '',
  })
}

function extractJsonObject(rawText: string): string | null {
  const trimmed = rawText.trim()

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed
  }

  const match = trimmed.match(/\{[\s\S]*\}/)
  return match ? match[0] : null
}

async function runAiEnrichment(
  input: ExerciseNameEnrichmentInput,
  base: ExerciseNameEnrichmentResult
): Promise<ExerciseNameEnrichmentResult | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) return null

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.2,
      topP: 0.9,
      maxOutputTokens: 200,
    },
  })

  const prompt = `You are normalizing gym exercise names.
Rules:
- Return STRICT JSON only, with keys: namePt, nameEn
- Keep names concise, natural, gym-friendly
- Portuguese must be pt-BR style
- English must be natural gym English
- Avoid robotic literal translations
- Keep user intent for custom names when they already look human
- Never include explanations

Input:
source=${input.source}
namePt=${base.namePt}
nameEn=${base.nameEn}
muscleGroup=${input.muscleGroup ?? ''}
equipment=${input.equipment ?? ''}

Output example:
{"namePt":"Supino reto","nameEn":"Bench Press"}`

  const response = await model.generateContent(prompt)
  const text = response.response.text()
  const json = extractJsonObject(text)

  if (!json) return null

  try {
    const parsed = JSON.parse(json) as { namePt?: string; nameEn?: string }

    const normalized = sanitizeEnrichedNames({
      namePt: parsed.namePt ?? null,
      nameEn: parsed.nameEn ?? null,
      fallbackPt: base.namePt,
      fallbackEn: base.nameEn,
    })

    return {
      namePt: normalized.namePt,
      nameEn: normalized.nameEn,
      customPreserved: base.customPreserved,
      shouldUseAi: true,
    }
  } catch {
    return null
  }
}

function saveCache(key: string, result: ExerciseNameEnrichmentResult): void {
  cache.set(key, {
    result,
    timestamp: Date.now(),
  })

  if (cache.size > 1000) {
    const keys = Array.from(cache.keys())
    for (let index = 0; index < keys.length - 800; index += 1) {
      cache.delete(keys[index])
    }
  }
}

function getCache(key: string): ExerciseNameEnrichmentResult | null {
  const cached = cache.get(key)
  if (!cached) return null

  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }

  return cached.result
}

export async function enrichExerciseNames(
  input: ExerciseNameEnrichmentInput
): Promise<ExerciseNameEnrichmentResult> {
  const base = buildExerciseNameEnrichmentBase(input)
  const key = cacheKey(input)

  const fromCache = getCache(key)
  if (fromCache) return fromCache

  if (!base.shouldUseAi) {
    saveCache(key, base)
    return base
  }

  try {
    const aiResult = await runAiEnrichment(input, base)

    if (aiResult) {
      saveCache(key, aiResult)
      return aiResult
    }
  } catch {
    // Fallback silently to deterministic normalization.
  }

  saveCache(key, base)
  return base
}

export async function enrichExternalExerciseForDisplay(input: {
  namePt?: string | null
  nameEn?: string | null
  fallbackName?: string | null
  muscleGroup?: string | null
  equipment?: string | null
  allowAi?: boolean
}): Promise<{ namePt: string; nameEn: string }> {
  const enriched = await enrichExerciseNames({
    source: 'EXTERNAL',
    namePt: input.namePt,
    nameEn: input.nameEn,
    fallbackName: input.fallbackName,
    muscleGroup: input.muscleGroup,
    equipment: input.equipment,
    allowAi: input.allowAi,
  })

  return {
    namePt: enriched.namePt,
    nameEn: enriched.nameEn,
  }
}
