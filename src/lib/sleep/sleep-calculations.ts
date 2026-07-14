import {
  DEFAULT_SLEEP_GOAL_MINUTES,
  SLEEP_RECENT_NIGHTS_LIMIT,
  SLEEP_WEEK_WINDOW_DAYS,
  type RecentSleepEntry,
  type SleepDashboardData,
  type SleepDetailItem,
  type SleepLogRecord,
  type SleepSummaryMetric,
  type WeeklySleepEntry,
} from "@/lib/sleep/sleep-types"
import {
  formatDateTimeAsTime,
  formatMinutesAsDuration,
  formatPercentage,
} from "@/lib/sleep/sleep-formatters"

const MINUTES_PER_DAY = 24 * 60

export function startOfUtcDay(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  )
}

export function addUtcDays(value: Date, days: number): Date {
  const next = new Date(value)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export function toDateKey(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function getShortWeekdayLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    timeZone: "UTC",
  }).format(value)
}

export function buildRecentCalendarDays(
  dayCount = SLEEP_WEEK_WINDOW_DAYS,
  referenceDate = new Date()
): Date[] {
  const endDate = startOfUtcDay(referenceDate)
  const startDate = addUtcDays(endDate, -(dayCount - 1))

  return Array.from({ length: dayCount }, (_, index) =>
    addUtcDays(startDate, index)
  )
}

export function calculateTimeInBed(log: SleepLogRecord): number {
  if (log.timeInBedMinutes > 0) {
    return log.timeInBedMinutes
  }

  const endTime = log.outOfBedTime ?? log.wakeTime
  return Math.max(
    0,
    Math.round((endTime.getTime() - log.bedTime.getTime()) / 60000)
  )
}

export function calculateSleepLatency(log: SleepLogRecord): number | null {
  if (log.sleepLatencyMinutes != null) {
    return log.sleepLatencyMinutes
  }

  if (!log.sleepTime) {
    return null
  }

  return Math.max(
    0,
    Math.round((log.sleepTime.getTime() - log.bedTime.getTime()) / 60000)
  )
}

export function calculateTimeAsleep(log: SleepLogRecord): number {
  if (log.timeAsleepMinutes > 0) {
    return log.timeAsleepMinutes
  }

  const timeInBedMinutes = calculateTimeInBed(log)
  const latencyMinutes = calculateSleepLatency(log) ?? 0
  const awakeMinutes = log.awakeMinutes ?? 0

  return Math.max(0, timeInBedMinutes - latencyMinutes - awakeMinutes)
}

export function calculateSleepEfficiency(log: SleepLogRecord): number | null {
  if (log.sleepEfficiency != null) {
    return log.sleepEfficiency
  }

  const timeInBedMinutes = calculateTimeInBed(log)
  if (timeInBedMinutes <= 0) {
    return null
  }

  return (calculateTimeAsleep(log) / timeInBedMinutes) * 100
}

export function calculateAverageSleepDuration(
  logs: SleepLogRecord[]
): number | null {
  if (logs.length === 0) {
    return null
  }

  const totalMinutes = logs.reduce(
    (sum, log) => sum + calculateTimeAsleep(log),
    0
  )

  return totalMinutes / logs.length
}

function getBedtimeMinutes(log: SleepLogRecord): number {
  return log.bedTime.getUTCHours() * 60 + log.bedTime.getUTCMinutes()
}

export function calculateAverageBedtime(logs: SleepLogRecord[]): number | null {
  if (logs.length === 0) {
    return null
  }

  const { x, y } = logs.reduce(
    (totals, log) => {
      const angle = (getBedtimeMinutes(log) / MINUTES_PER_DAY) * 2 * Math.PI
      return {
        x: totals.x + Math.cos(angle),
        y: totals.y + Math.sin(angle),
      }
    },
    { x: 0, y: 0 }
  )

  if (x === 0 && y === 0) {
    return null
  }

  const angle = Math.atan2(y / logs.length, x / logs.length)
  const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle

  return (normalizedAngle / (2 * Math.PI)) * MINUTES_PER_DAY
}

