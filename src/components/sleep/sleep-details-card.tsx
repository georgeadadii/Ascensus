import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTime } from "@/lib/sleep/sleep-formatters"
import type { SleepDetailItem } from "@/lib/sleep/sleep-types"

type SleepDetailsCardProps = {
  title: string
  details: SleepDetailItem[]
}

export function SleepDetailsCard({ title, details }: SleepDetailsCardProps) {
  return (
    <Card className="ring-1 ring-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="text-[12.5px] font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {details.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 text-sm text-muted-foreground">
            No sleep details available yet.
          </div>
        ) : null}

        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {details.map((item) => {
            const formattedValue = /^\d{1,2}:\d{2}$/.test(item.value)
              ? formatTime(item.value)
              : item.value

            return (
              <div
                key={item.label}
                className="flex items-center justify-between gap-4 border-b border-border/40 pb-3 text-sm last:border-b-0 last:pb-0"
              >
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium tabular-nums">
                  {formattedValue}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
