import * as React from "react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

export type AnimatedTabItem = {
  value: string
  label: string
}

type AnimatedTabsProps = {
  items: AnimatedTabItem[]
  values: string[]
  onValueChange: (value: string) => void
  className?: string
}

/**
 * Segmented pill tabs with a sliding active indicator (framer-motion shared
 * layout). Controlled via `values` / `onValueChange` so it can drive a chart,
 * a panel, or anything else. Supports multiple selected tabs.
 */
export function AnimatedTabs({
  items,
  values,
  onValueChange,
  className,
}: AnimatedTabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex flex-wrap gap-2 rounded-xl bg-[#11111198] bg-opacity-50 p-1 backdrop-blur-sm",
        className
      )}
    >
      {items.map((item) => {
        const active = values.includes(item.value)
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(item.value)}
            className={cn(
              "relative rounded-lg px-3 py-1.5 text-sm font-medium outline-none transition-colors",
              active ? "text-white" : "text-black"
            )}
          >
            {active && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
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
