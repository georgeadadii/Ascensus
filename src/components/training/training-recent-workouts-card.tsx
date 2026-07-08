import { CalendarRange } from "lucide-react"

import type { TrainingOverview } from "@/app/db/training"
import { TrainingEmptyState } from "@/components/training/training-empty-state"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function formatLongDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  })
}

export function TrainingRecentWorkoutsCard({
  recentWorkouts,
}: {
  recentWorkouts: TrainingOverview["recentWorkouts"]
}) {
  return (
    <Card className="border-border/60 py-4 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-[12.5px] font-semibold">
            Recent workouts
          </CardTitle>
          <CardDescription className="text-[11px]">
            Your latest completed sessions, sets, and volume.
          </CardDescription>
        </div>
        <div className="rounded-full border border-border/60 bg-muted/35 p-2 text-muted-foreground">
          <CalendarRange className="size-4" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {recentWorkouts.length === 0 ? (
          <TrainingEmptyState
            title="No completed workouts"
            description="Finished sessions will appear here once you start training."
          />
        ) : (
          recentWorkouts.map((workout) => (
            <div
              key={workout.id}
              className="rounded-xl border border-border/60 bg-muted/20 p-3.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">{workout.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatLongDate(workout.startedAt)}
                    {workout.durationMinutes != null
                      ? ` • ${workout.durationMinutes} min`
                      : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-[11px]">
                  <div className="rounded-full border border-border/60 bg-background px-2.5 py-1 font-medium">
                    {formatNumber(workout.totalVolume)} kg volume
                  </div>
                  <div className="rounded-full border border-border/60 bg-background px-2.5 py-1 font-medium">
                    {workout.totalSets} sets
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {workout.exercises.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No exercise details recorded.
                  </p>
                ) : (
                  workout.exercises.map((exercise) => (
                    <div
                      key={`${workout.id}-${exercise.exerciseName}`}
                      className="rounded-lg border border-border/50 bg-background/70 px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-medium">
                          {exercise.exerciseName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {exercise.sets.length} set
                          {exercise.sets.length === 1 ? "" : "s"}
                        </p>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {exercise.sets.map((set) => (
                          <span
                            key={set.id}
                            className="rounded-full border border-border/60 bg-muted/35 px-2 py-1 text-[10.5px] text-muted-foreground"
                          >
                            S{set.setNumber}{" "}
                            {set.weight != null && set.reps != null
                              ? `${formatNumber(set.weight)} x ${set.reps}`
                              : set.reps != null
                                ? `${set.reps} reps`
                                : "Logged"}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
