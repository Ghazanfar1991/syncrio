"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useParams } from 'next/navigation'
import { TopRightControls } from '@/components/layout/top-right-controls'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ArrowLeft, ExternalLink, Eye, FileText, BarChart3, Heart, MessageCircle, Share, TrendingUp, RefreshCw, Calendar, CalendarDays, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface PlatformAnalytics {
  platform: string
  account: {
    id: string
    username: string
    isActive: boolean
  }
  summary: {
    totalPosts: number
    totalImpressions: number
    totalLikes: number
    totalComments: number
    totalShares: number
    totalEngagement: number
    avgEngagementRate: number
  }
  chartData: Array<{
    date: string
    impressions: number
    engagement: number
    posts: number
  }>
  topPosts: Array<{
    id: string
    content: string
    publishedAt: string
    externalId: string
    metrics: {
      impressions: number
      likes: number
      comments: number
      shares: number
      engagementRate: number
    }
  }>
  allPosts: Array<{
    id: string
    content: string
    publishedAt: string
    externalId: string
    metrics: {
      impressions: number
      likes: number
      comments: number
      shares: number
      engagementRate: number
    }
  }>
}

export default function PlatformAnalyticsPage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const platform = params.platform as string
  
  const [data, setData] = useState<PlatformAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState('30')
  const [dateRange, setDateRange] = useState<{
    startDate: string
    endDate: string
  }>({
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })
  const [isCustomDateRange, setIsCustomDateRange] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [collapsed, setCollapsed] = useState(false)



  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (session && platform) {
      fetchPlatformAnalytics()
    }
  }, [platform, period, dateRange, isCustomDateRange, session])

  // Early returns after all hooks are called
  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!session) {
    redirect('/auth/signin')
  }

  const fetchPlatformAnalytics = async () => {
    setLoading(true)
    try {
      let url = `/api/analytics/platform/${platform}?period=${period}`

      // If custom date range is selected, use start and end dates
      if (isCustomDateRange) {
        url = `/api/analytics/platform/${platform}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      }

      const response = await fetch(url)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        console.error('Failed to fetch platform analytics:', result.error)
        // If it's a 404, it means no account is connected
        if (response.status === 404) {
          setData(null)
        }
      }
    } catch (error) {
      console.error('Failed to fetch platform analytics:', error)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshAnalytics = async () => {
    setRefreshing(true)
    try {
      await fetchPlatformAnalytics()
    } finally {
      setRefreshing(false)
    }
  }

  const handlePeriodChange = (newPeriod: string) => {
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

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      TWITTER: '🐦',
      LINKEDIN: '💼',
      INSTAGRAM: '📸',
      YOUTUBE: '📺'
    }
    return icons[platform] || '📱'
  }

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      TWITTER: 'bg-blue-500',
      LINKEDIN: 'bg-blue-700',
      INSTAGRAM: 'bg-pink-500',
      YOUTUBE: 'bg-red-500'
    }
    return colors[platform] || 'bg-gray-500'
  }

  const getPostUrl = (platform: string, externalId: string) => {
    const urls: Record<string, string> = {
      TWITTER: `https://twitter.com/i/web/status/${externalId}`,
      LINKEDIN: `https://www.linkedin.com/feed/update/${externalId}`,
      INSTAGRAM: `https://www.instagram.com/p/${externalId}`,
      YOUTUBE: `https://www.youtube.com/watch?v=${externalId}`
    }
    return urls[platform] || '#'
  }

  // Drawer component for post details
  const Drawer: React.FC<{ open: boolean; onClose: () => void; title?: string; children?: React.ReactNode }> = ({ open, onClose, title, children }) => (
    <div className={`fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`absolute right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-neutral-900 border-l border-black/10 dark:border-white/10 shadow-2xl transform transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-16 px-5 flex items-center justify-between border-b border-black/10 dark:border-white/10">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/6"><ChevronRight className="rotate-180"/></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto h-[calc(100%-4rem)]">
          {children}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen font-sans bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-colors">
        {/* Sidebar */}
        <Sidebar 
          collapsed={collapsed}
          onToggleCollapse={setCollapsed}
          showPlanInfo={true}
        />

        <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 ${collapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-neutral-700 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-neutral-700 rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 dark:bg-neutral-700 rounded mb-6"></div>
            <div className="h-96 bg-gray-200 dark:bg-neutral-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen font-sans bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-colors">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">
              No {platform.toUpperCase()} Account Connected
            </h1>
            <p className="opacity-60 mb-6">
              Connect your {platform.toUpperCase()} account to view analytics
            </p>
            <Link href="/settings">
              <button className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">Connect Account</button>
            </Link>
          </div>
        </div>
      </div>
    )
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
            <div className="flex items-center gap-4">
              <Link href="/analytics">
                <button className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/6 transition">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{platform.toUpperCase()} Analytics</h1>
                <p className="text-sm opacity-60">Performance insights for {platform.toUpperCase()}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <TopRightControls unreadNotificationsCount={3} />
            </div>
          </div>



          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <Link href="/analytics">
                  <button className="flex items-center gap-3 px-4 py-2 rounded-lg border hover:bg-black/5 dark:hover:bg-white/6 transition">
                    <ArrowLeft className="h-5 w-5" />
                    <span className="font-medium">Back to Analytics</span>
                  </button>
                </Link>
                
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl ${getPlatformColor(data.platform)} flex items-center justify-center text-white text-3xl shadow-xl`}>
                    {getPlatformIcon(data.platform)}
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">
                      {data.platform} Analytics
                    </h1>
                    <p className="text-lg opacity-60 mt-1">
                      @{data.account.username}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={refreshAnalytics}
                  disabled={refreshing}
                  className="px-4 py-2 rounded-lg border hover:bg-black/5 dark:hover:bg-white/6 transition disabled:opacity-50"
                >
                  {refreshing ? (
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-5 w-5 mr-2" />
                  )}
                  Refresh
                </button>

                {/* Preset Period Buttons */}
                {['7', '30', '90'].map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
                    className={`px-4 py-2 rounded-lg transition ${
                      period === p && !isCustomDateRange 
                        ? 'bg-indigo-600 text-white' 
                        : 'border hover:bg-black/5 dark:hover:bg-white/6'
                    }`}
                  >
                    {p} days
                  </button>
                ))}

                {/* Custom Date Range Selector */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                        isCustomDateRange 
                          ? 'bg-indigo-600 text-white' 
                          : 'border hover:bg-black/5 dark:hover:bg-white/6'
                      }`}
                    >
                      <CalendarDays className="h-5 w-5" />
                      {isCustomDateRange ? 'Custom Range' : 'Custom'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-2xl rounded-xl" align="end">
                    <div className="space-y-4 p-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Custom Date Range</h4>
                        <p className="text-sm opacity-60">
                          Select a custom date range for analytics
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="start-date">Start Date</Label>
                          <Input
                            id="start-date"
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                            max={dateRange.endDate}
                            className="border border-black/10 dark:border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 rounded-lg transition-all duration-300 bg-white/40 dark:bg-neutral-800/30"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="end-date">End Date</Label>
                          <Input
                            id="end-date"
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                            min={dateRange.startDate}
                            max={format(new Date(), 'yyyy-MM-dd')}
                            className="border border-black/10 dark:border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 rounded-lg transition-all duration-300 bg-white/40 dark:bg-neutral-800/30"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <button
                          onClick={() => {
                            setIsCustomDateRange(false)
                            setPeriod('30')
                          }}
                          className="px-3 py-2 rounded-lg border hover:bg-black/5 dark:hover:bg-white/6 transition text-sm"
                        >
                          Reset
                        </button>
                        <button
                          onClick={applyCustomDateRange}
                          disabled={!dateRange.startDate || !dateRange.endDate}
                          className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm transition disabled:opacity-50"
                        >
                          Apply Range
                        </button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Date Range Display */}
          <div className="mb-8 p-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm rounded-xl border border-black/10 dark:border-white/10 shadow-lg">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-indigo-600" />
              <span className="font-medium">
                Showing data from {format(new Date(dateRange.startDate), 'MMM dd, yyyy')} to {format(new Date(dateRange.endDate), 'MMM dd, yyyy')}
              </span>
              {isCustomDateRange && (
                <Badge variant="secondary" className="ml-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                  Custom Range
                </Badge>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="relative rounded-3xl p-5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg overflow-hidden transition-transform hover:-translate-y-1">
              <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#3b82f6, #06b6d4)' }} />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs opacity-70">Total Posts</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">{data.summary.totalPosts}</div>
                  <div className="mt-1 text-xs opacity-60">Published content</div>
                </div>
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><TrendingUp className="w-5 h-5 text-indigo-600" /></div>
              </div>
            </div>

            <div className="relative rounded-3xl p-5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg overflow-hidden transition-transform hover:-translate-y-1">
              <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#10b981, #06b6d4)' }} />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs opacity-70">Total Impressions</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">{data.summary.totalImpressions.toLocaleString()}</div>
                  <div className="mt-1 text-xs opacity-60">Content reach</div>
                </div>
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><Eye className="w-5 h-5 text-green-600" /></div>
              </div>
            </div>

            <div className="relative rounded-3xl p-5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg overflow-hidden transition-transform hover:-translate-y-1">
              <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#ef4444, #f97316)' }} />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs opacity-70">Total Engagement</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">{data.summary.totalEngagement.toLocaleString()}</div>
                  <div className="mt-1 text-xs opacity-60">Likes, comments, shares</div>
                </div>
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><Heart className="w-5 h-5 text-red-600" /></div>
              </div>
            </div>

            <div className="relative rounded-3xl p-5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg overflow-hidden transition-transform hover:-translate-y-1">
              <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#8b5cf6, #ec4899)' }} />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs opacity-70">Avg Engagement Rate</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">{data.summary.avgEngagementRate}%</div>
                  <div className="mt-1 text-xs opacity-60">Average rate</div>
                </div>
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><TrendingUp className="w-5 h-5 text-purple-600" /></div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="rounded-3xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg">
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-1">Daily Performance</h3>
                <p className="text-sm opacity-60">Impressions and engagement over time</p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                  <XAxis dataKey="date" stroke="currentColor" opacity={0.6} />
                  <YAxis stroke="currentColor" opacity={0.6} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="impressions" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} />
                  <Line type="monotone" dataKey="engagement" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-3xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg">
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-1">Posts vs Engagement</h3>
                <p className="text-sm opacity-60">Daily posting frequency and engagement</p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                  <XAxis dataKey="date" stroke="currentColor" opacity={0.6} />
                  <YAxis stroke="currentColor" opacity={0.6} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="posts" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="engagement" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Posts */}
          <div className="rounded-3xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg mb-8">
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-1">Top Performing Posts</h3>
              <p className="text-sm opacity-60">Your best content by engagement rate</p>
            </div>
            <div className="space-y-4">
              {data.topPosts.map((post, index) => (
                <div key={post.id} className="p-6 bg-white/40 dark:bg-neutral-800/30 backdrop-blur-sm rounded-xl border border-black/10 dark:border-white/10 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge variant="outline" className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700 px-3 py-1 font-semibold">
                          #{index + 1}
                        </Badge>
                        <span className="text-sm opacity-60 font-medium">
                          {new Date(post.publishedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mb-3 leading-relaxed">{post.content}</p>
                      <div className="flex items-center gap-6 text-sm opacity-60">
                        <span className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-indigo-500" />
                          <span className="font-medium">{post.metrics.impressions.toLocaleString()}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-red-500" />
                          <span className="font-medium">{post.metrics.likes}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-green-500" />
                          <span className="font-medium">{post.metrics.comments}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <Share className="h-4 w-4 text-purple-500" />
                          <span className="font-medium">{post.metrics.shares}</span>
                        </span>
                        <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 font-semibold">
                          {post.metrics.engagementRate.toFixed(2)}% engagement
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-3 ml-6">
                      <button 
                        onClick={() => setSelectedPost(post)}
                        className="px-4 py-2 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/6 transition"
                      >
                        View Details
                      </button>
                      <a 
                        href={getPostUrl(data.platform, post.externalId)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <button className="px-4 py-2 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/6 transition">
                          <ExternalLink className="h-5 w-5" />
                        </button>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All Posts Table */}
          <div className="rounded-3xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg">
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-1">All Posts</h3>
              <p className="text-sm opacity-60">Complete list of your {data.platform} posts</p>
            </div>
            <div className="space-y-3">
              {data.allPosts.map((post) => (
                <div key={post.id} className="p-4 bg-white/40 dark:bg-neutral-800/30 backdrop-blur-sm rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/6 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="mb-2 leading-relaxed line-clamp-2">{post.content}</p>
                      <p className="text-sm opacity-60 font-medium">
                        {new Date(post.publishedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-sm opacity-60 ml-6">
                      <span className="font-medium">{post.metrics.impressions.toLocaleString()}</span>
                      <span className="font-medium">{post.metrics.likes + post.metrics.comments + post.metrics.shares}</span>
                      <span className="font-medium">{post.metrics.engagementRate.toFixed(1)}%</span>
                      <button 
                        onClick={() => setSelectedPost(post)}
                        className="px-3 py-1 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/6 transition text-sm"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Drawer for post details */}
      <Drawer open={!!selectedPost} onClose={() => setSelectedPost(null)} title={selectedPost ? selectedPost.content : ''}>
        {selectedPost && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm opacity-70">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="capitalize">{data?.platform || 'Unknown'}</span>
              <span>•</span>
              <span>{selectedPost.publishedAt ? format(new Date(selectedPost.publishedAt), 'MMM dd, yyyy') : 'Unknown date'}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 bg-white/50 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5">
                <div className="text-xs opacity-60">Reach</div>
                <div className="font-semibold">{selectedPost.metrics.impressions.toLocaleString()}</div>
              </div>
              <div className="rounded-xl p-3 bg-white/50 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5">
                <div className="text-xs opacity-60">Likes</div>
                <div className="font-semibold">{selectedPost.metrics.likes}</div>
              </div>
              <div className="rounded-xl p-3 bg-white/50 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5">
                <div className="text-xs opacity-60">Comments</div>
                <div className="font-semibold">{selectedPost.metrics.comments}</div>
              </div>
              <div className="rounded-xl p-3 bg-white/50 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5">
                <div className="text-xs opacity-60">Shares</div>
                <div className="font-semibold">{selectedPost.metrics.shares}</div>
              </div>
            </div>

            <div className="rounded-2xl p-3 bg-white/50 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5 text-sm">
              <div className="font-medium mb-1">Content</div>
              <p className="opacity-80 leading-relaxed">{selectedPost.content}</p>
            </div>

            <div className="flex gap-2">
              <button className="px-3 py-2 rounded-full bg-indigo-600 text-white text-sm">Boost Post</button>
              <a 
                href={getPostUrl(data?.platform || '', selectedPost.externalId)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-full border text-sm hover:bg-black/5 dark:hover:bg-white/6 transition"
              >
                View Original
              </a>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
