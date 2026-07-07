"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/database/prisma"
import { logFoodForUser } from "@/lib/nutrition/log-food"
import { searchFoodsForUser } from "@/lib/nutrition/search-foods"
import type { FoodSearchResponse, LogFoodInput } from "@/lib/nutrition/types"
import type { NutritionGoalValues } from "@/types/nutrition"

export type SaveNutritionGoalsResult =
  { ok: true; goals: NutritionGoalValues } | { ok: false; error: string }

export type SearchFoodsResult =
  { ok: true; results: FoodSearchResponse } | { ok: false; error: string }

export type LogFoodResult = { ok: true } | { ok: false; error: string }
export type DeleteFoodResult = { ok: true } | { ok: false; error: string }

function parseField(
  input: NutritionGoalValues,
  field: keyof NutritionGoalValues
): number | null {
  const value = input[field]
  if (!Number.isFinite(value) || value < 0) {
    return null
  }

  return field === "calories"
    ? Math.round(value)
    : Math.round(value * 100) / 100
}

export async function saveNutritionGoals(
  input: NutritionGoalValues
): Promise<SaveNutritionGoalsResult> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return { ok: false, error: "You must be signed in to update goals." }
  }

  const fields = Object.keys(input) as (keyof NutritionGoalValues)[]
  const parsed = {} as NutritionGoalValues

  for (const field of fields) {
    const value = parseField(input, field)
    if (value == null) {
      return { ok: false, error: `Enter a valid ${field} value.` }
    }
    parsed[field] = value
  }

  await prisma.nutritionGoal.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...parsed,
    },
    update: parsed,
  })

  revalidatePath("/nutrition")
  return { ok: true, goals: parsed }
}

export async function searchFoods(query: string): Promise<SearchFoodsResult> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return { ok: false, error: "You must be signed in to search foods." }
  }

  const trimmed = query.trim()
  if (!trimmed) {
    return { ok: false, error: "Enter a food name to search." }
  }

  try {
    const results = await searchFoodsForUser(session.user.id, trimmed)
    return { ok: true, results }
  } catch {
    return {
      ok: false,
      error: "Food search is unavailable right now. Try again.",
    }
  }
}

export async function logFoodEntry(
  input: LogFoodInput
): Promise<LogFoodResult> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return { ok: false, error: "You must be signed in to log food." }
  }

  try {
    await logFoodForUser(session.user.id, input)
    revalidatePath("/nutrition")
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to save that entry.",
    }
  }
}

export async function deleteFoodEntry(
  entryId: string
): Promise<DeleteFoodResult> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return { ok: false, error: "You must be signed in to delete food." }
  }

  try {
    const result = await prisma.nutritionEntry.deleteMany({
      where: {
        id: entryId,
        userId: session.user.id,
      },
    })

    if (result.count === 0) {
      return { ok: false, error: "That food entry could not be found." }
    }

    revalidatePath("/nutrition")
    return { ok: true }
  } catch {
    return { ok: false, error: "Unable to delete that entry." }
  }
}
