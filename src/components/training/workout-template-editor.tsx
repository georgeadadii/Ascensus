"use client"

import * as React from "react"
import {
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  Plus,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"

import type { ExercisePickerOption } from "@/app/db/exercises"
import type { TemplateMutationResult } from "@/app/training/actions"
import { DiscardTemplateDialog } from "@/components/training/discard-template-dialog"
import { ExercisePickerDialog } from "@/components/training/exercise-picker-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createEmptyWorkoutTemplateDraft,
  renumberTemplateExercises,
  renumberTemplateSets,
  type WorkoutTemplateDraft,
  type WorkoutTemplateDraftExercise,
  type WorkoutTemplateDraftSet,
} from "@/lib/training/workout-template-draft"

type WorkoutTemplateSaveResult = TemplateMutationResult<{
  templateId: string
  version?: number
  updatedAt?: string
  exerciseCount?: number
}>

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function parseOptionalInteger(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = Number(trimmed)
  return Number.isInteger(parsed) ? parsed : null
}

function parseOptionalWeight(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function serializeDraft(draft: WorkoutTemplateDraft) {
  return JSON.stringify({
    name: draft.name,
    description: draft.description,
    exercises: draft.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      order: exercise.order,
      notes: exercise.notes,
      sets: exercise.sets.map((set) => ({
        setNumber: set.setNumber,
        minReps: set.minReps,
        maxReps: set.maxReps,
        targetWeight: set.targetWeight,
      })),
    })),
  })
}

function createDraftSet(
  overrides?: Partial<Omit<WorkoutTemplateDraftSet, "id">>
): WorkoutTemplateDraftSet {
  return {
    id: `draft-set-${crypto.randomUUID()}`,
    setNumber: overrides?.setNumber ?? 1,
    minReps: overrides?.minReps ?? null,
    maxReps: overrides?.maxReps ?? null,
    targetWeight: overrides?.targetWeight ?? null,
  }
}

function getSetValidation(set: WorkoutTemplateDraftSet) {
  const minRepsInvalid = set.minReps == null || set.minReps < 1
  const maxRepsInvalid =
    set.maxReps == null ||
    set.maxReps < 1 ||
    (set.minReps != null && set.maxReps < set.minReps)
  const targetWeightInvalid = set.targetWeight != null && set.targetWeight < 0

  return {
    minRepsInvalid,
    maxRepsInvalid,
    targetWeightInvalid,
  }
}

function validateDraft(draft: WorkoutTemplateDraft) {
  for (const exercise of draft.exercises) {
    if (exercise.sets.length === 0) {
      return `${exercise.exercise.name} must include at least one set.`
    }

    for (const set of exercise.sets) {
      const validation = getSetValidation(set)

      if (validation.minRepsInvalid || validation.maxRepsInvalid) {
        return `Enter valid min and max reps for every set in ${exercise.exercise.name}.`
      }

      if (validation.targetWeightInvalid) {
        return `Target weight must be blank or at least 0 for ${exercise.exercise.name}.`
      }
    }
  }

  return null
}

function exerciseMeta(exercise: WorkoutTemplateDraftExercise) {
  return exercise.exercise.primaryMuscle || exercise.exercise.equipment || null
}

