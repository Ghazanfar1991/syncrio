"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Lock } from "lucide-react"
import { AuthFooterLink, AuthPanel, AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isRecoveryReady, setIsRecoveryReady] = useState(false)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    let mounted = true

    const bootstrapRecovery = async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return

      if (data.session) {
        setIsRecoveryReady(true)
        setIsLoadingSession(false)
        return
      }

      setIsLoadingSession(false)
      setError("This recovery link is invalid or has expired. Request a new reset email.")
    }

    bootstrapRecovery()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (event === "PASSWORD_RECOVERY" || session) {
        setIsRecoveryReady(true)
        setIsLoadingSession(false)
        setError("")
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError(updateError.message)
        return
      }

      setSuccess("Password updated. Redirecting you to sign in...")
      window.setTimeout(() => {
        router.push("/auth/signin?message=Password%20updated.%20Please%20sign%20in.")
      }, 1200)
    } catch {
      setError("We couldn't update your password. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Choose a new password"
      title="Reset your password and get back in."
      description="Use a fresh password for your Syncrio account. Once saved, you'll be able to sign in normally again."
    >
      <AuthPanel
        title="Reset password"
        description="Create a new password for your account. For best security, use something unique to Syncrio."
      >
        {(error || success) && (
          <div
            className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
              error
                ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
            }`}
          >
            <div className="flex items-start gap-3">
              {error ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{error || success}</span>
            </div>
          </div>
        )}

        {isLoadingSession ? (
          <div className="rounded-2xl border border-black/5 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400">
            Checking your recovery session...
          </div>
        ) : isRecoveryReady ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                New password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-zinc-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a new password"
                  className="w-full rounded-2xl border border-black/10 bg-zinc-50 px-12 py-3.5 pr-12 text-sm outline-none transition focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100 dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-rose-400/40 dark:focus:bg-white/[0.06] dark:focus:ring-rose-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm new password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-zinc-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat your new password"
                  className="w-full rounded-2xl border border-black/10 bg-zinc-50 px-12 py-3.5 pr-12 text-sm outline-none transition focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100 dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-rose-400/40 dark:focus:bg-white/[0.06] dark:focus:ring-rose-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
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
                  Updating password...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Save new password
                  <ArrowRight className="h-4.5 w-4.5" />
                </span>
              )}
            </Button>
          </form>
        ) : (
          <div className="rounded-2xl border border-black/5 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400">
            Request a new recovery email to continue.
          </div>
        )}

        <div className="mt-6 border-t border-black/5 pt-5 dark:border-white/10">
          <AuthFooterLink
            prompt="Need a fresh recovery link?"
            href="/auth/forgot-password"
            label="Request another"
          />
        </div>
      </AuthPanel>
    </AuthShell>
  )
}
