import { Card, CardContent } from "@/components/ui/card"
import { ProgressBarCircle } from "@/components/ui/progress-circles"

type CaloriesCardProps = {
  loggedCalories?: number
  targetCalories?: number
}

export function CaloriesCard({
  loggedCalories = 0,
  targetCalories = 2500,
}: CaloriesCardProps) {
  const remainingCalories = Math.max(targetCalories - loggedCalories, 0)

  return (
    <Card>
      <CardContent className="flex min-h-[240px] flex-col justify-between p-6">
        <div>
          <p className="text-[11px] text-muted-foreground">Calories</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight">
            {loggedCalories.toLocaleString()}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              kcal
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {remainingCalories.toLocaleString()} kcal remaining today
          </p>
        </div>
        <div className="flex items-center justify-center">
          <ProgressBarCircle
            value={loggedCalories}
            min={0}
            max={
              targetCalories > 0 ? targetCalories : Math.max(loggedCalories, 1)
            }
            size="sm"
            label="Daily goal"
            valueFormatter={(value) => `${value.toLocaleString()} kcal`}
          />
        </div>
      </CardContent>
    </Card>
  )
}
