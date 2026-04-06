"use client"

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/providers/theme-provider'
import { Sparkles, Mail, Lock, ArrowRight, AlertCircle, Chrome } from 'lucide-react'
import ThemeToggle from "@/components/ui/ThemeToggle"

export default function SignInPage() {
  const { theme } = useTheme()
  const supabase = getSupabaseBrowserClient()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        setError(error.message === 'Invalid login credentials'
          ? 'Invalid email or password'
          : error.message)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('Sign in failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-rose-50 to-pink-50 dark:from-zinc-950 dark:to-black flex items-center justify-center p-6 antialiased">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full blur-3xl opacity-40 bg-gradient-to-tr from-fuchsia-500 to-cyan-500 dark:opacity-30" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full blur-3xl opacity-40 bg-gradient-to-tr from-indigo-500 to-emerald-500 dark:opacity-30" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-left mb-2">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="relative h-8 w-8 overflow-hidden">
                <img src="/applogo.PNG" alt="Syncrio Logo" className="w-full h-full" />
              </div>
              <span className="text-2xl font-semibold tracking-tight">Syncrio</span>
            </Link>
            <ThemeToggle className="h-4 w-16 mt-1" />
          </div>
        </div>

        <div className="rounded-2xl bg-white/70 shadow-sm -mt-6 backdrop-blur-md transition-all duration-200 p-8 dark:bg-zinc-900/60">
          <div className="text-center mb-8">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/60 ring-1 ring-zinc-900/5 px-3 py-1 text-xs tracking-wide text-muted-foreground dark:bg-zinc-900/60 dark:ring-white/10">
              <Sparkles className="h-3.5 w-3.5" />
              Welcome back
            </div>
            <h1 className="text-3xl font-semibold leading-tight md:text-4xl mt-4">
              Sign in to your account
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Pick up where you left off — your content awaits
            </p>
          </div>

          {message && (
            <div className="mb-6 p-4 bg-success/10 border border-success/20 text-success rounded-xl flex items-center gap-3">
              <div className="w-5 h-5 bg-success rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              {message}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-3">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full mb-6 flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/60 dark:bg-zinc-800/60 ring-1 ring-zinc-900/10 dark:ring-white/10 hover:bg-white/80 dark:hover:bg-zinc-800/80 transition-all duration-200 font-medium text-sm disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
            ) : (
              <Chrome className="h-5 w-5" />
            )}
            Continue with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/70 dark:bg-zinc-900/60 px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors duration-200 group-focus-within:text-foreground" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/60 backdrop-blur-sm dark:bg-zinc-800/60 border-0 ring-1 ring-zinc-900/5 dark:ring-white/10 shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white/80 dark:focus:bg-zinc-800/80"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-4 py-3 border-input rounded-xl bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 border-0 py-3 text-lg font-medium rounded-xl shadow-sm hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Sign in
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="font-medium text-primary hover:text-primary-hover transition-colors">
                Sign up for free
              </Link>
            </p>
            <Link href="/auth/forgot-password" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
