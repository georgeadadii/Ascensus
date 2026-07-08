import { Dumbbell, Layers3, Play } from "lucide-react"

import type { TrainingOverview } from "@/app/db/training"
import { TrainingPersonalRecordCard } from "@/components/training/training-personal-record-card"
import { TrainingRecentWorkoutsCard } from "@/components/training/training-recent-workouts-card"
import { TrainingTemplatesCard } from "@/components/training/training-templates-card"
import { TrainingWeeklyVolumeCard } from "@/components/training/training-weekly-volume-card"
import { Button } from "@/components/ui/button"

type TrainingDashboardProps = {
  overview: TrainingOverview
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
}

function buildTrainingSummary(overview: TrainingOverview) {
  if (overview.recentWorkouts.length === 0) {
    return "No workouts logged yet"
  }

  const latest = overview.recentWorkouts[0]
  return `Last workout: ${formatShortDate(latest.startedAt)}`
}

export function TrainingDashboard({ overview }: TrainingDashboardProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-6 py-3.5">
        <div>
          <h1 className="text-[15px] font-semibold">Training</h1>
          <p className="text-[11.5px] text-muted-foreground">
            {buildTrainingSummary(overview)}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Layers3 />
            Templates
          </Button>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Dumbbell />
            Exercises
          </Button>
          <Button size="sm" className="w-full sm:w-auto">
            <Play />
            Start workout
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 p-4 sm:p-[18px]">
        <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {overview.personalRecords.map((record) => (
            <TrainingPersonalRecordCard
              key={record.exerciseName}
              record={record}
            />
          ))}
        </section>

        <section className="grid gap-2.5 xl:grid-cols-2">
          <TrainingWeeklyVolumeCard weeklyVolume={overview.weeklyVolume} />
          <TrainingTemplatesCard templates={overview.templates} />
        </section>

        <section>
          <TrainingRecentWorkoutsCard
            recentWorkouts={overview.recentWorkouts}
          />
        </section>
      </div>
    </div>
  )
}
