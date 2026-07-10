"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import {
  createCustomExerciseForUser,
  type ExercisePickerUnusedOption,
} from "@/app/db/exercises"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/database/prisma"

export type CreateWorkoutSessionResult =
  { ok: true; sessionId: string } | { ok: false; error: string }

export type CreateCustomExerciseResult =
  | {
      ok: true
      exercise: ExercisePickerUnusedOption
    }
  | {
      ok: false
      error: string
      fieldErrors?: {
        name?: string
        primaryMuscle?: string
        equipment?: string
        difficulty?: string
        instructions?: string
      }
    }

function buildDefaultWorkoutName() {
  return `Workout ${new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })}`
}

export async function createWorkoutSession(
  name?: string
): Promise<CreateWorkoutSessionResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return { ok: false, error: "You must be signed in to start a workout." }
  }

  const trimmed = name?.trim()
  const workoutName = trimmed || buildDefaultWorkoutName()

  const workoutSession = await prisma.workoutSession.create({
    data: {
      userId: session.user.id,
      name: workoutName,
      status: "IN_PROGRESS",
    },
    select: {
      id: true,
    },
  })

  revalidatePath("/training")

  return {
    ok: true,
    sessionId: workoutSession.id,
  }
}

export async function createCustomExercise(input: {
  name: string
  primaryMuscle?: string | null
  equipment?: string | null
  difficulty?: string | null
  instructions?: string | null
}): Promise<CreateCustomExerciseResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return {
      ok: false,
      error: "You must be signed in to create a custom exercise.",
    }
  }

  const result = await createCustomExerciseForUser(session.user.id, input)

  if (!result.ok) {
    return result
  }

  revalidatePath("/training")

  return {
    ok: true,
    exercise: result.exercise,
  }
}
