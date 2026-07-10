import "server-only"

import type { ExerciseCategory } from "@/lib/database/generated/enums"
import { prisma } from "@/lib/database/prisma"

const ACTIVE_WORKOUT_STATUSES = ["COMPLETED", "IN_PROGRESS"] as const

type ExercisePickerBaseOption = {
  id: string
  name: string
  category: ExerciseCategory
  primaryMuscle: string | null
  equipment: string | null
  difficulty: string | null
}

export type ExercisePickerUsedOption = ExercisePickerBaseOption & {
  bestWeight: number | null
  bestReps: number | null
  estimatedOneRepMax: number | null
  lastUsedAt: string
  timesUsed: number
}

export type ExercisePickerUnusedOption = ExercisePickerBaseOption

export type ExercisePickerOption =
  ExercisePickerUsedOption | ExercisePickerUnusedOption

export type CreateCustomExerciseInput = {
  name: string
  primaryMuscle?: string | null
  equipment?: string | null
  difficulty?: string | null
  instructions?: string | null
}

function roundNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase())
}

function normalizeName(value: string) {
  return toTitleCase(normalizeWhitespace(value))
}

function normalizeOptionalText(value?: string | null, maxLength = 120) {
  if (typeof value !== "string") return null

  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (normalized.length > maxLength) return null

  return toTitleCase(normalized)
}

function normalizeInstructions(value?: string | null) {
  if (typeof value !== "string") return null

  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (normalized.length > 4000) return null

  return normalized
}

function deriveCategory(equipment: string | null): ExerciseCategory {
  const normalizedEquipment = equipment?.toLowerCase() ?? ""

  if (normalizedEquipment.includes("barbell")) return "BARBELL"
  if (normalizedEquipment.includes("dumbbell")) return "DUMBBELL"
  if (normalizedEquipment.includes("cable")) return "CABLE"
  if (normalizedEquipment.includes("machine")) return "MACHINE"
  if (
    normalizedEquipment.includes("bodyweight") ||
    normalizedEquipment.includes("body weight") ||
    normalizedEquipment.includes("body")
  ) {
    return "BODYWEIGHT"
  }
  if (
    normalizedEquipment.includes("treadmill") ||
    normalizedEquipment.includes("bike") ||
    normalizedEquipment.includes("cycle") ||
    normalizedEquipment.includes("rower") ||
    normalizedEquipment.includes("elliptical") ||
    normalizedEquipment.includes("stair")
  ) {
    return "CARDIO"
  }

  return "OTHER"
}

function toExercisePickerOption(exercise: {
  id: string
  name: string
  category: ExerciseCategory
  primaryMuscle: string | null
  equipment: string | null
  difficulty: string | null
}): ExercisePickerUnusedOption {
  return {
    id: exercise.id,
    name: exercise.name,
    category: exercise.category,
    primaryMuscle: exercise.primaryMuscle,
    equipment: exercise.equipment,
    difficulty: exercise.difficulty,
  }
}

