import { prisma } from "@/lib/database/prisma"
import {
  getTrainingPersonalRecordSlots,
  type TrainingPersonalRecordSlot,
} from "@/app/db/personal-record-slots"

const RECENT_WORKOUT_LIMIT = 5
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

type RecentWorkoutExercise = {
  exerciseName: string
  sets: {
    id: string
    setNumber: number
    weight: number | null
    reps: number | null
    volume: number
    completedAt: string | null
    isWarmup: boolean
    isFailure: boolean
  }[]
}

export type TrainingOverview = {
  recentWorkouts: {
    id: string
    name: string
    startedAt: string
    durationMinutes: number | null
    totalVolume: number
    totalSets: number
    exercises: RecentWorkoutExercise[]
  }[]
  templates: {
    id: string
    name: string
    description: string | null
    split: string | null
    exerciseCount: number
  }[]
  weeklyVolume: {
    day: string
    date: string
    totalVolume: number
    workoutCount: number
    today: boolean
  }[]
  personalRecords: TrainingPersonalRecordSlot[]
}

function roundNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfWeek(ref: Date): Date {
  const d = new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate())
  )
  const offset = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - offset)
  return d
}

function endOfWeek(ref: Date): Date {
  const d = startOfWeek(ref)
  d.setUTCDate(d.getUTCDate() + 7)
  return d
}

export async function getTrainingOverview(
  userId: string
): Promise<TrainingOverview> {
  const now = new Date()
  const weekStart = startOfWeek(now)
  const weekEnd = endOfWeek(now)
  const todayKey = dayKey(now)

  const [recentSessions, templates, weeklySessions, personalRecords] =
    await Promise.all([
      prisma.workoutSession.findMany({
        where: {
          userId,
          status: "COMPLETED",
        },
        orderBy: [{ startedAt: "desc" }, { id: "desc" }],
        take: RECENT_WORKOUT_LIMIT,
        select: {
          id: true,
          name: true,
          startedAt: true,
          durationMinutes: true,
          totalVolume: true,
          totalSets: true,
          exercises: {
            orderBy: [{ order: "asc" }, { id: "asc" }],
            select: {
              id: true,
              exercise: {
                select: {
                  name: true,
                },
              },
              sets: {
                orderBy: [{ setNumber: "asc" }, { id: "asc" }],
                select: {
                  id: true,
                  setNumber: true,
                  weight: true,
                  reps: true,
                  volume: true,
                  completedAt: true,
                  isWarmup: true,
                  isFailure: true,
                },
              },
            },
          },
        },
      }),
      prisma.workoutTemplate.findMany({
        where: { userId },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          name: true,
          description: true,
          split: true,
          _count: {
            select: {
              exercises: true,
            },
          },
        },
      }),
      prisma.workoutSession.findMany({
        where: {
          userId,
          status: "COMPLETED",
          startedAt: {
            gte: weekStart,
            lt: weekEnd,
          },
        },
        orderBy: [{ startedAt: "asc" }, { id: "asc" }],
        select: {
          startedAt: true,
          totalVolume: true,
        },
      }),
      getTrainingPersonalRecordSlots(userId),
    ])

  const weeklyVolumeMap = new Map<
    string,
    { totalVolume: number; workoutCount: number }
  >()
  for (const session of weeklySessions) {
    const key = dayKey(session.startedAt)
    const current = weeklyVolumeMap.get(key) ?? {
      totalVolume: 0,
      workoutCount: 0,
    }
    current.totalVolume = roundNumber(current.totalVolume + session.totalVolume)
    current.workoutCount += 1
    weeklyVolumeMap.set(key, current)
  }

  const weeklyVolume = DAY_LABELS.map((day, index) => {
    const date = new Date(weekStart)
    date.setUTCDate(date.getUTCDate() + index)
    const key = dayKey(date)
    const value = weeklyVolumeMap.get(key)

    return {
      day,
      date: key,
      totalVolume: value?.totalVolume ?? 0,
      workoutCount: value?.workoutCount ?? 0,
      today: key === todayKey,
    }
  })

  return {
    recentWorkouts: recentSessions.map((session) => ({
      id: session.id,
      name: session.name,
      startedAt: session.startedAt.toISOString(),
      durationMinutes: session.durationMinutes,
      totalVolume: roundNumber(session.totalVolume),
      totalSets: session.totalSets,
      exercises: session.exercises.map((exercise) => ({
        exerciseName: exercise.exercise.name,
        sets: exercise.sets.map((set) => ({
          id: set.id,
          setNumber: set.setNumber,
          weight: set.weight != null ? roundNumber(set.weight) : null,
          reps: set.reps,
          volume: roundNumber(set.volume),
          completedAt: set.completedAt?.toISOString() ?? null,
          isWarmup: set.isWarmup,
          isFailure: set.isFailure,
        })),
      })),
    })),
    templates: templates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      split: template.split,
      exerciseCount: template._count.exercises,
    })),
    weeklyVolume,
    personalRecords,
  }
}
