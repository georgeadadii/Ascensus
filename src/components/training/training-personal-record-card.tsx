import { Trophy } from "lucide-react"

import type { TrainingOverview } from "@/app/db/training"
import { TrainingEmptyState } from "@/components/training/training-empty-state"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type PersonalRecord = TrainingOverview["personalRecords"][number]

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

function formatWeight(weight: number, reps: number) {
  return `${formatNumber(weight)} kg x ${reps}`
}

export function TrainingPersonalRecordCard({
  record,
}: {
  record: PersonalRecord
}) {
  return (
    <Card className="border-border/60 bg-linear-to-br from-card via-card to-muted/30 py-4 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-[13px] font-semibold">
              {record.exerciseName}
            </CardTitle>
            <CardDescription className="mt-1 text-[11px]">
              Personal record
            </CardDescription>
          </div>
          <div className="rounded-full border border-amber-500/25 bg-amber-500/10 p-2 text-amber-700">
            <Trophy className="size-4" />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {record.highest ? (
          <div className="space-y-3">
            <div>
              <p className="text-[22px] leading-none font-semibold tracking-tight">
                {formatWeight(record.highest.weight, record.highest.reps)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Highest on {formatLongDate(record.highest.achievedAt)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border/60 bg-muted/35 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Latest
                </p>
                <p className="mt-1 font-medium">
                  {record.latest
                    ? formatWeight(record.latest.weight, record.latest.reps)
                    : "No PR yet"}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/35 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Est. 1RM
                </p>
                <p className="mt-1 font-medium">
                  {record.highest.estimatedOneRepMax != null
                    ? `${formatNumber(record.highest.estimatedOneRepMax)} kg`
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <TrainingEmptyState
            title="No PR yet"
            description={`Log ${record.exerciseName.toLowerCase()} sessions to populate this card.`}
          />
        )}
      </CardContent>
    </Card>
  )
}
