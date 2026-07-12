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
  compareSessionStructureToTemplate,
  createTemplateFromSessionStructure,
  createWorkoutSessionFromTemplate,
  ensureTemplateOwnership,
  replaceTemplateExercises,
  updateTemplateFromSessionStructure,
  validateWorkoutTemplateDraftInput,
  validateExerciseAccess,
  type WorkoutTemplateExerciseInput,
} from "@/lib/training/workout-templates"
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

export type TemplateMutationResult<T> =
  { ok: true; data: T } | { ok: false; error: string }

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

type WorkoutTemplateDraftMutationResult = TemplateMutationResult<{
  templateId: string
  version: number
  updatedAt: string
  exerciseCount: number
}>

export async function createWorkoutTemplateFromDraft(input: {
  name: string
  description?: string | null
  exercises: WorkoutTemplateExerciseInput[]
}): Promise<WorkoutTemplateDraftMutationResult> {
  const user = await getAuthenticatedTrainingUser()

  if (!user) {
    return {
      ok: false,
      error: "You must be signed in to create a template.",
    }
  }

  const validatedDraft = validateWorkoutTemplateDraftInput(input)
  if (!validatedDraft.ok) {
    return validatedDraft
  }

  const hasAccess = await validateExerciseAccess(
    prisma,
    user.id,
    validatedDraft.data.exercises.map((exercise) => exercise.exerciseId)
  )

  if (!hasAccess) {
    return { ok: false, error: "One or more exercises could not be found." }
  }

  const template = await prisma.$transaction(async (tx) => {
    const created = await tx.workoutTemplate.create({
      data: {
        userId: user.id,
        name: validatedDraft.data.name,
        description: validatedDraft.data.description,
      },
      select: {
        id: true,
        version: true,
        updatedAt: true,
      },
    })

    await replaceTemplateExercises(
      tx,
      created.id,
      validatedDraft.data.exercises
    )

    const counts = await tx.workoutTemplate.findUnique({
      where: {
        id: created.id,
      },
      select: {
        _count: {
          select: {
            exercises: true,
          },
        },
      },
    })

    return {
      id: created.id,
      version: created.version,
      updatedAt: created.updatedAt,
      exerciseCount: counts?._count.exercises ?? 0,
    }
  })

  revalidatePath("/training")
  revalidatePath(`/training/templates/${template.id}`)

  return {
    ok: true,
    data: {
      templateId: template.id,
      version: template.version,
      updatedAt: template.updatedAt.toISOString(),
      exerciseCount: template.exerciseCount,
    },
  }
}

export async function updateWorkoutTemplateFromDraft(input: {
  templateId: string
  name: string
  description?: string | null
  exercises: WorkoutTemplateExerciseInput[]
}): Promise<WorkoutTemplateDraftMutationResult> {
  const user = await getAuthenticatedTrainingUser()

  if (!user) {
    return {
      ok: false,
      error: "You must be signed in to update a template.",
    }
  }

  const validatedDraft = validateWorkoutTemplateDraftInput(input)
  if (!validatedDraft.ok) {
    return validatedDraft
  }

  const hasAccess = await validateExerciseAccess(
    prisma,
    user.id,
    validatedDraft.data.exercises.map((exercise) => exercise.exerciseId)
  )

  if (!hasAccess) {
    return { ok: false, error: "One or more exercises could not be found." }
  }

  const result = await prisma.$transaction(async (tx) => {
    const template = await ensureTemplateOwnership(
      tx,
      user.id,
      input.templateId
    )

    if (!template) {
      return { ok: false as const, error: "That template could not be found." }
    }

    await tx.workoutTemplate.update({
      where: {
        id: template.id,
      },
      data: {
        name: validatedDraft.data.name,
        description: validatedDraft.data.description,
      },
    })

    await replaceTemplateExercises(
      tx,
      template.id,
      validatedDraft.data.exercises
    )

    const updated = await tx.workoutTemplate.update({
      where: {
        id: template.id,
      },
      data: {
        version: {
          increment: 1,
        },
      },
      select: {
        id: true,
        version: true,
        updatedAt: true,
        _count: {
          select: {
            exercises: true,
          },
        },
      },
    })

    return {
      ok: true as const,
      data: {
        templateId: updated.id,
        version: updated.version,
        updatedAt: updated.updatedAt.toISOString(),
        exerciseCount: updated._count.exercises,
      },
    }
  })

  if (!result.ok) {
    return result
  }

  revalidatePath("/training")
  revalidatePath(`/training/templates/${input.templateId}`)

  return result
}

