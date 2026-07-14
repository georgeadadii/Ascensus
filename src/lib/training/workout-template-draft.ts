export type WorkoutTemplateDraftSet = {
  id: string
  setNumber: number
  minReps: number | null
  maxReps: number | null
  targetWeight: number | null
}

export type WorkoutTemplateDraftExercise = {
  id: string
  exerciseId: string
  order: number
  notes: string | null
  sets: WorkoutTemplateDraftSet[]
  exercise: {
    name: string
    primaryMuscle: string | null
    equipment: string | null
    difficulty: string | null
  }
}

export type WorkoutTemplateDraft = {
  name: string
  description: string
  exercises: WorkoutTemplateDraftExercise[]
}

export function createEmptyWorkoutTemplateDraft(): WorkoutTemplateDraft {
  return {
    name: "",
    description: "",
    exercises: [],
  }
}

export function createDraftFromTemplate(template: {
  name: string
  description: string | null
  exercises: Array<{
    id: string
    exerciseId: string
    order: number
    notes: string | null
    sets: Array<{
      id: string
      setNumber: number
      minReps: number
      maxReps: number
      targetWeight: number | null
    }>
    exercise: {
      name: string
      primaryMuscle: string | null
      equipment: string | null
      difficulty: string | null
    }
  }>
}): WorkoutTemplateDraft {
  return {
    name: template.name,
    description: template.description ?? "",
    exercises: template.exercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      order: exercise.order,
      notes: exercise.notes,
      sets: renumberTemplateSets(
        exercise.sets.map((set) => ({
          id: set.id,
          setNumber: set.setNumber,
          minReps: set.minReps,
          maxReps: set.maxReps,
          targetWeight: set.targetWeight,
        }))
      ),
      exercise: exercise.exercise,
    })),
  }
}

export function renumberTemplateSets(
  sets: WorkoutTemplateDraftSet[]
): WorkoutTemplateDraftSet[] {
  return sets.map((set, index) => ({
    ...set,
    setNumber: index + 1,
  }))
}

export function renumberTemplateExercises(
  exercises: WorkoutTemplateDraftExercise[]
): WorkoutTemplateDraftExercise[] {
  return exercises.map((exercise, index) => ({
    ...exercise,
    order: index + 1,
    sets: renumberTemplateSets(exercise.sets),
  }))
}
