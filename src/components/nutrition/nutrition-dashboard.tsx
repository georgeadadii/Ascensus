"use client"

import * as React from "react"

import { LogFoodDialog } from "@/components/nutrition/log-food-dialog"
import { NutritionCard } from "@/components/nutrition/nutrition-cards"
import { CaloriesCard } from "@/components/nutrition/calories-card"
import { MacrosCard } from "@/components/nutrition/macros-card"
import { EditGoalsDialog } from "@/components/nutrition/edit-goals-dialog"
import { Button } from "../ui/button"
import { SlidersHorizontal, Utensils } from "lucide-react"
import type { NutritionOverview } from "@/types/nutrition"

type NutritionDashboardProps = {
  initialOverview: NutritionOverview
}

function formatNumber(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })
}

function formatGoal(current: number, goal: number, unit: string) {
  return `${formatNumber(current)} / ${formatNumber(goal)} ${unit}`
}

function toPercent(current: number, goal: number) {
  if (goal <= 0) return 0
  return Math.min((current / goal) * 100, 100)
}

export function NutritionDashboard({
  initialOverview,
}: NutritionDashboardProps) {
  const [goals, setGoals] = React.useState(initialOverview.goals)
  const [editGoalsOpen, setEditGoalsOpen] = React.useState(false)
  const [logFoodOpen, setLogFoodOpen] = React.useState(false)
  const [goalsSnapshot, setGoalsSnapshot] = React.useState(
    initialOverview.goals
  )

  if (goalsSnapshot !== initialOverview.goals) {
    setGoalsSnapshot(initialOverview.goals)
    setGoals(initialOverview.goals)
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-6 py-3.5">
        <div>
          <h1 className="text-[15px] font-semibold">Nutrition</h1>
          <p className="text-[11.5px] text-muted-foreground">
            Track daily intake, macros, hydration, and nutrition habits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditGoalsOpen(true)}
          >
            <SlidersHorizontal />
            Edit Goals
          </Button>
          <Button size="sm" onClick={() => setLogFoodOpen(true)}>
            <Utensils />
            Log Food
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 p-4 sm:p-[18px]">
        <section className="grid gap-2.5 lg:grid-cols-2">
          <CaloriesCard
            loggedCalories={initialOverview.totals.calories}
            targetCalories={goals.calories}
          />

          <MacrosCard
            protein={{
              label: "Protein",
              consumed: initialOverview.totals.protein,
              goal: goals.protein,
              unit: "g",
            }}
            carbs={{
              label: "Carbohydrates",
              consumed: initialOverview.totals.carbs,
              goal: goals.carbs,
              unit: "g",
            }}
            fat={{
              label: "Fat",
              consumed: initialOverview.totals.fat,
              goal: goals.fat,
              unit: "g",
            }}
            fibre={{
              label: "Fibre",
              consumed: initialOverview.totals.fibre,
              goal: goals.fibre,
              unit: "g",
            }}
          />
        </section>

        <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <NutritionCard
            title="Water"
            progressLabel={formatGoal(
              initialOverview.totals.water,
              goals.water,
              "L"
            )}
            progressValue={toPercent(initialOverview.totals.water, goals.water)}
          />

          <NutritionCard
            title="Sodium"
            progressLabel={formatGoal(
              initialOverview.totals.sodium,
              goals.sodium,
              "g"
            )}
            progressValue={toPercent(
              initialOverview.totals.sodium,
              goals.sodium
            )}
          />

          <NutritionCard
            title="Sugar"
            progressLabel={formatGoal(
              initialOverview.totals.sugar,
              goals.sugar,
              "g"
            )}
            progressValue={toPercent(initialOverview.totals.sugar, goals.sugar)}
          />

          <NutritionCard
            title="Cholesterol"
            progressLabel={formatGoal(
              initialOverview.totals.cholesterol,
              goals.cholesterol,
              "mg"
            )}
            progressValue={toPercent(
              initialOverview.totals.cholesterol,
              goals.cholesterol
            )}
          />
        </section>
      </div>

      <EditGoalsDialog
        open={editGoalsOpen}
        onOpenChange={setEditGoalsOpen}
        goals={goals}
        onSaved={(nextGoals) => setGoals(nextGoals)}
      />
      <LogFoodDialog open={logFoodOpen} onOpenChange={setLogFoodOpen} />
    </div>
  )
}
