"use client"

import * as React from "react"
import {
  Check,
  LoaderCircle,
  Search,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"

import { logFoodEntry, searchFoods } from "@/app/nutrition/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { MealType } from "@/lib/database/generated/enums"
import type { FoodSearchResult } from "@/lib/nutrition/types"

type LogFoodDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "SNACK", label: "Snacks" },
]

function formatNumber(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, {
        maximumFractionDigits: 1,
      })
}

function mealLabel(meal: MealType) {
  return MEAL_OPTIONS.find((option) => option.value === meal)?.label ?? "Meal"
}

function sameFood(a: FoodSearchResult | null, b: FoodSearchResult) {
  if (!a) return false

  if (a.source === "LOCAL" && b.source === "LOCAL") {
    return a.localFoodId === b.localFoodId
  }

  if (a.externalSource && b.externalSource && a.externalId && b.externalId) {
    return (
      a.externalSource === b.externalSource && a.externalId === b.externalId
    )
  }

  return (
    a.name === b.name &&
    (a.brand ?? null) === (b.brand ?? null) &&
    (a.barcode ?? null) === (b.barcode ?? null)
  )
}

function computeTotals(food: FoodSearchResult | null, quantityG: number) {
  if (!food || !Number.isFinite(quantityG) || quantityG <= 0) {
    return null
  }

  const multiplier = quantityG / 100

  return {
    calories: Math.round(food.caloriesPer100g * multiplier),
    protein: Number((food.proteinPer100g * multiplier).toFixed(1)),
    carbs: Number((food.carbsPer100g * multiplier).toFixed(1)),
    fat: Number((food.fatPer100g * multiplier).toFixed(1)),
  }
}

