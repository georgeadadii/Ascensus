"use client"

import * as React from "react"
import { CalendarDays, Camera, Check, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { logBodyMetric } from "@/app/body/actions"
import type { BodyMetricField, WeekDay } from "@/app/db/body-metrics"

export type { BodyMetricField } from "@/app/db/body-metrics"

type BodyLogDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  metric: BodyMetricField
  label: string
  /** Canonical unit the value is stored in: "kg" for masses, "%" for body fat. */
  unit: string
  /** Today's existing value (if already logged) used to prefill the input. */
  defaultValue?: string
  previousValue?: number | null
  previousDate?: string | null
  delta?: number | null
  week?: WeekDay[]
}

/** Metrics where a decrease is the "good" direction (shown green). */
const LOWER_IS_BETTER: Record<BodyMetricField, boolean> = {
  weight: true,
  bodyFat: true,
  muscleMass: false,
  leanMass: false,
}

function formatRelativeDay(dateKey: string): string {
  const today = new Date()
  const todayKey = today.toISOString().slice(0, 10)
  if (dateKey === todayKey) return "today"
  const yesterday = new Date(today)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  if (dateKey === yesterday.toISOString().slice(0, 10)) return "yesterday"
  return new Date(dateKey).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
}

export function BodyLogDialog({
  open,
  onOpenChange,
  metric,
  label,
  unit,
  defaultValue = "",
  previousValue,
  previousDate,
  delta,
  week,
}: BodyLogDialogProps) {
  const isMass = unit !== "%"
  const [value, setValue] = React.useState(defaultValue)
  const [selectedUnit, setSelectedUnit] = React.useState(unit)
  const [image, setImage] = React.useState<File | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  // Reset the form each time the dialog transitions to open (derived-state
  // pattern — preferred over a setState-in-effect).
  const [wasOpen, setWasOpen] = React.useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setValue(defaultValue)
      setSelectedUnit(unit)
      setImage(null)
      setError(null)
    }
  }

  function handleSave() {
    const parsed = Number.parseFloat(value)
    if (!Number.isFinite(parsed)) {
      setError("Enter a valid number.")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await logBodyMetric({
        metric,
        value: parsed,
        unit: selectedUnit,
      })
      if (result.ok) {
        onOpenChange(false)
      } else {
        setError(result.error)
      }
    })
  }

  const deltaIsGood =
    delta != null && (LOWER_IS_BETTER[metric] ? delta < 0 : delta > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 p-0 text-white ring-0"
      >
        <DialogHeader className="flex flex-row items-start justify-between space-y-0 border-b border-white/10 px-6 py-5">
          <div>
            <DialogTitle className="text-base font-semibold text-white">
              Log {label}
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

        <div className="space-y-5 px-6 py-6">
          <div className="flex items-center justify-center gap-3">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="decimal"
              autoFocus
              className="h-20 w-36 rounded-xl border-white/10 bg-neutral-800 text-center !text-4xl font-semibold text-white"
            />
            <span className="text-xl text-neutral-400">{selectedUnit}</span>
          </div>

          {isMass && (
            <div className="flex justify-center gap-2">
              {["kg", "lbs", "st"].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setSelectedUnit(u)}
                  className={cn(
                    "rounded-lg border px-4 py-1.5 text-xs transition",
                    selectedUnit === u
                      ? "border-blue-500 bg-blue-950 text-blue-400"
                      : "border-white/10 bg-neutral-800 text-neutral-400"
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
          )}

          {previousValue != null && (
            <div className="flex items-center justify-between rounded-xl bg-neutral-800 px-4 py-3">
              <span className="text-xs text-neutral-500">Previous</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-300">
                  {previousValue} {unit}
                  {previousDate ? ` · ${formatRelativeDay(previousDate)}` : ""}
                </span>
                {delta != null && delta !== 0 && (
                  <span
                    className={cn(
                      "text-xs font-medium",
                      deltaIsGood ? "text-emerald-400" : "text-orange-400"
                    )}
                  >
                    {delta < 0 ? "↓" : "↑"} {Math.abs(delta)} {unit}
                  </span>
                )}
              </div>
            </div>
          )}

          {week && week.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-widest text-neutral-500">
                This week
              </p>
              <div className="grid grid-cols-7 gap-1.5">
                {week.map((d) => (
                  <div
                    key={d.day}
                    className={cn(
                      "rounded-lg border p-2 text-center",
                      d.today
                        ? "border-blue-500 bg-blue-950"
                        : d.value != null
                          ? "border-emerald-600 bg-emerald-950"
                          : "border-white/10 bg-neutral-800"
                    )}
                  >
                    <p className="text-[9.5px] text-neutral-400">{d.day}</p>
                    <p className="mt-0.5 text-[10.5px] text-neutral-200">
                      {d.value != null ? d.value : "–"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-[11px] uppercase tracking-widest text-neutral-500">
              Progress photo <span className="lowercase">optional</span>
            </p>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-neutral-800 p-6 transition hover:border-blue-500">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              />
              {image ? (
                <>
                  <Check className="mb-2 h-6 w-6 text-emerald-400" />
                  <p className="max-w-full truncate text-sm">{image.name}</p>
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-red-400"
                    onClick={(e) => {
                      e.preventDefault()
                      setImage(null)
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <Camera className="mb-2 h-6 w-6 text-neutral-500" />
                  <div className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium">
                    <Upload className="h-3.5 w-3.5" />
                    Choose image
                  </div>
                  <p className="mt-2 text-[11px] text-neutral-500">
                    PNG, JPG or HEIC
                  </p>
                </>
              )}
            </label>
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
            {isPending ? "Saving…" : `Log ${label.toLowerCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
