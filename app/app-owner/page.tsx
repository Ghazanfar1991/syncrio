"use client"

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'

import { Sidebar } from '@/components/layout/sidebar'
import { TopRightControls } from '@/components/layout/top-right-controls'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

import {
  Activity,
  ArrowRight,
  CheckCircle,
  DollarSign,
  FileText,
  Server,
  TrendingUp,
  Users,
  XCircle,
  Zap,
  Settings,
  AlertTriangle,
} from 'lucide-react'

interface AppStats {
  totalUsers: number
  activeUsers: number
  totalPosts: number
  scheduledPosts: number
  publishedPosts: number
  failedPosts: number
  totalRevenue: number
  monthlyRevenue: number
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical'
  aiModels: number
  activeModels: number
}

interface RecentActivity {
  id: string
  type: 'user_signup' | 'post_published' | 'post_failed' | 'model_updated' | 'system_alert'
  message: string
  timestamp: string
  severity: 'info' | 'warning' | 'error' | 'success'
}

type OverviewResponse = {
  totalUsers?: number
  activeUsers?: number
  totalPosts?: number
  scheduledPosts?: number
  publishedPosts?: number
  failedPosts?: number
  totalRevenue?: number
  monthlyRevenue?: number
  systemHealth?: 'excellent' | 'good' | 'warning' | 'critical'
  aiModels?: number
  activeModels?: number
  lastUpdatedAt?: string
  platformBreakdown?: Array<{
    platform?: string
    posts?: number
    published?: number
    failed?: number
    accounts?: number
  }>
  recentActivity?: Array<{
    id?: string | number
    type?: string
    message?: string
    timestamp?: string
    severity?: string
  }>
  // Owner-specific extras
  postsThisMonth?: number
  newUsersThisMonth?: number
  usageThisMonth?: number
  totalSubscriptions?: number
  activeSubscriptions?: number
  trialingSubscriptions?: number
  canceledSubscriptions?: number
  publishedPublications?: number
  failedPublications?: number
}

