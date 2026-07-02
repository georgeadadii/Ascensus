"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Superset of metrics the chart can ever render. Only "weight" | "bodyFat" | "muscleMass"
// are wired up elsewhere today, but leanMass/bmi/ffmi already have colours + labels defined
// so adding them later is just a matter of selecting them — no chart changes needed.
export type BodyChartView =
  "weight" | "bodyFat" | "muscleMass" | "leanMass" | "bmi" | "ffmi"

type MetricSeriesPoint = { date: string; value: number }

/** Minimal shape the chart needs from a metric's summary — real summaries may have more fields. */
type MetricSummaryLike = {
  series?: MetricSeriesPoint[]
}

/**
 * A row in the chart dataset. Beyond `date` and `goal`, keys are dynamic per metric:
 *   [metric]: number | null              — value to plot (absolute or relative %)
 *   [metric + "_carriedForward"]: boolean — true if this day's value was carried forward
 *   [metric + "_carriedOnly"]: number|null — rendering helper: only set on carried-forward
 *                                            stretches (plus the anchor point right before
 *                                            a gap), used to draw the dashed overlay line.
 */
type ChartRow = Record<string, string | number | boolean | null | undefined> & {
  date: string
}

// ---------------------------------------------------------------------------
// Central metric configuration — every part of the chart reads from these.
// ---------------------------------------------------------------------------

const METRIC_META: Record<
  BodyChartView,
  { title: string; description: string; label: string; unit: string }
> = {
  weight: {
    title: "Weight trend",
    description: "Actual weight vs goal over time",
    label: "Weight",
    unit: "kg",
  },
  bodyFat: {
    title: "Body fat trend",
    description: "Body fat percentage vs target",
    label: "Body fat",
    unit: "%",
  },
  muscleMass: {
    title: "Muscle mass trend",
    description: "Muscle mass vs target",
    label: "Muscle mass",
    unit: "kg",
  },
  leanMass: {
    title: "Lean mass trend",
    description: "Lean mass over time",
    label: "Lean mass",
    unit: "kg",
  },
  bmi: {
    title: "BMI trend",
    description: "Body mass index over time",
    label: "BMI",
    unit: "",
  },
  ffmi: {
    title: "FFMI trend",
    description: "Fat-free mass index over time",
    label: "FFMI",
    unit: "",
  },
}

/** Central colour map — used for chart config, gradients, area strokes, and dots alike. */
const METRIC_COLORS: Record<BodyChartView, string> = {
  weight: "var(--foreground)", // reads as black in light mode
  bodyFat: "#ef4444", // red
  muscleMass: "#22c55e", // green
  leanMass: "#3b82f6", // blue
  bmi: "#f97316", // orange
  ffmi: "#a855f7", // purple
}

const GOAL_COLOR = "var(--muted-foreground)"

const TIME_RANGE_DAYS: Record<string, number> = {
  "90d": 90,
  "30d": 30,
  "7d": 7,
}

function daysForRange(range: string): number {
  return TIME_RANGE_DAYS[range] ?? 90
}

// ---------------------------------------------------------------------------
// Date helpers — all dates are plain "YYYY-MM-DD" strings, treated as UTC days
// so day-by-day iteration never trips over DST.
// ---------------------------------------------------------------------------

