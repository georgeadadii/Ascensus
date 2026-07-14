import type { ReactNode } from "react"
import { Plus, Trophy } from "lucide-react"

import type { TrainingOverview } from "@/app/db/training"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

type PersonalRecord = TrainingOverview["personalRecords"][number]

function formatNumber(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })
}

function formatWeight(weight: number | null) {
  return weight == null ? "—" : `${formatNumber(weight)} kg`
}

function formatAchievedDate(date: string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function TrainingPersonalRecordCard({
  record,
  editMode = false,
  action,
  empty = false,
}: {
  record: PersonalRecord
  editMode?: boolean
  action?: ReactNode
  empty?: boolean
}) {
  if (empty || !record.exercise) {
    return (
      <Card className="border-dashed border-border/60 bg-muted/18 py-0 shadow-sm">
        <CardContent className="p-0">
          <div className="flex min-h-52 w-full flex-col items-center justify-center gap-3 rounded-xl px-6 py-8 text-center text-muted-foreground">
            <div className="rounded-full border border-border/60 bg-background/80 p-3">
              <Plus className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Select exercise
              </p>
              <p className="text-xs">Choose a lift for slot {record.slot}.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 bg-linear-to-br from-card via-card to-muted/30 py-4 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-[13px] font-semibold">
              {record.exercise.name}
            </CardTitle>
            <CardDescription className="mt-1 text-[11px]">
              {record.actualOneRepMaxAchievedAt
                ? `PR hit on: ${formatAchievedDate(
                    record.actualOneRepMaxAchievedAt
                  )}`
                : "No PR recorded"}
            </CardDescription>
          </div>
          <CardAction className="flex items-center gap-2">
            {action}
            <div className="rounded-full border border-amber-500/25 bg-amber-500/10 p-2 text-amber-700">
              <Trophy className="size-4" />
            </div>
          </CardAction>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-border/60 bg-muted/35 px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Actual 1RM
            </p>
            <p className="mt-1 text-lg font-semibold">
              {formatWeight(record.actualOneRepMax)}
            </p>
          </div>
          <div
            className={cn(
              "rounded-lg border border-border/60 bg-muted/35 px-3 py-3",
              record.estimatedOneRepMax != null &&
                !record.shouldDisplayEstimatedValue &&
                record.actualOneRepMax != null &&
                "text-muted-foreground"
            )}
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Estimated 1RM
            </p>
            <p className="mt-1 text-lg font-semibold">
              {record.shouldDisplayEstimatedValue
                ? formatWeight(record.estimatedOneRepMax)
                : "—"}
            </p>
          </div>
        </div>

        {editMode ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Replace this exercise to track a different lift in this slot.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
