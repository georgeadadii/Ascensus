import { AppSidebar } from "@/components/app-sidebar"
import { BodyDashboard } from "@/components/body/body-dashboard"
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
import { getCurrentUser } from "@/app/db/users"
import { getBodyOverview } from "@/app/db/body-metrics"
import { auth } from "@/lib/auth/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function BodyPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect("/login")
  }

  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const overview = await getBodyOverview(user.id)

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
                  <BreadcrumbPage>Body</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <BodyDashboard overview={overview} />
      </SidebarInset>
    </SidebarProvider>
  )
}
