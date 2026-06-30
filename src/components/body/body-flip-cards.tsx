"use client"

import * as React from "react"
import { PlusIcon, SlidersHorizontalIcon } from "lucide-react"

import { BodyLogDialog } from "@/components/body/body-log-dialog"
import { FlipCard } from "@/components/flip-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { logBodyMetric } from "@/app/body/actions"
import type { BodyMetricField, MetricSummary } from "@/app/db/body-metrics"

type MetricMeta = {
  metric: BodyMetricField
  label: string
  unit: string
  /** Lower readings are the "good" direction (shown green). */
  lowerIsBetter: boolean
}

const METRICS: MetricMeta[] = [
  { metric: "weight", label: "Weight", unit: "kg", lowerIsBetter: true },
  { metric: "bodyFat", label: "Body fat", unit: "%", lowerIsBetter: true },
  {
    metric: "muscleMass",
    label: "Muscle mass",
    unit: "kg",
    lowerIsBetter: false,
  },
  { metric: "leanMass", label: "Lean mass", unit: "kg", lowerIsBetter: false },
]

function MetricFlipCard({
  meta,
  summary,
}: {
  meta: MetricMeta
  summary: MetricSummary
}) {
  const [quickLogOpen, setQuickLogOpen] = React.useState(false)
  const [quickValue, setQuickValue] = React.useState(
    summary.latest != null ? String(summary.latest) : ""
  )
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  const displayValue = summary.latest != null ? String(summary.latest) : "—"
  const delta = summary.delta
  const deltaIsGood =
    delta != null && (meta.lowerIsBetter ? delta < 0 : delta > 0)

  function saveQuickLog() {
    const parsed = Number.parseFloat(quickValue)
    if (!Number.isFinite(parsed)) return
    startTransition(async () => {
      const result = await logBodyMetric({
        metric: meta.metric,
        value: parsed,
        unit: meta.unit,
      })
      if (result.ok) setQuickLogOpen(false)
    })
  }

  return (
    <>
      <FlipCard
        height="148px"
        front={
          <>
            <p className="text-[11px] text-muted-foreground">{meta.label}</p>
            <div className="flex flex-1 items-end">
              <p className="text-2xl font-semibold tracking-tight">
                {displayValue}
                <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                  {meta.unit}
                </span>
              </p>
            </div>
            <p
              className={cn(
                "text-[10.5px]",
                delta == null
                  ? "text-muted-foreground"
                  : deltaIsGood
                    ? "text-emerald-600"
                    : "text-orange-600"
              )}
            >
              {delta == null
                ? "No previous reading"
                : `${delta < 0 ? "↓" : "↑"} ${Math.abs(delta)} ${meta.unit} vs last`}
            </p>
          </>
        }
        back={
          <>
            <p className="text-sm font-medium">{meta.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Log a new reading or open the full entry form.
            </p>

            {quickLogOpen ? (
              <div className="mt-4 space-y-2">
                <div className="relative">
                  <Input
                    value={quickValue}
                    onChange={(event) => setQuickValue(event.target.value)}
                    inputMode="decimal"
                    className="h-8 pr-10 text-sm"
                    autoFocus
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {meta.unit}
                  </span>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={saveQuickLog}
                  disabled={isPending}
                >
                  {isPending ? "Saving…" : "Save quick log"}
                </Button>
              </div>
            ) : (
              <div className="mt-auto flex flex-col gap-2 pt-4">
                <Button
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setQuickLogOpen(true)}
                >
                  <PlusIcon />
                  Quick log
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setDialogOpen(true)}
                >
                  <SlidersHorizontalIcon />
                  Detailed entry
                </Button>
              </div>
            )}
          </>
        }
      />

      <BodyLogDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        metric={meta.metric}
        label={meta.label}
        unit={meta.unit}
        defaultValue={summary.latest != null ? String(summary.latest) : ""}
        previousValue={summary.previous}
        previousDate={summary.previousDate}
        delta={summary.delta}
        week={summary.week}
      />
    </>
  )
}

export function BodyFlipCards({
  summaries,
}: {
  summaries: Record<BodyMetricField, MetricSummary>
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      {METRICS.map((meta) => (
        <MetricFlipCard
          key={meta.metric}
          meta={meta}
          summary={summaries[meta.metric]}
        />
      ))}
    </div>
  )
}
