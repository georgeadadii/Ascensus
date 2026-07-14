import { notFound, redirect } from "next/navigation"

import { getExercisePickerOptions } from "@/app/db/exercises"
import { getWorkoutTemplateForEditor } from "@/app/db/workout-templates"
import { updateWorkoutTemplateFromDraft } from "@/app/training/actions"
import { getCurrentUser } from "@/app/db/users"
import { AppSidebar } from "@/components/app-sidebar"
import { WorkoutTemplateEditor } from "@/components/training/workout-template-editor"
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
import { createDraftFromTemplate } from "@/lib/training/workout-template-draft"

export default async function TrainingTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const [template, exerciseOptions] = await Promise.all([
    getWorkoutTemplateForEditor(user.id, id),
    getExercisePickerOptions(user.id),
  ])

  if (!template) {
    notFound()
  }

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

                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/training">Training</BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbSeparator className="hidden md:block" />

                <BreadcrumbItem>
                  <BreadcrumbPage>{template.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <WorkoutTemplateEditor
          mode="edit"
          initialDraft={createDraftFromTemplate(template)}
          initialVersion={template.version}
          initialUpdatedAt={template.updatedAt}
          exerciseOptions={exerciseOptions}
          onSubmitDraft={async (draft) => {
            "use server"

            return updateWorkoutTemplateFromDraft({
              templateId: template.id,
              name: draft.name,
              description: draft.description,
              exercises: draft.exercises.map((exercise) => ({
                exerciseId: exercise.exerciseId,
                order: exercise.order,
                notes: exercise.notes,
                sets: exercise.sets.map((set) => ({
                  setNumber: set.setNumber,
                  minReps: set.minReps ?? 0,
                  maxReps: set.maxReps ?? 0,
                  targetWeight: set.targetWeight,
                })),
              })),
            })
          }}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}
