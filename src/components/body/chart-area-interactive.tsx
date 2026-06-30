"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

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

export type BodyChartView = "weight" | "bodyFat" | "muscleMass"

type ChartPoint = {
  date: string
  primary: number
  secondary: number
}

const weightData: ChartPoint[] = [
  { date: "2024-04-01", primary: 82.1, secondary: 76 },
  { date: "2024-04-08", primary: 81.8, secondary: 76 },
  { date: "2024-04-15", primary: 81.5, secondary: 76 },
  { date: "2024-04-22", primary: 81.3, secondary: 76 },
  { date: "2024-04-29", primary: 81.0, secondary: 76 },
  { date: "2024-05-06", primary: 80.9, secondary: 76 },
  { date: "2024-05-13", primary: 80.7, secondary: 76 },
  { date: "2024-05-20", primary: 80.6, secondary: 76 },
  { date: "2024-05-27", primary: 80.5, secondary: 76 },
  { date: "2024-06-03", primary: 80.4, secondary: 76 },
  { date: "2024-06-10", primary: 80.3, secondary: 76 },
  { date: "2024-06-17", primary: 80.2, secondary: 76 },
  { date: "2024-06-24", primary: 80.1, secondary: 76 },
  { date: "2024-06-30", primary: 80.4, secondary: 76 },
]

const bodyFatData: ChartPoint[] = [
  { date: "2024-04-01", primary: 18.4, secondary: 15 },
  { date: "2024-04-08", primary: 18.1, secondary: 15 },
  { date: "2024-04-15", primary: 17.9, secondary: 15 },
  { date: "2024-04-22", primary: 17.7, secondary: 15 },
  { date: "2024-04-29", primary: 17.6, secondary: 15 },
  { date: "2024-05-06", primary: 17.5, secondary: 15 },
  { date: "2024-05-13", primary: 17.4, secondary: 15 },
  { date: "2024-05-20", primary: 17.3, secondary: 15 },
  { date: "2024-05-27", primary: 17.3, secondary: 15 },
  { date: "2024-06-03", primary: 17.2, secondary: 15 },
  { date: "2024-06-10", primary: 17.2, secondary: 15 },
  { date: "2024-06-17", primary: 17.1, secondary: 15 },
  { date: "2024-06-24", primary: 17.2, secondary: 15 },
  { date: "2024-06-30", primary: 17.2, secondary: 15 },
]

const muscleMassData: ChartPoint[] = [
  { date: "2024-04-01", primary: 62.0, secondary: 65 },
  { date: "2024-04-08", primary: 62.1, secondary: 65 },
  { date: "2024-04-15", primary: 62.2, secondary: 65 },
  { date: "2024-04-22", primary: 62.3, secondary: 65 },
  { date: "2024-04-29", primary: 62.4, secondary: 65 },
  { date: "2024-05-06", primary: 62.5, secondary: 65 },
  { date: "2024-05-13", primary: 62.5, secondary: 65 },
  { date: "2024-05-20", primary: 62.6, secondary: 65 },
  { date: "2024-05-27", primary: 62.7, secondary: 65 },
  { date: "2024-06-03", primary: 62.7, secondary: 65 },
  { date: "2024-06-10", primary: 62.8, secondary: 65 },
  { date: "2024-06-17", primary: 62.8, secondary: 65 },
  { date: "2024-06-24", primary: 62.8, secondary: 65 },
  { date: "2024-06-30", primary: 62.8, secondary: 65 },
]

const chartDataByView: Record<BodyChartView, ChartPoint[]> = {
  weight: weightData,
  bodyFat: bodyFatData,
  muscleMass: muscleMassData,
}

const chartMetaByView: Record<
  BodyChartView,
  {
    title: string
    description: string
    primaryLabel: string
    secondaryLabel: string
    unit: string
  }
> = {
  weight: {
    title: "Weight trend",
    description: "Actual weight vs goal over time",
    primaryLabel: "Weight",
    secondaryLabel: "Goal",
    unit: "kg",
  },
  bodyFat: {
    title: "Body fat trend",
    description: "Body fat percentage vs target",
    primaryLabel: "Body fat",
    secondaryLabel: "Target",
    unit: "%",
  },
  muscleMass: {
    title: "Muscle mass trend",
    description: "Muscle mass vs target",
    primaryLabel: "Muscle mass",
    secondaryLabel: "Target",
    unit: "kg",
  },
}

type ChartAreaInteractiveProps = {
  view: BodyChartView
  /** Real logged values for this metric; falls back to sample data when empty. */
  series?: { date: string; value: number }[]
  /** Optional goal/target rendered as the dashed comparison line. */
  goal?: number | null
}

export function ChartAreaInteractive({
  view,
  series,
  goal,
}: ChartAreaInteractiveProps) {
  const [timeRange, setTimeRange] = React.useState("90d")
  const meta = chartMetaByView[view]

  const chartData = React.useMemo<ChartPoint[]>(() => {
    if (series && series.length > 0) {
      return series.map((point) => ({
        date: point.date,
        primary: point.value,
        secondary: goal ?? point.value,
      }))
    }
    return chartDataByView[view]
  }, [series, goal, view])

  const hasGoal =
    (series && series.length > 0 && goal != null) || !series?.length

  const chartConfig = {
    primary: {
      label: meta.primaryLabel,
      color: "var(--chart-1)",
    },
    secondary: {
      label: meta.secondaryLabel,
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig

  const referenceDate = React.useMemo(() => {
    const last = chartData.at(-1)
    return last ? new Date(last.date) : new Date()
  }, [chartData])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

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
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient
                id={`fillPrimary-${view}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient
                id={`fillSecondary-${view}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-secondary)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-secondary)"
                  stopOpacity={0.1}
                />
              </linearGradient>
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
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  formatter={(value) => [`${value} ${meta.unit}`, ""]}
                  indicator="dot"
                />
              }
            />
            {hasGoal && (
              <Area
                dataKey="secondary"
                type="natural"
                fill={`url(#fillSecondary-${view})`}
                stroke="var(--color-secondary)"
                strokeDasharray="4 4"
                fillOpacity={0.15}
              />
            )}
            <Area
              dataKey="primary"
              type="natural"
              fill={`url(#fillPrimary-${view})`}
              stroke="var(--color-primary)"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
