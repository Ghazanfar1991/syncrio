"use client"

import { useState } from 'react'
import React from 'react';
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useAppShell } from '@/components/layout/app-shell-context'

const AnalyticsOverview = dynamic(
  () => import('@/components/analytics/analytics-overview').then((mod) => mod.AnalyticsOverview),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-3xl border border-black/10 bg-white/70 p-6 dark:border-white/10 dark:bg-neutral-950/40">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-neutral-800" />
          ))}
        </div>
      </div>
    ),
  }
)

export default function PlatformAnalyticsPageContent({ 
  platform, 
  initialSocialAccounts 
}: { 
  platform: string, 
  initialSocialAccounts: any[] 
}) {
  const { user: session } = useAuth()
  const { collapsed } = useAppShell()
  const normalizedPlatform = platform.toUpperCase()
  
  const [period, setPeriod] = useState('30')
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  })
  const [isCustomDateRange, setIsCustomDateRange] = useState(false)

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white font-sans text-slate-900 transition-colors dark:from-neutral-950 dark:to-neutral-900 dark:text-slate-100">
      <div className={`mx-auto max-w-[1400px] px-4 pb-8 pt-4 transition-all duration-300 sm:px-6 lg:px-8 ${collapsed ? 'ml-16' : 'ml-64'}`}>
        <main className="space-y-6">
          <div className="rounded-3xl border border-black/5 bg-white/60 p-5 shadow-lg backdrop-blur dark:border-white/5 dark:bg-neutral-900/60">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Link href="/analytics" className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-white/70 transition hover:bg-white dark:border-white/10 dark:bg-neutral-950/50 dark:hover:bg-neutral-900">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{normalizedPlatform} Analytics</h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">Account-aware analytics with platform-specific metrics.</p>
              </div>
            </div>
          </div>

          <AnalyticsOverview
            period={period}
            dateRange={dateRange}
            isCustomDateRange={isCustomDateRange}
            onPeriodChange={(value) => {
              if (value === 'custom') return
              setIsCustomDateRange(false)
              setPeriod(value)
              setDateRange({
                startDate: format(new Date(Date.now() - Number.parseInt(value, 10) * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
                endDate: format(new Date(), 'yyyy-MM-dd'),
              })
            }}
            onCustomDateChange={(field, value) => setDateRange((current) => ({ ...current, [field]: value }))}
            onApplyCustomDateRange={() => {
              setIsCustomDateRange(true)
              setPeriod('custom')
            }}
            lockedPlatform={normalizedPlatform}
            initialSocialAccounts={initialSocialAccounts}
          />
        </main>
      </div>
    </div>
  )
}
