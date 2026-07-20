export const SLEEP_QUALITY_MIN = 1
export const SLEEP_QUALITY_MAX = 10

export type ManualSleepLogFormState = {
  sleepDate: string
  bedtime: string
  wakeTime: string
  timeToFallAsleep: string
  awakenings: string
  awakeDuration: string
  sleepQuality: number
  notes: string
}

export type ManualSleepLogField =
  | "sleepDate"
  | "bedtime"
  | "wakeTime"
  | "timeToFallAsleep"
  | "awakenings"
  | "awakeDuration"
  | "sleepQuality"

export type ManualSleepLogErrors = Partial<Record<ManualSleepLogField, string>>

export type ManualSleepLogValues = {
  sleepDate: string
  bedtime: string
  wakeTime: string
  timeToFallAsleep: number | null
  awakenings: number | null
  awakeDuration: number | null
  sleepQuality: number
  notes: string
}

export function getTodayDateValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function createManualSleepLogInitialState(
  initialValues?: Partial<ManualSleepLogValues>
): ManualSleepLogFormState {
  return {
    sleepDate: initialValues?.sleepDate ?? getTodayDateValue(),
    bedtime: initialValues?.bedtime ?? "",
    wakeTime: initialValues?.wakeTime ?? "",
    timeToFallAsleep:
      initialValues?.timeToFallAsleep != null
        ? String(initialValues.timeToFallAsleep)
        : "",
    awakenings:
      initialValues?.awakenings != null ? String(initialValues.awakenings) : "",
    awakeDuration:
      initialValues?.awakeDuration != null
        ? String(initialValues.awakeDuration)
        : "",
    sleepQuality: initialValues?.sleepQuality ?? 7,
    notes: initialValues?.notes ?? "",
  }
}

export function parseOptionalNonNegativeInteger(value: string) {
  if (value.trim() === "") {
    return null
  }

  const parsedValue = Number(value)

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return null
  }

  return parsedValue
}

export function validateManualSleepLogForm(
  values: ManualSleepLogFormState
): ManualSleepLogErrors {
  const errors: ManualSleepLogErrors = {}

  if (!values.sleepDate) {
    errors.sleepDate = "Sleep date is required."
  }

  if (!values.bedtime) {
    errors.bedtime = "Bedtime is required."
  }

  if (!values.wakeTime) {
    errors.wakeTime = "Wake time is required."
  }

  for (const [field, rawValue] of [
    ["timeToFallAsleep", values.timeToFallAsleep],
    ["awakenings", values.awakenings],
    ["awakeDuration", values.awakeDuration],
  ] as const) {
    if (
      rawValue.trim() !== "" &&
      parseOptionalNonNegativeInteger(rawValue) == null
    ) {
      errors[field] = "Must be 0 or greater."
    }
  }

  if (
    values.sleepQuality < SLEEP_QUALITY_MIN ||
    values.sleepQuality > SLEEP_QUALITY_MAX
  ) {
    errors.sleepQuality = `Sleep quality must be between ${SLEEP_QUALITY_MIN} and ${SLEEP_QUALITY_MAX}.`
  }

  return errors
}

export function normalizeManualSleepLogValues(
  values: ManualSleepLogFormState
): ManualSleepLogValues {
  return {
    sleepDate: values.sleepDate,
    bedtime: values.bedtime,
    wakeTime: values.wakeTime,
    timeToFallAsleep: parseOptionalNonNegativeInteger(values.timeToFallAsleep),
    awakenings: parseOptionalNonNegativeInteger(values.awakenings),
    awakeDuration: parseOptionalNonNegativeInteger(values.awakeDuration),
    sleepQuality: values.sleepQuality,
    notes: values.notes.trim(),
  }
}

function isValidDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return false
  }

  const [, year, month, day] = match
  const parsedYear = Number(year)
  const parsedMonth = Number(month)
  const parsedDay = Number(day)
  const candidate = new Date(Date.UTC(parsedYear, parsedMonth - 1, parsedDay))

  return (
    candidate.getUTCFullYear() === parsedYear &&
    candidate.getUTCMonth() === parsedMonth - 1 &&
    candidate.getUTCDate() === parsedDay
  )
}

function isValidTimeInput(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value)
}

export function validateManualSleepLogValues(
  values: ManualSleepLogValues
): ManualSleepLogErrors {
  const errors: ManualSleepLogErrors = {}

  if (!isValidDateInput(values.sleepDate)) {
    errors.sleepDate = "Sleep date is required."
  }

  if (!isValidTimeInput(values.bedtime)) {
    errors.bedtime = "Bedtime is required."
  }

  if (!isValidTimeInput(values.wakeTime)) {
    errors.wakeTime = "Wake time is required."
  }

  for (const [field, value] of [
    ["timeToFallAsleep", values.timeToFallAsleep],
    ["awakenings", values.awakenings],
    ["awakeDuration", values.awakeDuration],
  ] as const) {
    if (value != null && (!Number.isInteger(value) || value < 0)) {
      errors[field] = "Must be 0 or greater."
    }
  }

  if (
    !Number.isInteger(values.sleepQuality) ||
    values.sleepQuality < SLEEP_QUALITY_MIN ||
    values.sleepQuality > SLEEP_QUALITY_MAX
  ) {
    errors.sleepQuality = `Sleep quality must be between ${SLEEP_QUALITY_MIN} and ${SLEEP_QUALITY_MAX}.`
  }

  return errors
}
