import "server-only"

import type { ExerciseCategory } from "@/lib/database/generated/enums"
import { prisma } from "@/lib/database/prisma"
import {
  calculatePersonalRecordSummary,
  isPersonalRecordSlotNumber,
  PERSONAL_RECORD_SLOT_NUMBERS,
  type PersonalRecordSlotNumber,
} from "@/lib/training/personal-records"

export type TrainingPersonalRecordSlot = {
  slot: PersonalRecordSlotNumber
  exercise: {
    id: string
    name: string
  } | null
  actualOneRepMax: number | null
  actualOneRepMaxAchievedAt: string | null
  estimatedOneRepMax: number | null
  shouldDisplayEstimatedValue: boolean
}

function roundNumber(value: number | null) {
  if (value == null || !Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

export async function getTrainingPersonalRecordSlots(
  userId: string
): Promise<TrainingPersonalRecordSlot[]> {
  const slots = await prisma.personalRecordSlot.findMany({
    where: {
      userId,
    },
    orderBy: [{ slot: "asc" }, { id: "asc" }],
    select: {
      slot: true,
      exercise: {
        select: {
          id: true,
          name: true,
          category: true,
        },
      },
    },
  })

  const selectedExercises = slots
    .filter((slot) => isPersonalRecordSlotNumber(slot.slot))
    .map((slot) => slot.exercise.id)

  const sets =
    selectedExercises.length > 0
      ? await prisma.workoutSet.findMany({
          where: {
            completedAt: {
              not: null,
            },
            reps: {
              not: null,
            },
            weight: {
              gt: 0,
            },
            workoutExercise: {
              exerciseId: {
                in: selectedExercises,
              },
              session: {
                userId,
                status: "COMPLETED",
              },
            },
          },
          select: {
            weight: true,
            reps: true,
            completedAt: true,
            workoutExercise: {
              select: {
                exerciseId: true,
                exercise: {
                  select: {
                    category: true,
                  },
                },
              },
            },
          },
        })
      : []

  const setsByExerciseId = new Map<
    string,
    {
      weight: number | null
      reps: number | null
      category: ExerciseCategory
      completedAt: Date | null
    }[]
  >()

  for (const set of sets) {
    const exerciseId = set.workoutExercise.exerciseId
    const currentSets = setsByExerciseId.get(exerciseId) ?? []
    currentSets.push({
      weight: set.weight,
      reps: set.reps,
      category: set.workoutExercise.exercise.category,
      completedAt: set.completedAt,
    })
    setsByExerciseId.set(exerciseId, currentSets)
  }

  const slotByNumber = new Map(
    slots
      .filter((slot) => isPersonalRecordSlotNumber(slot.slot))
      .map((slot) => [slot.slot, slot])
  )

  return PERSONAL_RECORD_SLOT_NUMBERS.map((slotNumber) => {
    const slot = slotByNumber.get(slotNumber)
    if (!slot) {
      return {
        slot: slotNumber,
        exercise: null,
        actualOneRepMax: null,
        actualOneRepMaxAchievedAt: null,
        estimatedOneRepMax: null,
        shouldDisplayEstimatedValue: false,
      }
    }

    const actualOneRepMaxSet = (setsByExerciseId.get(slot.exercise.id) ?? [])
      .filter((set) => set.reps === 1 && set.weight != null && set.weight > 0)
      .sort((a, b) => {
        const weightDiff = (b.weight ?? 0) - (a.weight ?? 0)
        if (weightDiff !== 0) return weightDiff
        return (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0)
      })[0]

    const summary = calculatePersonalRecordSummary(
      (setsByExerciseId.get(slot.exercise.id) ?? []).map((set) => ({
        weight: set.weight,
        reps: set.reps,
        category: set.category,
      }))
    )

    return {
      slot: slotNumber,
      exercise: {
        id: slot.exercise.id,
        name: slot.exercise.name,
      },
      actualOneRepMax: roundNumber(summary.actualOneRepMax),
      actualOneRepMaxAchievedAt:
        actualOneRepMaxSet?.completedAt?.toISOString() ?? null,
      estimatedOneRepMax: roundNumber(summary.estimatedOneRepMax),
      shouldDisplayEstimatedValue: summary.shouldDisplayEstimatedValue,
    }
  })
}
