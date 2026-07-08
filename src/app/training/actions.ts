"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/database/prisma"

export type CreateWorkoutSessionResult =
  { ok: true; sessionId: string } | { ok: false; error: string }

function buildDefaultWorkoutName() {
  return `Workout ${new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })}`
}

export async function createWorkoutSession(
  name?: string
): Promise<CreateWorkoutSessionResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return { ok: false, error: "You must be signed in to start a workout." }
  }

  const trimmed = name?.trim()
  const workoutName = trimmed || buildDefaultWorkoutName()

  const workoutSession = await prisma.workoutSession.create({
    data: {
      userId: session.user.id,
      name: workoutName,
      status: "IN_PROGRESS",
    },
    select: {
      id: true,
    },
  })

  revalidatePath("/training")

  return {
    ok: true,
    sessionId: workoutSession.id,
  }
}
