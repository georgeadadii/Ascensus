"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { AUTH_CALLBACK_URL } from "@/lib/auth/constants"
import { authClient } from "@/lib/auth/client"
import { cn } from "@/lib/utils"

type AuthCardMode = "login" | "signup"

type AuthCardProps = {
  mode: AuthCardMode
  className?: string
}

export function AuthCard({ mode, className }: AuthCardProps) {
  const router = useRouter()
  const isLogin = mode === "login"

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const signInWithGoogle = async () => {
    setError(null)
    setIsLoading(true)

    const { error: authError } = await authClient.signIn.social({
      provider: "google",
      callbackURL: AUTH_CALLBACK_URL,
      ...(isLogin ? {} : { newUserCallbackURL: AUTH_CALLBACK_URL }),
    })

    setIsLoading(false)

    if (authError) {
      setError(authError.message ?? "Unable to continue with Google")
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!isLogin) {
      if (password.length < 8) {
        setError("Password must be at least 8 characters long")
        return
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match")
        return
      }
    }

    setIsLoading(true)

    if (isLogin) {
      const { error: authError } = await authClient.signIn.email({
        email,
        password,
        callbackURL: AUTH_CALLBACK_URL,
      })

      setIsLoading(false)

      if (authError) {
        setError(authError.message ?? "Unable to sign in")
        return
      }
    } else {
      const { error: authError } = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: AUTH_CALLBACK_URL,
      })

      setIsLoading(false)

      if (authError) {
        setError(authError.message ?? "Unable to create account")
        return
      }
    }

    router.push(AUTH_CALLBACK_URL)
    router.refresh()
  }

  return (
    <>
      <style>{`
        .auth-card-animate {
          opacity: 0;
          transform: translateY(20px);
          animation: authCardFadeUp 0.8s cubic-bezier(.22,.61,.36,1) 0.15s forwards;
        }
        @keyframes authCardFadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <Card
        className={cn(
          "auth-card-animate w-full max-w-sm border-zinc-800 bg-zinc-900/70 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60",
          className
        )}
      >
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">
            {isLogin ? "Welcome back" : "Create an account"}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {isLogin
              ? "Sign in to your account"
              : "Sign up to get started with Ascensus"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="grid gap-5" onSubmit={handleSubmit}>
            {error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            {!isLogin ? (
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-zinc-300">
                  Full name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    disabled={isLoading}
                    className="h-10 border-zinc-800 bg-zinc-950 pl-10 text-zinc-50 placeholder:text-zinc-600"
                  />
                </div>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="email" className="text-zinc-300">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={isLoading}
                  className="h-10 border-zinc-800 bg-zinc-950 pl-10 text-zinc-50 placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password" className="text-zinc-300">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={isLoading}
                  className="h-10 border-zinc-800 bg-zinc-950 pl-10 pr-10 text-zinc-50 placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-zinc-400 hover:text-zinc-200"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {!isLogin ? (
              <div className="grid gap-2">
                <Label htmlFor="confirm-password" className="text-zinc-300">
                  Confirm password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    disabled={isLoading}
                    className="h-10 border-zinc-800 bg-zinc-950 pl-10 pr-10 text-zinc-50 placeholder:text-zinc-600"
                  />
                  <button
                    type="button"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-zinc-400 hover:text-zinc-200"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    className="border-zinc-700 data-[state=checked]:bg-zinc-50 data-[state=checked]:text-zinc-900"
                  />
                  <Label htmlFor="remember" className="text-zinc-400">
                    Remember me
                  </Label>
                </div>
                <span className="text-sm text-zinc-500">Forgot password?</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="h-10 w-full rounded-lg bg-zinc-50 text-zinc-900 hover:bg-zinc-200"
            >
              {isLoading
                ? isLogin
                  ? "Signing in..."
                  : "Creating account..."
                : isLogin
                  ? "Continue"
                  : "Create account"}
            </Button>

            <div className="relative">
              <Separator className="bg-zinc-800" />
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-900/70 px-2 text-[11px] tracking-widest text-zinc-500 uppercase">
                or
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={signInWithGoogle}
              className="h-10 w-full rounded-lg border-zinc-800 bg-zinc-950 text-zinc-50 hover:bg-zinc-900/80"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="mr-2 h-4 w-4"
              >
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
              Google
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t-0 bg-transparent pt-0 text-sm text-zinc-400">
          {isLogin ? (
            <>
              Don&apos;t have an account?
              <Link
                href="/signup"
                className="ml-1 text-zinc-200 hover:underline"
              >
                Create one
              </Link>
            </>
          ) : (
            <>
              Already have an account?
              <Link
                href="/login"
                className="ml-1 text-zinc-200 hover:underline"
              >
                Sign in
              </Link>
            </>
          )}
        </CardFooter>
      </Card>
    </>
  )
}
