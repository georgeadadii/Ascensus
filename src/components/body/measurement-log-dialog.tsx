"use client"

import * as React from "react"
import { CalendarDays, Check, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { logMeasurements } from "@/app/body/actions"
import type { MeasurementField } from "@/app/db/body-metrics"

type MeasurementLogDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MEASUREMENT_INPUTS: { field: MeasurementField; label: string }[] = [
  { field: "waist", label: "Waist" },
  { field: "chest", label: "Chest" },
  { field: "hips", label: "Hips" },
  { field: "leftArm", label: "Left arm" },
  { field: "rightArm", label: "Right arm" },
  { field: "leftLeg", label: "Thigh (L)" },
  { field: "rightLeg", label: "Thigh (R)" },
]

export function MeasurementLogDialog({
  open,
  onOpenChange,
}: MeasurementLogDialogProps) {
  const [values, setValues] = React.useState<
    Record<MeasurementField, string>
  >({
    waist: "",
    chest: "",
    hips: "",
    leftArm: "",
    rightArm: "",
    leftLeg: "",
    rightLeg: "",
  })
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  // Reset on open
  const [wasOpen, setWasOpen] = React.useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setValues({
        waist: "",
        chest: "",
        hips: "",
        leftArm: "",
        rightArm: "",
        leftLeg: "",
        rightLeg: "",
      })
      setError(null)
    }
  }

  function handleSave() {
    const input: any = {}
    for (const [f, v] of Object.entries(values)) {
      if (v.trim() !== "") {
        const parsed = Number.parseFloat(v)
        if (!Number.isFinite(parsed)) {
          setError(`Invalid value for ${f}.`)
          return
        }
        input[f] = parsed
      }
    }

    if (Object.keys(input).length === 0) {
      setError("Please enter at least one measurement.")
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await logMeasurements(input)
      if (result.ok) {
        onOpenChange(false)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 p-0 text-white ring-0"
      >
        <DialogHeader className="flex flex-row items-start justify-between space-y-0 border-b border-white/10 px-6 py-5">
          <div>
            <DialogTitle className="text-base font-semibold text-white">
              Update Measurements
            </DialogTitle>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
              <CalendarDays className="h-3.5 w-3.5" />
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-neutral-800 text-neutral-400 transition hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-2 gap-4">
            {MEASUREMENT_INPUTS.map((item) => (
              <div key={item.field} className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-widest text-neutral-500">
                  {item.label} (cm)
                </label>
                <Input
                  value={values[item.field]}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [item.field]: e.target.value,
                    }))
                  }
                  inputMode="decimal"
                  className="h-10 rounded-lg border-white/10 bg-neutral-800 text-sm font-medium text-white"
                />
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <DialogFooter className="mx-0 mb-0 flex flex-row gap-2 rounded-none border-t border-white/10 bg-transparent px-6 py-4">
          <Button
            variant="outline"
            className="flex-1 border-white/10 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            className="flex-[2] bg-blue-600 text-white hover:bg-blue-500"
            onClick={handleSave}
            disabled={isPending}
          >
            <Check className="h-4 w-4" />
            {isPending ? "Saving…" : "Save Measurements"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
