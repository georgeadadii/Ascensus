import type { MealType } from "@/lib/database/generated/enums"

export type NutritionGoalValues = {
  calories: number
  protein: number
  carbs: number
  fat: number
  fibre: number
  water: number
  sodium: number
  sugar: number
  cholesterol: number
}

export type NutritionTotals = {
  calories: number
  protein: number
  carbs: number
  fat: number
  fibre: number
  water: number
  sodium: number
  sugar: number
  cholesterol: number
}

export type NutritionMealEntry = {
  id: string
  meal: MealType
  foodName: string
  brand: string | null
  quantityG: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type NutritionMealSection = {
  meal: MealType
  entries: NutritionMealEntry[]
  totals: Pick<NutritionTotals, "calories" | "protein" | "carbs" | "fat">
}

export type NutritionOverview = {
  goals: NutritionGoalValues
  totals: NutritionTotals
  meals: NutritionMealSection[]
}
