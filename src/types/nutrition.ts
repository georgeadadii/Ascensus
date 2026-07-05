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

export type NutritionOverview = {
  goals: NutritionGoalValues
  totals: NutritionTotals
}
