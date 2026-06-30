"use client"

import * as React from "react"
import { DownloadIcon, PlusIcon, UserIcon } from "lucide-react"

import {
  ChartAreaInteractive,
  type BodyChartView,
} from "@/components/body/chart-area-interactive"
import { BodyFlipCards } from "@/components/body/body-flip-cards"
import { BodyLogDialog } from "@/components/body/body-log-dialog"
import { AnimatedTabs } from "@/components/ui/animated-tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { BodyMetricField, BodyOverview } from "@/app/db/body-metrics"

const measurements = [
  { label: "Waist", value: "84 cm", delta: "↓ 1.5", positive: true },
  { label: "Chest", value: "102 cm", delta: "↑ 0.5", positive: true },
  { label: "Hips", value: "98 cm", delta: "↓ 0.5", positive: true },
  { label: "Left arm", value: "37 cm", delta: "↑ 0.5", positive: true },
  { label: "Right arm", value: "37.5 cm", delta: "↑ 0.5", positive: true },
  { label: "Thigh", value: "58 cm", delta: "–", positive: null },
]

const progressPhotos = [
  { label: "Front", date: "Jun 1" },
  { label: "Side", date: "Jun 1" },
  { label: "Back", date: "Jun 1" },
]

const chartViews: { value: BodyChartView; label: string }[] = [
  { value: "weight", label: "Weight" },
  { value: "bodyFat", label: "Body fat" },
  { value: "muscleMass", label: "Muscle mass" },
]

function formatLastLogged(overview: BodyOverview): string {
  const dates = (Object.keys(overview.summaries) as BodyMetricField[])
    .map((field) => overview.summaries[field].latestDate)
    .filter((d): d is string => d != null)
    .sort()
  const latest = dates.at(-1)
  if (!latest) return "No entries yet"
  const today = new Date().toISOString().slice(0, 10)
  if (latest === today) return "Last logged: today"
  return `Last logged: ${new Date(latest).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })}`
}

export function BodyDashboard({ overview }: { overview: BodyOverview }) {
  const [logDialogOpen, setLogDialogOpen] = React.useState(false)
  const [chartView, setChartView] = React.useState<BodyChartView>("weight")
  const photoInputRef = React.useRef<HTMLInputElement>(null)

  const weight = overview.summaries.weight
  const activeSummary = overview.summaries[chartView]

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-6 py-3.5">
        <div>
          <h1 className="text-[15px] font-semibold">Body</h1>
          <p className="text-[11.5px] text-muted-foreground">
            {formatLastLogged(overview)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <DownloadIcon />
            Export
          </Button>
          <Button size="sm" onClick={() => setLogDialogOpen(true)}>
            <PlusIcon />
            Log weight
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 p-4 sm:p-[18px]">
        <BodyFlipCards summaries={overview.summaries} />

        <div className="flex w-full flex-col gap-2">
          <AnimatedTabs
            items={chartViews}
            value={chartView}
            onValueChange={(value) => setChartView(value as BodyChartView)}
            className="w-full max-w-lg"
          />
          <ChartAreaInteractive
            view={chartView}
            series={activeSummary.series}
            goal={chartView === "weight" ? overview.targetWeight : null}
          />
        </div>

        <div className="grid gap-2.5 lg:grid-cols-2">
          <Card className="border-border/60 py-4 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between px-4 pb-3">
              <CardTitle className="text-[12.5px] font-semibold">
                Measurements
              </CardTitle>
              <button
                type="button"
                className="text-[11px] text-primary hover:underline"
              >
                Update
              </button>
            </CardHeader>
            <CardContent className="px-4">
              <div className="divide-y divide-border/60">
                {measurements.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-1.5 text-xs"
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <span>
                      <span className="font-medium">{row.value}</span>
                      <span
                        className={cn(
                          "ml-1.5 text-[10.5px]",
                          row.positive === true && "text-emerald-600",
                          row.positive === false && "text-orange-600",
                          row.positive === null && "text-muted-foreground"
                        )}
                      >
                        {row.delta}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 py-4 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between px-4 pb-3">
              <CardTitle className="text-[12.5px] font-semibold">
                Progress photos
              </CardTitle>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="text-[11px] text-primary hover:underline"
              >
                Upload
              </button>
            </CardHeader>
            <CardContent className="px-4">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
              />
              <div className="grid grid-cols-3 gap-1.5">
                {progressPhotos.map((photo) => (
                  <div
                    key={photo.label}
                    className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted/40"
                  >
                    <span className="absolute left-1.5 top-1.5 text-[9.5px] text-muted-foreground">
                      {photo.date}
                    </span>
                    <UserIcon className="size-5 text-muted-foreground/40" />
                    <span className="absolute inset-x-0 bottom-1.5 text-center text-[10px] text-muted-foreground">
                      {photo.label}
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 text-muted-foreground transition-colors hover:bg-muted/40"
                >
                  <PlusIcon className="size-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <BodyLogDialog
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
        metric="weight"
        label="Weight"
        unit="kg"
        defaultValue={weight.latest != null ? String(weight.latest) : ""}
        previousValue={weight.previous}
        previousDate={weight.previousDate}
        delta={weight.delta}
        week={weight.week}
      />
    </div>
  )
}
