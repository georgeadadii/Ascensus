"use client"

import * as React from "react"
import { LoaderCircle, Play } from "lucide-react"
import { useRouter } from "next/navigation"

import { createWorkoutSession } from "@/app/training/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

function buildInitialWorkoutName() {
  return `Workout ${new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })}`
}

export function StartWorkoutDialog() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState(buildInitialWorkoutName)
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const [wasOpen, setWasOpen] = React.useState(open)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setName(buildInitialWorkoutName())
      setError(null)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createWorkoutSession(name)

      if (!result.ok) {
        setError(result.error)
        return
      }

      setOpen(false)
      router.push(`/training/session/${result.sessionId}`)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full sm:w-auto">
          <Play />
          Start workout
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start workout</DialogTitle>
          <DialogDescription>
            Create a live workout session and jump straight into logging sets.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="workout-name" className="text-sm font-medium">
              Workout title
            </label>
            <Input
              id="workout-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Workout title"
              autoFocus
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <LoaderCircle className="animate-spin" /> : <Play />}
              Start workout
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
