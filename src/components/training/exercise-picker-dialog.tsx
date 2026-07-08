"use client"

import * as React from "react"
import { Dumbbell, Search } from "lucide-react"

import type { ExercisePickerOption } from "@/app/db/exercises"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ExercisePickerDialogProps = {
  options: ExercisePickerOption[]
  trigger?: React.ReactNode
  triggerLabel?: string
  onSelect?: (
    option: ExercisePickerOption
  ) => void | boolean | Promise<void | boolean>
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
  const [query, setQuery] = React.useState("")
  const [pendingExerciseId, setPendingExerciseId] = React.useState<
    string | null
  >(null)
  const deferredQuery = React.useDeferredValue(query.trim())

  const filteredOptions = options.filter((option) =>
    matchesQuery(option, deferredQuery)
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setQuery("")
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
                Try a different search or add a custom exercise later.
              </p>
            </div>

            <Button type="button" variant="outline" disabled>
              Create custom exercise
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
