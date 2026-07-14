import "server-only"

import { prisma } from "@/lib/database/prisma"

export type WorkoutTemplateEditorView = {
  id: string
  name: string
  description: string | null
  version: number
  updatedAt: string
  exercises: {
    id: string
    exerciseId: string
    order: number
    notes: string | null
    sets: {
      id: string
      setNumber: number
      minReps: number
      maxReps: number
      targetWeight: number | null
    }[]
    exercise: {
      name: string
      primaryMuscle: string | null
      equipment: string | null
      difficulty: string | null
    }
  }[]
}

function roundNullable(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

export async function getWorkoutTemplateForEditor(
  userId: string,
  templateId: string
): Promise<WorkoutTemplateEditorView | null> {
  const template = await prisma.workoutTemplate.findFirst({
    where: {
      id: templateId,
      userId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      version: true,
      updatedAt: true,
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
              id: true,
              setNumber: true,
              minReps: true,
              maxReps: true,
              targetWeight: true,
            },
          },
          exercise: {
            select: {
              name: true,
              primaryMuscle: true,
              equipment: true,
              difficulty: true,
            },
          },
        },
      },
    },
  })

  if (!template) return null

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    version: template.version,
    updatedAt: template.updatedAt.toISOString(),
    exercises: template.exercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      order: exercise.order,
      notes: exercise.notes,
      sets: exercise.sets.map((set) => ({
        id: set.id,
        setNumber: set.setNumber,
        minReps: set.minReps,
        maxReps: set.maxReps,
        targetWeight: roundNullable(set.targetWeight),
      })),
      exercise: exercise.exercise,
    })),
  }
}
