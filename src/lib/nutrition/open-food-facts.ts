import type { FoodSearchResult } from "@/lib/nutrition/types"

type OpenFoodFactsProduct = {
  code?: unknown
  product_name?: unknown
  brands?: unknown
  quantity?: unknown
  serving_size?: unknown
  serving_quantity?: unknown
  image_front_url?: unknown
  ingredients_text?: unknown
  allergens_tags?: unknown
  nutrition_grades?: unknown
  nova_group?: unknown
  nutriments?: Record<string, unknown>
}

type OpenFoodFactsResponse = {
  count?: number
  page?: number
  page_size?: number
  hits?: OpenFoodFactsProduct[]
  products?: OpenFoodFactsProduct[]
}

const OPEN_FOOD_FACTS_FIELDS = [
  "code",
  "product_name",
  "brands",
  "quantity",
  "serving_size",
  "serving_quantity",
  "image_front_url",
  "ingredients_text",
  "allergens_tags",
  "nutrition_grades",
  "nova_group",
  "nutriments",
].join(",")

function asNonEmptyString(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

function parseServingUnit(servingSize: string | null, quantity: string | null) {
  const fromServing = servingSize
    ?.match(/^\s*[\d.]+\s*([^\d\s].*)$/)?.[1]
    ?.trim()
  if (fromServing) return fromServing

  const fromQuantity = quantity?.match(/^\s*[\d.]+\s*([^\d\s].*)$/)?.[1]?.trim()
  return fromQuantity || null
}

function normalizeAllergens(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => asNonEmptyString(item))
    .filter((item): item is string => item != null)
    .map((item) => item.replace(/^en:/, "").replaceAll("-", " "))
}

function mapProduct(product: OpenFoodFactsProduct): FoodSearchResult | null {
  const code = asNonEmptyString(product.code)
  const name = asNonEmptyString(product.product_name)
  const nutriments = product.nutriments

  if (!code || !name || !nutriments || typeof nutriments !== "object") {
    return null
  }

  const caloriesPer100g = asNumber(nutriments["energy-kcal_100g"])
  const proteinPer100g = asNumber(nutriments["proteins_100g"])
  const carbsPer100g = asNumber(nutriments["carbohydrates_100g"])
  const fatPer100g = asNumber(nutriments["fat_100g"])

  if (
    caloriesPer100g == null ||
    proteinPer100g == null ||
    carbsPer100g == null ||
    fatPer100g == null
  ) {
    return null
  }

  const servingSize = asNonEmptyString(product.serving_size)
  const quantity = asNonEmptyString(product.quantity)

  return {
    source: "OPEN_FOOD_FACTS",
    externalSource: "OPEN_FOOD_FACTS",
    externalId: code,
    barcode: code,
    name,
    brand: asNonEmptyString(product.brands),
    imageUrl: asNonEmptyString(product.image_front_url),
    servingSize: asNumber(product.serving_quantity),
    servingUnit: parseServingUnit(servingSize, quantity),
    caloriesPer100g,
    proteinPer100g,
    carbsPer100g,
    fatPer100g,
    fibrePer100g: asNumber(nutriments["fiber_100g"]),
    sugarPer100g: asNumber(nutriments["sugars_100g"]),
    sodiumPer100g: asNumber(nutriments["sodium_100g"]),
    cholesterolPer100g: asNumber(nutriments["cholesterol_100g"]),
    saturatedFatPer100g: asNumber(nutriments["saturated-fat_100g"]),
    saltPer100g: asNumber(nutriments["salt_100g"]),
    nutritionGrade: asNonEmptyString(product.nutrition_grades)?.toUpperCase(),
    novaGroup: asNumber(product.nova_group),
    ingredients: asNonEmptyString(product.ingredients_text),
    allergens: normalizeAllergens(product.allergens_tags),
  }
}

export async function searchOpenFoodFacts(query: string) {
  const trimmed = query.trim()
  if (!trimmed) return []

  const search = new URLSearchParams({
    q: trimmed,
    page: "1",
    page_size: "10",
    fields: OPEN_FOOD_FACTS_FIELDS,
  })

  const response = await fetch(
    `https://search.openfoodfacts.org/search?${search.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }
  )

  if (!response.ok) {
    throw new Error("Open Food Facts search failed.")
  }

  const json = (await response.json()) as OpenFoodFactsResponse
  const products = Array.isArray(json.hits)
    ? json.hits
    : Array.isArray(json.products)
      ? json.products
      : []

  const mappedProducts = products
    .map((product) => mapProduct(product))
    .filter((product): product is FoodSearchResult => product != null)

  console.log("Open Food Facts parsed response:", {
    query: trimmed,
    rawProductCount: products.length,
    loggableProductCount: mappedProducts.length,
    sampleProduct: products[0] ?? null,
    sampleMappedProduct: mappedProducts[0] ?? null,
  })

  return mappedProducts
}
