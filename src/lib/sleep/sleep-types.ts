export const SLEEP_WEEK_WINDOW_DAYS = 7
export const SLEEP_RECENT_NIGHTS_LIMIT = 5
export const DEFAULT_SLEEP_GOAL_MINUTES = 8 * 60

export type SleepLogRecord = {
  id: string
  date: Date
  bedTime: Date
  sleepTime: Date | null
  wakeTime: Date
  outOfBedTime: Date | null
  timeInBedMinutes: number
  timeAsleepMinutes: number
  sleepLatencyMinutes: number | null
  awakeMinutes: number | null
  sleepEfficiency: number | null
  qualityScore: number | null
  awakenings: number | null
}

export type WeeklySleepEntry = {
  day: string
  date: string
  timeAsleepMinutes: number | null
  timeInBedMinutes: number | null
  qualityScore: number | null
}

export type RecentSleepEntry = {
  date: string
  day: string
  timeAsleepMinutes: number
  qualityScore: number | null
}

export type SleepSummaryMetric = {
  title: string
  value: string
  subtitle: string
}

export type SleepDetailItem = {
  label: string
  value: string
}

export type SleepSummary = {
  subtitle: string
  sleepGoalMinutes: number
  latestNightDate: string | null
  metrics: SleepSummaryMetric[]
}

export type SleepDashboardData = {
  weeklySleep: WeeklySleepEntry[]
  recentNights: RecentSleepEntry[]
  summary: SleepSummary
  lastNightDetails: SleepDetailItem[]
}
