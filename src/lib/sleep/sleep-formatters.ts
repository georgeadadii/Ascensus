export function formatMinutesAsDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.abs(totalMinutes % 60)

  return `${hours}h ${minutes}m`
}

export function formatMinutesAsCompactDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.abs(totalMinutes % 60)

  if (hours === 0) {
    return `${minutes}m`
  }

  if (minutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${minutes}m`
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`
}

export function formatTime(value: string): string {
  const [hours, minutes] = value.split(":")
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`
}

export function formatDateTimeAsTime(value: Date): string {
  return `${String(value.getUTCHours()).padStart(2, "0")}:${String(
    value.getUTCMinutes()
  ).padStart(2, "0")}`
}

export function formatMinutesAsTimeOfDay(totalMinutes: number): string {
  const normalizedMinutes = ((Math.round(totalMinutes) % 1440) + 1440) % 1440
  const hours = Math.floor(normalizedMinutes / 60)
  const minutes = normalizedMinutes % 60

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}
