"use client"

import { Loader2 } from "lucide-react"

export function AppRouteLoading({
  title = "Loading your workspace...",
}: {
  title?: string
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg mx-auto mb-4">
          <Loader2 className="h-6 w-6 text-white animate-spin" />
        </div>
        <p className="text-sm opacity-70">{title}</p>
      </div>
    </div>
  )
}
