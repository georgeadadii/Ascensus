import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/database/prisma"

export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session) {
    return null
  }

  return prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  })
}
