import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { formatMinutesAsCompactDuration } from "@/lib/sleep/sleep-formatters"
import type { RecentSleepEntry } from "@/lib/sleep/sleep-types"

type RecentSleepCardProps = {
  entries: RecentSleepEntry[]
  sleepGoalMinutes: number
}

function getSleepQualityBadge(score: number | null) {
  if (score == null) {
    return {
      label: "Unrated",
      className:
        "border-border/60 bg-muted/50 text-muted-foreground dark:text-muted-foreground",
    }
  }

  if (score >= 8) {
    return {
      label: "Good",
      className:
        "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    }
  }

  if (score >= 6) {
    return {
      label: "Fair",
      className:
        "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    }
  }

  return {
    label: "Poor",
    className:
      "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  }
}

export function RecentSleepCard({
  entries,
  sleepGoalMinutes,
}: RecentSleepCardProps) {
  return (
    <Card className="ring-1 ring-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="text-[12.5px] font-semibold">
          Recent nights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 text-sm text-muted-foreground">
            No recent sleep logs yet.
          </div>
        ) : null}

        {entries.map((entry) => {
          const badge = getSleepQualityBadge(entry.qualityScore)
          const progress = Math.min(
            (entry.timeAsleepMinutes / sleepGoalMinutes) * 100,
            100
          )

          return (
            <div
              key={entry.date}
              className="grid gap-2 rounded-lg border border-border/50 bg-muted/15 p-3 md:grid-cols-[44px_minmax(0,1fr)_72px_120px] md:items-center"
            >
              <div className="text-sm font-medium">{entry.day}</div>

              <div className="space-y-1">
                <Progress value={progress} className="h-2" />
                <p className="text-[11px] text-muted-foreground">
                  Goal: {formatMinutesAsCompactDuration(sleepGoalMinutes)}
                </p>
              </div>

              <div className="text-sm font-medium tabular-nums md:text-right">
                {formatMinutesAsCompactDuration(entry.timeAsleepMinutes)}
              </div>

              <div className="flex items-center justify-between gap-2 md:justify-end">
                <span className="text-sm text-muted-foreground">
                  {entry.qualityScore != null
                    ? `${entry.qualityScore} / 10`
                    : "Not rated"}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                    badge.className
                  )}
                >
                  {badge.label}
                </span>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
