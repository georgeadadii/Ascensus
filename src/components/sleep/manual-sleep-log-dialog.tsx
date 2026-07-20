"use client"

import { useId, useState, useTransition } from "react"

import { saveManualSleepLog } from "@/app/sleep/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  SLEEP_QUALITY_MAX,
  SLEEP_QUALITY_MIN,
  createManualSleepLogInitialState,
  normalizeManualSleepLogValues,
  validateManualSleepLogForm,
  type ManualSleepLogErrors,
  type ManualSleepLogField,
  type ManualSleepLogFormState,
  type ManualSleepLogValues,
} from "@/lib/sleep/manual-sleep-log-validation"
import { cn } from "@/lib/utils"

type ManualSleepLogDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValues?: Partial<ManualSleepLogValues>
  mode?: "create" | "edit"
}

export function ManualSleepLogDialog({
  open,
  onOpenChange,
  initialValues,
  mode = "create",
}: ManualSleepLogDialogProps) {
  const sleepDateId = useId()
  const bedtimeId = useId()
  const wakeTimeId = useId()
  const timeToFallAsleepId = useId()
  const awakeningsId = useId()
  const awakeDurationId = useId()
  const sleepQualityId = useId()
  const notesId = useId()

  const [formValues, setFormValues] = useState<ManualSleepLogFormState>(() =>
    createManualSleepLogInitialState(initialValues)
  )
  const [errors, setErrors] = useState<ManualSleepLogErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const resetForm = () => {
    setFormValues(createManualSleepLogInitialState(initialValues))
    setErrors({})
    setSubmitError(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending && !nextOpen) {
      return
    }

    resetForm()
    onOpenChange(nextOpen)
  }

  const handleStringChange =
    (field: keyof ManualSleepLogFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nextValue = event.target.value

      setFormValues((currentValues) => ({
        ...currentValues,
        [field]: nextValue,
      }))

      if (submitError) {
        setSubmitError(null)
      }

      setErrors((currentErrors) => {
        if (!currentErrors[field as ManualSleepLogField]) {
          return currentErrors
        }

        const nextErrors = { ...currentErrors }
        delete nextErrors[field as ManualSleepLogField]
        return nextErrors
      })
    }

  const handleSleepQualityChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const nextValue = Number(event.target.value)

    setFormValues((currentValues) => ({
      ...currentValues,
      sleepQuality: nextValue,
    }))

    if (submitError) {
      setSubmitError(null)
    }

    setErrors((currentErrors) => {
      if (!currentErrors.sleepQuality) {
        return currentErrors
      }

      const nextErrors = { ...currentErrors }
      delete nextErrors.sleepQuality
      return nextErrors
    })
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isPending) {
      return
    }

    const nextErrors = validateManualSleepLogForm(formValues)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setSubmitError(null)
      return
    }

    const normalizedValues = normalizeManualSleepLogValues(formValues)
    setSubmitError(null)

    startTransition(async () => {
      const result = await saveManualSleepLog(normalizedValues)

      if (result.ok) {
        handleOpenChange(false)
        return
      }

      if (result.fieldErrors) {
        setErrors((currentErrors) => ({
          ...currentErrors,
          ...result.fieldErrors,
        }))
      }

      setSubmitError(result.error)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(92vh,720px)] max-w-2xl overflow-y-auto p-0">
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 p-5">
            <DialogHeader>
              <DialogTitle>
                {mode === "edit" ? "Edit sleep log" : "Log sleep"}
              </DialogTitle>
              <DialogDescription>
                Capture last night&apos;s sleep details manually.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldGroup
                id={sleepDateId}
                label="Sleep date"
                error={errors.sleepDate}
              >
                <Input
                  id={sleepDateId}
                  type="date"
                  value={formValues.sleepDate}
                  onChange={handleStringChange("sleepDate")}
                  aria-invalid={Boolean(errors.sleepDate)}
                  required
                />
              </FieldGroup>

              <FieldGroup id={bedtimeId} label="Bedtime" error={errors.bedtime}>
                <Input
                  id={bedtimeId}
                  type="time"
                  value={formValues.bedtime}
                  onChange={handleStringChange("bedtime")}
                  aria-invalid={Boolean(errors.bedtime)}
                  required
                />
              </FieldGroup>

              <FieldGroup
                id={wakeTimeId}
                label="Wake time"
                error={errors.wakeTime}
              >
                <Input
                  id={wakeTimeId}
                  type="time"
                  value={formValues.wakeTime}
                  onChange={handleStringChange("wakeTime")}
                  aria-invalid={Boolean(errors.wakeTime)}
                  required
                />
              </FieldGroup>

              <FieldGroup
                id={timeToFallAsleepId}
                label="Time to fall asleep (minutes)"
                error={errors.timeToFallAsleep}
              >
                <Input
                  id={timeToFallAsleepId}
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={formValues.timeToFallAsleep}
                  onChange={handleStringChange("timeToFallAsleep")}
                  aria-invalid={Boolean(errors.timeToFallAsleep)}
                />
              </FieldGroup>

              <FieldGroup
                id={awakeningsId}
                label="Awakenings"
                error={errors.awakenings}
              >
                <Input
                  id={awakeningsId}
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={formValues.awakenings}
                  onChange={handleStringChange("awakenings")}
                  aria-invalid={Boolean(errors.awakenings)}
                />
              </FieldGroup>

              <FieldGroup
                id={awakeDurationId}
                label="Awake duration (minutes)"
                error={errors.awakeDuration}
              >
                <Input
                  id={awakeDurationId}
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={formValues.awakeDuration}
                  onChange={handleStringChange("awakeDuration")}
                  aria-invalid={Boolean(errors.awakeDuration)}
                />
              </FieldGroup>
            </div>

            <FieldGroup
              id={sleepQualityId}
              label={`Sleep quality (${formValues.sleepQuality}/${SLEEP_QUALITY_MAX})`}
              error={errors.sleepQuality}
            >
              <div className="space-y-2">
                <input
                  id={sleepQualityId}
                  type="range"
                  min={SLEEP_QUALITY_MIN}
                  max={SLEEP_QUALITY_MAX}
                  step="1"
                  value={formValues.sleepQuality}
                  onChange={handleSleepQualityChange}
                  aria-invalid={Boolean(errors.sleepQuality)}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{SLEEP_QUALITY_MIN}</span>
                  <span>{SLEEP_QUALITY_MAX}</span>
                </div>
              </div>
            </FieldGroup>

            <FieldGroup id={notesId} label="Notes (optional)">
              <textarea
                id={notesId}
                value={formValues.notes}
                onChange={handleStringChange("notes")}
                rows={4}
                className={cn(
                  "flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30 dark:disabled:bg-input/80"
                )}
                placeholder="How did the night feel?"
              />
            </FieldGroup>

            {submitError ? (
              <p className="text-sm text-destructive" role="alert">
                {submitError}
              </p>
            ) : null}
          </div>

          <DialogFooter className="mt-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : mode === "edit"
                  ? "Save changes"
                  : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type FieldGroupProps = {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}

function FieldGroup({ id, label, error, children }: FieldGroupProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[12.5px]">
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-[11px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
