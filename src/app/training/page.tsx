import { AppSidebar } from "@/components/app-sidebar"
import { TrainingDashboard } from "@/components/training/training-dashboard"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getExercisePickerOptions } from "@/app/db/exercises"
import { getTrainingOverview } from "@/app/db/training"
import { getCurrentUser } from "@/app/db/users"
import { auth } from "@/lib/auth/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function TrainingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  const user = await getCurrentUser()

  if (!session || !user) {
    redirect("/login")
  }

  const [overview, exerciseOptions] = await Promise.all([
    getTrainingOverview(user.id),
    getExercisePickerOptions(user.id),
  ])

  return (
    <SidebarProvider>
      <AppSidebar user={user} />

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/overview">Overview</BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbSeparator className="hidden md:block" />

                <BreadcrumbItem>
                  <BreadcrumbPage>Training</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <TrainingDashboard
          overview={overview}
          exerciseOptions={exerciseOptions}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}
