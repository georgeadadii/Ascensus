import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { AuthCard } from "@/components/ui/login-signup"
import { auth } from "@/lib/auth/auth"

export default async function SignupPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (session) {
    redirect("/overview")
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <AuthCard mode="signup" />
    </div>
  )
}
