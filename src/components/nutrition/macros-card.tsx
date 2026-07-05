import { Card, CardContent } from "@/components/ui/card"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"

type Macro = {
  label: string
  consumed: number
  goal: number
  unit: string
}

type MacrosCardProps = {
  protein?: Macro
  carbs?: Macro
  fat?: Macro
  fibre?: Macro
}

function MacroProgress({ label, consumed, goal, unit }: Macro) {
  const progress = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0

  return (
    <div className="space-y-2">
      <Progress value={progress}>
        <ProgressLabel>{label}</ProgressLabel>
        <ProgressValue>{`${consumed} / ${goal} ${unit}`}</ProgressValue>
      </Progress>
    </div>
  )
}

export function MacrosCard({
  protein = { label: "Protein", consumed: 0, goal: 180, unit: "g" },
  carbs = { label: "Carbohydrates", consumed: 0, goal: 300, unit: "g" },
  fat = { label: "Fat", consumed: 0, goal: 70, unit: "g" },
  fibre = { label: "Fibre", consumed: 0, goal: 30, unit: "g" },
}: MacrosCardProps) {
  return (
    <Card>
      <CardContent className="flex min-h-[240px] flex-col p-6">
        <div className="mb-6">
          <p className="text-[11px] text-muted-foreground">Macronutrients</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Daily Progress
          </h2>
        </div>

        <div className="flex flex-1 flex-col justify-between gap-5">
          <MacroProgress {...protein} />
          <MacroProgress {...carbs} />
          <MacroProgress {...fat} />
          <MacroProgress {...fibre} />
        </div>
      </CardContent>
    </Card>
  )
}
