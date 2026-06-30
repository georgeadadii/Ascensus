"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface FlipCardProps {
  front: React.ReactNode
  back: React.ReactNode
  width?: string
  height?: string
  className?: string
}

export function FlipCard({
  front,
  back,
  width = "100%",
  height = "260px",
  className,
}: FlipCardProps) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div
      className={cn("group perspective-[1400px]", className)}
      style={{ width, height }}
      onClick={() => setFlipped((prev) => !prev)}
    >
      <div
        className={cn(
          "relative h-full w-full rounded-2xl transition-transform duration-700 ease-in-out [transform-style:preserve-3d]",
          "group-hover:[transform:rotateY(180deg)]",
          flipped && "[transform:rotateY(180deg)]"
        )}
      >
        {/* Front */}
        <div className="absolute inset-0 rounded-2xl border border-border/60 bg-card shadow-sm [backface-visibility:hidden]">
          <div className="flex h-full w-full flex-col rounded-2xl p-6">
            {front}
          </div>
        </div>

        {/* Back */}
        <div className="absolute inset-0 rounded-2xl border border-border/60 bg-card shadow-sm [transform:rotateY(180deg)] [backface-visibility:hidden]">
          <div
            className="flex h-full w-full flex-col rounded-2xl p-6"
            onClick={(event) => event.stopPropagation()}
          >
            {back}
          </div>
        </div>
      </div>
    </div>
  )
}
