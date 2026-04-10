"use client"

import { useState } from "react"
import { AlertCircle, ArrowRight, CheckCircle2, Mail } from "lucide-react"
import { AuthFooterLink, AuthPanel, AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export default function ForgotPasswordPage() {
  const supabase = getSupabaseBrowserClient()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError("")
    setSuccess("")

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (resetError) {
        setError(resetError.message)
        return
      }

      setSuccess("Reset link sent. Check your inbox and spam folder for the recovery email.")
    } catch {
      setError("We couldn't send the reset email. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Password recovery"
      title="Get back into your workspace safely."
      description="We'll send you a secure reset link so you can choose a new password and continue working."
    >
      <AuthPanel
        title="Forgot password"
        description="Enter the email tied to your account and we'll send a password reset link."
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

          <Button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 h-12 w-full rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 text-base font-semibold text-white shadow-[0_18px_40px_-20px_rgba(244,63,94,0.75)] transition hover:scale-[1.01] hover:from-rose-600 hover:via-pink-500 hover:to-orange-500"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Sending link...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Send reset link
                <ArrowRight className="h-4.5 w-4.5" />
              </span>
            )}
          </Button>
        </form>

        <div className="mt-6 border-t border-black/5 pt-5 dark:border-white/10">
          <AuthFooterLink
            prompt="Remembered it?"
            href="/auth/signin"
            label="Back to sign in"
          />
        </div>
      </AuthPanel>
    </AuthShell>
  )
}
