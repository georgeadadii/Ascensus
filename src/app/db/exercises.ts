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

function roundNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
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

    unusedOptions.push({
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      primaryMuscle: exercise.primaryMuscle,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
    })
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
