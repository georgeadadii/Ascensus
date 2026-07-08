import type { TrainingOverview } from "@/app/db/training"
import { TrainingEmptyState } from "@/components/training/training-empty-state"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

function formatNumber(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  })
}

function getMaxWeeklyVolume(weeklyVolume: TrainingOverview["weeklyVolume"]) {
  return Math.max(...weeklyVolume.map((day) => day.totalVolume), 0)
}

export function TrainingWeeklyVolumeCard({
  weeklyVolume,
}: {
  weeklyVolume: TrainingOverview["weeklyVolume"]
}) {
  const maxWeeklyVolume = getMaxWeeklyVolume(weeklyVolume)
  const weeklyTotal = weeklyVolume.reduce(
    (total, day) => total + day.totalVolume,
    0
  )
  const weeklySessions = weeklyVolume.reduce(
    (total, day) => total + day.workoutCount,
    0
  )

  return (
    <Card className="border-border/60 py-4 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-[12.5px] font-semibold">
          Weekly volume
        </CardTitle>
        <CardDescription className="text-[11px]">
          Completed session volume for the current week.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {maxWeeklyVolume === 0 ? (
          <TrainingEmptyState
            title="No volume this week"
            description="Complete a workout this week to start the trend."
          />
        ) : (
          <div className="space-y-3">
            <div className="grid h-40 grid-cols-7 items-end gap-2">
              {weeklyVolume.map((day) => {
                const height =
                  maxWeeklyVolume > 0
                    ? Math.max((day.totalVolume / maxWeeklyVolume) * 100, 8)
                    : 0

                return (
                  <div
                    key={day.date}
                    className="flex h-full flex-col items-center justify-end gap-2"
                  >
                    <div className="flex h-full w-full items-end justify-center rounded-lg bg-muted/25 p-1.5">
                      <div
                        className={cn(
                          "w-full rounded-md bg-primary/85 transition-all",
                          day.today && "bg-primary"
                        )}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-medium">{day.day}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatNumber(day.totalVolume)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Weekly total
                </p>
                <p className="mt-1 font-medium">
                  {formatNumber(weeklyTotal)} kg
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Sessions
                </p>
                <p className="mt-1 font-medium">{weeklySessions}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
