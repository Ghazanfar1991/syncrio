"use client"

import { useState } from 'react'
import React from 'react';
import { useAuth } from "@/components/providers/auth-provider"
import dynamic from 'next/dynamic'
import { useAppShell } from '@/components/layout/app-shell-context'
import { format } from 'date-fns'

const AnalyticsOverview = dynamic(
  () => import('@/components/analytics/analytics-overview').then((mod) => mod.AnalyticsOverview),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-950/40 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
      </div>
    ),
  }
)

export default function AnalyticsPageContent({ initialSocialAccounts }: { initialSocialAccounts: any }) {
  const { user: session } = useAuth()
  const { collapsed } = useAppShell()
  const [period, setPeriod] = useState('30')
  const [dateRange, setDateRange] = useState<{
    startDate: string
    endDate: string
  }>({
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })
  const [isCustomDateRange, setIsCustomDateRange] = useState(false)

  const handlePeriodChange = (newPeriod: string) => {
    if (newPeriod === 'custom') {
      setPeriod(newPeriod)
      return
    }
    
    setIsCustomDateRange(false)
    setPeriod(newPeriod)

    const endDate = new Date()
    const startDate = new Date(Date.now() - parseInt(newPeriod) * 24 * 60 * 60 * 1000)

    setDateRange({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    })
  }

  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const applyCustomDateRange = () => {
    setIsCustomDateRange(true)
    setPeriod('custom')
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-colors">
      <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 ${collapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
        <main className="space-y-6">
          <div className="rounded-3xl border border-black/5 bg-white/60 p-5 shadow-lg backdrop-blur dark:border-white/5 dark:bg-neutral-900/60">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Analytics Dashboard</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Track performance, compare accounts, and surface the metrics that matter for each platform.
                </p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white/70 px-4 py-2 text-sm text-slate-600 shadow-sm dark:border-white/5 dark:bg-neutral-950/50 dark:text-slate-300">
                Bundle-powered analytics, shaped to the Syncrio dashboard style.
              </div>
            </div>
          </div>

          <AnalyticsOverview
            period={period}
            dateRange={dateRange}
            isCustomDateRange={isCustomDateRange}
            onPeriodChange={handlePeriodChange}
            onCustomDateChange={handleCustomDateChange}
            onApplyCustomDateRange={applyCustomDateRange}
            initialSocialAccounts={initialSocialAccounts}
          />
        </main>
      </div>
    </div>
  )
}
