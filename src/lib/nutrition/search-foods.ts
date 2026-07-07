import { prisma } from "@/lib/database/prisma"
import { searchOpenFoodFacts } from "@/lib/nutrition/open-food-facts"
import type {
  FoodSearchResponse,
  FoodSearchResult,
} from "@/lib/nutrition/types"

function asRoundedNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? ""
}

function dedupeKeys(result: FoodSearchResult) {
  return {
    externalId:
      result.externalSource && result.externalId
        ? `${result.externalSource}:${result.externalId}`
        : null,
    barcode: normalizeText(result.barcode),
    nameBrand: `${normalizeText(result.name)}::${normalizeText(result.brand)}`,
  }
}

function rememberResult(
  seen: Set<string>,
  result: FoodSearchResult,
  collection: FoodSearchResult[]
) {
  const keys = dedupeKeys(result)
  const candidates = [keys.externalId, keys.barcode, keys.nameBrand].filter(
    (key): key is string => Boolean(key)
  )

  if (candidates.some((key) => seen.has(key))) {
    return
  }

  for (const key of candidates) {
    seen.add(key)
  }

  collection.push(result)
}

function mapLocalFood(food: {
  id: string
  externalSource: string | null
  externalId: string | null
  barcode: string | null
  name: string
  brand: string | null
  imageUrl: string | null
  servingSize: number | null
  servingUnit: string | null
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fibrePer100g: number | null
  sugarPer100g: number | null
  sodiumPer100g: number | null
  cholesterolPer100g: number | null
  saturatedFatPer100g: number | null
  saltPer100g: number | null
  nutritionGrade: string | null
  novaGroup: number | null
  ingredients: string | null
  allergens: string[]
}): FoodSearchResult {
  return {
    source: "LOCAL",
    localFoodId: food.id,
    externalSource:
      food.externalSource === "OPEN_FOOD_FACTS" ? "OPEN_FOOD_FACTS" : undefined,
    externalId: food.externalId ?? undefined,
    barcode: food.barcode,
    name: food.name,
    brand: food.brand,
    imageUrl: food.imageUrl,
    servingSize: food.servingSize,
    servingUnit: food.servingUnit,
    caloriesPer100g: food.caloriesPer100g,
    proteinPer100g: food.proteinPer100g,
    carbsPer100g: food.carbsPer100g,
    fatPer100g: food.fatPer100g,
    fibrePer100g: food.fibrePer100g,
    sugarPer100g: food.sugarPer100g,
    sodiumPer100g: food.sodiumPer100g,
    cholesterolPer100g: food.cholesterolPer100g,
    saturatedFatPer100g: food.saturatedFatPer100g,
    saltPer100g: food.saltPer100g,
    nutritionGrade: food.nutritionGrade,
    novaGroup: food.novaGroup,
    ingredients: food.ingredients,
    allergens: food.allergens,
  }
}

export async function searchFoodsForUser(
  userId: string,
  query: string
): Promise<FoodSearchResponse> {
  const trimmed = query.trim()
  if (!trimmed) {
    return { previouslyLogged: [], moreOptions: [] }
  }

  const localEntries = await prisma.nutritionEntry.findMany({
    where: {
      userId,
      foodId: { not: null },
      OR: [
        { foodName: { contains: trimmed, mode: "insensitive" } },
        { brand: { contains: trimmed, mode: "insensitive" } },
        {
          food: {
            is: {
              name: { contains: trimmed, mode: "insensitive" },
            },
          },
        },
        {
          food: {
            is: {
              brand: { contains: trimmed, mode: "insensitive" },
            },
          },
        },
      ],
    },
    include: {
      food: true,
    },
    orderBy: {
      date: "desc",
    },
    take: 25,
  })

  const seen = new Set<string>()
  const previouslyLogged: FoodSearchResult[] = []

  for (const entry of localEntries) {
    if (!entry.food) continue
    rememberResult(seen, mapLocalFood(entry.food), previouslyLogged)
    if (previouslyLogged.length >= 6) break
  }

  const remoteResults = await searchOpenFoodFacts(trimmed)
  const moreOptions: FoodSearchResult[] = []

  for (const result of remoteResults) {
    rememberResult(seen, result, moreOptions)
    if (moreOptions.length >= 8) break
  }

  return {
    previouslyLogged,
    moreOptions,
  }
}

export function roundLoggedValue(value: number | null | undefined) {
  return asRoundedNumber(value) ?? 0
}
