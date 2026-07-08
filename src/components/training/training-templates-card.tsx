import { ArrowRight, Plus } from "lucide-react"

import type { TrainingOverview } from "@/app/db/training"
import { TrainingEmptyState } from "@/components/training/training-empty-state"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function TrainingTemplatesCard({
  templates,
}: {
  templates: TrainingOverview["templates"]
}) {
  return (
    <Card className="border-border/60 py-4 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-[12.5px] font-semibold">
            Templates
          </CardTitle>
          <CardDescription className="text-[11px]">
            Saved workout structures ready to launch.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px]">
          <Plus />
          New
        </Button>
      </CardHeader>

      <CardContent className="space-y-2.5">
        {templates.length === 0 ? (
          <TrainingEmptyState
            title="No templates yet"
            description="Create a template to reuse your go-to workout splits."
          />
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{template.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {template.description || "No description yet"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-border/60 bg-background px-2 py-1 text-[10.5px] text-muted-foreground">
                    {template.split || "Custom split"}
                  </span>
                  <span className="rounded-full border border-border/60 bg-background px-2 py-1 text-[10.5px] text-muted-foreground">
                    {template.exerciseCount} exercise
                    {template.exerciseCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="rounded-full border border-border/60 p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                aria-label={`Open ${template.name} template`}
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
