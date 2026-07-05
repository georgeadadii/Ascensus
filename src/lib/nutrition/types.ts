import type { MealType } from "@/lib/database/generated/enums"

export type FoodSearchResult = {
  source: "LOCAL" | "OPEN_FOOD_FACTS"
  localFoodId?: string
  externalSource?: "OPEN_FOOD_FACTS"
  externalId?: string
  barcode?: string | null
  name: string
  brand?: string | null
  imageUrl?: string | null
  servingSize?: number | null
  servingUnit?: string | null
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fibrePer100g?: number | null
  sugarPer100g?: number | null
  sodiumPer100g?: number | null
  cholesterolPer100g?: number | null
  saturatedFatPer100g?: number | null
  saltPer100g?: number | null
  nutritionGrade?: string | null
  novaGroup?: number | null
  ingredients?: string | null
  allergens: string[]
}

export type FoodSearchResponse = {
  previouslyLogged: FoodSearchResult[]
  moreOptions: FoodSearchResult[]
}

export type LogFoodInput = {
  meal: MealType
  quantityG: number
  selectedFood: FoodSearchResult
}
