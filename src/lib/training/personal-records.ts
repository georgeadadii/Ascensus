import type { ExerciseCategory } from "@/lib/database/generated/enums"

export const PERSONAL_RECORD_SLOT_NUMBERS = [1, 2, 3, 4] as const

export type PersonalRecordSlotNumber =
  (typeof PERSONAL_RECORD_SLOT_NUMBERS)[number]

export type PersonalRecordCalculationSet = {
  weight: number | null
  reps: number | null
  category: ExerciseCategory
}

export type PersonalRecordSummary = {
  actualOneRepMax: number | null
  estimatedOneRepMax: number | null
  shouldDisplayEstimatedValue: boolean
}

export type PersonalRecordSlotSelectionExercise = {
  id: string
  userId: string | null
}

export function isPersonalRecordSlotNumber(
  value: number
): value is PersonalRecordSlotNumber {
  return PERSONAL_RECORD_SLOT_NUMBERS.includes(
    value as PersonalRecordSlotNumber
  )
}

export function calculateEstimatedOneRepMax(
  weight: number,
  reps: number
): number {
  const effectiveReps = Math.min(reps, 12)
  return weight * (1 + effectiveReps / 30)
}

export function shouldDisplayEstimatedPersonalRecordValue(
  actualOneRepMax: number | null,
  estimatedOneRepMax: number | null
) {
  if (estimatedOneRepMax == null) return false
  if (actualOneRepMax == null) return true
  return estimatedOneRepMax > actualOneRepMax
}

export function calculatePersonalRecordSummary(
  sets: PersonalRecordCalculationSet[]
): PersonalRecordSummary {
  let actualOneRepMax: number | null = null
  let estimatedOneRepMax: number | null = null

  for (const set of sets) {
    if (set.weight == null || set.weight <= 0 || set.reps == null) {
      continue
    }

    if (set.reps === 1) {
      actualOneRepMax = Math.max(actualOneRepMax ?? 0, set.weight)
      continue
    }

    if (set.category === "BODYWEIGHT") {
      // Only use positive external load for bodyweight movements.
      if (set.weight <= 0) {
        continue
      }
    }

    const estimatedValue = calculateEstimatedOneRepMax(set.weight, set.reps)
    estimatedOneRepMax = Math.max(estimatedOneRepMax ?? 0, estimatedValue)
  }

  return {
    actualOneRepMax,
    estimatedOneRepMax,
    shouldDisplayEstimatedValue: shouldDisplayEstimatedPersonalRecordValue(
      actualOneRepMax,
      estimatedOneRepMax
    ),
  }
}

export function validatePersonalRecordSlotSelection(input: {
  slot: number
  userId: string
  exercise: PersonalRecordSlotSelectionExercise
  selectedExerciseIds: string[]
  currentSlotExerciseId?: string | null
}): { ok: true } | { ok: false; error: string } {
  if (!isPersonalRecordSlotNumber(input.slot)) {
    return {
      ok: false,
      error: "Select a valid personal record slot.",
    }
  }

  if (
    input.exercise.userId !== null &&
    input.exercise.userId !== input.userId
  ) {
    return {
      ok: false,
      error: "That exercise is not available to you.",
    }
  }

  if (input.currentSlotExerciseId === input.exercise.id) {
    return {
      ok: false,
      error: "That exercise is already selected for this slot.",
    }
  }

  if (input.selectedExerciseIds.includes(input.exercise.id)) {
    return {
      ok: false,
      error: "You already selected that exercise for another slot.",
    }
  }

  return { ok: true }
}
