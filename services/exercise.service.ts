import { prisma } from '@/lib/prisma'
import {
  EXERCISE_MUSCLE_GROUPS,
  SYSTEM_EXERCISES,
  type ExerciseMuscleGroupValue,
} from '@/lib/exerciseCatalog'
import { normalizeName as utilsNormalizeName, standardizeEquipment } from '@/lib/exerciseUtils'

interface ExerciseRecord {
  id: string
  externalId: string | null
  source: string
  namePt: string
  nameEn: string
  muscleGroup: ExerciseMuscleGroupValue
  equipment: string | null
  imageUrl: string | null
  isSystem: boolean
  userId: string | null
  createdAt: Date
  updatedAt: Date
}

interface ExerciseDelegate {
  findMany(args: {
    where?: Record<string, unknown>
    orderBy?: Record<string, unknown> | Array<Record<string, unknown>>
    take?: number
  }): Promise<ExerciseRecord[]>
  findFirst(args: {
    where: Record<string, unknown>
  }): Promise<ExerciseRecord | null>
  create(args: {
    data: Record<string, unknown>
  }): Promise<ExerciseRecord>
  createMany(args: {
    data: Array<Record<string, unknown>>
  }): Promise<{ count: number }>
  update(args: {
    where: Record<string, unknown>
    data: Record<string, unknown>
  }): Promise<ExerciseRecord>
}

function exerciseDelegate(client: unknown): ExerciseDelegate {
  return (client as { exercise: ExerciseDelegate }).exercise
}

export interface ExerciseDTO {
  id: string
  externalId: string | null
  source: string
  namePt: string
  nameEn: string
  muscleGroup: ExerciseMuscleGroupValue
  equipment: string | null
  imageUrl: string | null
  isSystem: boolean
  userId: string | null
  createdAt: string
  updatedAt: string
}

function toExerciseDTO(exercise: ExerciseRecord): ExerciseDTO {
  return {
    id: exercise.id,
    externalId: exercise.externalId,
    source: exercise.source,
    namePt: exercise.namePt,
    nameEn: exercise.nameEn,
    muscleGroup: exercise.muscleGroup,
    equipment: exercise.equipment,
    imageUrl: exercise.imageUrl,
    isSystem: exercise.isSystem,
    userId: exercise.userId,
    createdAt: exercise.createdAt.toISOString(),
    updatedAt: exercise.updatedAt.toISOString(),
  }
}

function normalizeMuscleGroup(input: string): ExerciseMuscleGroupValue {
  const normalized = input.trim().toUpperCase()

  if (!EXERCISE_MUSCLE_GROUPS.includes(normalized as ExerciseMuscleGroupValue)) {
    throw new Error('Grupo muscular invalido')
  }

  return normalized as ExerciseMuscleGroupValue
}

function normalizeName(input: string): string {
  const normalized = input.trim()

  if (!normalized) {
    throw new Error('Nome do exercicio e obrigatorio')
  }

  if (normalized.length > 80) {
    throw new Error('Nome do exercicio muito longo')
  }

  return utilsNormalizeName(normalized)
}

function normalizeOptionalEquipment(input?: string): string | null {
  if (!input) return null

  const normalized = input.trim()

  if (!normalized) return null

  if (normalized.length > 80) {
    throw new Error('Equipamento muito longo')
  }

  return standardizeEquipment(normalized)
}

let hasSeededSystemExercises = false

export async function ensureSystemExercisesSeeded(): Promise<void> {
  if (hasSeededSystemExercises) return

  const delegate = exerciseDelegate(prisma)
  const existing = await delegate.findMany({
    where: { isSystem: true },
  })

  const existingKeySet = new Set(
    existing.map((item) => `${item.namePt.toLowerCase()}::${item.nameEn.toLowerCase()}`)
  )

  const missing = SYSTEM_EXERCISES.filter((seed) => {
    const key = `${seed.namePt.toLowerCase()}::${seed.nameEn.toLowerCase()}`
    return !existingKeySet.has(key)
  })

  if (missing.length > 0) {
    await delegate.createMany({
      data: missing.map((seed) => ({
        externalId: null,
        source: 'SYSTEM',
        namePt: seed.namePt,
        nameEn: seed.nameEn,
        muscleGroup: seed.muscleGroup,
        equipment: seed.equipment ?? null,
        imageUrl: seed.imageUrl ?? null,
        isSystem: true,
        userId: null,
      })),
    })
  }

  hasSeededSystemExercises = true
}

export async function listAvailableExercises(
  userId: string,
  input?: { query?: string; muscleGroup?: string }
): Promise<ExerciseDTO[]> {
  await ensureSystemExercisesSeeded()

  const query = input?.query?.trim() ?? ''
  const muscleGroup = input?.muscleGroup?.trim() ?? ''

  const filters: Array<Record<string, unknown>> = [
    {
      OR: [{ isSystem: true }, { userId }],
    },
  ]

  if (muscleGroup && muscleGroup !== 'ALL') {
    filters.push({ muscleGroup: normalizeMuscleGroup(muscleGroup) })
  }

  if (query) {
    filters.push({
      OR: [
        { namePt: { contains: query, mode: 'insensitive' } },
        { nameEn: { contains: query, mode: 'insensitive' } },
      ],
    })
  }

  const exercises = await exerciseDelegate(prisma).findMany({
    where: { AND: filters },
    orderBy: [{ isSystem: 'desc' }, { namePt: 'asc' }],
  })

  return exercises.map(toExerciseDTO)
}

export async function createCustomExercise(
  userId: string,
  input: { name: string; muscleGroup: string; equipment?: string }
): Promise<ExerciseDTO> {
  const name = normalizeName(input.name)
  const muscleGroup = normalizeMuscleGroup(input.muscleGroup)
  const equipment = normalizeOptionalEquipment(input.equipment)

  // Before creating, check if there's already a system exercise with the same normalized name
  const existingSystem = await exerciseDelegate(prisma).findFirst({
    where: {
      isSystem: true,
      OR: [
        { namePt: name },
        { nameEn: name }
      ]
    },
  })

  // Check if the user already has a custom one matches
  const existingCustom = await exerciseDelegate(prisma).findFirst({
    where: {
      userId,
      isSystem: false,
      namePt: name,
    }
  })

  if (existingSystem) {
    return toExerciseDTO(existingSystem)
  }
  
  if (existingCustom) {
    return toExerciseDTO(existingCustom)
  }

  const exercise = await exerciseDelegate(prisma).create({
    data: {
      externalId: null,
      source: 'CUSTOM',
      namePt: name,
      nameEn: name,
      muscleGroup,
      equipment,
      imageUrl: null,
      isSystem: false,
      userId,
    },
  })

  return toExerciseDTO(exercise)
}

export async function ensureExerciseAccess(userId: string, exerciseId: string): Promise<ExerciseDTO> {
  await ensureSystemExercisesSeeded()

  const exercise = await exerciseDelegate(prisma).findFirst({
    where: {
      id: exerciseId,
      OR: [{ isSystem: true }, { userId }],
    },
  })

  if (!exercise) {
    throw new Error('Exercicio nao encontrado')
  }

  return toExerciseDTO(exercise)
}
