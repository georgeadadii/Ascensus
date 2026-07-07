import type { ReactNode } from "react"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"

import { cn } from "@/lib/utils"

type NutritionCardProps = {
  title: string
  children?: ReactNode
  description?: string
  footer?: string
  progressLabel?: string
  progressValue?: number
  className?: string
  contentClassName?: string
  variant?: "default" | "large"
}

export function NutritionCard({
  title,
  children,
  description,
  footer,
  progressLabel,
  progressValue,
  className,
  contentClassName,
  variant = "default",
}: NutritionCardProps) {
  return (
    <div
      className={cn(
        "relative flex overflow-hidden rounded-2xl border border-border/60 bg-card p-6 text-card-foreground shadow-sm",
        "flex-col transition-shadow hover:shadow-md",
        variant === "large" ? "min-h-[240px]" : "min-h-[100px]",
        className
      )}
    >
      <p className="text-[11px] text-muted-foreground">{title}</p>

      <div className={cn("flex flex-1 flex-col justify-end", contentClassName)}>
        {children ? (
          children
        ) : description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {progressLabel ? (
        <div className="mt-3">
          <Progress value={progressValue ?? 0}>
            <ProgressLabel>{progressLabel}</ProgressLabel>
            <ProgressValue />
          </Progress>
        </div>
      ) : footer ? (
        <p className="mt-3 text-[10.5px] text-muted-foreground">{footer}</p>
      ) : null}
    </div>
  )
}
