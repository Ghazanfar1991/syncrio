"use client"

import { Suspense, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, ArrowRight, Chrome, Eye, EyeOff, Lock, Mail } from "lucide-react"
import { AuthFooterLink, AuthPanel, AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { prefetchAppRoutes, warmRouteData } from "@/lib/app-warmup"

function SignInContent() {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState("")

  const successMessage = useMemo(() => searchParams.get("message"), [searchParams])
  const callbackError = useMemo(() => searchParams.get("error"), [searchParams])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(
          signInError.message === "Invalid login credentials"
            ? "Invalid email or password."
            : signInError.message
        )
        return
      }

      prefetchAppRoutes(router, ["/dashboard", "/create", "/calendar"])
      void warmRouteData(queryClient, "/dashboard")
      router.replace("/dashboard")
    } catch {
      setError("We couldn't sign you in. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    setError("")

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (oauthError) {
      setError(oauthError.message)
      setIsGoogleLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in and get back to publishing."
      description="Access your workspace, jump into drafts, review analytics, and keep your team moving without friction."
    >
      <AuthPanel
        title="Sign in"
        description="Use email and password or continue with Google. Your workspace will be ready right where you left it."
      >
        {(successMessage || callbackError || error) && (
          <div
            className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
              error || callbackError
                ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {error ||
                  (callbackError === "auth_callback_failed"
                    ? "Google sign-in didn't complete. Please try again."
                    : successMessage)}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className="mb-5 flex w-full items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm font-medium transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
        >
          {isGoogleLoading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-white" />
          ) : (
            <Chrome className="h-5 w-5" />
          )}
          Continue with Google
        </button>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200 dark:border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs uppercase tracking-[0.2em] text-zinc-400 dark:bg-neutral-900 dark:text-zinc-500">
              or use email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-zinc-400" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-2xl border border-black/10 bg-zinc-50 px-12 py-3.5 text-sm outline-none transition focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100 dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-rose-400/40 dark:focus:bg-white/[0.06] dark:focus:ring-rose-500/10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-zinc-500 transition hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-300"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-zinc-400" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-2xl border border-black/10 bg-zinc-50 px-12 py-3.5 pr-12 text-sm outline-none transition focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100 dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-rose-400/40 dark:focus:bg-white/[0.06] dark:focus:ring-rose-500/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 h-12 w-full rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 text-base font-semibold text-white shadow-[0_18px_40px_-20px_rgba(244,63,94,0.75)] transition hover:scale-[1.01] hover:from-rose-600 hover:via-pink-500 hover:to-orange-500"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Signing in...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Sign in
                <ArrowRight className="h-4.5 w-4.5" />
              </span>
            )}
          </Button>
        </form>

        <div className="mt-6 border-t border-black/5 pt-5 dark:border-white/10">
          <AuthFooterLink
            prompt="Don't have an account yet?"
            href="/auth/signup"
            label="Create one"
          />
        </div>
      </AuthPanel>
    </AuthShell>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50 dark:bg-neutral-950" />}>
      <SignInContent />
    </Suspense>
  )
}