function formatMinutesDifference(
  currentMinutes: number,
  averageMinutes: number,
  earlierLater = false
): string {
  const delta = Math.round(currentMinutes - averageMinutes)

  if (delta === 0) {
    return "In line with 7-day average"
  }

  if (earlierLater) {
    return `${Math.abs(delta)}m ${delta > 0 ? "later" : "earlier"} than average`
  }

  return `${Math.abs(delta)}m ${delta > 0 ? "above" : "below"} 7-day average`
}

function formatPointsDifference(current: number, average: number): string {
  const delta = Math.round((current - average) * 10) / 10

  if (delta === 0) {
    return "In line with 7-day average"
  }

  return `${Math.abs(delta)} ${
    Math.abs(delta) === 1 ? "point" : "points"
  } ${delta > 0 ? "above" : "below"} 7-day average`
}

function getSleepQualityLabel(score: number | null): string {
  if (score == null) {
    return "No quality rating logged"
  }

  if (score >= 8) {
    return "Good"
  }

  if (score >= 6) {
    return "Fair"
  }

  return "Poor"
}

function buildFallbackSubtitle(loggedNightCount: number): string {
  if (loggedNightCount <= 1) {
    return "Based on 1 logged night"
  }

  return "No previous data"
}

function buildSummaryMetrics(
  latestLog: SleepLogRecord | null,
  comparisonLogs: SleepLogRecord[]
): SleepSummaryMetric[] {
  const loggedNightCount = latestLog ? comparisonLogs.length + 1 : 0

  if (!latestLog) {
    return [
      {
        title: "Time asleep",
        value: "0h 0m",
        subtitle: "No sleep logged yet",
      },
      {
        title: "Sleep quality",
        value: "0 / 10",
        subtitle: "No sleep logged yet",
      },
      {
        title: "Sleep efficiency",
        value: "0%",
        subtitle: "No sleep logged yet",
      },
      {
        title: "Bedtime",
        value: "--:--",
        subtitle: "No sleep logged yet",
      },
    ]
  }

  const latestTimeAsleep = calculateTimeAsleep(latestLog)
  const averageTimeAsleep = calculateAverageSleepDuration(comparisonLogs)
  const latestQuality = latestLog.qualityScore
  const latestEfficiency = calculateSleepEfficiency(latestLog)
  const efficiencyLogs = comparisonLogs.filter(
    (log) => calculateSleepEfficiency(log) != null
  )
  const averageEfficiency =
    efficiencyLogs.length > 0
      ? efficiencyLogs.reduce(
          (sum, log) => sum + (calculateSleepEfficiency(log) ?? 0),
          0
        ) / efficiencyLogs.length
      : null
  const latestBedtimeMinutes = getBedtimeMinutes(latestLog)
  const averageBedtime = calculateAverageBedtime(comparisonLogs)

  const qualityComparisonLogs = comparisonLogs.filter(
    (log) => log.qualityScore != null
  )

  return [
    {
      title: "Time asleep",
      value: formatMinutesAsDuration(latestTimeAsleep),
      subtitle:
        averageTimeAsleep != null
          ? formatMinutesDifference(latestTimeAsleep, averageTimeAsleep)
          : buildFallbackSubtitle(loggedNightCount),
    },
    {
      title: "Sleep quality",
      value: latestQuality != null ? `${latestQuality} / 10` : "Not rated",
      subtitle:
        latestQuality != null && qualityComparisonLogs.length > 0
          ? formatPointsDifference(
              latestQuality,
              qualityComparisonLogs.reduce(
                (sum, log) => sum + (log.qualityScore ?? 0),
                0
              ) / qualityComparisonLogs.length
            )
          : getSleepQualityLabel(latestQuality),
    },
    {
      title: "Sleep efficiency",
      value:
        latestEfficiency != null ? formatPercentage(latestEfficiency) : "—",
      subtitle:
        latestEfficiency != null && averageEfficiency != null
          ? `${Math.abs(Math.round(latestEfficiency - averageEfficiency))}% ${
              latestEfficiency >= averageEfficiency ? "above" : "below"
            } average`
          : buildFallbackSubtitle(loggedNightCount),
    },
    {
      title: "Bedtime",
      value: formatDateTimeAsTime(latestLog.bedTime),
      subtitle:
        averageBedtime != null
          ? formatMinutesDifference(latestBedtimeMinutes, averageBedtime, true)
          : buildFallbackSubtitle(loggedNightCount),
    },
  ]
}

