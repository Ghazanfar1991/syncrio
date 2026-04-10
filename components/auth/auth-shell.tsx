"use client"

import Image from "next/image"
import Link from "next/link"
import ThemeToggle from "@/components/ui/ThemeToggle"
import {
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react"

interface AuthShellProps {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}

const productHighlights = [
  "Multi-platform publishing",
  "AI-assisted content workflows",
  "Shared calendar and approvals",
]

const trustNotes = [
  {
    icon: ShieldCheck,
    title: "Protected by Supabase Auth",
    body: "Secure email login, Google sign-in, and password recovery in one flow.",
  },
  {
    icon: Zap,
    title: "Built for fast teams",
    body: "Jump from idea to scheduled post without fighting your tooling.",
  },
  {
    icon: LockKeyhole,
    title: "Light and dark aware",
    body: "A calmer auth experience that matches the rest of the product.",
  },
]

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.12),_transparent_32%)] bg-zinc-50 text-zinc-950 dark:bg-neutral-950 dark:text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-7rem] h-72 w-72 rounded-full bg-rose-400/20 blur-3xl dark:bg-rose-500/15" />
        <div className="absolute bottom-[-8rem] right-[-6rem] h-80 w-80 rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-500/10" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-fuchsia-400/10 blur-3xl dark:bg-fuchsia-500/10" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col p-4 sm:p-6 lg:flex-row lg:items-stretch lg:gap-6">
        <section className="flex flex-1 flex-col justify-between rounded-[2rem] border border-black/5 bg-white/75 p-6 shadow-[0_25px_80px_-45px_rgba(15,23,42,0.35)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_25px_80px_-45px_rgba(0,0,0,0.65)] sm:p-8 lg:p-10">
          <div>
            <div className="flex items-center justify-between gap-4">
              <Link href="/auth/signin" className="inline-flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-black/5 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/10">
                  <Image
                    src="/applogo.PNG"
                    alt="Syncrio"
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain"
                  />
                </div>
                <div>
                  <div className="text-base font-semibold tracking-tight">Syncrio</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    Product workspace
                  </div>
                </div>
              </Link>

              <ThemeToggle className="h-10 w-16" />
            </div>

            <div className="mt-10 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-200/70 bg-rose-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                <Sparkles className="h-3.5 w-3.5" />
                {eyebrow}
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-7 text-zinc-600 dark:text-zinc-300 sm:text-base">
                {description}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {productHighlights.map((item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-black/[0.02] px-3 py-1.5 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-200"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {trustNotes.map((note) => {
              const Icon = note.icon
              return (
                <div
                  key={note.title}
                  className="rounded-[1.5rem] border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="mb-3 inline-flex rounded-2xl bg-zinc-950 px-3 py-3 text-white dark:bg-white dark:text-black">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-semibold">{note.title}</div>
                  <div className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {note.body}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="flex w-full items-center justify-center lg:max-w-xl">
          <div className="w-full rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_25px_80px_-45px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/80 dark:shadow-[0_25px_80px_-45px_rgba(0,0,0,0.75)] sm:p-8">
            {children}
          </div>
        </section>
      </div>
    </div>
  )
}

export function AuthFooterLink({
  prompt,
  href,
  label,
}: {
  prompt: string
  href: string
  label: string
}) {
  return (
    <p className="text-sm text-zinc-500 dark:text-zinc-400">
      {prompt}{" "}
      <Link
        href={href}
        className="inline-flex items-center gap-1 font-semibold text-zinc-950 transition hover:text-rose-600 dark:text-white dark:hover:text-rose-300"
      >
        {label}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </p>
  )
}

export function AuthPanel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
      {children}
    </div>
  )
}
