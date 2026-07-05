import { prisma } from "@/lib/database/prisma"
import type {
  NutritionGoalValues,
  NutritionOverview,
  NutritionTotals,
} from "@/types/nutrition"

export const EMPTY_NUTRITION_GOALS: NutritionGoalValues = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fibre: 0,
  water: 0,
  sodium: 0,
  sugar: 0,
  cholesterol: 0,
}

export const EMPTY_NUTRITION_TOTALS: NutritionTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fibre: 0,
  water: 0,
  sodium: 0,
  sugar: 0,
  cholesterol: 0,
}

function roundNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

export async function getNutritionOverview(
  userId: string
): Promise<NutritionOverview> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(startOfDay)
  endOfDay.setDate(endOfDay.getDate() + 1)

  const [goal, entryTotals, waterTotals] = await Promise.all([
    prisma.nutritionGoal.findUnique({
      where: { userId },
      select: {
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        fibre: true,
        water: true,
        sodium: true,
        sugar: true,
        cholesterol: true,
      },
    }),
    prisma.nutritionEntry.aggregate({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      _sum: {
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        fibre: true,
        sodium: true,
        sugar: true,
        cholesterol: true,
      },
    }),
    prisma.waterLog.aggregate({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      _sum: {
        amount: true,
      },
    }),
  ])

  return {
    goals: {
      calories: goal?.calories ?? 0,
      protein: goal?.protein ?? 0,
      carbs: goal?.carbs ?? 0,
      fat: goal?.fat ?? 0,
      fibre: goal?.fibre ?? 0,
      water: goal?.water ?? 0,
      sodium: goal?.sodium ?? 0,
      sugar: goal?.sugar ?? 0,
      cholesterol: goal?.cholesterol ?? 0,
    },
    totals: {
      calories: roundNumber(entryTotals._sum.calories),
      protein: roundNumber(entryTotals._sum.protein),
      carbs: roundNumber(entryTotals._sum.carbs),
      fat: roundNumber(entryTotals._sum.fat),
      fibre: roundNumber(entryTotals._sum.fibre),
      water: roundNumber(waterTotals._sum.amount),
      sodium: roundNumber(entryTotals._sum.sodium),
      sugar: roundNumber(entryTotals._sum.sugar),
      cholesterol: roundNumber(entryTotals._sum.cholesterol),
    },
  }
}
