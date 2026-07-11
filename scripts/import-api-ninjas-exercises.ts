import "dotenv/config"

import { performance } from "node:perf_hooks"

import type { ExerciseCategory } from "../src/lib/database/generated/enums"
import { prisma } from "../src/lib/database/prisma"

const API_URL = "https://api.api-ninjas.com/v1/exercises"

const MUSCLE_GROUPS = [
  "abdominals",
  "abductors",
  "adductors",
  "biceps",
  "calves",
  "chest",
  "forearms",
  "glutes",
  "hamstrings",
  "lats",
  "lower_back",
  "middle_back",
  "neck",
  "quadriceps",
  "traps",
  "triceps",
] as const

const ALLOWED_TYPES = new Set(["strength", "cardio", "powerlifting"])

type ApiNinjasExercise = {
  name?: string
  type?: string
  muscle?: string
  difficulty?: string
  instructions?: string
  equipments?: string[]
  safety_info?: string
}

type NormalizedExercise = {
  name: string
  primaryMuscle: string | null
  equipment: string | null
  difficulty: string | null
  category: ExerciseCategory
  instructions: string | null
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase())
}

function normalizeName(name: string): string {
  return toTitleCase(normalizeWhitespace(name))
}

function normalizeOptionalText(value?: string): string | null {
  if (!value) {
    return null
  }

  const normalized = normalizeWhitespace(value)
  return normalized.length > 0 ? normalized : null
}

function normalizeEquipment(equipments?: string[]): string | null {
  if (!equipments || equipments.length === 0) {
    return null
  }

  const normalizedEquipments = equipments
    .map((equipment) => normalizeOptionalText(equipment))
    .filter((equipment): equipment is string => Boolean(equipment))

  if (normalizedEquipments.length === 0) {
    return null
  }

  const joined = normalizedEquipments.join(" ").toLowerCase()

  if (joined.includes("barbell")) {
    return "Barbell"
  }

  if (joined.includes("dumbbell")) {
    return "Dumbbell"
  }

  if (joined.includes("cable")) {
    return "Cable"
  }

  if (joined.includes("machine")) {
    return "Machine"
  }

  if (joined.includes("body") || joined.includes("bodyweight")) {
    return "Bodyweight"
  }

  return toTitleCase(normalizedEquipments[0])
}

function hasEquipment(
  equipments: string[] | undefined,
  search: string
): boolean {
  if (!equipments || equipments.length === 0) {
    return false
  }

  return equipments.some((equipment) =>
    normalizeOptionalText(equipment)?.toLowerCase().includes(search)
  )
}

function mapCategory(type: string, equipments?: string[]): ExerciseCategory {
  if (hasEquipment(equipments, "barbell")) {
    return "BARBELL"
  }

  if (hasEquipment(equipments, "dumbbell")) {
    return "DUMBBELL"
  }

  if (hasEquipment(equipments, "cable")) {
    return "CABLE"
  }

  if (hasEquipment(equipments, "machine")) {
    return "MACHINE"
  }

  if (
    hasEquipment(equipments, "body") ||
    hasEquipment(equipments, "bodyweight")
  ) {
    return "BODYWEIGHT"
  }

  return type === "cardio" ? "CARDIO" : "OTHER"
}

function normalizeExercise(
  exercise: ApiNinjasExercise
): NormalizedExercise | null {
  const rawName = exercise.name ? normalizeWhitespace(exercise.name) : ""

  if (!rawName) {
    return null
  }

  const normalizedType = exercise.type?.trim().toLowerCase()

  if (!normalizedType || !ALLOWED_TYPES.has(normalizedType)) {
    return null
  }

  return {
    name: normalizeName(rawName),
    primaryMuscle: normalizeOptionalText(exercise.muscle),
    equipment: normalizeEquipment(exercise.equipments),
    difficulty: normalizeOptionalText(exercise.difficulty),
    category: mapCategory(normalizedType, exercise.equipments),
    instructions: normalizeOptionalText(exercise.instructions),
  }
}

async function fetchExercisesForMuscle(
  apiKey: string,
  muscleGroup: (typeof MUSCLE_GROUPS)[number]
): Promise<ApiNinjasExercise[]> {
  const url = new URL(API_URL)
  url.searchParams.set("muscle", muscleGroup)

  const response = await fetch(url, {
    headers: {
      "X-Api-Key": apiKey,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `API Ninjas request failed for "${muscleGroup}" with status ${response.status}: ${errorText}`
    )
  }

  const data: unknown = await response.json()

  if (!Array.isArray(data)) {
    throw new Error(
      `API Ninjas returned a non-array response for "${muscleGroup}"`
    )
  }

  return data as ApiNinjasExercise[]
}

async function main() {
  const startedAt = performance.now()
  const apiKey = process.env.API_NINJAS_KEY

  if (!apiKey) {
    throw new Error("Missing API_NINJAS_KEY environment variable.")
  }

  const stats = {
    fetched: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
  }

  const existingExercises = await prisma.exercise.findMany({
    where: {
      source: "API_NINJAS",
    },
    select: {
      id: true,
      name: true,
    },
  })

  const existingByCanonicalName = new Map(
    existingExercises.map((exercise) => [exercise.name.toLowerCase(), exercise])
  )

  const seenInRun = new Set<string>()

  for (const muscleGroup of MUSCLE_GROUPS) {
    const apiExercises = await fetchExercisesForMuscle(apiKey, muscleGroup)
    stats.fetched += apiExercises.length

    for (const apiExercise of apiExercises) {
      const normalizedExercise = normalizeExercise(apiExercise)

      if (!normalizedExercise) {
        stats.skipped += 1
        continue
      }

      const canonicalName = normalizedExercise.name.toLowerCase()

      if (seenInRun.has(canonicalName)) {
        stats.skipped += 1
        continue
      }

      seenInRun.add(canonicalName)

      const existingExercise = existingByCanonicalName.get(canonicalName)
      const existedBeforeUpsert = Boolean(existingExercise)

      const savedExercise = existingExercise
        ? await prisma.exercise.update({
            where: {
              id: existingExercise.id,
            },
            data: {
              name: normalizedExercise.name,
              category: normalizedExercise.category,
              primaryMuscle: normalizedExercise.primaryMuscle,
              equipment: normalizedExercise.equipment,
              difficulty: normalizedExercise.difficulty,
              instructions: normalizedExercise.instructions,
              source: "API_NINJAS",
              isCustom: false,
              userId: null,
            },
            select: {
              id: true,
              name: true,
            },
          })
        : await prisma.exercise.create({
            data: {
              name: normalizedExercise.name,
              category: normalizedExercise.category,
              primaryMuscle: normalizedExercise.primaryMuscle,
              equipment: normalizedExercise.equipment,
              difficulty: normalizedExercise.difficulty,
              instructions: normalizedExercise.instructions,
              source: "API_NINJAS",
              isCustom: false,
              userId: null,
            },
            select: {
              id: true,
              name: true,
            },
          })

      existingByCanonicalName.set(canonicalName, savedExercise)

      if (existedBeforeUpsert) {
        stats.updated += 1
      } else {
        stats.imported += 1
      }
    }
  }

  const elapsedMs = performance.now() - startedAt

  console.log(`total API exercises fetched: ${stats.fetched}`)
  console.log(`imported: ${stats.imported}`)
  console.log(`updated: ${stats.updated}`)
  console.log(`skipped: ${stats.skipped}`)
  console.log(`total execution time: ${(elapsedMs / 1000).toFixed(2)}s`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
