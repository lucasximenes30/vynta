export type ExerciseEnrichmentSource = 'SYSTEM' | 'CUSTOM' | 'WGER' | 'EXTERNAL'

export interface ExerciseNameEnrichmentInput {
  source: ExerciseEnrichmentSource
  namePt?: string | null
  nameEn?: string | null
  fallbackName?: string | null
  muscleGroup?: string | null
  equipment?: string | null
  allowAi?: boolean
}

export interface ExerciseNameEnrichmentResult {
  namePt: string
  nameEn: string
  customPreserved: boolean
  shouldUseAi: boolean
}

const EN_TO_PT_PHRASES: Array<[string, string]> = [
  ['romanian deadlift', 'levantamento terra romeno'],
  ['bench press', 'supino reto'],
  ['incline bench press', 'supino inclinado'],
  ['decline bench press', 'supino declinado'],
  ['lat pulldown', 'puxada alta'],
  ['pull-up', 'barra fixa'],
  ['pull up', 'barra fixa'],
  ['push-up', 'flexao'],
  ['push up', 'flexao'],
  ['barbell curl', 'rosca direta'],
  ['dumbbell curl', 'rosca com halteres'],
  ['hammer curl', 'rosca martelo'],
  ['tricep pushdown', 'triceps pulley'],
  ['triceps pushdown', 'triceps pulley'],
  ['deadlift', 'levantamento terra'],
  ['shoulder press', 'desenvolvimento de ombros'],
  ['overhead press', 'desenvolvimento militar'],
  ['lateral raise', 'elevacao lateral'],
  ['rear delt fly', 'crucifixo invertido'],
  ['reverse fly', 'crucifixo invertido'],
  ['leg extension', 'cadeira extensora'],
  ['leg curl', 'mesa flexora'],
  ['leg press', 'leg press'],
  ['calf raise', 'panturrilha'],
  ['hip thrust', 'hip thrust'],
  ['glute bridge', 'ponte de gluteos'],
  ['step-up', 'step up'],
  ['step up', 'step up'],
  ['squat', 'agachamento'],
  ['lunge', 'afundo'],
  ['row', 'remada'],
  ['plank', 'prancha'],
  ['crunch', 'abdominal crunch'],
]

const PT_TO_EN_PHRASES: Array<[string, string]> = [
  ['levantamento terra romeno', 'romanian deadlift'],
  ['levantamento terra', 'deadlift'],
  ['supino reto', 'bench press'],
  ['supino inclinado', 'incline bench press'],
  ['supino declinado', 'decline bench press'],
  ['puxada alta', 'lat pulldown'],
  ['barra fixa', 'pull-up'],
  ['flexao', 'push-up'],
  ['rosca direta', 'barbell curl'],
  ['rosca com halteres', 'dumbbell curl'],
  ['rosca martelo', 'hammer curl'],
  ['triceps pulley', 'tricep pushdown'],
  ['desenvolvimento de ombros', 'shoulder press'],
  ['desenvolvimento militar', 'overhead press'],
  ['elevacao lateral', 'lateral raise'],
  ['crucifixo invertido', 'rear delt fly'],
  ['cadeira extensora', 'leg extension'],
  ['mesa flexora', 'leg curl'],
  ['panturrilha', 'calf raise'],
  ['ponte de gluteos', 'glute bridge'],
  ['agachamento', 'squat'],
  ['afundo', 'lunge'],
  ['remada', 'row'],
  ['prancha', 'plank'],
  ['abdominal crunch', 'crunch'],
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function applyPhraseDictionary(value: string, dictionary: Array<[string, string]>): string {
  let output = value

  for (const [from, to] of dictionary) {
    const regex = new RegExp(`\\b${escapeRegExp(from)}\\b`, 'gi')
    output = output.replace(regex, to)
  }

  return normalizeWhitespace(output)
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/[_]+/g, ' ')
    .replace(/[\s]+/g, ' ')
    .trim()
}

function stripOuterPunctuation(value: string): string {
  let start = 0
  let end = value.length
  while (start < end && /[\W_]/.test(value[start])) start++
  while (end > start && /[\W_]/.test(value[end - 1])) end--
  return value.slice(start, end)
}

