"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

type TabsVariant = "default" | "line"

type TabsContextValue = {
  value?: string
  layoutId: string
  variant: TabsVariant
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext(component: string) {
  const ctx = React.useContext(TabsContext)
  if (!ctx) {
    throw new Error(`<${component}> must be used within <Tabs>`)
  }
  return ctx
}

function Tabs({
  className,
  orientation = "horizontal",
  value,
  defaultValue,
  onValueChange,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root> & {
  variant?: TabsVariant
}) {
  const layoutId = React.useId()
  const isControlled = value !== undefined

  // We keep our own copy of the active value (seeded from value/defaultValue)
  // so TabsTrigger can know whether it's selected without relying on
  // data-state CSS selectors.
  const [internalValue, setInternalValue] = React.useState(
    value ?? defaultValue
  )
  const activeValue = isControlled ? value : internalValue

  const handleValueChange = React.useCallback(
    (next: string) => {
      if (!isControlled) {
        setInternalValue(next)
      }
      onValueChange?.(next)
    },
    [isControlled, onValueChange]
  )

  const rootProps = isControlled
    ? { value, onValueChange: handleValueChange }
    : { defaultValue, onValueChange: handleValueChange }

  return (
    <TabsContext.Provider value={{ value: activeValue, layoutId, variant }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        data-orientation={orientation}
        className={cn(
          "flex gap-2",
          orientation === "horizontal" ? "flex-col" : "flex-row",
          className
        )}
        {...rootProps}
        {...props}
      />
    </TabsContext.Provider>
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const { variant } = useTabsContext("TabsList")

  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-lg p-1",
        variant === "line" && "gap-2 rounded-none p-0",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  value,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const {
    value: activeValue,
    layoutId,
    variant,
  } = useTabsContext("TabsTrigger")
  const isActive = activeValue === value

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        isActive ? "text-white" : "text-black hover:bg-black/5",
        className
      )}
      {...props}
    >
      {isActive && (
        <motion.div
          layoutId={`${layoutId}-active-pill`}
          className={cn(
            "absolute inset-0 z-0 rounded-lg bg-black",
            variant === "line" && "rounded-md"
          )}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {children}
      </span>
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