export function WorkoutTemplateEditor({
  mode,
  initialDraft = createEmptyWorkoutTemplateDraft(),
  initialVersion,
  initialUpdatedAt,
  exerciseOptions,
  onSubmitDraft,
}: {
  mode: "create" | "edit"
  initialDraft?: WorkoutTemplateDraft
  initialVersion?: number
  initialUpdatedAt?: string
  exerciseOptions: ExercisePickerOption[]
  onSubmitDraft: (
    draft: WorkoutTemplateDraft
  ) => Promise<WorkoutTemplateSaveResult>
}) {
  const router = useRouter()
  const [draft, setDraft] = React.useState(initialDraft)
  const [version, setVersion] = React.useState(initialVersion ?? 1)
  const [updatedAt, setUpdatedAt] = React.useState(initialUpdatedAt ?? null)
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [discardDialogOpen, setDiscardDialogOpen] = React.useState(false)
  const [savedSnapshot, setSavedSnapshot] = React.useState(() =>
    serializeDraft(initialDraft)
  )
  const allowNavigationRef = React.useRef(false)
  const historyGuardActiveRef = React.useRef(false)
  const suppressNextPopRef = React.useRef(false)
  const currentSnapshot = serializeDraft(draft)
  const hasUnsavedChanges = currentSnapshot !== savedSnapshot

  React.useEffect(() => {
    if (!hasUnsavedChanges) {
      if (historyGuardActiveRef.current) {
        suppressNextPopRef.current = true
        historyGuardActiveRef.current = false
        window.history.back()
      }

      historyGuardActiveRef.current = false
      return
    }

    if (historyGuardActiveRef.current) {
      return
    }

    window.history.pushState(
      { workoutTemplateDraft: true },
      "",
      window.location.href
    )
    historyGuardActiveRef.current = true
  }, [hasUnsavedChanges])

  React.useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges || allowNavigationRef.current) {
        return
      }

      event.preventDefault()
      event.returnValue = ""
    }

    function handlePopState() {
      if (suppressNextPopRef.current) {
        suppressNextPopRef.current = false
        return
      }

      if (!hasUnsavedChanges || allowNavigationRef.current) {
        return
      }

      window.history.pushState(
        { workoutTemplateDraft: true },
        "",
        window.location.href
      )
      setDiscardDialogOpen(true)
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("popstate", handlePopState)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("popstate", handlePopState)
    }
  }, [hasUnsavedChanges])

  function updateExercise(
    exerciseId: string,
    updater: (
      exercise: WorkoutTemplateDraftExercise
    ) => WorkoutTemplateDraftExercise
  ) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      exercises: currentDraft.exercises.map((exercise) =>
        exercise.id === exerciseId ? updater(exercise) : exercise
      ),
    }))
  }

  function updateSet(
    exerciseId: string,
    setId: string,
    updater: (set: WorkoutTemplateDraftSet) => WorkoutTemplateDraftSet
  ) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => (set.id === setId ? updater(set) : set)),
    }))
  }

  async function handleSave() {
    const validationError = validateDraft(draft)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setIsSubmitting(true)

    const result = await onSubmitDraft(draft)

    setIsSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setSavedSnapshot(currentSnapshot)
    setVersion(result.data.version ?? version)
    setUpdatedAt(result.data.updatedAt ?? updatedAt)

    if (mode === "create") {
      allowNavigationRef.current = true
      router.push(`/training/templates/${result.data.templateId}`)
      return
    }

    router.refresh()
  }

  function handleCancel() {
    allowNavigationRef.current = true
    router.push("/training")
  }

  function handleDiscard() {
    allowNavigationRef.current = true
    setDiscardDialogOpen(false)
    router.push("/training")
  }

  async function handleAddExercise(option: ExercisePickerOption) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      exercises: [
        ...currentDraft.exercises,
        {
          id: `draft-exercise-${crypto.randomUUID()}`,
          exerciseId: option.id,
          order: currentDraft.exercises.length + 1,
          notes: null,
          sets: [createDraftSet()],
          exercise: {
            name: option.name,
            primaryMuscle: option.primaryMuscle,
            equipment: option.equipment,
            difficulty: option.difficulty,
          },
        },
      ],
    }))

    return true
  }

  function handleMoveExercise(exerciseId: string, direction: -1 | 1) {
    const currentIndex = draft.exercises.findIndex(
      (exercise) => exercise.id === exerciseId
    )
    const nextIndex = currentIndex + direction

    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= draft.exercises.length
    ) {
      return
    }

    const nextExercises = [...draft.exercises]
    const [movedExercise] = nextExercises.splice(currentIndex, 1)
    nextExercises.splice(nextIndex, 0, movedExercise)

    setDraft((currentDraft) => ({
      ...currentDraft,
      exercises: renumberTemplateExercises(nextExercises),
    }))
  }

  function handleRemoveExercise(exerciseId: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      exercises: renumberTemplateExercises(
        currentDraft.exercises.filter((exercise) => exercise.id !== exerciseId)
      ),
    }))
  }

  function handleAddSet(exerciseId: string) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      sets: renumberTemplateSets([...exercise.sets, createDraftSet()]),
    }))
  }

  function handleRemoveSet(exerciseId: string, setId: string) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      sets: renumberTemplateSets(
        exercise.sets.filter((set) => set.id !== setId)
      ),
    }))
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-[18px]">
        <Card className="border-border/60 py-3 shadow-sm">
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                {mode === "create" ? "Cancel" : "Back"}
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isSubmitting}
                onClick={handleSave}
              >
                {isSubmitting ? (
                  <LoaderCircle className="animate-spin" />
                ) : null}
                {mode === "create" ? "Save Template" : "Save Changes"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-editor-name" className="sr-only">
                Template name
              </Label>
              <Input
                id="template-editor-name"
                value={draft.name}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    name: event.target.value,
                  }))
                }
                placeholder="Template name"
                className="h-10 border-none bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
              />

              <Label htmlFor="template-editor-description" className="sr-only">
                Template description
              </Label>
              <textarea
                id="template-editor-description"
                rows={2}
                value={draft.description}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    description: event.target.value,
                  }))
                }
                placeholder="Short description"
                className="block w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                {mode === "edit" && updatedAt ? (
                  <span>
                    Version {version} · Updated {formatUpdatedAt(updatedAt)}
                  </span>
                ) : null}
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {draft.exercises.length === 0 ? (
            <Card className="border-border/60 py-6 shadow-sm">
              <CardContent className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">
                  Add exercises to start building this template.
                </p>
                <ExercisePickerDialog
                  options={exerciseOptions}
                  onSelect={handleAddExercise}
                  trigger={
                    <Button type="button" size="sm" disabled={isSubmitting}>
                      <Plus />
                      Add exercise
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            draft.exercises.map((exercise, index) => (
              <Card
                key={exercise.id}
                className="border-border/60 py-3 shadow-sm"
              >
                <CardHeader className="gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">
                        {index + 1}. {exercise.exercise.name}
                      </CardTitle>
                      {exerciseMeta(exercise) ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {exerciseMeta(exercise)}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        disabled={index === 0 || isSubmitting}
                        aria-label={`Move ${exercise.exercise.name} up`}
                        onClick={() => handleMoveExercise(exercise.id, -1)}
                      >
                        <ChevronUp />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        disabled={
                          index === draft.exercises.length - 1 || isSubmitting
                        }
                        aria-label={`Move ${exercise.exercise.name} down`}
                        onClick={() => handleMoveExercise(exercise.id, 1)}
                      >
                        <ChevronDown />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={isSubmitting}
                        aria-label={`Remove ${exercise.exercise.name}`}
                        onClick={() => handleRemoveExercise(exercise.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor={`exercise-notes-${exercise.id}`}
                      className="sr-only"
                    >
                      {exercise.exercise.name} notes
                    </Label>
                    <textarea
                      id={`exercise-notes-${exercise.id}`}
                      rows={2}
                      value={exercise.notes ?? ""}
                      onChange={(event) =>
                        updateExercise(exercise.id, (currentExercise) => ({
                          ...currentExercise,
                          notes: event.target.value || null,
                        }))
                      }
                      placeholder="Short exercise note"
                      className="block w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {exercise.sets.length === 0 ? (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/8 px-3 py-2 text-sm text-destructive">
                      Add at least one set for this exercise.
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    {exercise.sets.map((set) => {
                      const validation = getSetValidation(set)

                      return (
                        <div
                          key={set.id}
                          className="rounded-xl border border-border/60 bg-muted/20 p-3"
                        >
                          <div className="grid grid-cols-[56px_1fr_1fr] gap-2 sm:grid-cols-[56px_1fr_1fr_1fr_auto]">
                            <div className="space-y-1">
                              <Label
                                htmlFor={`set-number-${exercise.id}-${set.id}`}
                                className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
                              >
                                Set
                              </Label>
                              <Input
                                id={`set-number-${exercise.id}-${set.id}`}
                                value={String(set.setNumber)}
                                disabled
                                readOnly
                                className="bg-background"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label
                                htmlFor={`min-reps-${exercise.id}-${set.id}`}
                                className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
                              >
                                Min
                              </Label>
                              <Input
                                id={`min-reps-${exercise.id}-${set.id}`}
                                type="number"
                                min="1"
                                step="1"
                                value={set.minReps ?? ""}
                                aria-invalid={validation.minRepsInvalid}
                                onChange={(event) =>
                                  updateSet(
                                    exercise.id,
                                    set.id,
                                    (currentSet) => ({
                                      ...currentSet,
                                      minReps: parseOptionalInteger(
                                        event.target.value
                                      ),
                                    })
                                  )
                                }
                              />
                            </div>

                            <div className="space-y-1">
                              <Label
                                htmlFor={`max-reps-${exercise.id}-${set.id}`}
                                className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
                              >
                                Max
                              </Label>
                              <Input
                                id={`max-reps-${exercise.id}-${set.id}`}
                                type="number"
                                min="1"
                                step="1"
                                value={set.maxReps ?? ""}
                                aria-invalid={validation.maxRepsInvalid}
                                onChange={(event) =>
                                  updateSet(
                                    exercise.id,
                                    set.id,
                                    (currentSet) => ({
                                      ...currentSet,
                                      maxReps: parseOptionalInteger(
                                        event.target.value
                                      ),
                                    })
                                  )
                                }
                              />
                            </div>

                            <div className="space-y-1">
                              <Label
                                htmlFor={`target-weight-${exercise.id}-${set.id}`}
                                className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
                              >
                                Weight
                              </Label>
                              <Input
                                id={`target-weight-${exercise.id}-${set.id}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={set.targetWeight ?? ""}
                                aria-invalid={validation.targetWeightInvalid}
                                onChange={(event) =>
                                  updateSet(
                                    exercise.id,
                                    set.id,
                                    (currentSet) => ({
                                      ...currentSet,
                                      targetWeight: parseOptionalWeight(
                                        event.target.value
                                      ),
                                    })
                                  )
                                }
                                placeholder="Blank"
                              />
                            </div>

                            <div className="col-span-3 flex items-end justify-end sm:col-span-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                disabled={
                                  isSubmitting || exercise.sets.length === 1
                                }
                                aria-label={`Remove set ${set.setNumber}`}
                                onClick={() =>
                                  handleRemoveSet(exercise.id, set.id)
                                }
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => handleAddSet(exercise.id)}
                  >
                    <Plus />
                    Add Set
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {draft.exercises.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <ExercisePickerDialog
              options={exerciseOptions}
              onSelect={handleAddExercise}
              trigger={
                <Button type="button" size="sm" disabled={isSubmitting}>
                  <Plus />
                  Add exercise
                </Button>
              }
            />
            <p className="text-xs text-muted-foreground">
              Fixed reps are supported by setting min and max to the same value.
            </p>
          </div>
        ) : null}
      </div>

      <DiscardTemplateDialog
        open={discardDialogOpen}
        onKeepEditing={() => setDiscardDialogOpen(false)}
        onDiscard={handleDiscard}
      />
    </>
  )
}
