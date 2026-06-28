import Link from "next/link"

import { cn } from "@/lib/utils"

export function AuthShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className={cn("flex w-full max-w-sm flex-col gap-6", className)}>
        <Link
          href="/"
          className="flex items-center gap-2 self-center font-medium"
        >
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="text-xs font-semibold">A</span>
          </div>
          Ascensus
        </Link>
        {children}
      </div>
    </div>
  )
}
