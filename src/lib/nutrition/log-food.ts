import type { MealType } from "@/lib/database/generated/enums"
import { prisma } from "@/lib/database/prisma"
import { parseDateKey } from "@/lib/nutrition/date"
import type { FoodSearchResult, LogFoodInput } from "@/lib/nutrition/types"

const VALID_MEALS: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"]

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100
}

function isMealType(value: string): value is MealType {
  return VALID_MEALS.includes(value as MealType)
}

function ensureSearchResult(result: FoodSearchResult) {
  const requiredNumbers = [
    result.caloriesPer100g,
    result.proteinPer100g,
    result.carbsPer100g,
    result.fatPer100g,
  ]

  return requiredNumbers.every(
    (value) => typeof value === "number" && Number.isFinite(value)
  )
}

async function resolveFoodRecord(selectedFood: FoodSearchResult) {
  if (selectedFood.source === "LOCAL") {
    if (!selectedFood.localFoodId) {
      throw new Error("Select a saved food to continue.")
    }

    const localFood = await prisma.food.findUnique({
      where: { id: selectedFood.localFoodId },
    })

    if (!localFood) {
      throw new Error("That food is no longer available.")
    }

    return localFood
  }

  if (
    selectedFood.externalSource !== "OPEN_FOOD_FACTS" ||
    !selectedFood.externalId
  ) {
    throw new Error("Select a valid Open Food Facts result.")
  }

  const existing = await prisma.food.findFirst({
    where: {
      OR: [
        {
          externalSource: "OPEN_FOOD_FACTS",
          externalId: selectedFood.externalId,
        },
        ...(selectedFood.barcode ? [{ barcode: selectedFood.barcode }] : []),
      ],
    },
  })

  const data = {
    externalSource: "OPEN_FOOD_FACTS" as const,
    externalId: selectedFood.externalId,
    barcode: selectedFood.barcode ?? selectedFood.externalId,
    name: selectedFood.name,
    brand: selectedFood.brand ?? null,
    imageUrl: selectedFood.imageUrl ?? null,
    servingSize: selectedFood.servingSize ?? null,
    servingUnit: selectedFood.servingUnit ?? null,
    caloriesPer100g: selectedFood.caloriesPer100g,
    proteinPer100g: selectedFood.proteinPer100g,
    carbsPer100g: selectedFood.carbsPer100g,
    fatPer100g: selectedFood.fatPer100g,
    fibrePer100g: selectedFood.fibrePer100g ?? null,
    sugarPer100g: selectedFood.sugarPer100g ?? null,
    sodiumPer100g: selectedFood.sodiumPer100g ?? null,
    cholesterolPer100g: selectedFood.cholesterolPer100g ?? null,
    saturatedFatPer100g: selectedFood.saturatedFatPer100g ?? null,
    saltPer100g: selectedFood.saltPer100g ?? null,
    nutritionGrade: selectedFood.nutritionGrade ?? null,
    novaGroup:
      typeof selectedFood.novaGroup === "number"
        ? Math.round(selectedFood.novaGroup)
        : null,
    ingredients: selectedFood.ingredients ?? null,
    allergens: selectedFood.allergens,
  }

  if (!existing) {
    return prisma.food.create({ data })
  }

  return prisma.food.update({
    where: { id: existing.id },
    data,
  })
}

export async function logFoodForUser(userId: string, input: LogFoodInput) {
  const quantityG = Number(input.quantityG)

  if (!input.selectedFood || !ensureSearchResult(input.selectedFood)) {
    throw new Error("Select a food with complete macro data.")
  }

  if (!Number.isFinite(quantityG) || quantityG <= 0) {
    throw new Error("Enter a quantity greater than zero.")
  }

  if (!isMealType(input.meal)) {
    throw new Error("Select a valid meal.")
  }

  const selectedDate = parseDateKey(input.dateKey)
  if (!selectedDate) {
    throw new Error("Select a valid date.")
  }

  const food = await resolveFoodRecord(input.selectedFood)
  const multiplier = quantityG / 100

  return prisma.nutritionEntry.create({
    data: {
      userId,
      foodId: food.id,
      date: selectedDate,
      meal: input.meal,
      quantityG: roundToTwo(quantityG),
      foodName: food.name,
      brand: food.brand,
      barcode: food.barcode,
      calories: roundToTwo(food.caloriesPer100g * multiplier),
      protein: roundToTwo(food.proteinPer100g * multiplier),
      carbs: roundToTwo(food.carbsPer100g * multiplier),
      fat: roundToTwo(food.fatPer100g * multiplier),
      fibre:
        food.fibrePer100g == null
          ? null
          : roundToTwo(food.fibrePer100g * multiplier),
      sugar:
        food.sugarPer100g == null
          ? null
          : roundToTwo(food.sugarPer100g * multiplier),
      sodium:
        food.sodiumPer100g == null
          ? null
          : roundToTwo(food.sodiumPer100g * multiplier),
      cholesterol:
        food.cholesterolPer100g == null
          ? null
          : roundToTwo(food.cholesterolPer100g * multiplier),
    },
  })
}
