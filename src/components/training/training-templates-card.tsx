"use client"

import * as React from "react"
import Link from "next/link"
import { LoaderCircle, Pencil, Play, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import type { TrainingOverview } from "@/app/db/training"
import {
  deleteWorkoutTemplate,
  startWorkoutFromTemplate,
} from "@/app/training/actions"
import { TrainingEmptyState } from "@/components/training/training-empty-state"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type TemplateSummary = TrainingOverview["templates"][number]

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function TemplateDeleteDialog({ template }: { template: TemplateSummary }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  function handleDelete() {
    setError(null)

    startTransition(async () => {
      const result = await deleteWorkoutTemplate(template.id)

      if (!result.ok) {
        setError(result.error)
        return
      }

      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 />
          Delete
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete template?</DialogTitle>
          <DialogDescription>
            This removes the template and its exercises. Historical workout
            sessions stay unchanged.
          </DialogDescription>
        </DialogHeader>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={handleDelete}
          >
            {isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
            Delete template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TemplateCard({ template }: { template: TemplateSummary }) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  function handleStartWorkout() {
    setError(null)

    startTransition(async () => {
      const result = await startWorkoutFromTemplate(template.id)

      if (!result.ok) {
        setError(result.error)
        return
      }

      router.push(`/training/session/${result.sessionId}`)
      router.refresh()
    })
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold">{template.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {template.description || "No description yet"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border/60 bg-background px-2.5 py-1">
            {template.exerciseCount} exercise
            {template.exerciseCount === 1 ? "" : "s"}
          </span>
          <span className="rounded-full border border-border/60 bg-background px-2.5 py-1">
            Updated {formatUpdatedAt(template.updatedAt)}
          </span>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/8 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={template.exerciseCount === 0 || isPending}
          onClick={handleStartWorkout}
        >
          {isPending ? <LoaderCircle className="animate-spin" /> : <Play />}
          Start Workout
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/training/templates/${template.id}`}>
            <Pencil />
            Edit
          </Link>
        </Button>
        <TemplateDeleteDialog template={template} />
      </div>
    </div>
  )
}

export function TrainingTemplatesCard({
  templates,
}: {
  templates: TrainingOverview["templates"]
}) {
  return (
    <Card
      id="training-templates"
      className="flex h-[23rem] flex-col border-border/60 py-4 shadow-sm"
    >
      <CardHeader className="shrink-0 flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-[12.5px] font-semibold">
            Templates
          </CardTitle>
          <CardDescription className="text-[11px]">
            Create, edit, launch, and maintain your saved workout structures.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/training/templates/new">
            <Plus />
            Create Template
          </Link>
        </Button>
      </CardHeader>

      <CardContent
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          templates.length === 0 ? "flex items-center pb-2" : "space-y-3"
        )}
      >
        {templates.length === 0 ? (
          <TrainingEmptyState
            title="No templates yet"
            description="Create a template to reuse your go-to workout splits."
          />
        ) : (
          templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))
        )}
      </CardContent>
    </Card>
  )
}
