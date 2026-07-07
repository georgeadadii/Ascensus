"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  addDaysToDateKey,
  formatDateLabel,
  todayDateKey,
} from "@/lib/nutrition/date"

type NutritionDaySwitcherProps = {
  selectedDateKey: string
}

export function NutritionDaySwitcher({
  selectedDateKey,
}: NutritionDaySwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const todayKey = todayDateKey()
  const isToday = selectedDateKey === todayKey

  const navigateToDate = React.useCallback(
    (dateKey: string) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString())
      if (dateKey === todayKey) {
        nextSearchParams.delete("date")
      } else {
        nextSearchParams.set("date", dateKey)
      }

      const query = nextSearchParams.toString()
      const href = query ? `${pathname}?${query}` : pathname
      router.replace(href, { scroll: false })
    },
    [pathname, router, searchParams, todayKey]
  )

  return (
    <div className="inline-flex min-h-9 flex-wrap items-center justify-center gap-1 rounded-xl border border-border/70 bg-card/80 px-1.5 py-1 shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-lg text-muted-foreground hover:text-foreground"
        onClick={() => navigateToDate(addDaysToDateKey(selectedDateKey, -1))}
        aria-label="Previous day"
      >
        <ChevronLeft className="size-4" />
      </Button>

      <div className="min-w-[12rem] px-2 text-center">
        <div className="text-[12.5px] font-medium text-foreground">
          {formatDateLabel(selectedDateKey)}
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-lg text-muted-foreground hover:text-foreground"
        onClick={() => navigateToDate(addDaysToDateKey(selectedDateKey, 1))}
        aria-label="Next day"
      >
        <ChevronRight className="size-4" />
      </Button>

      <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-lg px-2.5 text-[11px] text-primary hover:text-primary"
        onClick={() => navigateToDate(todayKey)}
        disabled={isToday}
      >
        Today
      </Button>
    </div>
  )
}
