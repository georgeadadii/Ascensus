import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { SleepSummaryMetric } from "@/lib/sleep/sleep-types"

type SleepSummaryCardsProps = {
  metrics: SleepSummaryMetric[]
}

export function SleepSummaryCards({ metrics }: SleepSummaryCardsProps) {
  return (
    <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.title} className="ring-1 ring-border/60 shadow-sm">
          <CardHeader className="gap-2">
            <CardDescription className="text-[11.5px] uppercase tracking-[0.16em]">
              {metric.title}
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {metric.value}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
