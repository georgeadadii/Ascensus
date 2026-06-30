"use client"

import * as React from "react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

export type AnimatedTabItem = {
  value: string
  label: string
}

type AnimatedTabsProps = {
  items: AnimatedTabItem[]
  value: string
  onValueChange: (value: string) => void
  className?: string
}

/**
 * Segmented pill tabs with a sliding active indicator (framer-motion shared
 * layout). Controlled via `value` / `onValueChange` so it can drive a chart,
 * a panel, or anything else.
 */
export function AnimatedTabs({
  items,
  value,
  onValueChange,
  className,
}: AnimatedTabsProps) {
  // Unique per instance so multiple tab bars on a page animate independently.
  const layoutId = React.useId()

  return (
    <div
      role="tablist"
      className={cn(
        "flex flex-wrap gap-2 rounded-xl bg-[#11111198] bg-opacity-50 p-1 backdrop-blur-sm",
        className
      )}
    >
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(item.value)}
            className="relative rounded-lg px-3 py-1.5 text-sm font-medium text-white outline-none transition-colors"
          >
            {active && (
              <motion.div
                layoutId={layoutId}
                transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
                className="absolute inset-0 rounded-lg bg-[#111111d1] bg-opacity-50 shadow-[0_0_20px_rgba(0,0,0,0.2)] backdrop-blur-sm"
              />
            )}
            <span className="relative z-10">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
