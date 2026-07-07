const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function pad(value: number) {
  return String(value).padStart(2, "0")
}

export function formatDateKey(date: Date): string {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
  ].join("-")
}

export function parseDateKey(dateKey: string): Date | null {
  if (!DATE_KEY_PATTERN.test(dateKey)) {
    return null
  }

  const [yearString, monthString, dayString] = dateKey.split("-")
  const year = Number(yearString)
  const month = Number(monthString)
  const day = Number(dayString)

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null
  }

  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

export function todayDateKey(now = new Date()): string {
  return formatDateKey(now)
}

export function resolveDateKey(
  input: string | string[] | undefined,
  fallback = todayDateKey()
): string {
  const value = Array.isArray(input) ? input[0] : input
  if (!value) return fallback

  return parseDateKey(value) ? value : fallback
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey)
  if (!date) {
    return todayDateKey()
  }

  date.setUTCDate(date.getUTCDate() + days)
  return formatDateKey(date)
}

export function getDayRangeForDateKey(dateKey: string) {
  const start = parseDateKey(dateKey) ?? parseDateKey(todayDateKey())!
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

export function formatDateLabel(dateKey: string, locale = "en-GB") {
  const date = parseDateKey(dateKey) ?? parseDateKey(todayDateKey())!

  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}
