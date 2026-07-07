"use client"

import * as React from "react"
import { Moon, Plus, Sunrise, Sun, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { deleteFoodEntry } from "@/app/nutrition/actions"
import { LogFoodDialog } from "@/components/nutrition/log-food-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { mealLabel } from "@/lib/nutrition/meals"
import { cn } from "@/lib/utils"
import type { MealType } from "@/lib/database/generated/enums"
import type {
  NutritionMealEntry,
  NutritionMealSection,
} from "@/types/nutrition"

type DailyMealLogProps = {
  meals: NutritionMealSection[]
  selectedDateKey: string
}

function formatNumber(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, {
        maximumFractionDigits: 1,
      })
}

const MEAL_META: Record<
  MealType,
  {
    icon: React.ComponentType<{ className?: string }>
    iconClassName: string
  }
> = {
  BREAKFAST: {
    icon: Sunrise,
    iconClassName: "text-amber-500",
  },
  LUNCH: {
    icon: Sun,
    iconClassName: "text-orange-500",
  },
  DINNER: {
    icon: Moon,
    iconClassName: "text-indigo-400",
  },
  SNACK: {
    icon: Plus,
    iconClassName: "text-emerald-500",
  },
}

function servingLabel(quantityG: number) {
  return `${formatNumber(quantityG)}g`
}

function MealFoodRow({
  entry,
  isDeleting,
  onDelete,
}: {
  entry: NutritionMealEntry
  isDeleting: boolean
  onDelete: (entryId: string) => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground">
          {entry.foodName}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {servingLabel(entry.quantityG)}
        </p>
      </div>

      <div className="hidden items-center gap-3 text-[11px] text-muted-foreground sm:flex">
        <span>
          P{" "}
          <span className="text-foreground">
            {formatNumber(entry.protein)}g
          </span>
        </span>
        <span>
          C{" "}
          <span className="text-foreground">{formatNumber(entry.carbs)}g</span>
        </span>
        <span>
          F <span className="text-foreground">{formatNumber(entry.fat)}g</span>
        </span>
      </div>

      <div className="text-right">
        <div className="text-[13px] font-semibold text-foreground">
          {formatNumber(entry.calories)}
        </div>
        <div className="text-[10.5px] text-muted-foreground">kcal</div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => onDelete(entry.id)}
        disabled={isDeleting}
        aria-label={`Delete ${entry.foodName}`}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}

function MealSection({
  meal,
  entries,
  totals,
  deletingEntryId,
  onAddFood,
  onDeleteFood,
}: NutritionMealSection & {
  deletingEntryId: string | null
  onAddFood: (meal: MealType) => void
  onDeleteFood: (entryId: string) => void
}) {
  const { icon: MealIcon, iconClassName } = MEAL_META[meal]

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-lg border border-border/70 bg-muted/50",
              iconClassName
            )}
          >
            <MealIcon className="size-4" />
          </span>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">
              {mealLabel(meal)}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {formatNumber(totals.calories)} kcal
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary"
          onClick={() => onAddFood(meal)}
        >
          <Plus className="size-3.5" />
          Add food
        </Button>
      </div>

      {entries.length > 0 ? (
        <div className="space-y-1.5">
          {entries.map((entry) => (
            <MealFoodRow
              key={entry.id}
              entry={entry}
              isDeleting={deletingEntryId === entry.id}
              onDelete={onDeleteFood}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-4 text-[12px] text-muted-foreground">
          No foods logged yet.
        </div>
      )}
    </section>
  )
}

export function DailyMealLog({ meals, selectedDateKey }: DailyMealLogProps) {
  const router = useRouter()
  const [logFoodOpen, setLogFoodOpen] = React.useState(false)
  const [selectedMeal, setSelectedMeal] = React.useState<MealType>("LUNCH")
  const [deletingEntryId, setDeletingEntryId] = React.useState<string | null>(
    null
  )

  const handleAddFood = React.useCallback((meal: MealType) => {
    setSelectedMeal(meal)
    setLogFoodOpen(true)
  }, [])

  const handleDeleteFood = React.useCallback(
    (entryId: string) => {
      React.startTransition(async () => {
        setDeletingEntryId(entryId)

        const result = await deleteFoodEntry(entryId)
        if (result.ok) {
          router.refresh()
        }

        setDeletingEntryId(null)
      })
    },
    [router]
  )

  return (
    <>
      <Card className="rounded-2xl ring-1 ring-border/60">
        <CardContent className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          {meals.map((meal) => (
            <MealSection
              key={meal.meal}
              {...meal}
              deletingEntryId={deletingEntryId}
              onAddFood={handleAddFood}
              onDeleteFood={handleDeleteFood}
            />
          ))}
        </CardContent>
      </Card>

      <LogFoodDialog
        open={logFoodOpen}
        onOpenChange={setLogFoodOpen}
        initialMeal={selectedMeal}
        selectedDateKey={selectedDateKey}
      />
    </>
  )
}
