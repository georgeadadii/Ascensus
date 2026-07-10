"use client"

import * as React from "react"
import { Dumbbell, LoaderCircle, Plus, Search } from "lucide-react"

import type { ExercisePickerOption } from "@/app/db/exercises"
import { createCustomExercise } from "@/app/training/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type ExercisePickerDialogProps = {
  options: ExercisePickerOption[]
  trigger?: React.ReactNode
  triggerLabel?: string
  onSelect?: (
    option: ExercisePickerOption
  ) => void | boolean | Promise<void | boolean>
}

type CustomExerciseFormState = {
  name: string
  primaryMuscle: string
  equipment: string
  difficulty: string
  instructions: string
}

type CustomExerciseFieldErrors = {
  name?: string
  primaryMuscle?: string
  equipment?: string
  difficulty?: string
  instructions?: string
}

function isUsedExercise(
  option: ExercisePickerOption
): option is Extract<ExercisePickerOption, { lastUsedAt: string }> {
  return "lastUsedAt" in option
}

function matchesQuery(option: ExercisePickerOption, query: string) {
  if (!query) return true

  const normalizedQuery = query.toLowerCase()
  return [option.name, option.primaryMuscle, option.equipment].some((value) =>
    value?.toLowerCase().includes(normalizedQuery)
  )
}

function sortOptions(options: ExercisePickerOption[]) {
  return [...options].sort((left, right) => {
    const leftUsed = isUsedExercise(left)
    const rightUsed = isUsedExercise(right)

    if (leftUsed && rightUsed) {
      if (left.lastUsedAt !== right.lastUsedAt) {
        return right.lastUsedAt.localeCompare(left.lastUsedAt)
      }
      if (left.timesUsed !== right.timesUsed) {
        return right.timesUsed - left.timesUsed
      }
      return left.name.localeCompare(right.name)
    }

    if (leftUsed) return -1
    if (rightUsed) return 1

    return left.name.localeCompare(right.name)
  })
}

function buildInitialCustomExerciseForm(
  query: string
): CustomExerciseFormState {
  return {
    name: query,
    primaryMuscle: "",
    equipment: "",
    difficulty: "",
    instructions: "",
  }
}

function formatWeight(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })
}

