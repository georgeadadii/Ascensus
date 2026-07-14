"use client"

import { LineChart, PlusIcon } from "lucide-react"

import { RecentSleepCard } from "@/components/sleep/recent-sleep-card"
import { SleepDetailsCard } from "@/components/sleep/sleep-details-card"
import { SleepDurationChart } from "@/components/sleep/sleep-duration-chart"
import { SleepSummaryCards } from "@/components/sleep/sleep-summary-cards"
import { Button } from "@/components/ui/button"
import type { SleepDashboardData } from "@/lib/sleep/sleep-types"

type SleepDashboardProps = {
  data: SleepDashboardData
}

export function SleepDashboard({ data }: SleepDashboardProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-6 py-3.5">
        <div>
          <h1 className="text-[15px] font-semibold">Sleep</h1>
          <p className="text-[11.5px] text-muted-foreground">
            {data.summary.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            <LineChart />
            Trends
          </Button>
          <Button size="sm">
            <PlusIcon />
            Log sleep
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 p-4 sm:p-[18px]">
        <SleepSummaryCards metrics={data.summary.metrics} />

        <SleepDurationChart
          entries={data.weeklySleep}
          sleepGoalMinutes={data.summary.sleepGoalMinutes}
          latestNightDate={data.summary.latestNightDate}
        />

        <section className="grid gap-2.5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <SleepDetailsCard
            title="Last night details"
            details={data.lastNightDetails}
          />
          <RecentSleepCard
            entries={data.recentNights}
            sleepGoalMinutes={data.summary.sleepGoalMinutes}
          />
        </section>
      </div>
    </div>
  )
}
