"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Rectangle,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  formatMinutesAsCompactDuration,
  formatMinutesAsDuration,
} from "@/lib/sleep/sleep-formatters"
import type { WeeklySleepEntry } from "@/lib/sleep/sleep-types"

type SleepDurationChartProps = {
  entries: WeeklySleepEntry[]
  sleepGoalMinutes: number
  latestNightDate: string | null
}

type SleepChartRow = WeeklySleepEntry & {
  chartMinutes: number
  isLatest: boolean
  hasData: boolean
}

const chartConfig = {
  sleep: {
    label: "Time asleep",
    color: "var(--foreground)",
  },
  goal: {
    label: "Sleep goal",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig

function formatHoursTick(value: number) {
  if (value === 0) {
    return "0h"
  }

  return `${value / 60}h`
}

function SleepDurationTooltip({
  active,
  payload,
  label,
}: React.ComponentProps<typeof ChartTooltipContent>) {
  if (!active || !payload?.length) {
    return null
  }

  const entry = payload[0]?.payload as WeeklySleepEntry | undefined

  if (!entry || entry.timeAsleepMinutes == null) {
    return (
      <ChartTooltipContent
        active={active}
        payload={payload}
        label={label}
        formatter={() => (
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-muted-foreground">Time asleep</span>
            <span className="font-medium text-foreground">No data</span>
          </div>
        )}
      />
    )
  }

  const timeAsleepMinutes = entry.timeAsleepMinutes

  return (
    <ChartTooltipContent
      active={active}
      payload={payload}
      label={label}
      formatter={() => (
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-muted-foreground">Time asleep</span>
          <span className="font-medium text-foreground">
            {formatMinutesAsDuration(timeAsleepMinutes)}
          </span>
        </div>
      )}
      labelFormatter={() => `${entry.day} · ${entry.date}`}
    />
  )
}

SleepDurationTooltip.displayName = "SleepDurationTooltip"

function SleepBarShape(props: {
  fill?: string
  height?: number
  payload?: SleepChartRow
  width?: number
  x?: number
  y?: number
}) {
  const {
    fill = "var(--foreground)",
    height = 0,
    payload,
    width = 0,
    x = 0,
    y = 0,
  } = props

  if (!payload) {
    return null
  }

  if (!payload.hasData) {
    return (
      <Rectangle
        x={x}
        y={y - 16}
        width={width}
        height={16}
        radius={[8, 8, 8, 8]}
        fill="var(--muted)"
        fillOpacity={0.3}
        stroke="var(--border)"
        strokeDasharray="4 4"
      />
    )
  }

  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      radius={[10, 10, 4, 4]}
      fill={payload.isLatest ? "var(--foreground)" : fill}
    />
  )
}

SleepBarShape.displayName = "SleepBarShape"

export function SleepDurationChart({
  entries,
  sleepGoalMinutes,
  latestNightDate,
}: SleepDurationChartProps) {
  const chartData = entries.map((entry) => ({
    ...entry,
    chartMinutes: entry.timeAsleepMinutes ?? 0,
    isLatest: entry.date === latestNightDate,
    hasData: entry.timeAsleepMinutes != null,
  }))

  const maxMinutes = Math.max(
    sleepGoalMinutes,
    ...entries.map((entry) => entry.timeAsleepMinutes ?? 0)
  )
  const roundedMax = Math.ceil((maxMinutes + 60) / 60) * 60
  const yTicks = Array.from(
    new Set(
      [0, 120, 240, 360, 480, roundedMax].filter((tick) => tick <= roundedMax)
    )
  )

  return (
    <Card className="ring-1 ring-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="text-[12.5px] font-semibold">This week</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="h-[320px] w-full aspect-auto"
        >
          <BarChart data={chartData} barCategoryGap={18}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
            <YAxis
              domain={[0, roundedMax]}
              ticks={yTicks}
              tickFormatter={formatHoursTick}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
            <ReferenceLine
              y={sleepGoalMinutes}
              stroke="var(--color-goal)"
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
              label={{
                value: "Goal · 8h",
                position: "insideTopRight",
                fill: "var(--muted-foreground)",
                fontSize: 11,
              }}
            />
            <ChartTooltip cursor={false} content={<SleepDurationTooltip />} />
            <Bar
              dataKey="chartMinutes"
              maxBarSize={44}
              shape={<SleepBarShape fill="var(--chart-3)" />}
            >
              <LabelList
                dataKey="chartMinutes"
                position="top"
                className="fill-muted-foreground text-[11px]"
                formatter={(value) =>
                  typeof value === "number" && value > 0
                    ? formatMinutesAsCompactDuration(value)
                    : ""
                }
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
