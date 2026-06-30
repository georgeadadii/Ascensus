import { prisma } from "@/lib/database/prisma"

export type BodyMetricField = "weight" | "bodyFat" | "muscleMass" | "leanMass"

export type MetricPoint = { date: string; value: number }

export type WeekDay = {
  day: string
  date: string
  value: number | null
  today: boolean
}

export type MetricSummary = {
  field: BodyMetricField
  latest: number | null
  latestDate: string | null
  previous: number | null
  previousDate: string | null
  /** latest - previous, null when there is nothing to compare against */
  delta: number | null
  /** Mon..Sun of the current week, with the logged value per day (or null) */
  week: WeekDay[]
  /** chronological series used by the trend chart */
  series: MetricPoint[]
}

export type BodyOverview = {
  summaries: Record<BodyMetricField, MetricSummary>
  /** target weight from the user's baseline, used as the chart goal line */
  targetWeight: number | null
}

const FIELDS: BodyMetricField[] = [
  "weight",
  "bodyFat",
  "muscleMass",
  "leanMass",
]

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/** YYYY-MM-DD in UTC — the canonical "day" key for a metric row. */
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Monday (00:00 UTC) of the week containing `ref`. */
function startOfWeek(ref: Date): Date {
  const d = new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate())
  )
  // getUTCDay(): 0 = Sunday … 6 = Saturday. Shift so Monday = 0.
  const offset = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - offset)
  return d
}

type MetricRow = {
  date: Date
  weight: number | null
  bodyFat: number | null
  muscleMass: number | null
  leanMass: number | null
}

function buildSummary(
  field: BodyMetricField,
  rows: MetricRow[],
  now: Date
): MetricSummary {
  const points: MetricPoint[] = rows
    .filter((row) => row[field] != null)
    .map((row) => ({ date: dayKey(row.date), value: row[field] as number }))

  const latestPoint = points.at(-1) ?? null
  const previousPoint = points.length > 1 ? points.at(-2)! : null

  const todayKey = dayKey(now)
  const weekStart = startOfWeek(now)
  const week: WeekDay[] = DAY_LABELS.map((label, index) => {
    const d = new Date(weekStart)
    d.setUTCDate(d.getUTCDate() + index)
    const key = dayKey(d)
    const point = points.find((p) => p.date === key)
    return {
      day: label,
      date: key,
      value: point ? point.value : null,
      today: key === todayKey,
    }
  })

  return {
    field,
    latest: latestPoint?.value ?? null,
    latestDate: latestPoint?.date ?? null,
    previous: previousPoint?.value ?? null,
    previousDate: previousPoint?.date ?? null,
    delta:
      latestPoint && previousPoint
        ? Math.round((latestPoint.value - previousPoint.value) * 100) / 100
        : null,
    week,
    series: points,
  }
}

/**
 * Loads everything the Body dashboard needs in one query: per-metric latest /
 * previous readings, the current week's logs and a chronological series.
 */
export async function getBodyOverview(userId: string): Promise<BodyOverview> {
  const now = new Date()
  const since = new Date(now)
  since.setUTCDate(since.getUTCDate() - 120)

  const [rows, baseline] = await Promise.all([
    prisma.bodyMetric.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: "asc" },
      select: {
        date: true,
        weight: true,
        bodyFat: true,
        muscleMass: true,
        leanMass: true,
      },
    }),
    prisma.userBaseline.findUnique({
      where: { userId },
      select: { targetWeight: true },
    }),
  ])

  const summaries = Object.fromEntries(
    FIELDS.map((field) => [field, buildSummary(field, rows, now)])
  ) as Record<BodyMetricField, MetricSummary>

  return {
    summaries,
    targetWeight: baseline?.targetWeight ?? null,
  }
}
