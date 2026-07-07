"use client"

import * as React from "react"
import { CalendarDays, Check, X } from "lucide-react"
import { useRouter } from "next/navigation"

import { saveNutritionGoals } from "@/app/nutrition/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { NutritionGoalValues } from "@/types/nutrition"

type EditGoalsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  goals: NutritionGoalValues
  onSaved: (goals: NutritionGoalValues) => void
}

type GoalField = {
  key: keyof NutritionGoalValues
  label: string
  unit: string
  colorClassName: string
  optionalText?: string
}

const MACRO_FIELDS: GoalField[] = [
  {
    key: "protein",
    label: "Protein",
    unit: "g",
    colorClassName: "bg-emerald-500",
  },
  {
    key: "carbs",
    label: "Carbs",
    unit: "g",
    colorClassName: "bg-orange-500",
  },
  {
    key: "fat",
    label: "Fat",
    unit: "g",
    colorClassName: "bg-fuchsia-500",
  },
  {
    key: "fibre",
    label: "Fibre",
    unit: "g",
    colorClassName: "bg-teal-500",
    optionalText: "target",
  },
]

const SECONDARY_FIELDS: GoalField[] = [
  { key: "water", label: "Water", unit: "L", colorClassName: "bg-cyan-500" },
  { key: "sodium", label: "Sodium", unit: "g", colorClassName: "bg-slate-500" },
  { key: "sugar", label: "Sugar", unit: "g", colorClassName: "bg-amber-500" },
  {
    key: "cholesterol",
    label: "Cholesterol",
    unit: "mg",
    colorClassName: "bg-rose-500",
  },
]

const FIELD_ORDER: (keyof NutritionGoalValues)[] = [
  "calories",
  "protein",
  "carbs",
  "fat",
  "fibre",
  "water",
  "sodium",
  "sugar",
  "cholesterol",
]

const EMPTY_NUTRITION_GOALS: NutritionGoalValues = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fibre: 0,
  water: 0,
  sodium: 0,
  sugar: 0,
  cholesterol: 0,
}

function toFormState(goals: NutritionGoalValues) {
  return {
    calories: String(goals.calories),
    protein: String(goals.protein),
    carbs: String(goals.carbs),
    fat: String(goals.fat),
    fibre: String(goals.fibre),
    water: String(goals.water),
    sodium: String(goals.sodium),
    sugar: String(goals.sugar),
    cholesterol: String(goals.cholesterol),
  }
}

function parseGoals(
  values: Record<keyof NutritionGoalValues, string>
): NutritionGoalValues | null {
  const parsed = {} as NutritionGoalValues

  for (const field of FIELD_ORDER) {
    const raw = values[field].trim()
    if (raw === "") return null
    const value = Number.parseFloat(raw)
    if (!Number.isFinite(value) || value < 0) {
      return null
    }
    parsed[field] = value
  }

  return parsed
}

function macroCalories(values: NutritionGoalValues) {
  return values.protein * 4 + values.carbs * 4 + values.fat * 9
}

function macroPercentage(
  values: NutritionGoalValues,
  key: "protein" | "carbs" | "fat"
) {
  const total = macroCalories(values)
  if (total <= 0) return 0

  const calories = key === "fat" ? values[key] * 9 : values[key] * 4

  return Math.round((calories / total) * 100)
}

