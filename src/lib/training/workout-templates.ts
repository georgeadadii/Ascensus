import "server-only"

import type { Prisma } from "@/lib/database/generated/client"
import { prisma } from "@/lib/database/prisma"
import {
  normalizeTemplateDescription,
  normalizeTemplateName,
  validateWorkoutTemplateDraft,
  type WorkoutTemplateExerciseInput,
} from "@/lib/training/workout-template-draft-validation"

export {
  validateWorkoutTemplateDraft,
  validateWorkoutTemplateDraftInput,
  type ValidatedWorkoutTemplateDraft,
  type ValidatedWorkoutTemplateExerciseInput,
  type WorkoutTemplateExerciseInput,
  type WorkoutTemplateSetInput,
} from "@/lib/training/workout-template-draft-validation"

type DatabaseClient = Prisma.TransactionClient | typeof prisma

export async function ensureTemplateOwnership(
  db: DatabaseClient,
  userId: string,
  templateId: string
) {
  return db.workoutTemplate.findFirst({
    where: {
      id: templateId,
      userId,
    },
    select: {
      id: true,
      name: true,
      version: true,
    },
  })
}

export async function ensureSessionOwnership(
  db: DatabaseClient,
  userId: string,
  sessionId: string
) {
  return db.workoutSession.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    select: {
      id: true,
      name: true,
      status: true,
      templateId: true,
      startedAt: true,
      exercises: {
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: {
          id: true,
          exerciseId: true,
          order: true,
          notes: true,
          sets: {
            orderBy: [{ setNumber: "asc" }, { id: "asc" }],
            select: {
              setNumber: true,
              plannedMinReps: true,
              plannedMaxReps: true,
              weight: true,
              reps: true,
            },
          },
        },
      },
    },
  })
}

export async function validateExerciseAccess(
  db: DatabaseClient,
  userId: string,
  exerciseIds: string[]
) {
  const uniqueExerciseIds = [...new Set(exerciseIds)]
  if (uniqueExerciseIds.length === 0) return true

  const count = await db.exercise.count({
    where: {
      id: {
        in: uniqueExerciseIds,
      },
      OR: [{ userId: null }, { userId }],
    },
  })

  return count === uniqueExerciseIds.length
}

export async function replaceTemplateExercises(
  db: DatabaseClient,
  templateId: string,
  exercises: WorkoutTemplateExerciseInput[]
) {
  await db.workoutTemplateExercise.deleteMany({
    where: {
      templateId,
    },
  })

  if (exercises.length === 0) {
    return exercises
  }

  await Promise.all(
    exercises.map((exercise) =>
      db.workoutTemplateExercise.create({
        data: {
          templateId,
          exerciseId: exercise.exerciseId,
          order: exercise.order,
          notes: exercise.notes,
          sets: exercise.sets.length
            ? {
                create: exercise.sets.map((set) => ({
                  setNumber: set.setNumber,
                  minReps: set.minReps,
                  maxReps: set.maxReps,
                  targetWeight: set.targetWeight,
                })),
              }
            : undefined,
        },
      })
    )
  )

  return exercises
}

function buildTemplateExercisesFromSession(
  session: NonNullable<Awaited<ReturnType<typeof ensureSessionOwnership>>>
) {
  const exercises = session.exercises.map((exercise, exerciseIndex) => ({
    exerciseId: exercise.exerciseId,
    order: exerciseIndex + 1,
    notes: exercise.notes,
    sets: exercise.sets.map((set, setIndex) => {
      if (set.reps == null || !Number.isInteger(set.reps) || set.reps < 1) {
        throw new Error(
          `Set ${setIndex + 1} in exercise ${exerciseIndex + 1} needs completed reps before it can be saved to a template.`
        )
      }

      return {
        setNumber: setIndex + 1,
        minReps: set.reps,
        maxReps: set.reps,
        targetWeight: set.weight,
      }
    }),
  }))

  return validateWorkoutTemplateDraft(exercises)
}

export async function createWorkoutSessionFromTemplate(
  db: DatabaseClient,
  userId: string,
  templateId: string
) {
  const startedAt = new Date()
  const template = await db.workoutTemplate.findFirst({
    where: {
      id: templateId,
      userId,
    },
    select: {
      id: true,
      name: true,
      version: true,
      exercises: {
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: {
          exerciseId: true,
          notes: true,
          sets: {
            orderBy: [{ setNumber: "asc" }, { id: "asc" }],
            select: {
              setNumber: true,
              minReps: true,
              maxReps: true,
              targetWeight: true,
            },
          },
        },
      },
    },
  })

  if (!template) {
    return { ok: false as const, error: "That template could not be found." }
  }

  if (template.exercises.length === 0) {
    return {
      ok: false as const,
      error: "Add at least one exercise before starting this template.",
    }
  }

  const session = await db.workoutSession.create({
    data: {
      userId,
      templateId: template.id,
      templateVersion: template.version,
      name: template.name,
      status: "IN_PROGRESS",
      startedAt,
      exercises: {
        create: template.exercises.map((exercise, index) => ({
          exerciseId: exercise.exerciseId,
          order: index + 1,
          notes: exercise.notes,
          sets: exercise.sets.length
            ? {
                create: exercise.sets.map((set) => ({
                  setNumber: set.setNumber,
                  plannedMinReps: set.minReps,
                  plannedMaxReps: set.maxReps,
                  weight: set.targetWeight,
                })),
              }
            : undefined,
        })),
      },
    },
    select: {
      id: true,
    },
  })

  return { ok: true as const, sessionId: session.id }
}