function FoodResultRow({
  food,
  selected,
  onSelect,
}: {
  food: FoodSearchResult
  selected: boolean
  onSelect: (food: FoodSearchResult) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(food)}
      className={cn(
        "flex w-full items-center gap-3 border-b border-white/6 px-5 py-3 text-left transition hover:bg-neutral-800/80",
        selected && "bg-blue-950/40"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-neutral-800",
          selected && "border-blue-500/60 bg-blue-950/50"
        )}
      >
        {food.imageUrl ? (
          <div
            aria-hidden="true"
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: `url("${food.imageUrl}")` }}
          />
        ) : (
          <UtensilsCrossed
            className={cn(
              "h-4 w-4 text-neutral-500",
              selected && "text-blue-300"
            )}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm text-white">{food.name}</p>
          {food.source === "LOCAL" ? (
            <span className="rounded-md bg-amber-950 px-1.5 py-0.5 text-[10px] text-amber-300">
              Logged
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[11px] text-neutral-500">
          {[food.brand, "per 100g"].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-1 flex gap-2 text-[11px] text-neutral-500">
          <span>
            P{" "}
            <span className="text-neutral-300">
              {formatNumber(food.proteinPer100g)}g
            </span>
          </span>
          <span>
            C{" "}
            <span className="text-neutral-300">
              {formatNumber(food.carbsPer100g)}g
            </span>
          </span>
          <span>
            F{" "}
            <span className="text-neutral-300">
              {formatNumber(food.fatPer100g)}g
            </span>
          </span>
        </div>
      </div>

      <div className="text-right">
        <div className="text-sm font-medium text-white">
          {Math.round(food.caloriesPer100g)}
          <span className="ml-1 text-[10.5px] font-normal text-neutral-500">
            kcal
          </span>
        </div>
      </div>

      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-blue-500/60 bg-blue-950 text-blue-300",
          selected
            ? "border-emerald-500/60 bg-emerald-950 text-emerald-300"
            : ""
        )}
      >
        {selected ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
      </div>
    </button>
  )
}

export function LogFoodDialog({ open, onOpenChange }: LogFoodDialogProps) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [meal, setMeal] = React.useState<MealType>("LUNCH")
  const [quantity, setQuantity] = React.useState("100")
  const [selectedFood, setSelectedFood] =
    React.useState<FoodSearchResult | null>(null)
  const [previouslyLogged, setPreviouslyLogged] = React.useState<
    FoodSearchResult[]
  >([])
  const [moreOptions, setMoreOptions] = React.useState<FoodSearchResult[]>([])
  const [searchError, setSearchError] = React.useState<string | null>(null)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [isSearching, setIsSearching] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const [wasOpen, setWasOpen] = React.useState(open)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setQuery("")
      setMeal("LUNCH")
      setQuantity("100")
      setSelectedFood(null)
      setPreviouslyLogged([])
      setMoreOptions([])
      setSearchError(null)
      setSubmitError(null)
      setIsSearching(false)
    }
  }

  React.useEffect(() => {
    if (!open) return

    const trimmed = query.trim()
    if (!trimmed) {
      return
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      setIsSearching(true)
      setSearchError(null)

      const result = await searchFoods(trimmed)
      if (cancelled) return

      setIsSearching(false)
      if (!result.ok) {
        setPreviouslyLogged([])
        setMoreOptions([])
        setSearchError(result.error)
        return
      }

      setPreviouslyLogged(result.results.previouslyLogged)
      setMoreOptions(result.results.moreOptions)
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, query])

  const quantityNumber = Number.parseFloat(quantity)
  const selectedTotals = computeTotals(selectedFood, quantityNumber)
  const hasResults = previouslyLogged.length > 0 || moreOptions.length > 0

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)

    if (!selectedFood) {
      setSubmitError("Select a food before saving.")
      return
    }

    if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
      setSubmitError("Enter a quantity greater than zero.")
      return
    }

    startTransition(async () => {
      const result = await logFoodEntry({
        meal,
        quantityG: quantityNumber,
        selectedFood,
      })

      if (!result.ok) {
        setSubmitError(result.error)
        return
      }

      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(92vh,860px)] w-[min(680px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 p-0 text-white ring-0"
      >
        <DialogHeader className="flex flex-row items-start justify-between space-y-0 border-b border-white/10 px-5 py-[18px]">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center justify-between gap-3">
              <DialogTitle className="text-sm font-medium text-white">
                Add food to {mealLabel(meal).toLowerCase()}
              </DialogTitle>
              <div className="rounded-md bg-orange-950 px-2.5 py-1 text-[11px] text-orange-300">
                {mealLabel(meal)}
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search foods"
                className="h-10 rounded-lg border-white/10 bg-neutral-800 pl-9 text-sm text-white placeholder:text-neutral-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-neutral-800 text-neutral-400 transition hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="min-h-[320px]">
              {query.trim() ? (
                <>
                  {previouslyLogged.length > 0 ? (
                    <div>
                      <p className="px-5 pt-3 text-[10.5px] uppercase tracking-[0.06em] text-neutral-500">
                        Previously logged
                      </p>
                      <div className="mt-1">
                        {previouslyLogged.map((food) => (
                          <FoodResultRow
                            key={
                              food.localFoodId ??
                              `${food.externalSource}:${food.externalId}`
                            }
                            food={food}
                            selected={sameFood(selectedFood, food)}
                            onSelect={setSelectedFood}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {moreOptions.length > 0 ? (
                    <div>
                      <p className="px-5 pt-3 text-[10.5px] uppercase tracking-[0.06em] text-neutral-500">
                        More options
                      </p>
                      <div className="mt-1">
                        {moreOptions.map((food) => (
                          <FoodResultRow
                            key={
                              food.localFoodId ??
                              `${food.externalSource}:${food.externalId}`
                            }
                            food={food}
                            selected={sameFood(selectedFood, food)}
                            onSelect={setSelectedFood}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {!isSearching && !hasResults && !searchError ? (
                    <div className="px-5 py-10 text-center text-sm text-neutral-500">
                      No foods matched that search.
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="px-5 py-10 text-center text-sm text-neutral-500">
                  Search by food name to see foods you have logged before and
                  additional matches from Open Food Facts.
                </div>
              )}

              {isSearching ? (
                <div className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-neutral-500">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Searching foods
                </div>
              ) : null}

              {searchError ? (
                <div className="px-5 py-6 text-sm text-rose-300">
                  {searchError}
                </div>
              ) : null}
            </div>

            <div className="border-t border-white/10 bg-neutral-800 px-5 py-4">
              <p className="mb-3 text-[11px] uppercase tracking-[0.05em] text-neutral-500">
                Selected food
              </p>

              {selectedFood ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {selectedFood.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-neutral-500">
                        {selectedFood.brand ?? "Generic"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                        inputMode="decimal"
                        className="h-9 w-20 rounded-lg border-white/10 bg-neutral-700 text-center text-sm text-white"
                      />
                      <span className="text-xs text-neutral-500">g</span>
                    </div>
                  </div>

                  {selectedTotals ? (
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
                      <span>
                        Protein{" "}
                        <span className="text-white">
                          {formatNumber(selectedTotals.protein)}g
                        </span>
                      </span>
                      <span>
                        Carbs{" "}
                        <span className="text-white">
                          {formatNumber(selectedTotals.carbs)}g
                        </span>
                      </span>
                      <span>
                        Fat{" "}
                        <span className="text-white">
                          {formatNumber(selectedTotals.fat)}g
                        </span>
                      </span>
                      <span className="ml-auto text-sm font-medium text-white">
                        {selectedTotals.calories} kcal
                      </span>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-neutral-500">
                  Select a food result to set quantity and meal.
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {MEAL_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMeal(option.value)}
                    className={cn(
                      "rounded-md border border-white/10 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-400 transition",
                      meal === option.value &&
                        "border-orange-500/60 bg-orange-950 text-orange-300"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-2 border-t border-white/10 px-5 py-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-white/10 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-[1.35]" disabled={isPending}>
              {isPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                <>Add to {mealLabel(meal).toLowerCase()}</>
              )}
            </Button>
          </div>

          {submitError ? (
            <div className="shrink-0 px-5 pb-4 text-sm text-rose-300">
              {submitError}
            </div>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  )
}
