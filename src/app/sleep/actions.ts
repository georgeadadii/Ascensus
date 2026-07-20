"use server"

import "server-only"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/database/prisma"
import { SleepSource } from "@/lib/database/generated/client"
import type { Prisma } from "@/lib/database/generated/client"
import {
  validateManualSleepLogValues,
  type ManualSleepLogErrors,
  type ManualSleepLogValues,
} from "@/lib/sleep/manual-sleep-log-validation"

type SaveManualSleepLogResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: ManualSleepLogErrors }

function parseDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return null
  }

  const [, year, month, day] = match

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  }
}

function parseTimeInput(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  if (!match) {
    return null
  }

  const [, hours, minutes] = match

  return {
    hours: Number(hours),
    minutes: Number(minutes),
  }
}

function buildUtcDateTime(
  date: { year: number; month: number; day: number },
  time: { hours: number; minutes: number }
) {
  return new Date(
    Date.UTC(date.year, date.month - 1, date.day, time.hours, time.minutes)
  )
}

function startOfUtcDay(date: { year: number; month: number; day: number }) {
  return new Date(Date.UTC(date.year, date.month - 1, date.day))
}

function subtractUtcDays(value: Date, days: number) {
  const next = new Date(value)
  next.setUTCDate(next.getUTCDate() - days)
  return next
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100
}

function buildSleepLogWriteInput(values: ManualSleepLogValues) {
  const parsedDate = parseDateInput(values.sleepDate)
  const parsedBedtime = parseTimeInput(values.bedtime)
  const parsedWakeTime = parseTimeInput(values.wakeTime)

  if (!parsedDate || !parsedBedtime || !parsedWakeTime) {
    return {
      ok: false as const,
      error: "Please correct the highlighted fields.",
      fieldErrors: validateManualSleepLogValues(values),
    }
  }

  const date = startOfUtcDay(parsedDate)
  const wakeTime = buildUtcDateTime(parsedDate, parsedWakeTime)

  const bedtimeMinutes = parsedBedtime.hours * 60 + parsedBedtime.minutes
  const wakeMinutes = parsedWakeTime.hours * 60 + parsedWakeTime.minutes
  const bedDate = bedtimeMinutes > wakeMinutes ? subtractUtcDays(date, 1) : date
  const bedTime = new Date(
    Date.UTC(
      bedDate.getUTCFullYear(),
      bedDate.getUTCMonth(),
      bedDate.getUTCDate(),
      parsedBedtime.hours,
      parsedBedtime.minutes
    )
  )

  const sleepLatencyMinutes = values.timeToFallAsleep
  const awakeMinutes = values.awakeDuration
  const latencyForCalculation = sleepLatencyMinutes ?? 0
  const awakeForCalculation = awakeMinutes ?? 0

  const timeInBedMinutes = Math.round(
    (wakeTime.getTime() - bedTime.getTime()) / 60000
  )
  const timeAsleepMinutes =
    timeInBedMinutes - latencyForCalculation - awakeForCalculation
  const sleepEfficiency =
    timeInBedMinutes > 0
      ? roundToTwoDecimals((timeAsleepMinutes / timeInBedMinutes) * 100)
      : -1

  const fieldErrors: ManualSleepLogErrors = {}

  if (timeInBedMinutes <= 0) {
    fieldErrors.wakeTime = "Wake time must be after bedtime."
  }

  if (timeAsleepMinutes < 0) {
    fieldErrors.awakeDuration =
      "Time asleep cannot be negative based on the entered values."
  }

  if (sleepEfficiency < 0 || sleepEfficiency > 100) {
    fieldErrors.sleepQuality = "Sleep efficiency must be between 0 and 100%."
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false as const,
      error: "Please correct the highlighted fields.",
      fieldErrors,
    }
  }

  return {
    ok: true as const,
    writeInput: {
      date,
      bedTime,
      sleepTime:
        sleepLatencyMinutes != null
          ? new Date(bedTime.getTime() + sleepLatencyMinutes * 60000)
          : null,
      wakeTime,
      outOfBedTime: wakeTime,
      timeInBedMinutes,
      timeAsleepMinutes,
      sleepLatencyMinutes,
      awakeMinutes,
      sleepEfficiency,
      qualityScore: values.sleepQuality,
      awakenings: values.awakenings,
      notes: values.notes.trim() || null,
      source: SleepSource.MANUAL,
    } satisfies Prisma.SleepLogUncheckedUpdateInput,
  }
}

export async function saveManualSleepLog(
  values: ManualSleepLogValues
): Promise<SaveManualSleepLogResult> {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return { ok: false, error: "You must be signed in to log sleep." }
  }

  const fieldErrors = validateManualSleepLogValues(values)

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors,
    }
  }

  const prepared = buildSleepLogWriteInput(values)

  if (!prepared.ok) {
    return prepared
  }

  const userId = session.user.id

  try {
    const createData: Prisma.SleepLogUncheckedCreateInput = {
      userId,
      ...prepared.writeInput,
    }

    const updateData: Prisma.SleepLogUncheckedUpdateInput = {
      ...prepared.writeInput,
    }

    await prisma.sleepLog.upsert({
      where: {
        userId_date: {
          userId,
          date: prepared.writeInput.date,
        },
      },
      create: createData,
      update: updateData,
    })
  } catch {
    return {
      ok: false,
      error: "Unable to save your sleep log right now.",
    }
  }

  revalidatePath("/sleep")
  return { ok: true }
}