export async function createTemplateFromSessionStructure(
  db: DatabaseClient,
  userId: string,
  sessionId: string,
  templateName: string,
  description?: string | null
) {
  const session = await ensureSessionOwnership(db, userId, sessionId)
  if (!session) {
    return { ok: false as const, error: "That workout could not be found." }
  }

  if (session.exercises.length === 0) {
    return {
      ok: false as const,
      error:
        "Add at least one exercise before saving this workout as a template.",
    }
  }

  const normalizedName = normalizeTemplateName(templateName)
  if (!normalizedName) {
    return { ok: false as const, error: "Template name is required." }
  }

  const templateExercises = buildTemplateExercisesFromSession(session)
  if (!templateExercises.ok) {
    return templateExercises
  }

  const template = await db.workoutTemplate.create({
    data: {
      userId,
      name: normalizedName,
      description: normalizeTemplateDescription(description),
      exercises: {
        create: templateExercises.data.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          order: exercise.order,
          notes: exercise.notes,
          sets: {
            create: exercise.sets.map((set) => ({
              setNumber: set.setNumber,
              minReps: set.minReps,
              maxReps: set.maxReps,
              targetWeight: set.targetWeight,
            })),
          },
        })),
      },
    },
    select: {
      id: true,
    },
  })

  return { ok: true as const, templateId: template.id }
}

export async function compareSessionStructureToTemplate(
  db: DatabaseClient,
  userId: string,
  sessionId: string
) {
  const session = await ensureSessionOwnership(db, userId, sessionId)
  if (!session) {
    return { ok: false as const, error: "That workout could not be found." }
  }

  if (!session.templateId) {
    return {
      ok: true as const,
      hasTemplate: false,
      modified: false,
      templateId: null,
      templateName: null,
    }
  }

  const template = await db.workoutTemplate.findFirst({
    where: {
      id: session.templateId,
      userId,
    },
    select: {
      id: true,
      name: true,
      exercises: {
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: {
          exerciseId: true,
          notes: true,
          sets: {
            orderBy: [{ setNumber: "asc" }, { id: "asc" }],
            select: {
              setNumber: true,
              minReps: true,
              maxReps: true,
              targetWeight: true,
            },
          },
        },
      },
    },
  })

  if (!template) {
    return {
      ok: true as const,
      hasTemplate: false,
      modified: false,
      templateId: null,
      templateName: null,
    }
  }

  const sessionTemplateExercises = buildTemplateExercisesFromSession(session)
  if (!sessionTemplateExercises.ok) {
    return sessionTemplateExercises
  }

  const modified =
    JSON.stringify(
      sessionTemplateExercises.data.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        order: exercise.order,
        sets: exercise.sets.map((set) => ({
          setNumber: set.setNumber,
          minReps: set.minReps,
          maxReps: set.maxReps,
          targetWeight: set.targetWeight,
        })),
      }))
    ) !==
    JSON.stringify(
      template.exercises.map((exercise, index) => ({
        exerciseId: exercise.exerciseId,
        order: index + 1,
        sets: exercise.sets.map((set, setIndex) => ({
          setNumber: setIndex + 1,
          minReps: set.minReps,
          maxReps: set.maxReps,
          targetWeight: set.targetWeight,
        })),
      }))
    )

  return {
    ok: true as const,
    hasTemplate: true,
    modified,
    templateId: template.id,
    templateName: template.name,
  }
}

export async function updateTemplateFromSessionStructure(
  db: DatabaseClient,
  userId: string,
  sessionId: string
) {
  const session = await ensureSessionOwnership(db, userId, sessionId)
  if (!session) {
    return { ok: false as const, error: "That workout could not be found." }
  }

  if (!session.templateId) {
    return {
      ok: false as const,
      error: "This workout was not started from a template.",
    }
  }

  const template = await ensureTemplateOwnership(db, userId, session.templateId)
  if (!template) {
    return { ok: false as const, error: "That template could not be found." }
  }

  const templateExercises = buildTemplateExercisesFromSession(session)
  if (!templateExercises.ok) {
    return templateExercises
  }

  await replaceTemplateExercises(db, template.id, templateExercises.data)

  await db.workoutTemplate.update({
    where: {
      id: template.id,
    },
    data: {
      version: {
        increment: 1,
      },
    },
  })

  return { ok: true as const, templateId: template.id }
}