export const createWorkoutTemplate = createWorkoutTemplateFromDraft
export const updateWorkoutTemplate = updateWorkoutTemplateFromDraft

export async function deleteWorkoutTemplate(
  templateId: string
): Promise<TemplateMutationResult<{ templateId: string }>> {
  const user = await getAuthenticatedTrainingUser()

  if (!user) {
    return {
      ok: false,
      error: "You must be signed in to delete a template.",
    }
  }

  const deleted = await prisma.workoutTemplate.deleteMany({
    where: {
      id: templateId,
      userId: user.id,
    },
  })

  if (deleted.count === 0) {
    return { ok: false, error: "That template could not be found." }
  }

  revalidatePath("/training")
  revalidatePath(`/training/templates/${templateId}`)

  return {
    ok: true,
    data: {
      templateId,
    },
  }
}

export async function startWorkoutFromTemplate(
  templateId: string
): Promise<CreateWorkoutSessionResult> {
  const user = await getAuthenticatedTrainingUser()

  if (!user) {
    return {
      ok: false,
      error: "You must be signed in to start a template workout.",
    }
  }

  const result = await prisma.$transaction((tx) =>
    createWorkoutSessionFromTemplate(tx, user.id, templateId)
  )

  if (!result.ok) {
    return result
  }

  revalidatePath("/training")
  revalidatePath(`/training/session/${result.sessionId}`)

  return result
}

export async function createTemplateFromWorkout(input: {
  sessionId: string
  name: string
  description?: string | null
}): Promise<TemplateMutationResult<{ templateId: string }>> {
  const user = await getAuthenticatedTrainingUser()

  if (!user) {
    return {
      ok: false,
      error: "You must be signed in to save this workout as a template.",
    }
  }

  const result = await prisma.$transaction((tx) =>
    createTemplateFromSessionStructure(
      tx,
      user.id,
      input.sessionId,
      input.name,
      input.description
    )
  )

  if (!result.ok) {
    return result
  }

  revalidatePath("/training")
  revalidatePath(`/training/templates/${result.templateId}`)

  return {
    ok: true,
    data: {
      templateId: result.templateId,
    },
  }
}

export async function updateTemplateFromWorkout(
  sessionId: string
): Promise<TemplateMutationResult<{ templateId: string }>> {
  const user = await getAuthenticatedTrainingUser()

  if (!user) {
    return {
      ok: false,
      error: "You must be signed in to update this template.",
    }
  }

  const result = await prisma.$transaction((tx) =>
    updateTemplateFromSessionStructure(tx, user.id, sessionId)
  )

  if (!result.ok) {
    return result
  }

  revalidatePath("/training")
  revalidatePath(`/training/templates/${result.templateId}`)

  return {
    ok: true,
    data: {
      templateId: result.templateId,
    },
  }
}

export async function compareWorkoutToTemplate(sessionId: string): Promise<
  TemplateMutationResult<{
    hasTemplate: boolean
    modified: boolean
    templateId: string | null
    templateName: string | null
  }>
> {
  const user = await getAuthenticatedTrainingUser()

  if (!user) {
    return {
      ok: false,
      error: "You must be signed in to compare this workout to a template.",
    }
  }

  const result = await compareSessionStructureToTemplate(
    prisma,
    user.id,
    sessionId
  )

  if (!result.ok) {
    return result
  }

  return {
    ok: true,
    data: {
      hasTemplate: result.hasTemplate,
      modified: result.modified,
      templateId: result.templateId,
      templateName: result.templateName,
    },
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