function buildLastNightDetails(
  latestLog: SleepLogRecord | null
): SleepDetailItem[] {
  if (!latestLog) {
    return []
  }

  const details: SleepDetailItem[] = [
    { label: "In bed", value: formatDateTimeAsTime(latestLog.bedTime) },
  ]

  if (latestLog.sleepTime) {
    details.push({
      label: "Fell asleep",
      value: formatDateTimeAsTime(latestLog.sleepTime),
    })
  }

  details.push({
    label: "Woke up",
    value: formatDateTimeAsTime(latestLog.wakeTime),
  })

  if (latestLog.outOfBedTime) {
    details.push({
      label: "Out of bed",
      value: formatDateTimeAsTime(latestLog.outOfBedTime),
    })
  }

  details.push(
    {
      label: "Time in bed",
      value: formatMinutesAsDuration(calculateTimeInBed(latestLog)),
    },
    {
      label: "Time asleep",
      value: formatMinutesAsDuration(calculateTimeAsleep(latestLog)),
    }
  )

  const sleepLatency = calculateSleepLatency(latestLog)
  if (sleepLatency != null) {
    details.push({
      label: "Sleep latency",
      value: `${sleepLatency}m`,
    })
  }

  if (latestLog.awakenings != null) {
    details.push({
      label: "Awakenings",
      value: String(latestLog.awakenings),
    })
  }

  const sleepEfficiency = calculateSleepEfficiency(latestLog)
  if (sleepEfficiency != null) {
    details.push({
      label: "Sleep efficiency",
      value: formatPercentage(sleepEfficiency),
    })
  }

  return details
}

function buildRecentNights(recentLogs: SleepLogRecord[]): RecentSleepEntry[] {
  return recentLogs.slice(0, SLEEP_RECENT_NIGHTS_LIMIT).map((log) => ({
    date: toDateKey(log.date),
    day: getShortWeekdayLabel(log.date),
    timeAsleepMinutes: calculateTimeAsleep(log),
    qualityScore: log.qualityScore,
  }))
}

function buildWeeklySleep(
  calendarDays: Date[],
  logsByDate: Map<string, SleepLogRecord>
): WeeklySleepEntry[] {
  return calendarDays.map((day) => {
    const dateKey = toDateKey(day)
    const log = logsByDate.get(dateKey)

    return {
      day: getShortWeekdayLabel(day),
      date: dateKey,
      timeAsleepMinutes: log ? calculateTimeAsleep(log) : null,
      timeInBedMinutes: log ? calculateTimeInBed(log) : null,
      qualityScore: log?.qualityScore ?? null,
    }
  })
}

function buildHeaderSubtitle(averageSleepDuration: number | null): string {
  if (averageSleepDuration == null) {
    return "No sleep logged in the last 7 nights"
  }

  return `Last 7 nights average: ${formatMinutesAsDuration(
    Math.round(averageSleepDuration)
  )}`
}

export function buildSleepDashboardData(params: {
  recentLogs: SleepLogRecord[]
  weeklyRangeLogs: SleepLogRecord[]
  calendarDays?: Date[]
}): SleepDashboardData {
  const calendarDays =
    params.calendarDays ?? buildRecentCalendarDays(SLEEP_WEEK_WINDOW_DAYS)
  const weeklyLogsByDate = new Map(
    params.weeklyRangeLogs.map((log) => [toDateKey(log.date), log] as const)
  )
  const latestLog = params.recentLogs[0] ?? null
  const comparisonLogs = params.recentLogs.slice(1)
  const recentAverage = calculateAverageSleepDuration(params.recentLogs)

  return {
    weeklySleep: buildWeeklySleep(calendarDays, weeklyLogsByDate),
    recentNights: buildRecentNights(params.recentLogs),
    summary: {
      subtitle: buildHeaderSubtitle(recentAverage),
      sleepGoalMinutes: DEFAULT_SLEEP_GOAL_MINUTES,
      latestNightDate: latestLog ? toDateKey(latestLog.date) : null,
      metrics: buildSummaryMetrics(latestLog, comparisonLogs),
    },
    lastNightDetails: buildLastNightDetails(latestLog),
  }
}