export async function getExercisePickerOptions(
  userId: string,
  query?: string
): Promise<ExercisePickerOption[]> {
  const normalizedQuery = query?.trim()
  const searchFilter = normalizedQuery
    ? {
        OR: [
          {
            name: {
              contains: normalizedQuery,
              mode: "insensitive" as const,
            },
          },
          {
            primaryMuscle: {
              contains: normalizedQuery,
              mode: "insensitive" as const,
            },
          },
          {
            equipment: {
              contains: normalizedQuery,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : undefined

  const [exerciseUsage, exercises] = await Promise.all([
    prisma.workoutExercise.findMany({
      where: {
        session: {
          userId,
          status: {
            in: [...ACTIVE_WORKOUT_STATUSES],
          },
        },
        exercise: {
          OR: [{ userId: null }, { userId }],
          ...(searchFilter ? { AND: [searchFilter] } : {}),
        },
      },
      orderBy: [{ session: { startedAt: "desc" } }, { id: "desc" }],
      select: {
        exerciseId: true,
        session: {
          select: {
            startedAt: true,
          },
        },
      },
    }),
    prisma.exercise.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
        ...(searchFilter ? { AND: [searchFilter] } : {}),
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        category: true,
        primaryMuscle: true,
        equipment: true,
        difficulty: true,
        personalRecords: {
          where: {
            userId,
          },
          orderBy: [
            { weight: "desc" },
            { estimatedOneRepMax: "desc" },
            { reps: "desc" },
            { achievedAt: "desc" },
            { id: "desc" },
          ],
          take: 1,
          select: {
            weight: true,
            reps: true,
            estimatedOneRepMax: true,
          },
        },
      },
    }),
  ])

  const usageByExerciseId = new Map<
    string,
    {
      timesUsed: number
      lastUsedAt: Date
    }
  >()

  for (const usage of exerciseUsage) {
    const existing = usageByExerciseId.get(usage.exerciseId)
    if (existing) {
      existing.timesUsed += 1
      if (usage.session.startedAt > existing.lastUsedAt) {
        existing.lastUsedAt = usage.session.startedAt
      }
      continue
    }

    usageByExerciseId.set(usage.exerciseId, {
      timesUsed: 1,
      lastUsedAt: usage.session.startedAt,
    })
  }

  const usedOptions: ExercisePickerUsedOption[] = []
  const unusedOptions: ExercisePickerUnusedOption[] = []

  for (const exercise of exercises) {
    const usage = usageByExerciseId.get(exercise.id)
    if (usage) {
      const personalRecord = exercise.personalRecords[0]
      usedOptions.push({
        id: exercise.id,
        name: exercise.name,
        category: exercise.category,
        primaryMuscle: exercise.primaryMuscle,
        equipment: exercise.equipment,
        difficulty: exercise.difficulty,
        bestWeight: roundNumber(personalRecord?.weight),
        bestReps: personalRecord?.reps ?? null,
        estimatedOneRepMax: roundNumber(personalRecord?.estimatedOneRepMax),
        lastUsedAt: usage.lastUsedAt.toISOString(),
        timesUsed: usage.timesUsed,
      })
      continue
    }

    unusedOptions.push(toExercisePickerOption(exercise))
  }

  usedOptions.sort((a, b) => {
    if (a.lastUsedAt !== b.lastUsedAt) {
      return b.lastUsedAt.localeCompare(a.lastUsedAt)
    }
    if (a.timesUsed !== b.timesUsed) {
      return b.timesUsed - a.timesUsed
    }
    return a.name.localeCompare(b.name)
  })

  return [...usedOptions, ...unusedOptions]
}

export async function createCustomExerciseForUser(
  userId: string,
  input: CreateCustomExerciseInput
): Promise<
  | { ok: true; exercise: ExercisePickerUnusedOption }
  | {
      ok: false
      error: string
      fieldErrors?: Partial<Record<keyof CreateCustomExerciseInput, string>>
    }
> {
  const normalizedName = normalizeWhitespace(input.name)

  if (!normalizedName) {
    return {
      ok: false,
      error: "Exercise name is required.",
      fieldErrors: {
        name: "Enter an exercise name.",
      },
    }
  }

  if (normalizedName.length > 120) {
    return {
      ok: false,
      error: "Exercise name is too long.",
      fieldErrors: {
        name: "Use 120 characters or fewer.",
      },
    }
  }

  const normalizedPrimaryMuscle = normalizeOptionalText(input.primaryMuscle, 80)
  if (input.primaryMuscle?.trim() && !normalizedPrimaryMuscle) {
    return {
      ok: false,
      error: "Primary muscle is too long.",
      fieldErrors: {
        primaryMuscle: "Use 80 characters or fewer.",
      },
    }
  }

  const normalizedEquipment = normalizeOptionalText(input.equipment, 80)
  if (input.equipment?.trim() && !normalizedEquipment) {
    return {
      ok: false,
      error: "Equipment is too long.",
      fieldErrors: {
        equipment: "Use 80 characters or fewer.",
      },
    }
  }

  const normalizedDifficulty = normalizeOptionalText(input.difficulty, 40)
  if (input.difficulty?.trim() && !normalizedDifficulty) {
    return {
      ok: false,
      error: "Difficulty is too long.",
      fieldErrors: {
        difficulty: "Use 40 characters or fewer.",
      },
    }
  }

  const normalizedInstructions = normalizeInstructions(input.instructions)
  if (input.instructions?.trim() && !normalizedInstructions) {
    return {
      ok: false,
      error: "Instructions are too long.",
      fieldErrors: {
        instructions: "Use 4000 characters or fewer.",
      },
    }
  }

  const normalizedExerciseName = normalizeName(normalizedName)

  const existingExercise = await prisma.exercise.findFirst({
    where: {
      userId,
      isCustom: true,
      name: {
        equals: normalizedExerciseName,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
    },
  })

  if (existingExercise) {
    return {
      ok: false,
      error: "You already created a custom exercise with that name.",
      fieldErrors: {
        name: "You already have a custom exercise with this name.",
      },
    }
  }

  const createdExercise = await prisma.exercise.create({
    data: {
      name: normalizedExerciseName,
      primaryMuscle: normalizedPrimaryMuscle,
      equipment: normalizedEquipment,
      difficulty: normalizedDifficulty,
      instructions: normalizedInstructions,
      category: deriveCategory(normalizedEquipment),
      source: "CUSTOM",
      isCustom: true,
      userId,
    },
    select: {
      id: true,
      name: true,
      category: true,
      primaryMuscle: true,
      equipment: true,
      difficulty: true,
    },
  })

  return {
    ok: true,
    exercise: toExercisePickerOption(createdExercise),
  }
}
