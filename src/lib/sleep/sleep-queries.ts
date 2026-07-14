import { prisma } from "@/lib/database/prisma"
import {
  addUtcDays,
  buildRecentCalendarDays,
  buildSleepDashboardData,
  startOfUtcDay,
} from "@/lib/sleep/sleep-calculations"
import {
  SLEEP_WEEK_WINDOW_DAYS,
  type SleepDashboardData,
  type SleepLogRecord,
} from "@/lib/sleep/sleep-types"

const sleepLogSelect = {
  id: true,
  date: true,
  bedTime: true,
  sleepTime: true,
  wakeTime: true,
  outOfBedTime: true,
  timeInBedMinutes: true,
  timeAsleepMinutes: true,
  sleepLatencyMinutes: true,
  awakeMinutes: true,
  sleepEfficiency: true,
  qualityScore: true,
  awakenings: true,
} as const

async function getRecentSleepLogs(
  userId: string,
  limit = SLEEP_WEEK_WINDOW_DAYS
): Promise<SleepLogRecord[]> {
  return prisma.sleepLog.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
    select: sleepLogSelect,
  })
}

async function getSleepLogsForRecentCalendarDays(
  userId: string,
  dayCount = SLEEP_WEEK_WINDOW_DAYS,
  referenceDate = new Date()
): Promise<{ calendarDays: Date[]; logs: SleepLogRecord[] }> {
  const calendarDays = buildRecentCalendarDays(dayCount, referenceDate)
  const startDate = startOfUtcDay(calendarDays[0])
  const endDate = startOfUtcDay(calendarDays.at(-1) ?? referenceDate)

  const logs = await prisma.sleepLog.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lt: addUtcDays(endDate, 1),
      },
    },
    orderBy: { date: "asc" },
    select: sleepLogSelect,
  })

  return { calendarDays, logs }
}

export async function getSleepDashboardData(
  userId: string
): Promise<SleepDashboardData> {
  const [recentLogs, weeklyRange] = await Promise.all([
    getRecentSleepLogs(userId),
    getSleepLogsForRecentCalendarDays(userId),
  ])

  return buildSleepDashboardData({
    recentLogs,
    weeklyRangeLogs: weeklyRange.logs,
    calendarDays: weeklyRange.calendarDays,
  })
}
