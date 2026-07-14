"use client"

import * as React from "react"
import { PencilLine } from "lucide-react"
import { useRouter } from "next/navigation"

import type { ExercisePickerOption } from "@/app/db/exercises"
import type { TrainingOverview } from "@/app/db/training"
import {
  assignPersonalRecordSlot,
  replacePersonalRecordSlot,
} from "@/app/training/actions"
import { ExercisePickerDialog } from "@/components/training/exercise-picker-dialog"
import { TrainingPersonalRecordCard } from "@/components/training/training-personal-record-card"
import { Button } from "@/components/ui/button"

type PersonalRecordSlot = TrainingOverview["personalRecords"][number]

type TrainingPersonalRecordsSectionProps = {
  slots: PersonalRecordSlot[]
  exerciseOptions: ExercisePickerOption[]
}

function toOptimisticSlot(
  currentSlot: PersonalRecordSlot,
  exercise: { id: string; name: string }
): PersonalRecordSlot {
  return {
    ...currentSlot,
    exercise,
    actualOneRepMax: null,
    actualOneRepMaxAchievedAt: null,
    estimatedOneRepMax: null,
    shouldDisplayEstimatedValue: false,
  }
}

export function TrainingPersonalRecordsSection({
  slots,
  exerciseOptions,
}: TrainingPersonalRecordsSectionProps) {
  const router = useRouter()
  const [editMode, setEditMode] = React.useState(false)
  const [localSlots, setLocalSlots] = React.useState(slots)
  const [busySlot, setBusySlot] = React.useState<number | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  // `localSlots` mirrors server props so immediate client updates can be
  // reconciled by the subsequent router refresh.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalSlots(slots)
  }, [slots])

  async function handleSelect(slot: PersonalRecordSlot, exerciseId: string) {
    setBusySlot(slot.slot)
    setErrorMessage(null)

    const action = slot.exercise
      ? replacePersonalRecordSlot
      : assignPersonalRecordSlot
    const result = await action(slot.slot, exerciseId)

    if (!result.ok) {
      setBusySlot(null)
      setErrorMessage(result.error)
      return false
    }

    setLocalSlots((currentSlots) =>
      currentSlots.map((currentSlot) =>
        currentSlot.slot === slot.slot
          ? toOptimisticSlot(currentSlot, result.exercise)
          : currentSlot
      )
    )
    setBusySlot(null)
    router.refresh()
    return true
  }

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold">Personal Records</h2>
          <p className="text-[11.5px] text-muted-foreground">
            Track four lifts with actual and estimated 1RM values.
          </p>
          {errorMessage ? (
            <p className="mt-1 text-[11.5px] text-destructive">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEditMode((currentValue) => !currentValue)}
        >
          <PencilLine />
          {editMode ? "Done" : "Edit"}
        </Button>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {localSlots.map((slot) => {
          const unavailableExerciseIds = localSlots
            .filter((candidate) => candidate.slot !== slot.slot)
            .flatMap((candidate) =>
              candidate.exercise ? [candidate.exercise.id] : []
            )

          if (!slot.exercise) {
            return (
              <ExercisePickerDialog
                key={slot.slot}
                options={exerciseOptions}
                title={`Select exercise for slot ${slot.slot}`}
                description="Search by name, primary muscle, or equipment."
                trigger={
                  <button
                    type="button"
                    className="w-full text-left"
                    aria-label={`Select exercise for personal record slot ${slot.slot}`}
                    disabled={busySlot === slot.slot}
                  >
                    <TrainingPersonalRecordCard
                      record={slot}
                      editMode={editMode}
                      empty
                    />
                  </button>
                }
                filterOption={(option) =>
                  !unavailableExerciseIds.includes(option.id)
                }
                onSelect={(option) => handleSelect(slot, option.id)}
              />
            )
          }

          if (editMode) {
            return (
              <div key={slot.slot}>
                <TrainingPersonalRecordCard
                  record={slot}
                  editMode
                  action={
                    <ExercisePickerDialog
                      options={exerciseOptions}
                      title={`Replace exercise in slot ${slot.slot}`}
                      description="Choose a different exercise for this personal record slot."
                      trigger={
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          disabled={busySlot === slot.slot}
                          aria-label={`Replace personal record slot ${slot.slot} exercise`}
                        >
                          Replace
                        </Button>
                      }
                      filterOption={(option) =>
                        option.id !== slot.exercise?.id &&
                        !unavailableExerciseIds.includes(option.id)
                      }
                      onSelect={(option) => handleSelect(slot, option.id)}
                    />
                  }
                />
              </div>
            )
          }

          return (
            <div key={slot.slot}>
              <TrainingPersonalRecordCard record={slot} />
            </div>
          )
        })}
      </div>
    </section>
  )
}