function ExerciseRow({
  option,
  onSelect,
  isPending,
}: {
  option: ExercisePickerOption
  onSelect?: (
    option: ExercisePickerOption
  ) => void | boolean | Promise<void | boolean>
  isPending: boolean
}) {
  const used = isUsedExercise(option)

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={async () => {
        await onSelect?.(option)
      }}
      className={cn(
        "flex w-full items-start justify-between gap-3 rounded-xl border border-border/60 bg-background px-4 py-3 text-left transition hover:border-border hover:bg-muted/40 disabled:cursor-wait disabled:opacity-70"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{option.name}</p>
          {used && option.bestWeight != null ? (
            <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              PR {formatWeight(option.bestWeight)}
            </span>
          ) : null}
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          {[
            option.primaryMuscle ?? "No primary muscle",
            option.equipment ?? "No equipment",
            option.difficulty ?? "No difficulty",
          ].join(" · ")}
        </p>
      </div>

      {used ? (
        <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          {option.timesUsed} use{option.timesUsed === 1 ? "" : "s"}
        </span>
      ) : null}
    </button>
  )
}

export function ExercisePickerDialog({
  options,
  trigger,
  triggerLabel = "Exercises",
  onSelect,
}: ExercisePickerDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [createdOptions, setCreatedOptions] = React.useState<
    ExercisePickerOption[]
  >([])
  const [pendingExerciseId, setPendingExerciseId] = React.useState<
    string | null
  >(null)
  const [customExerciseForm, setCustomExerciseForm] =
    React.useState<CustomExerciseFormState>(() =>
      buildInitialCustomExerciseForm("")
    )
  const [customExerciseError, setCustomExerciseError] = React.useState<
    string | null
  >(null)
  const [customExerciseFieldErrors, setCustomExerciseFieldErrors] =
    React.useState<CustomExerciseFieldErrors>({})
  const [isCreatingCustomExercise, startCreateTransition] =
    React.useTransition()
  const deferredQuery = React.useDeferredValue(query.trim())

  const mergedOptions = React.useMemo(
    () =>
      sortOptions(
        [...options, ...createdOptions].filter(
          (option, index, allOptions) =>
            allOptions.findIndex((candidate) => candidate.id === option.id) ===
            index
        )
      ),
    [createdOptions, options]
  )

  const filteredOptions = mergedOptions.filter((option) =>
    matchesQuery(option, deferredQuery)
  )

  function resetCustomExerciseForm(nextName = query.trim()) {
    setCustomExerciseForm(buildInitialCustomExerciseForm(nextName))
    setCustomExerciseError(null)
    setCustomExerciseFieldErrors({})
  }

  async function handleExerciseSelect(option: ExercisePickerOption) {
    if (!onSelect) return

    setPendingExerciseId(option.id)
    try {
      const result = await onSelect(option)
      if (result !== false) {
        setOpen(false)
      }
    } finally {
      setPendingExerciseId(null)
    }
  }

  function handleCreateDialogChange(nextOpen: boolean) {
    setCreateOpen(nextOpen)
    if (nextOpen) {
      resetCustomExerciseForm()
      return
    }

    setCustomExerciseError(null)
    setCustomExerciseFieldErrors({})
  }

  function updateCustomExerciseForm<
    Field extends keyof CustomExerciseFormState,
  >(field: Field, value: CustomExerciseFormState[Field]) {
    setCustomExerciseForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
    setCustomExerciseFieldErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }))
  }

  function handleCustomExerciseSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCustomExerciseError(null)
    setCustomExerciseFieldErrors({})

    startCreateTransition(async () => {
      const result = await createCustomExercise(customExerciseForm)

      if (!result.ok) {
        setCustomExerciseError(result.error)
        setCustomExerciseFieldErrors(result.fieldErrors ?? {})
        return
      }

      setCreatedOptions((currentOptions) =>
        sortOptions(
          currentOptions.some((option) => option.id === result.exercise.id)
            ? currentOptions
            : [...currentOptions, result.exercise]
        )
      )
      setQuery(result.exercise.name)
      handleCreateDialogChange(false)

      if (onSelect) {
        await handleExerciseSelect(result.exercise)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setQuery("")
          handleCreateDialogChange(false)
        }
      }}
    >
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Dumbbell />
            {triggerLabel}
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border/60 px-5 py-4">
          <DialogTitle>Exercises</DialogTitle>
          <DialogDescription>
            Browse your available exercises and search by name, muscle, or
            equipment.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-border/60 px-5 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search exercises"
              className="pl-9"
            />
          </div>
        </div>

        {filteredOptions.length > 0 ? (
          <div className="max-h-[26rem] space-y-2 overflow-y-auto p-4">
            {filteredOptions.map((option) => (
              <ExerciseRow
                key={option.id}
                option={option}
                isPending={pendingExerciseId === option.id}
                onSelect={
                  onSelect
                    ? async (selectedOption) => {
                        setPendingExerciseId(selectedOption.id)
                        try {
                          const result = await onSelect(selectedOption)
                          if (result !== false) {
                            setOpen(false)
                          }
                        } finally {
                          setPendingExerciseId(null)
                        }
                      }
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
            <div className="space-y-1">
              <p className="text-sm font-medium">No exercises found</p>
              <p className="text-sm text-muted-foreground">
                Try a different search or create your own private exercise.
              </p>
            </div>

            <Dialog open={createOpen} onOpenChange={handleCreateDialogChange}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline">
                  <Plus />
                  Create custom exercise
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create custom exercise</DialogTitle>
                  <DialogDescription>
                    This exercise will only be visible in your own library.
                  </DialogDescription>
                </DialogHeader>

                <form
                  onSubmit={handleCustomExerciseSubmit}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="custom-exercise-name">Name</Label>
                    <Input
                      id="custom-exercise-name"
                      value={customExerciseForm.name}
                      onChange={(event) =>
                        updateCustomExerciseForm("name", event.target.value)
                      }
                      placeholder="e.g. Incline Smith Press"
                      autoFocus
                      required
                      aria-invalid={Boolean(customExerciseFieldErrors.name)}
                    />
                    {customExerciseFieldErrors.name ? (
                      <p className="text-sm text-destructive">
                        {customExerciseFieldErrors.name}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="custom-exercise-primary-muscle">
                        Primary muscle
                      </Label>
                      <Input
                        id="custom-exercise-primary-muscle"
                        value={customExerciseForm.primaryMuscle}
                        onChange={(event) =>
                          updateCustomExerciseForm(
                            "primaryMuscle",
                            event.target.value
                          )
                        }
                        placeholder="Optional"
                        aria-invalid={Boolean(
                          customExerciseFieldErrors.primaryMuscle
                        )}
                      />
                      {customExerciseFieldErrors.primaryMuscle ? (
                        <p className="text-sm text-destructive">
                          {customExerciseFieldErrors.primaryMuscle}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="custom-exercise-equipment">
                        Equipment
                      </Label>
                      <Input
                        id="custom-exercise-equipment"
                        value={customExerciseForm.equipment}
                        onChange={(event) =>
                          updateCustomExerciseForm(
                            "equipment",
                            event.target.value
                          )
                        }
                        placeholder="Optional"
                        aria-invalid={Boolean(
                          customExerciseFieldErrors.equipment
                        )}
                      />
                      {customExerciseFieldErrors.equipment ? (
                        <p className="text-sm text-destructive">
                          {customExerciseFieldErrors.equipment}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-exercise-difficulty">
                      Difficulty
                    </Label>
                    <Input
                      id="custom-exercise-difficulty"
                      value={customExerciseForm.difficulty}
                      onChange={(event) =>
                        updateCustomExerciseForm(
                          "difficulty",
                          event.target.value
                        )
                      }
                      placeholder="Optional"
                      aria-invalid={Boolean(
                        customExerciseFieldErrors.difficulty
                      )}
                    />
                    {customExerciseFieldErrors.difficulty ? (
                      <p className="text-sm text-destructive">
                        {customExerciseFieldErrors.difficulty}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-exercise-instructions">
                      Instructions
                    </Label>
                    <textarea
                      id="custom-exercise-instructions"
                      value={customExerciseForm.instructions}
                      onChange={(event) =>
                        updateCustomExerciseForm(
                          "instructions",
                          event.target.value
                        )
                      }
                      placeholder="Optional"
                      rows={5}
                      aria-invalid={Boolean(
                        customExerciseFieldErrors.instructions
                      )}
                      className={cn(
                        "flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                        customExerciseFieldErrors.instructions
                          ? "border-destructive"
                          : null
                      )}
                    />
                    {customExerciseFieldErrors.instructions ? (
                      <p className="text-sm text-destructive">
                        {customExerciseFieldErrors.instructions}
                      </p>
                    ) : null}
                  </div>

                  {customExerciseError ? (
                    <p className="text-sm text-destructive">
                      {customExerciseError}
                    </p>
                  ) : null}

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={isCreatingCustomExercise}>
                      {isCreatingCustomExercise ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Plus />
                      )}
                      Create exercise
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
