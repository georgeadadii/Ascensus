import type { MealType } from "@/lib/database/generated/enums"

export const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "SNACK", label: "Snacks" },
]

export const MEAL_ORDER = MEAL_OPTIONS.map((option) => option.value)

export function mealLabel(meal: MealType) {
  return MEAL_OPTIONS.find((option) => option.value === meal)?.label ?? "Meal"
}
