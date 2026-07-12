export type WorkoutTemplateExerciseInput = {
  exerciseId: string
  order: number
  notes: string | null
  sets: WorkoutTemplateSetInput[]
}

export type WorkoutTemplateSetInput = {
  setNumber: number
  minReps: number
  maxReps: number
  targetWeight: number | null
}

export type ValidatedWorkoutTemplateExerciseInput = {
  exerciseId: string
  order: number
  notes: string | null
  sets: WorkoutTemplateSetInput[]
}

export type ValidatedWorkoutTemplateDraft = {
  name: string
  description: string | null
  exercises: ValidatedWorkoutTemplateExerciseInput[]
}

export function normalizeTemplateName(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ")
  if (!normalized) return null
  if (normalized.length > 120) return null
  return normalized
}

export function normalizeTemplateDescription(value?: string | null) {
  if (typeof value !== "string") return null

  const normalized = value.trim().replace(/\s+/g, " ")
  if (!normalized) return null
  if (normalized.length > 500) return null
  return normalized
}

function normalizeTemplateNotes(value?: string | null) {
  if (typeof value !== "string") return null

  const normalized = value.trim()
  if (!normalized) return null
  if (normalized.length > 1000) return null
  return normalized
}

function roundNullable(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

function normalizeTargetWeight(value: number | null | undefined) {
  if (value == null) return null
  if (!Number.isFinite(value) || value < 0) return null
  return roundNullable(value)
}

function normalizeRepCount(value: number | null | undefined) {
  if (value == null) return null
  if (!Number.isInteger(value) || value < 1 || value > 1000) return null
  return value
}

function normalizeTemplateSets(sets: WorkoutTemplateSetInput[]) {
  return sets.map((set, index) => {
    const minReps = normalizeRepCount(set.minReps)
    if (minReps == null) {
      return {
        ok: false as const,
        error: `Set ${index + 1} must have min reps of at least 1.`,
      }
    }

    const maxReps = normalizeRepCount(set.maxReps)
    if (maxReps == null) {
      return {
        ok: false as const,
        error: `Set ${index + 1} must have max reps of at least min reps.`,
      }
    }

    if (!Number.isInteger(set.setNumber) || set.setNumber !== index + 1) {
      return {
        ok: false as const,
        error: "Sets must be numbered sequentially starting at 1.",
      }
    }

    if (maxReps < minReps) {
      return {
        ok: false as const,
        error: `Set ${index + 1} must have max reps of at least min reps.`,
      }
    }

    if (
      set.targetWeight != null &&
      (!Number.isFinite(set.targetWeight) || set.targetWeight < 0)
    ) {
      return {
        ok: false as const,
        error: `Set ${index + 1} must have a target weight of 0 or greater.`,
      }
    }

    return {
      ok: true as const,
      data: {
        setNumber: set.setNumber,
        minReps,
        maxReps,
        targetWeight: normalizeTargetWeight(set.targetWeight),
      },
    }
  })
}

export function validateWorkoutTemplateDraft(
  exercises: WorkoutTemplateExerciseInput[]
) {
  if (exercises.length === 0) {
    return {
      ok: false as const,
      error: "Add at least one exercise before saving this template.",
    }
  }

  const normalizedExercises: ValidatedWorkoutTemplateExerciseInput[] = []

  for (const [exerciseIndex, exercise] of exercises.entries()) {
    if (!exercise.exerciseId) {
      return {
        ok: false as const,
        error: `Exercise ${exerciseIndex + 1} could not be found.`,
      }
    }

    if (
      !Number.isInteger(exercise.order) ||
      exercise.order !== exerciseIndex + 1
    ) {
      return {
        ok: false as const,
        error: "Exercises must be ordered sequentially starting at 1.",
      }
    }

    if (exercise.sets.length === 0) {
      return {
        ok: false as const,
        error: `Exercise ${exerciseIndex + 1} must include at least one set.`,
      }
    }

    const normalizedSets = normalizeTemplateSets(exercise.sets)
    const invalidSet = normalizedSets.find((set) => !set.ok)

    if (invalidSet && !invalidSet.ok) {
      return invalidSet
    }

    normalizedExercises.push({
      exerciseId: exercise.exerciseId,
      order: exercise.order,
      notes: normalizeTemplateNotes(exercise.notes),
      sets: normalizedSets.map((set) => {
        if (!set.ok) {
          throw new Error("Unexpected invalid set during template validation.")
        }

        return set.data
      }),
    })
  }

  return {
    ok: true as const,
    data: normalizedExercises,
  }
}

export function validateWorkoutTemplateDraftInput(input: {
  name: string
  description?: string | null
  exercises: WorkoutTemplateExerciseInput[]
}) {
  const name = normalizeTemplateName(input.name)
  if (!name) {
    return { ok: false as const, error: "Template name is required." }
  }

  const exercises = validateWorkoutTemplateDraft(input.exercises)
  if (!exercises.ok) {
    return exercises
  }

  return {
    ok: true as const,
    data: {
      name,
      description: normalizeTemplateDescription(input.description),
      exercises: exercises.data,
    } satisfies ValidatedWorkoutTemplateDraft,
  }
}
