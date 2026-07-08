import type { WorkoutStatus } from "@/lib/database/generated/enums"
import { prisma } from "@/lib/database/prisma"

export type TrainingSessionSetView = {
  id: string
  setNumber: number
  weight: number | null
  reps: number | null
  completedAt: string | null
}

export type TrainingSessionPreviousSetView = {
  setNumber: number
  weight: number | null
  reps: number | null
}

export type TrainingSessionExerciseView = {
  id: string
  exerciseId: string
  order: number
  name: string
  primaryMuscle: string | null
  equipment: string | null
  difficulty: string | null
  hasPersonalRecord: boolean
  previousSets: TrainingSessionPreviousSetView[]
  sets: TrainingSessionSetView[]
}

export type TrainingSessionView = {
  id: string
  name: string
  status: WorkoutStatus
  startedAt: string
  finishedAt: string | null
  isEditable: boolean
  totals: {
    totalSets: number
    totalReps: number
    totalVolume: number
    exerciseCount: number
  }
  exercises: TrainingSessionExerciseView[]
}

function roundNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

function mapSet(set: {
  id: string
  setNumber: number
  weight: number | null
  reps: number | null
  completedAt: Date | null
}): TrainingSessionSetView {
  return {
    id: set.id,
    setNumber: set.setNumber,
    weight: set.weight != null ? roundNumber(set.weight) : null,
    reps: set.reps,
    completedAt: set.completedAt?.toISOString() ?? null,
  }
}

function buildTotals(exercises: TrainingSessionExerciseView[]) {
  let totalSets = 0
  let totalReps = 0
  let totalVolume = 0

  for (const exercise of exercises) {
    for (const set of exercise.sets) {
      if (!set.completedAt) continue

      totalSets += 1
      totalReps += set.reps ?? 0
      totalVolume += (set.weight ?? 0) * (set.reps ?? 0)
    }
  }

  return {
    totalSets,
    totalReps,
    totalVolume: roundNumber(totalVolume),
    exerciseCount: exercises.length,
  }
}

async function getPreviousSetsByExerciseIds(
  userId: string,
  exerciseIds: string[]
) {
  if (exerciseIds.length === 0) {
    return new Map<string, TrainingSessionPreviousSetView[]>()
  }

  const previousExercises = await prisma.workoutExercise.findMany({
    where: {
      exerciseId: {
        in: exerciseIds,
      },
      session: {
        userId,
        status: "COMPLETED",
      },
      sets: {
        some: {
          completedAt: {
            not: null,
          },
        },
      },
    },
    orderBy: [
      { session: { startedAt: "desc" } },
      { order: "asc" },
      { id: "desc" },
    ],
    select: {
      exerciseId: true,
      sets: {
        where: {
          completedAt: {
            not: null,
          },
        },
        orderBy: [{ setNumber: "asc" }, { id: "asc" }],
        select: {
          setNumber: true,
          weight: true,
          reps: true,
        },
      },
    },
  })

  const previousByExerciseId = new Map<
    string,
    TrainingSessionPreviousSetView[]
  >()
  for (const previousExercise of previousExercises) {
    if (previousByExerciseId.has(previousExercise.exerciseId)) continue

    previousByExerciseId.set(
      previousExercise.exerciseId,
      previousExercise.sets.map((set) => ({
        setNumber: set.setNumber,
        weight: set.weight != null ? roundNumber(set.weight) : null,
        reps: set.reps,
      }))
    )
  }

  return previousByExerciseId
}

export async function getTrainingSessionExercise(
  userId: string,
  workoutExerciseId: string
): Promise<TrainingSessionExerciseView | null> {
  const workoutExercise = await prisma.workoutExercise.findFirst({
    where: {
      id: workoutExerciseId,
      session: {
        userId,
      },
    },
    select: {
      id: true,
      exerciseId: true,
      order: true,
      exercise: {
        select: {
          name: true,
          primaryMuscle: true,
          equipment: true,
          difficulty: true,
          personalRecords: {
            where: { userId },
            take: 1,
            select: { id: true },
          },
        },
      },
      sets: {
        orderBy: [{ setNumber: "asc" }, { id: "asc" }],
        select: {
          id: true,
          setNumber: true,
          weight: true,
          reps: true,
          completedAt: true,
        },
      },
    },
  })

  if (!workoutExercise) return null

  const previousByExerciseId = await getPreviousSetsByExerciseIds(userId, [
    workoutExercise.exerciseId,
  ])

  return {
    id: workoutExercise.id,
    exerciseId: workoutExercise.exerciseId,
    order: workoutExercise.order,
    name: workoutExercise.exercise.name,
    primaryMuscle: workoutExercise.exercise.primaryMuscle,
    equipment: workoutExercise.exercise.equipment,
    difficulty: workoutExercise.exercise.difficulty,
    hasPersonalRecord: workoutExercise.exercise.personalRecords.length > 0,
    previousSets: previousByExerciseId.get(workoutExercise.exerciseId) ?? [],
    sets: workoutExercise.sets.map(mapSet),
  }
}

export async function getTrainingSession(
  userId: string,
  sessionId: string
): Promise<TrainingSessionView | null> {
  const session = await prisma.workoutSession.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    select: {
      id: true,
      name: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      exercises: {
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: {
          id: true,
          exerciseId: true,
          order: true,
          exercise: {
            select: {
              name: true,
              primaryMuscle: true,
              equipment: true,
              difficulty: true,
              personalRecords: {
                where: { userId },
                take: 1,
                select: { id: true },
              },
            },
          },
          sets: {
            orderBy: [{ setNumber: "asc" }, { id: "asc" }],
            select: {
              id: true,
              setNumber: true,
              weight: true,
              reps: true,
              completedAt: true,
            },
          },
        },
      },
    },
  })

  if (!session) return null

  const previousByExerciseId = await getPreviousSetsByExerciseIds(
    userId,
    session.exercises.map((exercise) => exercise.exerciseId)
  )

  const exercises = session.exercises.map((exercise) => ({
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    order: exercise.order,
    name: exercise.exercise.name,
    primaryMuscle: exercise.exercise.primaryMuscle,
    equipment: exercise.exercise.equipment,
    difficulty: exercise.exercise.difficulty,
    hasPersonalRecord: exercise.exercise.personalRecords.length > 0,
    previousSets: previousByExerciseId.get(exercise.exerciseId) ?? [],
    sets: exercise.sets.map(mapSet),
  }))

  return {
    id: session.id,
    name: session.name,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    finishedAt: session.finishedAt?.toISOString() ?? null,
    isEditable: session.status === "IN_PROGRESS",
    totals: buildTotals(exercises),
    exercises,
  }
}
