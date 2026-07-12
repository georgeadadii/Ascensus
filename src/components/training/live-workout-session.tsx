"use client"

import * as React from "react"
import {
  Clock3,
  Dumbbell,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Trophy,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"

import type { ExercisePickerOption } from "@/app/db/exercises"
import type {
  TrainingSessionExerciseView,
  TrainingSessionSetView,
  TrainingSessionView,
} from "@/app/db/training-session"
import {
  compareWorkoutToTemplate,
  createTemplateFromWorkout,
  updateTemplateFromWorkout,
} from "@/app/training/actions"
import {
  addExercise,
  addSet,
  cancelWorkout,
  finishWorkout,
  removeExercise,
  removeSet,
  updateSet,
  updateWorkoutTitle,
} from "@/app/training/session/actions"
import { ExercisePickerDialog } from "@/components/training/exercise-picker-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type LiveWorkoutSessionProps = {
  session: TrainingSessionView
  exerciseOptions: ExercisePickerOption[]
}

type LocalSet = TrainingSessionSetView & {
  weightInput: string
  repsInput: string
}

type LocalExercise = Omit<TrainingSessionExerciseView, "sets"> & {
  sets: LocalSet[]
}

function toInputValue(value: number | null) {
  return value == null ? "" : String(value)
}

function toLocalSet(set: TrainingSessionSetView): LocalSet {
  return {
    ...set,
    weightInput: toInputValue(set.weight),
    repsInput: toInputValue(set.reps),
  }
}

function toLocalExercise(exercise: TrainingSessionExerciseView): LocalExercise {
  return {
    ...exercise,
    sets: exercise.sets.map(toLocalSet),
  }
}

function roundNumber(value: number) {
  return Math.round(value * 100) / 100
}

function formatMetricValue(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
}

function formatPrevious(weight: number | null, reps: number | null) {
  if (weight == null || reps == null) return "—"
  return `${formatMetricValue(weight)} × ${reps}`
}

function formatPlannedReps(
  plannedMinReps: number | null,
  plannedMaxReps: number | null
) {
  if (plannedMinReps == null || plannedMaxReps == null) return "—"
  if (plannedMinReps === plannedMaxReps) {
    return `${plannedMinReps} reps`
  }
  return `${plannedMinReps}-${plannedMaxReps} reps`
}

function formatClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":")
}

function formatStartedAt(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function parseWeightInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function parseRepsInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = Number(trimmed)
  return Number.isInteger(parsed) ? parsed : null
}

function buildTotals(exercises: LocalExercise[]) {
  let totalSets = 0
  let totalReps = 0
  let totalVolume = 0

  for (const exercise of exercises) {
    for (const set of exercise.sets) {
      if (!set.completedAt) continue

      totalSets += 1
      totalReps += set.reps ?? 0
      totalVolume += (set.weight ?? 0) * (set.reps ?? 0)
    }
  }

  return {
    totalSets,
    totalReps,
    totalVolume: roundNumber(totalVolume),
    exerciseCount: exercises.length,
  }
}

function findPreviousLabel(exercise: LocalExercise, setNumber: number) {
  const previousSet = exercise.previousSets.find(
    (candidate) => candidate.setNumber === setNumber
  )

  return previousSet
    ? formatPrevious(previousSet.weight, previousSet.reps)
    : "—"
}

function TotalsCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export function LiveWorkoutSession({
  session,
  exerciseOptions,
}: LiveWorkoutSessionProps) {
  const router = useRouter()
  const [title, setTitle] = React.useState(session.name)
  const [titleDraft, setTitleDraft] = React.useState(session.name)
  const [exercises, setExercises] = React.useState(() =>
    session.exercises.map(toLocalExercise)
  )
  const [elapsedSeconds, setElapsedSeconds] = React.useState(() =>
    Math.max(
      0,
      Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)
    )
  )
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [titlePending, setTitlePending] = React.useState(false)
  const [busyAction, setBusyAction] = React.useState<
    "finish" | "cancel" | null
  >(null)
  const [saveTemplateOpen, setSaveTemplateOpen] = React.useState(false)
  const [updateTemplateOpen, setUpdateTemplateOpen] = React.useState(false)
  const [templateName, setTemplateName] = React.useState(session.name)
  const timersRef = React.useRef(new Map<string, number>())
  const isEditable = session.isEditable

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      setElapsedSeconds(
        Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(session.startedAt).getTime()) / 1000
          )
        )
      )
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [session.startedAt])

  React.useEffect(() => {
    const timers = timersRef.current

    return () => {
      for (const timerId of timers.values()) {
        window.clearTimeout(timerId)
      }
      timers.clear()
    }
  }, [])

  const totals = buildTotals(exercises)

  async function saveTitle(nextTitle: string) {
    const trimmed = nextTitle.trim()
    if (!trimmed || trimmed === title) {
      setTitleDraft(title)
      return
    }

    setTitlePending(true)
    setErrorMessage(null)

    const result = await updateWorkoutTitle(session.id, trimmed)

    setTitlePending(false)

    if (!result.ok) {
      setErrorMessage(result.error)
      setTitleDraft(title)
      return
    }

    setTitle(result.data.name)
    setTitleDraft(result.data.name)
  }

  function updateLocalSet(setId: string, updater: (set: LocalSet) => LocalSet) {
    setExercises((currentExercises) =>
      currentExercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) =>
          set.id === setId ? updater(set) : set
        ),
      }))
    )
  }

  async function persistSetPatch(
    setId: string,
    patch: { weight?: number | null; reps?: number | null; completed?: boolean }
  ) {
    const result = await updateSet(session.id, setId, patch)
    if (!result.ok) {
      setErrorMessage(result.error)
      return false
    }

    setErrorMessage(null)
    updateLocalSet(setId, () => toLocalSet(result.data.set))
    return true
  }

  function scheduleSetPatch(
    setId: string,
    field: "weight" | "reps",
    value: number | null
  ) {
    const timerKey = `${setId}:${field}`
    const existingTimer = timersRef.current.get(timerKey)
    if (existingTimer != null) {
      window.clearTimeout(existingTimer)
    }

    timersRef.current.set(
      timerKey,
      window.setTimeout(async () => {
        timersRef.current.delete(timerKey)
        await persistSetPatch(setId, { [field]: value })
      }, 500)
    )
  }

  async function flushSetPatch(
    setId: string,
    field: "weight" | "reps",
    value: number | null
  ) {
    const timerKey = `${setId}:${field}`
    const existingTimer = timersRef.current.get(timerKey)
    if (existingTimer != null) {
      window.clearTimeout(existingTimer)
      timersRef.current.delete(timerKey)
    }

    await persistSetPatch(setId, { [field]: value })
  }

  async function handleAddExercise(option: ExercisePickerOption) {
    setErrorMessage(null)

    const result = await addExercise(session.id, option.id)
    if (!result.ok) {
      setErrorMessage(result.error)
      return false
    }

    setExercises((currentExercises) => [
      ...currentExercises,
      toLocalExercise(result.data.exercise),
    ])
    return true
  }

  async function handleAddSet(workoutExerciseId: string) {
    setErrorMessage(null)
    const result = await addSet(session.id, workoutExerciseId)

    if (!result.ok) {
      setErrorMessage(result.error)
      return
    }

    setExercises((currentExercises) =>
      currentExercises.map((exercise) =>
        exercise.id === workoutExerciseId
          ? {
              ...exercise,
              sets: [...exercise.sets, toLocalSet(result.data.set)],
            }
          : exercise
      )
    )
  }

  async function handleRemoveSet(workoutExerciseId: string, setId: string) {
    setErrorMessage(null)
    const result = await removeSet(session.id, setId)

    if (!result.ok) {
      setErrorMessage(result.error)
      return
    }

    setExercises((currentExercises) =>
      currentExercises.map((exercise) => {
        if (exercise.id !== workoutExerciseId) return exercise

        return {
          ...exercise,
          sets: exercise.sets
            .filter((set) => set.id !== setId)
            .map((set, index) => ({
              ...set,
              setNumber: index + 1,
            })),
        }
      })
    )
  }

  async function handleRemoveExercise(workoutExerciseId: string) {
    setErrorMessage(null)
    const result = await removeExercise(session.id, workoutExerciseId)

    if (!result.ok) {
      setErrorMessage(result.error)
      return
    }

    setExercises((currentExercises) =>
      currentExercises
        .filter((exercise) => exercise.id !== workoutExerciseId)
        .map((exercise, index) => ({
          ...exercise,
          order: index + 1,
        }))
    )
  }

  async function handleToggleComplete(set: LocalSet, checked: boolean) {
    setErrorMessage(null)
    const previousCompletedAt = set.completedAt

    updateLocalSet(set.id, (currentSet) => ({
      ...currentSet,
      completedAt: checked ? new Date().toISOString() : null,
    }))

    const saved = await persistSetPatch(set.id, { completed: checked })
    if (!saved) {
      updateLocalSet(set.id, (currentSet) => ({
        ...currentSet,
        completedAt: previousCompletedAt,
      }))
    }
  }

  async function handleCloseWorkout(kind: "finish" | "cancel") {
    if (
      kind === "cancel" &&
      !window.confirm("Cancel this workout? Your session will be closed.")
    ) {
      return
    }

    setBusyAction(kind)
    setErrorMessage(null)

    const result =
      kind === "cancel"
        ? await cancelWorkout(session.id)
        : await finishWorkout(session.id)

    setBusyAction(null)

    if (!result.ok) {
      setErrorMessage(result.error)
      return
    }

    router.push(result.data.redirectTo)
    router.refresh()
  }

  async function handleFinishWorkout() {
    if (!session.templateId) {
      setTemplateName(titleDraft.trim() || title)
      setSaveTemplateOpen(true)
      return
    }

    setBusyAction("finish")
    setErrorMessage(null)

    const comparison = await compareWorkoutToTemplate(session.id)
    setBusyAction(null)

    if (!comparison.ok) {
      setErrorMessage(comparison.error)
      return
    }

    if (!comparison.data.hasTemplate || !comparison.data.modified) {
      await handleCloseWorkout("finish")
      return
    }

    setUpdateTemplateOpen(true)
  }

  async function finishWithoutTemplateChanges() {
    setSaveTemplateOpen(false)
    setUpdateTemplateOpen(false)
    await handleCloseWorkout("finish")
  }

  async function handleSaveTemplateAfterWorkout() {
    setBusyAction("finish")
    setErrorMessage(null)

    const result = await createTemplateFromWorkout({
      sessionId: session.id,
      name: templateName,
    })

    if (!result.ok) {
      setBusyAction(null)
      setErrorMessage(result.error)
      return
    }

    setSaveTemplateOpen(false)
    await handleCloseWorkout("finish")
  }

  async function handleUpdateTemplateAfterWorkout() {
    setBusyAction("finish")
    setErrorMessage(null)

    const result = await updateTemplateFromWorkout(session.id)

    if (!result.ok) {
      setBusyAction(null)
      setErrorMessage(result.error)
      return
    }

    setUpdateTemplateOpen(false)
    await handleCloseWorkout("finish")
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border/60 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Live workout
            </p>

            <Input
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={() => void saveTitle(titleDraft)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur()
                }
                if (event.key === "Escape") {
                  setTitleDraft(title)
                  event.currentTarget.blur()
                }
              }}
              disabled={!isEditable || titlePending}
              aria-label="Workout title"
              className="mt-2 h-auto border-0 bg-transparent px-0 text-2xl font-semibold shadow-none focus-visible:ring-0 sm:text-3xl"
            />

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-4" />
                Started {formatStartedAt(session.startedAt)}
              </span>
              <span className="rounded-full border border-border/60 px-2.5 py-1 font-medium text-foreground">
                {formatClock(elapsedSeconds)}
              </span>
              {!isEditable ? (
                <span className="rounded-full border border-border/60 px-2.5 py-1 text-xs uppercase tracking-[0.14em]">
                  {session.status.replace("_", " ")}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ExercisePickerDialog
              options={exerciseOptions}
              onSelect={handleAddExercise}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isEditable || busyAction != null}
                >
                  <Plus />
                  Add exercise
                </Button>
              }
            />

            <Button
              variant="outline"
              size="sm"
              disabled={!isEditable || busyAction != null}
              onClick={() => void handleCloseWorkout("cancel")}
            >
              <X />
              Cancel workout
            </Button>

            <Button
              size="sm"
              disabled={!isEditable || busyAction != null}
              onClick={() => void handleFinishWorkout()}
            >
              Finish workout
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <TotalsCard label="Exercises" value={totals.exerciseCount} />
          <TotalsCard label="Sets" value={totals.totalSets} />
          <TotalsCard label="Reps" value={totals.totalReps} />
          <TotalsCard
            label="Volume"
            value={formatMetricValue(totals.totalVolume)}
          />
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}
      </div>

      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save this workout as a template?</DialogTitle>
            <DialogDescription>
              Copy this workout&apos;s exercise and set structure into a
              reusable template. Reps will be saved as fixed planned ranges and
              weight will be saved as the target weight.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label
              htmlFor="finish-template-name"
              className="text-sm font-medium"
            >
              Template name
            </label>
            <Input
              id="finish-template-name"
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder="Template name"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busyAction != null}
              onClick={() => void finishWithoutTemplateChanges()}
            >
              Skip
            </Button>
            <Button
              type="button"
              disabled={busyAction != null}
              onClick={() => void handleSaveTemplateAfterWorkout()}
            >
              {busyAction === "finish" ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Plus />
              )}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={updateTemplateOpen} onOpenChange={setUpdateTemplateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              You modified this workout. Would you like to update the template?
            </DialogTitle>
            <DialogDescription>
              The final exercise and set structure will replace the template,
              while historical workouts remain unchanged.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busyAction != null}
              onClick={() => void finishWithoutTemplateChanges()}
            >
              Keep Existing Template
            </Button>
            <Button
              type="button"
              disabled={busyAction != null}
              onClick={() => void handleUpdateTemplateAfterWorkout()}
            >
              {busyAction === "finish" ? (
                <LoaderCircle className="animate-spin" />
              ) : null}
              Update Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-1 flex-col p-4 sm:p-[18px]">
        {exercises.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex w-full max-w-lg flex-col items-center rounded-[28px] border border-dashed border-border/70 bg-card/80 px-8 py-14 text-center shadow-sm">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Dumbbell className="size-7" />
              </div>
              <h2 className="mt-5 text-xl font-semibold">No exercises added</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Search and add your first exercise.
              </p>
              <ExercisePickerDialog
                options={exerciseOptions}
                onSelect={handleAddExercise}
                trigger={
                  <Button
                    size="lg"
                    className="mt-6 min-w-44"
                    disabled={!isEditable}
                  >
                    <Plus />
                    Add Exercise
                  </Button>
                }
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {exercises.map((exercise) => {
              const completedSets = exercise.sets.filter(
                (set) => set.completedAt
              ).length
              const exerciseVolume = roundNumber(
                exercise.sets.reduce((sum, set) => {
                  if (!set.completedAt) return sum
                  return sum + (set.weight ?? 0) * (set.reps ?? 0)
                }, 0)
              )

              return (
                <Card
                  key={exercise.id}
                  className="border-border/60 py-0 shadow-sm"
                >
                  <CardHeader className="border-b border-border/60 px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">
                          {exercise.name}
                        </CardTitle>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {exercise.primaryMuscle ? (
                            <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1">
                              {exercise.primaryMuscle}
                            </span>
                          ) : null}
                          {exercise.equipment ? (
                            <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1">
                              {exercise.equipment}
                            </span>
                          ) : null}
                          {exercise.difficulty ? (
                            <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1">
                              {exercise.difficulty}
                            </span>
                          ) : null}
                          {exercise.hasPersonalRecord ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">
                              <Trophy className="size-3.5" />
                              PR
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right text-xs">
                          <p className="font-medium text-foreground">
                            {completedSets} / {exercise.sets.length} complete
                          </p>
                          <p className="text-muted-foreground">
                            {formatMetricValue(exerciseVolume)} volume
                          </p>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={!isEditable}
                              onSelect={() =>
                                void handleRemoveExercise(exercise.id)
                              }
                              className="text-destructive focus:text-destructive"
                            >
                              Delete Exercise
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="px-0">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead>
                          <tr className="border-b border-border/60 text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                            <th className="px-4 py-3 font-medium">Set</th>
                            <th className="px-4 py-3 font-medium">Previous</th>
                            <th className="px-4 py-3 font-medium">Planned</th>
                            <th className="px-4 py-3 font-medium">Weight</th>
                            <th className="px-4 py-3 font-medium">
                              Actual reps
                            </th>
                            <th className="px-4 py-3 font-medium">Complete</th>
                            <th className="px-4 py-3 font-medium"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {exercise.sets.map((set) => (
                            <tr
                              key={set.id}
                              className={cn(
                                "border-b border-border/50 last:border-b-0",
                                set.completedAt && "bg-emerald-500/[0.04]"
                              )}
                            >
                              <td className="px-4 py-3 font-medium">
                                {set.setNumber}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {findPreviousLabel(exercise, set.setNumber)}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {formatPlannedReps(
                                  set.plannedMinReps,
                                  set.plannedMaxReps
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={set.weightInput}
                                  disabled={!isEditable}
                                  onChange={(event) => {
                                    const nextInput = event.target.value
                                    updateLocalSet(set.id, (currentSet) => ({
                                      ...currentSet,
                                      weightInput: nextInput,
                                      weight: parseWeightInput(nextInput),
                                    }))
                                    scheduleSetPatch(
                                      set.id,
                                      "weight",
                                      parseWeightInput(nextInput)
                                    )
                                  }}
                                  onBlur={() =>
                                    void flushSetPatch(
                                      set.id,
                                      "weight",
                                      parseWeightInput(set.weightInput)
                                    )
                                  }
                                  className="h-9 min-w-24"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  step="1"
                                  placeholder="Actual reps"
                                  value={set.repsInput}
                                  disabled={!isEditable}
                                  onChange={(event) => {
                                    const nextInput = event.target.value
                                    updateLocalSet(set.id, (currentSet) => ({
                                      ...currentSet,
                                      repsInput: nextInput,
                                      reps: parseRepsInput(nextInput),
                                    }))
                                    scheduleSetPatch(
                                      set.id,
                                      "reps",
                                      parseRepsInput(nextInput)
                                    )
                                  }}
                                  onBlur={() =>
                                    void flushSetPatch(
                                      set.id,
                                      "reps",
                                      parseRepsInput(set.repsInput)
                                    )
                                  }
                                  className="h-9 min-w-20"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Checkbox
                                  checked={Boolean(set.completedAt)}
                                  disabled={!isEditable}
                                  onCheckedChange={(checked) =>
                                    void handleToggleComplete(
                                      set,
                                      checked === true
                                    )
                                  }
                                />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={!isEditable}
                                  aria-label={`Delete set ${set.setNumber}`}
                                  onClick={() =>
                                    void handleRemoveSet(exercise.id, set.id)
                                  }
                                >
                                  <X />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>

                  <div className="border-t border-border/60 bg-muted/20 px-4 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!isEditable}
                      onClick={() => void handleAddSet(exercise.id)}
                    >
                      <Plus />
                      Add Set
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
