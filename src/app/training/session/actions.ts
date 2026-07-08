"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import {
  getTrainingSessionExercise,
  type TrainingSessionExerciseView,
  type TrainingSessionSetView,
} from "@/app/db/training-session"
import { auth } from "@/lib/auth/auth"
import type { Prisma } from "@/lib/database/generated/client"
import { prisma } from "@/lib/database/prisma"

type MutationResult<T> = { ok: true; data: T } | { ok: false; error: string }

type SessionMutationContext = {
  userId: string
  sessionId: string
  editable: boolean
}

function roundNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

function roundNullable(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

function computeSetVolume(weight: number | null, reps: number | null) {
  if (weight == null || reps == null) return null
  return roundNumber(weight * reps)
}

async function getMutationContext(
  sessionId: string
): Promise<SessionMutationContext | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null

  const workoutSession = await prisma.workoutSession.findFirst({
    where: {
      id: sessionId,
      userId: session.user.id,
    },
    select: {
      id: true,
      status: true,
    },
  })

  if (!workoutSession) return null

  return {
    userId: session.user.id,
    sessionId: workoutSession.id,
    editable: workoutSession.status === "IN_PROGRESS",
  }
}

async function updateSessionAggregates(
  db: Prisma.TransactionClient | typeof prisma,
  sessionId: string
) {
  const aggregate = await db.workoutSet.aggregate({
    where: {
      workoutExercise: {
        sessionId,
      },
      completedAt: {
        not: null,
      },
    },
    _count: {
      id: true,
    },
    _sum: {
      volume: true,
    },
  })

  await db.workoutSession.update({
    where: {
      id: sessionId,
    },
    data: {
      totalSets: aggregate._count.id,
      totalVolume: roundNumber(aggregate._sum.volume),
    },
  })
}

function revalidateTraining(sessionId: string) {
  revalidatePath("/training")
  revalidatePath(`/training/session/${sessionId}`)
}

export async function updateWorkoutTitle(
  sessionId: string,
  name: string
): Promise<MutationResult<{ name: string }>> {
  const context = await getMutationContext(sessionId)
  if (!context) {
    return { ok: false, error: "You must be signed in to update this workout." }
  }
  if (!context.editable) {
    return { ok: false, error: "This workout can no longer be edited." }
  }

  const trimmed = name.trim()
  if (!trimmed) {
    return { ok: false, error: "Workout title cannot be empty." }
  }

  await prisma.workoutSession.update({
    where: {
      id: context.sessionId,
    },
    data: {
      name: trimmed,
    },
  })

  revalidateTraining(context.sessionId)
  return {
    ok: true,
    data: {
      name: trimmed,
    },
  }
}

export async function addExercise(
  sessionId: string,
  exerciseId: string
): Promise<MutationResult<{ exercise: TrainingSessionExerciseView }>> {
  const context = await getMutationContext(sessionId)
  if (!context) {
    return { ok: false, error: "You must be signed in to edit this workout." }
  }
  if (!context.editable) {
    return { ok: false, error: "This workout can no longer be edited." }
  }

  const exercise = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      OR: [{ userId: null }, { userId: context.userId }],
    },
    select: {
      id: true,
    },
  })

  if (!exercise) {
    return { ok: false, error: "That exercise could not be found." }
  }

  const workoutExercise = await prisma.$transaction(async (tx) => {
    const currentMax = await tx.workoutExercise.aggregate({
      where: {
        sessionId: context.sessionId,
      },
      _max: {
        order: true,
      },
    })

    const createdExercise = await tx.workoutExercise.create({
      data: {
        sessionId: context.sessionId,
        exerciseId: exercise.id,
        order: (currentMax._max.order ?? 0) + 1,
        sets: {
          create: {
            setNumber: 1,
          },
        },
      },
      select: {
        id: true,
      },
    })

    await updateSessionAggregates(tx, context.sessionId)
    return createdExercise
  })

  const view = await getTrainingSessionExercise(
    context.userId,
    workoutExercise.id
  )
  if (!view) {
    return { ok: false, error: "Unable to load the added exercise." }
  }

  revalidateTraining(context.sessionId)
  return {
    ok: true,
    data: {
      exercise: view,
    },
  }
}

