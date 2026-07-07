"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

const ProgressContext = React.createContext<number>(0)

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  children,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const progressValue = value ?? 0
  return (
    <ProgressContext.Provider value={progressValue}>
      <div className="flex w-full flex-col gap-2">
        {(children as React.ReactNode) && (
          <div className="flex items-center justify-between text-sm">
            {children}
          </div>
        )}

        <ProgressPrimitive.Root
          data-slot="progress"
          className={cn(
            "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted",
            className
          )}
          value={progressValue}
          {...props}
        >
          <ProgressPrimitive.Indicator
            data-slot="progress-indicator"
            className="size-full flex-1 bg-primary transition-all"
            style={{ transform: `translateX(-${100 - progressValue}%)` }}
          />
        </ProgressPrimitive.Root>
      </div>
    </ProgressContext.Provider>
  )
}

function ProgressLabel({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("font-medium", className)} {...props} />
}

function ProgressValue({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  const value = React.useContext(ProgressContext)

  return (
    <span className={cn("text-muted-foreground", className)} {...props}>
      {children ?? `${Number.isInteger(value) ? value : value.toFixed(1)}%`}
    </span>
  )
}

export { Progress, ProgressLabel, ProgressValue }