export default function AppOwnerPage() {
  const { data: session, status } = useSession()

  // Sidebar state (synced with other pages via localStorage + custom event)
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return JSON.parse(localStorage.getItem('sidebar:collapsed') ?? 'false')
    } catch {
      return false
    }
  })

  const handleToggleCollapse = React.useCallback<React.Dispatch<React.SetStateAction<boolean>>>(
    (next) => {
      setCollapsed((prev) => {
        const value = typeof next === 'function' ? (next as (p: boolean) => boolean)(prev) : next
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('sidebar:collapsed', JSON.stringify(value))
            window.dispatchEvent(new CustomEvent('sidebar:collapsed-change', { detail: value }))
          }
        } catch {}
        return value
      })
    },
    []
  )

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const onCustom = (e: Event) => {
      const ce = e as CustomEvent<boolean>
      if (typeof ce.detail === 'boolean') setCollapsed(ce.detail)
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'sidebar:collapsed' && e.newValue != null) {
        try {
          setCollapsed(JSON.parse(e.newValue))
        } catch {}
      }
    }
    window.addEventListener('sidebar:collapsed-change', onCustom as EventListener)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('sidebar:collapsed-change', onCustom as EventListener)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // Data state
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  
  const [stats, setStats] = useState<AppStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalPosts: 0,
    scheduledPosts: 0,
    publishedPosts: 0,
    failedPosts: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    systemHealth: 'good',
    aiModels: 0,
    activeModels: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [platforms, setPlatforms] = useState<
    Array<{ platform: string; posts: number; published: number; failed: number; accounts: number }>
  >([])
  const [ownerMeta, setOwnerMeta] = useState({
    postsThisMonth: 0,
    newUsersThisMonth: 0,
    usageThisMonth: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    trialingSubscriptions: 0,
    canceledSubscriptions: 0,
    publishedPublications: 0,
    failedPublications: 0,
  })

  const fetchOverview = async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/app-owner/overview', {
        method: 'GET',
        headers: { 'content-type': 'application/json' },
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Failed to load overview: ${res.status}`)
      const data: OverviewResponse = await res.json()

      setStats((prev) => ({
        totalUsers: data.totalUsers ?? prev.totalUsers,
        activeUsers: data.activeUsers ?? prev.activeUsers,
        totalPosts: data.totalPosts ?? prev.totalPosts,
        scheduledPosts: data.scheduledPosts ?? prev.scheduledPosts,
        publishedPosts: data.publishedPosts ?? prev.publishedPosts,
        failedPosts: data.failedPosts ?? prev.failedPosts,
        totalRevenue: data.totalRevenue ?? prev.totalRevenue,
        monthlyRevenue: data.monthlyRevenue ?? prev.monthlyRevenue,
        systemHealth: (data.systemHealth as AppStats['systemHealth']) ?? prev.systemHealth,
        aiModels: data.aiModels ?? prev.aiModels,
        activeModels: data.activeModels ?? prev.activeModels,
      }))

      if (data.platformBreakdown && Array.isArray(data.platformBreakdown)) {
        setPlatforms(
          data.platformBreakdown.map((p) => ({
            platform: (p.platform ?? 'unknown').toString(),
            posts: Number(p.posts ?? 0),
            published: Number(p.published ?? 0),
            failed: Number(p.failed ?? 0),
            accounts: Number(p.accounts ?? 0),
          }))
        )
      }

      if (Array.isArray(data.recentActivity)) {
        setRecentActivity(
          data.recentActivity.map((a, i) => ({
            id: String(a.id ?? i),
            type: (a.type as RecentActivity['type']) ?? 'system_alert',
            message: a.message ?? 'Activity',
            timestamp: a.timestamp ?? '',
            severity: (a.severity as RecentActivity['severity']) ?? 'info',
          }))
        )
      }

      setLastUpdatedAt(data.lastUpdatedAt ?? new Date().toISOString())
      setOwnerMeta({
        postsThisMonth: data.postsThisMonth ?? 0,
        newUsersThisMonth: data.newUsersThisMonth ?? 0,
        usageThisMonth: data.usageThisMonth ?? 0,
        totalSubscriptions: data.totalSubscriptions ?? 0,
        activeSubscriptions: data.activeSubscriptions ?? 0,
        trialingSubscriptions: data.trialingSubscriptions ?? 0,
        canceledSubscriptions: data.canceledSubscriptions ?? 0,
        publishedPublications: data.publishedPublications ?? 0,
        failedPublications: data.failedPublications ?? 0,
      })
    } catch (err: any) {
      setLoadError(err?.message ?? 'Failed to load overview')
    } finally {
      setIsLoading(false)
    }
  }

  const refetch = () => fetchOverview()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) return
    fetchOverview()
  }, [status, session])

  if (status === 'loading') return <div>Loading...</div>
  if (!session) redirect('/auth/signin')

  // Owner gating (same behavior retained)
  const isAppOwner = session?.user?.email === 'ghazanfarnaseer91@gmail.com'
  if (!isAppOwner) redirect('/dashboard')

  const getSystemHealthColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'good':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup':
        return <Users className="w-4 h-4" />
      case 'post_published':
        return <CheckCircle className="w-4 h-4" />
      case 'post_failed':
        return <XCircle className="w-4 h-4" />
      case 'model_updated':
        return <Zap className="w-4 h-4" />
      case 'system_alert':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getActivityColor = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'text-green-600 dark:text-green-400'
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
      case 'info':
        return 'text-blue-600 dark:text-blue-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar collapsed={collapsed} onToggleCollapse={handleToggleCollapse} showPlanInfo={true} />

      <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 ${collapsed ? 'ml-0 md:ml-16' : 'ml-0 md:ml-64'} transition-all duration-300`}>
        <main className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold">Owner Analytics</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {lastUpdatedAt ? `Last updated ${new Date(lastUpdatedAt).toLocaleString()}` : 'Overview of platform-wide performance'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <TopRightControls unreadNotificationsCount={5} />
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Platform-wide KPIs and activity for administrators</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="flex items-center gap-2" onClick={refetch} disabled={isLoading}>
                <Activity className="w-4 h-4" />
                {isLoading ? 'Refreshing…' : 'Refresh'}
              </Button>
              <Button className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </div>
          </div>

          {loadError && (
            <div className="rounded-lg border border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">
              {loadError}
            </div>
          )}

          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Users</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalUsers.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-blue-600 dark:text-blue-400">
                      {stats.totalUsers ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : '0.0'}% active
                    </span>
                    <Progress value={stats.totalUsers ? (stats.activeUsers / stats.totalUsers) * 100 : 0} className="flex-1 h-2" />
                  </div>
                  <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">New this month: {ownerMeta.newUsersThisMonth.toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Posts</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.totalPosts.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-600 dark:text-green-400">
                      {stats.totalPosts ? ((stats.publishedPosts / stats.totalPosts) * 100).toFixed(1) : '0.0'}% success
                    </span>
                    <Progress value={stats.totalPosts ? (stats.publishedPosts / stats.totalPosts) * 100 : 0} className="flex-1 h-2" />
                  </div>
                  <div className="mt-2 text-xs text-green-700 dark:text-green-300">This month: {ownerMeta.postsThisMonth.toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Active Subscriptions</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{ownerMeta.activeSubscriptions.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-purple-600 dark:text-purple-400">
                      Trialing: {ownerMeta.trialingSubscriptions.toLocaleString()} • Total: {ownerMeta.totalSubscriptions.toLocaleString()}
                    </span>
                    <Progress value={ownerMeta.totalSubscriptions ? (ownerMeta.activeSubscriptions / ownerMeta.totalSubscriptions) * 100 : 0} className="flex-1 h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">System Health</p>
                    <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 capitalize">{stats.systemHealth}</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                    <Server className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-4">
                  <Badge className={`${getSystemHealthColor(stats.systemHealth)} text-xs font-medium`}>
                    {stats.systemHealth === 'excellent' ? '100%' : '95%'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Platform Breakdown + AI Models */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Platform Breakdown</CardTitle>
                    <CardDescription>Connections and posting performance by platform</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {platforms.length > 0 ? (
                    platforms.map((p) => (
                      <div key={p.platform} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold capitalize">{p.platform}</div>
                          <Badge variant="outline">{p.accounts} accounts</Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Published</span>
                            <span className="font-medium">{p.published.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Failed</span>
                            <span className="font-medium">{p.failed.toLocaleString()}</span>
                          </div>
                          <Progress value={p.posts ? (p.published / Math.max(1, p.posts)) * 100 : 0} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">No platform data available.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">AI Models</CardTitle>
                    <CardDescription>Operational model summary</CardDescription>
                  </div>
                  <Link href="/app-owner/ai-models">
                    <Button variant="outline" className="flex items-center gap-2">
                      Manage
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm text-blue-700 dark:text-blue-300">Active Models</div>
                        <div className="text-lg font-semibold">{stats.activeModels}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm text-green-700 dark:text-green-300">Total Models</div>
                        <div className="text-lg font-semibold">{stats.aiModels}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm text-purple-700 dark:text-purple-300">Uptime</div>
                        <div className="text-lg font-semibold">98.5%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity & Post Quality */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-xl">Recent Activity</CardTitle>
                <CardDescription>Latest system events and user activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 h-80 md:h-96 overflow-y-auto pr-2">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getActivityColor(activity.severity)} bg-opacity-10`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.message}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{activity.timestamp}</p>
                        </div>
                        <Badge className={`text-xs ${getActivityColor(activity.severity)} bg-opacity-10`}>
                          {activity.severity}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">No recent activity.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Post Quality</CardTitle>
                <CardDescription>Published vs. failed posts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Published</span>
                    <span className="font-medium">{(ownerMeta.publishedPublications || stats.publishedPosts).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Failed</span>
                    <span className="font-medium">{(ownerMeta.failedPublications || stats.failedPosts).toLocaleString()}</span>
                  </div>
                  <Progress value={(ownerMeta.publishedPublications + ownerMeta.failedPublications) ? (ownerMeta.publishedPublications / (ownerMeta.publishedPublications + ownerMeta.failedPublications)) * 100 : (stats.totalPosts ? (stats.publishedPosts / stats.totalPosts) * 100 : 0)} />
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Success rate {
                      (ownerMeta.publishedPublications + ownerMeta.failedPublications)
                        ? ((ownerMeta.publishedPublications / (ownerMeta.publishedPublications + ownerMeta.failedPublications)) * 100).toFixed(1)
                        : (stats.totalPosts ? ((stats.publishedPosts / stats.totalPosts) * 100).toFixed(1) : '0.0')
                    }%
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">User Management</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage user accounts and permissions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                    <Server className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">System Health</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Monitor server performance and alerts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Billing & Plans</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage subscriptions and billing</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
