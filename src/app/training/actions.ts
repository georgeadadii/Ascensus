"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import {
  createCustomExerciseForUser,
  type ExercisePickerUnusedOption,
} from "@/app/db/exercises"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/database/prisma"
import {
  isPersonalRecordSlotNumber,
  validatePersonalRecordSlotSelection,
  type PersonalRecordSlotNumber,
} from "@/lib/training/personal-records"

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

export type UpdatePersonalRecordSlotResult =
  | {
      ok: true
      slot: PersonalRecordSlotNumber
      exercise: {
        id: string
        name: string
      }
    }
  | { ok: false; error: string }

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

async function getAuthenticatedTrainingUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return session?.user ?? null
}

async function updatePersonalRecordSlotSelection(
  slot: number,
  exerciseId: string
): Promise<UpdatePersonalRecordSlotResult> {
  const user = await getAuthenticatedTrainingUser()

  if (!user) {
    return {
      ok: false,
      error: "You must be signed in to update your personal records.",
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const exercise = await tx.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [{ userId: null }, { userId: user.id }],
      },
      select: {
        id: true,
        name: true,
        userId: true,
      },
    })

    if (!exercise) {
      return {
        ok: false as const,
        error: "That exercise could not be found.",
      }
    }

    const existingSlots = await tx.personalRecordSlot.findMany({
      where: {
        userId: user.id,
      },
      select: {
        slot: true,
        exerciseId: true,
      },
    })

    const currentSlot = existingSlots.find((entry) => entry.slot === slot)
    const selectionValidation = validatePersonalRecordSlotSelection({
      slot,
      userId: user.id,
      exercise,
      selectedExerciseIds: existingSlots
        .filter((entry) => entry.slot !== slot)
        .map((entry) => entry.exerciseId),
      currentSlotExerciseId: currentSlot?.exerciseId,
    })

    if (!selectionValidation.ok) {
      return selectionValidation
    }

    await tx.personalRecordSlot.upsert({
      where: {
        userId_slot: {
          userId: user.id,
          slot,
        },
      },
      update: {
        exerciseId: exercise.id,
      },
      create: {
        userId: user.id,
        slot,
        exerciseId: exercise.id,
      },
    })

    return {
      ok: true as const,
      slot: slot as PersonalRecordSlotNumber,
      exercise: {
        id: exercise.id,
        name: exercise.name,
      },
    }
  })

  if (result.ok) {
    revalidatePath("/training")
  }

  return result
}

export async function assignPersonalRecordSlot(
  slot: number,
  exerciseId: string
): Promise<UpdatePersonalRecordSlotResult> {
  return updatePersonalRecordSlotSelection(slot, exerciseId)
}

export async function replacePersonalRecordSlot(
  slot: number,
  exerciseId: string
): Promise<UpdatePersonalRecordSlotResult> {
  return updatePersonalRecordSlotSelection(slot, exerciseId)
}

export async function clearPersonalRecordSlot(
  slot: number
): Promise<
  { ok: true; slot: PersonalRecordSlotNumber } | { ok: false; error: string }
> {
  const user = await getAuthenticatedTrainingUser()

  if (!user) {
    return {
      ok: false,
      error: "You must be signed in to update your personal records.",
    }
  }

  if (!isPersonalRecordSlotNumber(slot)) {
    return {
      ok: false,
      error: "Select a valid personal record slot.",
    }
  }

  await prisma.personalRecordSlot.deleteMany({
    where: {
      userId: user.id,
      slot,
    },
  })

  revalidatePath("/training")

  return {
    ok: true,
    slot: slot as PersonalRecordSlotNumber,
  }
}