export async function removeExercise(
  sessionId: string,
  workoutExerciseId: string
): Promise<MutationResult<{ workoutExerciseId: string }>> {
  const context = await getMutationContext(sessionId)
  if (!context) {
    return { ok: false, error: "You must be signed in to edit this workout." }
  }
  if (!context.editable) {
    return { ok: false, error: "This workout can no longer be edited." }
  }

  const removed = await prisma.$transaction(async (tx) => {
    const workoutExercise = await tx.workoutExercise.findFirst({
      where: {
        id: workoutExerciseId,
        sessionId: context.sessionId,
      },
      select: {
        id: true,
      },
    })

    if (!workoutExercise) return null

    await tx.workoutExercise.delete({
      where: {
        id: workoutExerciseId,
      },
    })

    const remaining = await tx.workoutExercise.findMany({
      where: {
        sessionId: context.sessionId,
      },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: {
        id: true,
      },
    })

    await Promise.all(
      remaining.map((exercise, index) =>
        tx.workoutExercise.update({
          where: {
            id: exercise.id,
          },
          data: {
            order: index + 1,
          },
        })
      )
    )

    await updateSessionAggregates(tx, context.sessionId)
    return workoutExercise
  })

  if (!removed) {
    return { ok: false, error: "That exercise could not be found." }
  }

  revalidateTraining(context.sessionId)
  return {
    ok: true,
    data: {
      workoutExerciseId,
    },
  }
}

export async function addSet(
  sessionId: string,
  workoutExerciseId: string
): Promise<MutationResult<{ set: TrainingSessionSetView }>> {
  const context = await getMutationContext(sessionId)
  if (!context) {
    return { ok: false, error: "You must be signed in to edit this workout." }
  }
  if (!context.editable) {
    return { ok: false, error: "This workout can no longer be edited." }
  }

  const createdSet = await prisma.$transaction(async (tx) => {
    const workoutExercise = await tx.workoutExercise.findFirst({
      where: {
        id: workoutExerciseId,
        sessionId: context.sessionId,
      },
      select: {
        id: true,
        sets: {
          orderBy: [{ setNumber: "desc" }, { id: "desc" }],
          take: 1,
          select: {
            setNumber: true,
          },
        },
      },
    })

    if (!workoutExercise) return null

    return tx.workoutSet.create({
      data: {
        workoutExerciseId: workoutExercise.id,
        setNumber: (workoutExercise.sets[0]?.setNumber ?? 0) + 1,
      },
      select: {
        id: true,
        setNumber: true,
        weight: true,
        reps: true,
        completedAt: true,
      },
    })
  })

  if (!createdSet) {
    return { ok: false, error: "That exercise could not be found." }
  }

  revalidateTraining(context.sessionId)
  return {
    ok: true,
    data: {
      set: {
        id: createdSet.id,
        setNumber: createdSet.setNumber,
        weight: null,
        reps: null,
        completedAt: createdSet.completedAt?.toISOString() ?? null,
      },
    },
  }
}

export async function removeSet(
  sessionId: string,
  setId: string
): Promise<
  MutationResult<{
    workoutExerciseId: string
    removedSetId: string
    setIds: string[]
  }>
> {
  const context = await getMutationContext(sessionId)
  if (!context) {
    return { ok: false, error: "You must be signed in to edit this workout." }
  }
  if (!context.editable) {
    return { ok: false, error: "This workout can no longer be edited." }
  }

  const result = await prisma.$transaction(async (tx) => {
    const set = await tx.workoutSet.findFirst({
      where: {
        id: setId,
        workoutExercise: {
          sessionId: context.sessionId,
        },
      },
      select: {
        id: true,
        workoutExerciseId: true,
      },
    })

    if (!set) return null

    await tx.workoutSet.delete({
      where: {
        id: set.id,
      },
    })

    const remainingSets = await tx.workoutSet.findMany({
      where: {
        workoutExerciseId: set.workoutExerciseId,
      },
      orderBy: [{ setNumber: "asc" }, { id: "asc" }],
      select: {
        id: true,
      },
    })

    await Promise.all(
      remainingSets.map((remainingSet, index) =>
        tx.workoutSet.update({
          where: {
            id: remainingSet.id,
          },
          data: {
            setNumber: index + 1,
          },
        })
      )
    )

    await updateSessionAggregates(tx, context.sessionId)
    return {
      workoutExerciseId: set.workoutExerciseId,
      setIds: remainingSets.map((remainingSet) => remainingSet.id),
    }
  })

  if (!result) {
    return { ok: false, error: "That set could not be found." }
  }

  revalidateTraining(context.sessionId)
  return {
    ok: true,
    data: {
      workoutExerciseId: result.workoutExerciseId,
      removedSetId: setId,
      setIds: result.setIds,
    },
  }
}

