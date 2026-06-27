"use client"

import { authClient } from "@/lib/auth/client"

export default function LoginPage() {
  const signIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
      newUserCallbackURL: "/dashboard",
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <button
        onClick={signIn}
        className="rounded-lg bg-black px-6 py-3 text-white"
      >
        Continue with Google
      </button>
    </main>
  )
}