function parseISODate(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDaysISO(date: string, days: number): string {
  const d = parseISODate(date)
  d.setUTCDate(d.getUTCDate() + days)
  return formatISODate(d)
}

/** Every ISO date from start to end, inclusive. */
function buildDateRange(start: string, end: string): string[] {
  const dates: string[] = []
  let cursor = start
  while (cursor <= end) {
    dates.push(cursor)
    cursor = addDaysISO(cursor, 1)
  }
  return dates
}

type ChartAreaInteractiveProps = {
  /** Every metric currently selected. The first entry drives the title/description. */
  views: BodyChartView[]
  /** Real logged series per metric. Metrics with no series are simply skipped. */
  summaries: Partial<Record<BodyChartView, MetricSummaryLike>>
  /** Weight goal/target. Only ever rendered when "weight" is selected AND a real goal exists. */
  goal?: number | null
}

/**
 * Tooltip wrapper that strips the internal "_carriedOnly" dashed-overlay dataKeys out of
 * the payload before handing it to the real tooltip content. Without this, carried-forward
 * days would show two rows for the same metric (once from the solid area, once from the
 * dashed overlay) since both have a non-null value on those days.
 */
function FilteredTooltipContent(
  props: React.ComponentProps<typeof ChartTooltipContent>
) {
  const filteredPayload = props.payload?.filter(
    (item) => !String(item.dataKey ?? "").endsWith("_carriedOnly")
  )
  return <ChartTooltipContent {...props} payload={filteredPayload} />
}
FilteredTooltipContent.displayName = "FilteredTooltipContent"

// Wrapper for tooltip content to provide a display name and avoid anonymous inline component
const ChartBodyTooltipContent = (
  props: React.ComponentProps<typeof FilteredTooltipContent>
) => <FilteredTooltipContent {...props} />
ChartBodyTooltipContent.displayName = "ChartBodyTooltipContent"

export function ChartAreaInteractive({
  views,
  summaries,
  goal,
}: ChartAreaInteractiveProps) {
  const [timeRange, setTimeRange] = React.useState("90d")

  // Guard against an empty selection so the chart never has nothing to key off of.
  const activeViews = React.useMemo(
    () => (views.length > 0 ? views : (["weight"] as BodyChartView[])),
    [views]
  )
  const primaryMetric = activeViews[0]
  const meta = METRIC_META[primaryMetric]

  // Two or more metrics selected → normalise every metric to % change from its own
  // first-ever recorded value, and fill missing days with carried-forward values.
  const relativeMode = activeViews.length > 1

  const weightSelected = activeViews.includes("weight")
  const hasGoal = weightSelected && goal != null

  const chartData = React.useMemo<ChartRow[]>(() => {
    if (!relativeMode) {
      // -----------------------------------------------------------------
      // Single-metric mode: unchanged. Real points only, absolute values,
      // no continuous timeline, no carry-forward, no dashed distinction.
      // -----------------------------------------------------------------
      const rowsByDate = new Map<string, ChartRow>()

      for (const metric of activeViews) {
        const metricSeries = summaries[metric]?.series
        if (!metricSeries || metricSeries.length === 0) {
          continue
        }
        for (const point of metricSeries) {
          const row = rowsByDate.get(point.date) ?? { date: point.date }
          row[metric] = point.value
          rowsByDate.set(point.date, row)
        }
      }

      const rows = Array.from(rowsByDate.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      )

      if (hasGoal) {
        return rows.map((row) => ({ ...row, goal: goal as number }))
      }
      return rows
    }

    // -------------------------------------------------------------------
    // Multi-metric (relative) mode: continuous daily timeline + carry-forward.
    // -------------------------------------------------------------------
    const includedMetrics = activeViews.filter(
      (metric) => (summaries[metric]?.series?.length ?? 0) > 0
    )
    if (includedMetrics.length === 0) {
      return []
    }

    // Per-metric lookup structures.
    const perMetric = new Map<
      BodyChartView,
      {
        sorted: MetricSeriesPoint[]
        byDate: Map<string, number>
        firstValue: number
      }
    >()
    let latestDate: string | null = null

    for (const metric of includedMetrics) {
      const sorted = [
        ...(summaries[metric]!.series as MetricSeriesPoint[]),
      ].sort((a, b) => a.date.localeCompare(b.date))
      const byDate = new Map(sorted.map((p) => [p.date, p.value]))
      perMetric.set(metric, { sorted, byDate, firstValue: sorted[0].value })

      const lastDateForMetric = sorted[sorted.length - 1].date
      if (!latestDate || lastDateForMetric > latestDate) {
        latestDate = lastDateForMetric
      }
    }

    const end = latestDate as string
    const windowStart = addDaysISO(end, -daysForRange(timeRange))
    const fullDates = buildDateRange(windowStart, end)

    // Build rows, one per date, shared across all included metrics.
    const rows: ChartRow[] = fullDates.map((date) => ({ date }))

    for (const metric of includedMetrics) {
      const { byDate, firstValue, sorted } = perMetric.get(metric)!

      // Seed the carry-forward pointer with the most recent real value at or
      // before the window start, even if that log happened long before the window.
      let lastValue: number | undefined
      for (const point of sorted) {
        if (point.date < windowStart) {
          lastValue = point.value
        } else {
          break
        }
      }

      const carriedFlags: boolean[] = new Array(fullDates.length).fill(false)
      const relativeValues: (number | null)[] = new Array(
        fullDates.length
      ).fill(null)

      fullDates.forEach((date, index) => {
        let value: number | null
        let carried: boolean

        if (byDate.has(date)) {
          value = byDate.get(date) as number
          carried = false
          lastValue = value
        } else if (lastValue !== undefined) {
          value = lastValue
          carried = true
        } else {
          value = null
          carried = false
        }

        carriedFlags[index] = carried
        relativeValues[index] =
          value == null ? null : ((value - firstValue) / firstValue) * 100
      })

      // Overlay dataset for the dashed line: every carried-forward day, plus the
      // one real day immediately before a gap starts, so the dash connects cleanly
      // from the last known real point.
      const carriedOnly: (number | null)[] = fullDates.map((_, index) => {
        const isCarried = carriedFlags[index]
        const nextIsCarried = carriedFlags[index + 1] === true
        if (
          isCarried ||
          (!isCarried && relativeValues[index] != null && nextIsCarried)
        ) {
          return relativeValues[index]
        }
        return null
      })

      fullDates.forEach((_, index) => {
        rows[index][metric] = relativeValues[index]
        rows[index][`${metric}_carriedForward`] = carriedFlags[index]
        rows[index][`${metric}_carriedOnly`] = carriedOnly[index]
      })
    }

    if (hasGoal) {
      return rows.map((row) => ({ ...row, goal: goal as number }))
    }
    return rows
  }, [activeViews, summaries, relativeMode, hasGoal, goal, timeRange])

  // Dynamic chart config — one entry per selected metric, plus goal when applicable.
  // The "_carriedOnly" overlay lines are intentionally excluded so they never show in
  // the legend or affect colour/label lookups.
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {}
    for (const metric of activeViews) {
      config[metric] = {
        label: METRIC_META[metric].label,
        color: METRIC_COLORS[metric],
      }
    }
    if (hasGoal) {
      config.goal = {
        label: "Goal",
        color: GOAL_COLOR,
      }
    }
    return config
  }, [activeViews, hasGoal])

  const referenceDate = React.useMemo(() => {
    const last = chartData.at(-1)
    return last ? new Date(last.date as string) : new Date()
  }, [chartData])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date as string)
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysForRange(timeRange))
    return date >= startDate
  })

  const hasChartData = filteredData.length > 0

  // Custom dot: filled circle for real measurements, small hollow circle for
  // carried-forward points, nothing before a metric's first-ever measurement.
  type MetricDotProps = {
    cx?: number
    cy?: number
    payload?: ChartRow
    metric: BodyChartView
  }
  function MetricDot({ cx, cy, payload, metric }: MetricDotProps) {
    if (cx == null || cy == null || !payload) return null
    const value = payload[metric]
    if (value == null) return null
    const carried = Boolean(payload[`${metric}_carriedForward`])
    const color = METRIC_COLORS[metric]
    return carried ? (
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill="var(--background)"
        stroke={color}
        strokeWidth={1.5}
      />
    ) : (
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill={color}
        stroke={color}
        strokeWidth={1.5}
      />
    )
  }

  return (
    <Card className="border-border/60 pt-0 shadow-sm">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>{meta.title}</CardTitle>
          <CardDescription>{meta.description}</CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select time range"
          >
            <SelectValue placeholder="Last 3 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {hasChartData ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={filteredData}>
              <defs>
                {activeViews.map((metric) => (
                  <linearGradient
                    key={metric}
                    id={`fill-${metric}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={METRIC_COLORS[metric]}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={METRIC_COLORS[metric]}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                ))}
                {hasGoal && (
                  <linearGradient id="fill-goal" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={GOAL_COLOR}
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor={GOAL_COLOR}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                )}
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              {/* Domain is computed from dataMin/dataMax of whatever chartData contains —
                  it doesn't need to know whether that data is absolute or relative. */}
              <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartBodyTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }}
                    formatter={(value, name, item) => {
                      if (name === "goal") {
                        return [
                          `${value}${
                            METRIC_META.weight.unit
                              ? ` ${METRIC_META.weight.unit}`
                              : ""
                          }`,
                          "Goal",
                        ]
                      }

                      const metricMeta = METRIC_META[name as BodyChartView]
                      const label = metricMeta?.label ?? String(name)
                      const row = item?.payload as ChartRow | undefined
                      const isCarried = Boolean(row?.[`${name}_carriedForward`])

                      if (relativeMode) {
                        const numeric =
                          typeof value === "number" ? value : Number(value)
                        const sign = numeric > 0 ? "+" : ""
                        return [
                          <span key="val">
                            {sign}
                            {numeric.toFixed(2)}%
                            {isCarried && (
                              <span className="ml-1 text-muted-foreground">
                                (carried forward)
                              </span>
                            )}
                          </span>,
                          label,
                        ]
                      }

                      return [
                        `${value}${metricMeta?.unit ? ` ${metricMeta.unit}` : ""}`,
                        label,
                      ]
                    }}
                    indicator="dot"
                  />
                }
              />
              {hasGoal && (
                <Area
                  dataKey="goal"
                  type="natural"
                  fill="url(#fill-goal)"
                  stroke={GOAL_COLOR}
                  strokeDasharray="4 4"
                  fillOpacity={0.15}
                />
              )}
              {activeViews.map((metric) => (
                <Area
                  key={metric}
                  dataKey={metric}
                  type="natural"
                  fill={`url(#fill-${metric})`}
                  stroke={METRIC_COLORS[metric]}
                  dot={(props) => <MetricDot {...props} metric={metric} />}
                  connectNulls={false}
                />
              ))}
              {relativeMode &&
                activeViews.map((metric) => (
                  <Line
                    key={`${metric}-carried`}
                    dataKey={`${metric}_carriedOnly`}
                    type="natural"
                    stroke={METRIC_COLORS[metric]}
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    dot={(props) => <MetricDot {...props} metric={metric} />}
                    legendType="none"
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                ))}
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[250px] w-full flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              No data yet
            </p>
            <p className="text-xs text-muted-foreground">
              Start logging your body metrics to see trends over time.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
