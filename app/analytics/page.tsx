"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { TopRightControls } from '@/components/layout/top-right-controls'
import { Sidebar } from '@/components/layout/sidebar'
import { AnalyticsOverview } from '@/components/analytics/analytics-overview'
import { BarChart3, Calendar, CalendarDays } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import Link from 'next/link'
import { format } from 'date-fns'

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const [collapsed, setCollapsed] = useState(false)
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
      // Don't change anything when custom is selected, just set the period
      setPeriod(newPeriod)
      return
    }
    
    setIsCustomDateRange(false)
    setPeriod(newPeriod)

    // Update date range based on period
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

  if (status === 'loading') {
    return (
      <div className="min-h-screen font-sans bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-all duration-200">
        {/* Sidebar */}
        <Sidebar 
          collapsed={collapsed}
          onToggleCollapse={setCollapsed}
          showPlanInfo={true}
        />

        <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 ${collapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 mx-auto animate-pulse shadow-xl">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div className="w-12 h-12 border-3 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg opacity-60 font-medium">Loading analytics...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Sidebar */}
      <Sidebar 
        collapsed={collapsed}
        onToggleCollapse={setCollapsed}
        showPlanInfo={true}
      />

      <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 ${collapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
        {/* Main area */}
        <main className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
          <div>
                <h2 className="text-xl font-bold tracking-tight mb-1">Analytics Dashboard</h2>
                <p className="text-sm opacity-60 mt-1">Track your social media performance and engagement across all platforms</p>
              </div>
            <div className="flex items-center gap-4">
              <TopRightControls unreadNotificationsCount={3} />
            </div>
          </div>

          <div className="space-y-6">
           
            
          

          <AnalyticsOverview 
            period={period}
            dateRange={dateRange}
            isCustomDateRange={isCustomDateRange}
            onPeriodChange={handlePeriodChange}
            onCustomDateChange={handleCustomDateChange}
            onApplyCustomDateRange={applyCustomDateRange}
          />
          
          </div>
        </main>
      </div>
    </div>
  )
}