type UpdateSetInput = {
  weight?: number | null
  reps?: number | null
  completed?: boolean
}

export async function updateSet(
  sessionId: string,
  setId: string,
  input: UpdateSetInput
): Promise<MutationResult<{ set: TrainingSessionSetView }>> {
  const context = await getMutationContext(sessionId)
  if (!context) {
    return { ok: false, error: "You must be signed in to edit this workout." }
  }
  if (!context.editable) {
    return { ok: false, error: "This workout can no longer be edited." }
  }

  const currentSet = await prisma.workoutSet.findFirst({
    where: {
      id: setId,
      workoutExercise: {
        sessionId: context.sessionId,
      },
    },
    select: {
      id: true,
      setNumber: true,
      weight: true,
      reps: true,
      completedAt: true,
    },
  })

  if (!currentSet) {
    return { ok: false, error: "That set could not be found." }
  }

  const nextWeight =
    input.weight === undefined ? currentSet.weight : roundNullable(input.weight)
  const nextReps = input.reps === undefined ? currentSet.reps : input.reps

  if (nextWeight != null && nextWeight < 0) {
    return { ok: false, error: "Weight must be zero or greater." }
  }
  if (nextReps != null && (!Number.isInteger(nextReps) || nextReps < 0)) {
    return { ok: false, error: "Reps must be a whole number." }
  }

  const completedAt =
    input.completed === undefined
      ? currentSet.completedAt
      : input.completed
        ? new Date()
        : null

  const updatedSet = await prisma.workoutSet.update({
    where: {
      id: currentSet.id,
    },
    data: {
      weight: nextWeight,
      reps: nextReps,
      completedAt,
      volume: computeSetVolume(nextWeight, nextReps),
    },
    select: {
      id: true,
      setNumber: true,
      weight: true,
      reps: true,
      completedAt: true,
    },
  })

  await updateSessionAggregates(prisma, context.sessionId)

  revalidateTraining(context.sessionId)
  return {
    ok: true,
    data: {
      set: {
        id: updatedSet.id,
        setNumber: updatedSet.setNumber,
        weight:
          updatedSet.weight != null ? roundNumber(updatedSet.weight) : null,
        reps: updatedSet.reps,
        completedAt: updatedSet.completedAt?.toISOString() ?? null,
      },
    },
  }
}

export async function finishWorkout(
  sessionId: string
): Promise<MutationResult<{ redirectTo: string }>> {
  const context = await getMutationContext(sessionId)
  if (!context) {
    return { ok: false, error: "You must be signed in to finish this workout." }
  }
  if (!context.editable) {
    return { ok: false, error: "This workout has already been closed." }
  }

  const session = await prisma.workoutSession.findUnique({
    where: {
      id: context.sessionId,
    },
    select: {
      startedAt: true,
    },
  })

  if (!session) {
    return { ok: false, error: "That workout could not be found." }
  }

  await updateSessionAggregates(prisma, context.sessionId)

  const finishedAt = new Date()
  const durationMinutes = Math.max(
    0,
    Math.round((finishedAt.getTime() - session.startedAt.getTime()) / 60000)
  )

  await prisma.workoutSession.update({
    where: {
      id: context.sessionId,
    },
    data: {
      status: "COMPLETED",
      finishedAt,
      durationMinutes,
    },
  })

  revalidateTraining(context.sessionId)
  return {
    ok: true,
    data: {
      redirectTo: "/training",
    },
  }
}

export async function cancelWorkout(
  sessionId: string
): Promise<MutationResult<{ redirectTo: string }>> {
  const context = await getMutationContext(sessionId)
  if (!context) {
    return { ok: false, error: "You must be signed in to cancel this workout." }
  }
  if (!context.editable) {
    return { ok: false, error: "This workout has already been closed." }
  }

  await prisma.workoutSession.update({
    where: {
      id: context.sessionId,
    },
    data: {
      status: "CANCELLED",
      finishedAt: new Date(),
    },
  })

  revalidateTraining(context.sessionId)
  return {
    ok: true,
    data: {
      redirectTo: "/training",
    },
  }
}