export function EditGoalsDialog({
  open,
  onOpenChange,
  goals,
  onSaved,
}: EditGoalsDialogProps) {
  const router = useRouter()
  const [values, setValues] = React.useState(toFormState(goals))
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  const [wasOpen, setWasOpen] = React.useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setValues(toFormState(goals))
      setError(null)
    }
  }

  const parsedValues = parseGoals(values)
  const totalCalories = parsedValues?.calories ?? 0
  const macroTotal = parsedValues ? macroCalories(parsedValues) : 0

  function updateField(field: keyof NutritionGoalValues, value: string) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsed = parseGoals(values)
    if (!parsed) {
      setError("Enter a valid value for every goal field.")
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await saveNutritionGoals(parsed)
      if (!result.ok) {
        setError(result.error)
        return
      }

      onSaved(result.goals)
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[460px] gap-0 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 p-0 text-white ring-0"
      >
        <DialogHeader className="flex flex-row items-start justify-between space-y-0 border-b border-white/10 px-6 py-[18px]">
          <div>
            <DialogTitle className="text-sm font-medium text-white">
              Nutrition goals
            </DialogTitle>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
              <CalendarDays className="h-3.5 w-3.5" />
              Set daily calorie and macro targets.
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-neutral-800 text-neutral-400 transition hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              <p className="text-[10.5px] uppercase tracking-[0.06em] text-neutral-500">
                Daily calories
              </p>
              <div className="rounded-xl border border-white/10 bg-neutral-800 p-3">
                <label className="mb-2 block text-xs text-neutral-400">
                  Calorie target
                </label>
                <div className="relative">
                  <Input
                    value={values.calories}
                    onChange={(event) =>
                      updateField("calories", event.target.value)
                    }
                    inputMode="decimal"
                    className="h-11 rounded-lg border-white/10 bg-neutral-900 pr-14 text-sm font-medium text-white"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-neutral-500">
                    kcal
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10.5px] uppercase tracking-[0.06em] text-neutral-500">
                Macro targets
              </p>
              {MACRO_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center gap-3 rounded-xl bg-neutral-800 px-3 py-2.5"
                >
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      field.colorClassName
                    )}
                  />
                  <label className="w-14 text-[12.5px] text-neutral-300">
                    {field.label}
                  </label>
                  <div className="relative flex-1">
                    <Input
                      value={values[field.key]}
                      onChange={(event) =>
                        updateField(field.key, event.target.value)
                      }
                      inputMode="decimal"
                      className="h-9 rounded-lg border-white/10 bg-neutral-900 pr-10 text-sm text-white"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11.5px] text-neutral-500">
                      {field.unit}
                    </span>
                  </div>
                  <span className="w-10 text-right text-[11.5px] text-neutral-500">
                    {field.key === "fibre"
                      ? field.optionalText
                      : `${macroPercentage(
                          parsedValues ?? EMPTY_NUTRITION_GOALS,
                          field.key as "protein" | "carbs" | "fat"
                        )}%`}
                  </span>
                  <span className="w-16 text-right text-[11.5px] text-neutral-500">
                    {field.key === "fibre"
                      ? "—"
                      : `${Math.round(
                          field.key === "fat"
                            ? (parsedValues?.[field.key] ?? 0) * 9
                            : (parsedValues?.[field.key] ?? 0) * 4
                        )} kcal`}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-white/10 pt-5">
              <p className="text-[10.5px] uppercase tracking-[0.06em] text-neutral-500">
                Secondary targets
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {SECONDARY_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-widest text-neutral-500">
                      {field.label}
                    </label>
                    <div className="relative">
                      <Input
                        value={values[field.key]}
                        onChange={(event) =>
                          updateField(field.key, event.target.value)
                        }
                        inputMode="decimal"
                        className="h-10 rounded-lg border-white/10 bg-neutral-800 pr-12 text-sm font-medium text-white"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-neutral-500">
                        {field.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-neutral-800 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Total calories</span>
                <div className="text-right">
                  <div className="text-base font-medium text-white">
                    {totalCalories.toLocaleString()} kcal
                  </div>
                  <div className="text-[11px] text-emerald-400">
                    {macroTotal.toLocaleString()} kcal from macros
                  </div>
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          <DialogFooter className="mx-0 mb-0 flex flex-row gap-2 rounded-none border-t border-white/10 bg-transparent px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-white/10 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-[2] bg-blue-600 text-white hover:bg-blue-500"
              disabled={isPending}
            >
              <Check className="h-4 w-4" />
              {isPending ? "Saving…" : "Save goals"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