function titleCase(value: string): string {
  const words = value.split(' ')

  return words
    .map((word) => {
      if (!word) return word

      if (/^[A-Z0-9]+$/.test(word) && word.length <= 4) {
        return word
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

function sanitizeName(value: string | null | undefined): string {
  if (!value) return ''

  const normalized = stripOuterPunctuation(normalizeWhitespace(value))
  if (!normalized) return ''

  const compact = normalized.split('-').map((part) => part.trim()).join(' - ')
  return titleCase(compact).slice(0, 80)
}

function hasMachineLikeArtifacts(value: string): boolean {
  if (!value) return true

  if (value.includes('_')) return true
  if (/\s{2,}/.test(value)) return true
  if (/^[0-9]/.test(value)) return true
  if (/[a-zA-Z][0-9]{2}/.test(value)) return true
  if (/^[A-Z\s\-0-9]{8,}$/.test(value)) return true

  return false
}

function isMeaningful(value: string): boolean {
  return value.trim().length >= 2
}

function toGymPortuguese(value: string): string {
  return sanitizeName(applyPhraseDictionary(value.toLowerCase(), EN_TO_PT_PHRASES))
}

function toGymEnglish(value: string): string {
  return sanitizeName(applyPhraseDictionary(value.toLowerCase(), PT_TO_EN_PHRASES))
}

function buildFallbackNames(input: ExerciseNameEnrichmentInput): { namePt: string; nameEn: string } {
  const pt = sanitizeName(input.namePt)
  const en = sanitizeName(input.nameEn)
  const fallback = sanitizeName(input.fallbackName)

  let namePt = pt
  let nameEn = en

  if (!namePt && nameEn) {
    namePt = toGymPortuguese(nameEn)
  }

  if (!nameEn && namePt) {
    nameEn = toGymEnglish(namePt)
  }

  if (namePt && nameEn && namePt.toLowerCase() === nameEn.toLowerCase()) {
    const translatedPt = toGymPortuguese(nameEn)
    if (translatedPt && translatedPt.toLowerCase() !== nameEn.toLowerCase()) {
      namePt = translatedPt
    }

    const translatedEn = toGymEnglish(namePt)
    if (translatedEn && translatedEn.toLowerCase() !== namePt.toLowerCase()) {
      nameEn = translatedEn
    }
  }

  const base = namePt || nameEn || fallback || 'Exercicio'

  return {
    namePt: namePt || nameEn || fallback || base,
    nameEn: nameEn || namePt || fallback || base,
  }
}

function shouldPreserveCustomNames(input: ExerciseNameEnrichmentInput, fallback: { namePt: string; nameEn: string }): boolean {
  if (input.source !== 'CUSTOM') return false

  const looksGoodPt = isMeaningful(fallback.namePt) && !hasMachineLikeArtifacts(fallback.namePt)
  const looksGoodEn = isMeaningful(fallback.nameEn) && !hasMachineLikeArtifacts(fallback.nameEn)

  return looksGoodPt && looksGoodEn
}

export function buildExerciseNameEnrichmentBase(
  input: ExerciseNameEnrichmentInput
): ExerciseNameEnrichmentResult {
  const fallback = buildFallbackNames(input)
  const customPreserved = shouldPreserveCustomNames(input, fallback)

  if (customPreserved) {
    return {
      namePt: fallback.namePt,
      nameEn: fallback.nameEn,
      customPreserved: true,
      shouldUseAi: false,
    }
  }

  const hasMissingLanguage = !isMeaningful(fallback.namePt) || !isMeaningful(fallback.nameEn)
  const sameName = fallback.namePt.toLowerCase() === fallback.nameEn.toLowerCase()
  const machineLike =
    hasMachineLikeArtifacts(fallback.namePt) || hasMachineLikeArtifacts(fallback.nameEn)
  const veryLong = fallback.namePt.length > 50 || fallback.nameEn.length > 50

  const allowAi = input.allowAi !== false

  return {
    namePt: fallback.namePt,
    nameEn: fallback.nameEn,
    customPreserved: false,
    shouldUseAi: allowAi && (hasMissingLanguage || sameName || machineLike || veryLong),
  }
}

export function sanitizeEnrichedNames(input: {
  namePt?: string | null
  nameEn?: string | null
  fallbackPt: string
  fallbackEn: string
}): { namePt: string; nameEn: string } {
  const cleanedPt = sanitizeName(input.namePt)
  const cleanedEn = sanitizeName(input.nameEn)

  const fallbackPt = sanitizeName(input.fallbackPt) || 'Exercicio'
  const fallbackEn = sanitizeName(input.fallbackEn) || fallbackPt

  return {
    namePt: cleanedPt || cleanedEn || fallbackPt,
    nameEn: cleanedEn || cleanedPt || fallbackEn,
  }
}
