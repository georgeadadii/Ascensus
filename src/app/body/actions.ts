"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/database/prisma"
import type { Prisma } from "@/lib/database/generated/client"
import type { BodyMetricField } from "@/app/db/body-metrics"

/** Metrics stored in kilograms — these honour the kg/lbs/st unit toggle. */
const MASS_FIELDS: BodyMetricField[] = ["weight", "muscleMass", "leanMass"]

const KG_PER_LB = 0.45359237
const KG_PER_STONE = 6.35029318

/** Convert an entered value into the canonical stored unit (kg, or % as-is). */
function toCanonical(
  field: BodyMetricField,
  value: number,
  unit: string
): number {
  if (!MASS_FIELDS.includes(field)) return value
  if (unit === "lbs") return value * KG_PER_LB
  if (unit === "st") return value * KG_PER_STONE
  return value
}

/** 00:00 UTC of the given day — the unique key for "today's" log. */
function startOfUtcDay(date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
}

export type LogBodyMetricInput = {
  metric: BodyMetricField
  value: number
  unit?: string
}

export type LogBodyMetricResult =
  { ok: true; value: number } | { ok: false; error: string }

/**
 * Records a single body metric for the signed-in user. Limited to one row per
 * day: if a log already exists for today it is updated in place rather than
 * inserted as a new row (enforced by the `@@unique([userId, date])` index).
 */
export async function logBodyMetric({
  metric,
  value,
  unit = "kg",
}: LogBodyMetricInput): Promise<LogBodyMetricResult> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return { ok: false, error: "You must be signed in to log a metric." }
  }

  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, error: "Enter a valid number." }
  }

  const userId = session.user.id
  const date = startOfUtcDay()
  const stored = Math.round(toCanonical(metric, value, unit) * 100) / 100

  // Computed key — typed loosely here, then narrowed to the Prisma inputs.
  const fieldData = { [metric]: stored }

  await prisma.bodyMetric.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      ...fieldData,
    } as Prisma.BodyMetricUncheckedCreateInput,
    update: fieldData as Prisma.BodyMetricUncheckedUpdateInput,
  })

  revalidatePath("/body")
  return { ok: true, value: stored }
}
