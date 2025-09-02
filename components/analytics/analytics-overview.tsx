"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { BarChart3, TrendingUp, Eye, Heart, MessageCircle, Share, Calendar, ChevronRight, ChevronLeft, Filter, Globe2, Download, Twitter, Linkedin, Instagram, Youtube, Facebook, X, Clock, Users } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Link from 'next/link'
import { format } from 'date-fns'

// Custom X Logo component
const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

// Custom Date Range Dropdown Component
const DateRangeDropdown = ({ 
  isOpen, 
  onClose, 
  dateRange, 
  onDateChange, 
  onApply 
}: {
  isOpen: boolean
  onClose: () => void
  dateRange: { startDate: string; endDate: string }
  onDateChange: (field: 'startDate' | 'endDate', value: string) => void
  onApply: () => void
}) => {
  // Local state for dates - only applied when user clicks Apply
  const [localDateRange, setLocalDateRange] = useState(dateRange)

  // Update local state when dateRange prop changes
  useEffect(() => {
    setLocalDateRange(dateRange)
  }, [dateRange])

  // Handle local date changes without triggering parent updates
  const handleLocalDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setLocalDateRange(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handle Apply - send local dates to parent
  const handleApply = () => {
    onDateChange('startDate', localDateRange.startDate)
    onDateChange('endDate', localDateRange.endDate)
    onApply()
    onClose() // Close the dropdown after applying
  }

  // Handle Cancel - just close without applying changes
  const handleCancel = () => {
    // Reset local state to original values
    setLocalDateRange(dateRange)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop to handle click outside */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Dropdown */}
      <div className="absolute top-full right-0  mt-2 z-50">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 w-80 shadow-2xl border border-black/10 dark:border-white/10 backdrop-blur-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Custom Date Range</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300">Select start and end dates</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={localDateRange.startDate}
                onChange={(e) => handleLocalDateChange('startDate', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-neutral-800/30 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            {/* End Date */}
            <div>
              <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">
                End Date
              </label>
              <input
                type="date"
                value={localDateRange.endDate}
                onChange={(e) => handleLocalDateChange('endDate', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-neutral-800/30 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCancel}
              className="flex-1 px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-neutral-800/30 text-gray-700 dark:text-gray-200 text-xs font-medium transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-medium transition-all duration-300 shadow-sm hover:shadow-lg transform hover:scale-[1.02]"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

interface AnalyticsData {
  overview: {
    totalPosts: number
    totalImpressions: number
    totalLikes: number
    totalComments: number
    totalShares: number
    engagementRate: string
    period: number
    lifetimeMetrics?: {
      totalPosts: number
      totalViews: number
      totalLikes: number
      totalComments: number
    }
    periodMetrics?: {
      totalPosts: number
      totalViews: number
      totalLikes: number
      totalComments: number
    }
  }
  postsByPlatform: Array<{
    platform: string
    count: number
  }>
  topPosts: Array<{
    id: string
    content: string
    publishedAt: string
    platforms: string[]
    metrics: {
      impressions: number
      likes: number
      comments: number
      shares: number
    }
    // YouTube-specific properties
    thumbnail?: string
    duration?: string
    description?: string
  }>
  dailyAnalytics: Array<{
    date: string
    posts: number
    impressions: number
    engagement: number
  }>
  platformPerformance: Array<{
    platform: string
    posts: number
    username?: string
    avgEngagement: string
    totalReach: number
    isConnected: boolean
  }>
  youtubeAnalytics?: {
    views: number
    likes: number
    comments: number
    shares: number
    demographics: Array<{
      ageGroup: string
      gender: string
      viewerPercentage: number
    }>
    trafficSources: Array<{
      source: string
      views: number
    }>
    deviceTypes: Array<{
      device: string
      views: number
    }>
    // Additional calculated metrics
    watchTime?: string
    ctr?: number
    revenueEstimate?: number
    subscribers?: number
    engagementRate?: string
  }
}

interface PlatformAccount {
  id: string
  platform: string
  accountName: string
  username: string
  isConnected: boolean
}

interface AnalyticsOverviewProps {
  period: string
  dateRange: {
    startDate: string
    endDate: string
  }
  isCustomDateRange: boolean
  onPeriodChange: (newPeriod: string) => void
  onCustomDateChange: (field: 'startDate' | 'endDate', value: string) => void
  onApplyCustomDateRange: () => void
}

// Post interface for the modal
interface Post {
  id: string
  content: string
  publishedAt: string
  platforms: string[]
  metrics: {
    impressions: number
    likes: number
    comments: number
    shares: number
  }
  // YouTube-specific properties
  thumbnail?: string
  duration?: string
  description?: string
}

export function AnalyticsOverview({
  period,
  dateRange,
  isCustomDateRange,
  onPeriodChange,
  onCustomDateChange,
  onApplyCustomDateRange
}: AnalyticsOverviewProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccount[]>([])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [showDateModal, setShowDateModal] = useState(false)

  useEffect(() => {
    // Don't fetch analytics if custom is selected but dates are invalid
    if (period === 'custom' && isCustomDateRange) {
      const startDate = new Date(dateRange.startDate)
      const endDate = new Date(dateRange.endDate)
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return // Don't fetch if dates are invalid
      }
    }
    fetchAnalytics()
  }, [period, dateRange.startDate, dateRange.endDate, isCustomDateRange, selectedPlatform, selectedAccount])



  // Fetch platform accounts on component mount
  useEffect(() => {
    fetchPlatformAccounts()
  }, [])



  // Filter data based on selected platform and account
  const filteredData = useMemo(() => {
    if (!data) return null

    let filtered = { ...data }
    
    // Ensure overview data exists
    if (!filtered.overview) {
      console.warn('No overview data found in response')
      filtered.overview = {
        totalPosts: 0,
        totalImpressions: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        engagementRate: '0.00',
        period: 0
      }
    }

    // Filter by platform
    if (selectedPlatform !== 'all') {
      // Filter posts by platform
      filtered.postsByPlatform = data.postsByPlatform?.filter(
        post => post.platform === selectedPlatform
      ) || []
      
      // Filter platform performance to show only selected platform
      filtered.platformPerformance = data.platformPerformance?.filter(
        platform => platform.platform === selectedPlatform
      ) || []
      
      // For YouTube, the API already provides filtered data
      if (selectedPlatform === 'YOUTUBE') {
        // Preserve YouTube data as it's already filtered by the API
        filtered.topPosts = data.topPosts || []
        filtered.dailyAnalytics = data.dailyAnalytics || []
        
        // Update overview to reflect only YouTube data
        if (data.youtubeAnalytics) {
          filtered.overview = {
            ...filtered.overview,
            totalPosts: data.youtubeAnalytics.views > 0 ? (data.topPosts?.length || 0) : 0,
            totalImpressions: data.youtubeAnalytics.views || 0,
            totalLikes: data.youtubeAnalytics.likes || 0,
            totalComments: data.youtubeAnalytics.comments || 0,
            totalShares: data.youtubeAnalytics.shares || 0,
            engagementRate: data.youtubeAnalytics.engagementRate || '0.00'
          }
        }
      } else {
        // For other platforms, filter the data
        filtered.topPosts = data.topPosts?.filter(
          post => post.platforms?.includes(selectedPlatform)
        ) || []
        
        // Recalculate overview metrics for the selected platform only
        const selectedPlatformData = data.platformPerformance?.find(
          platform => platform.platform === selectedPlatform
        )
        if (selectedPlatformData) {
          filtered.overview = {
            ...filtered.overview,
            totalPosts: selectedPlatformData.posts || 0,
            totalImpressions: selectedPlatformData.totalReach || 0,
            totalLikes: 0, // Will be calculated from filtered posts
            totalComments: 0, // Will be calculated from filtered posts
            totalShares: 0, // Will be calculated from filtered posts
            engagementRate: selectedPlatformData.avgEngagement || '0.00'
          }
        }
      }
    }

    // Filter by account if specific account is selected
    if (selectedAccount !== 'all' && selectedPlatform !== 'all') {
      const selectedAccountData = platformAccounts.find(acc => acc.id === selectedAccount)
      if (selectedAccountData) {
        // For YouTube, account filtering is handled at API level
        if (selectedPlatform === 'YOUTUBE') {
          // The API already provides account-specific data
          // Keep the data as is since it's already filtered
          console.log('🔍 YouTube account selected:', selectedAccount, 'Data already filtered by API')
        } else {
          // For other platforms, filter posts by account
          filtered.topPosts = filtered.topPosts?.filter(post => {
            // This would need to be implemented based on how posts are linked to accounts
            // For now, we'll show all posts for the platform
            return true
          }) || []
          
          // Update overview to reflect account-specific data
          const selectedPlatformData = filtered.platformPerformance?.find(
            platform => platform.platform === selectedPlatform
          )
          if (selectedPlatformData) {
            filtered.overview = {
              ...filtered.overview,
              totalPosts: selectedPlatformData.posts || 0,
              totalImpressions: selectedPlatformData.totalReach || 0,
              engagementRate: selectedPlatformData.avgEngagement || '0.00'
            }
          }
        }
      }
    }

    // Debug logging for filtering
    if (selectedPlatform !== 'all') {
      console.log('🔍 Platform Filter Applied:', {
        selectedPlatform,
        selectedAccount,
        filteredPostsCount: filtered.topPosts?.length || 0,
        filteredPlatformPerformance: filtered.platformPerformance?.length || 0,
        overviewData: filtered.overview
      })
    }

    return filtered
  }, [data, selectedPlatform, selectedAccount, platformAccounts])

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      let url = `/api/analytics/overview?period=${period}`

      // If custom date range is selected, use start and end dates
      if (isCustomDateRange) {
        // Validate dates before making the API call
        const startDate = new Date(dateRange.startDate)
        const endDate = new Date(dateRange.endDate)
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error('Invalid date range selected. Please select valid start and end dates.')
        }
        
        if (startDate > endDate) {
          throw new Error('Start date cannot be after end date.')
        }
        
        url = `/api/analytics/overview?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      }

      // Add platform and account filters
      if (selectedPlatform !== 'all') {
        url += `&platform=${selectedPlatform}`
      }
      if (selectedAccount !== 'all') {
        url += `&accountId=${selectedAccount}`
        console.log('🔍 FRONTEND: Sending accountId:', selectedAccount)
      }

      const response = await fetch(url)
      const result = await response.json()

        if (result.success) {
          console.log('🔍 FRONTEND: Analytics data received:', {
            overview: result.data.overview,
            dailyAnalytics: result.data.dailyAnalytics,
            topPosts: result.data.topPosts,
            youtubeAnalytics: result.data.youtubeAnalytics,
            hasLifetimeMetrics: !!(result.data.overview as any).lifetimeMetrics,
            hasPeriodMetrics: !!(result.data.overview as any).periodMetrics
          })
          setData(result.data)
        } else {
          setError(result.error?.message || 'Failed to fetch analytics data')
        }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      setError(error instanceof Error ? error.message : 'Failed to connect to server. Please check your internet connection.')
    } finally {
      setLoading(false)
    }
  }

  const fetchPlatformAccounts = async () => {
    try {
      const response = await fetch('/api/social/accounts')
      const result = await response.json()
      
      if (result.success) {
        // Transform the data to match our interface
        const transformedAccounts: PlatformAccount[] = result.data.map((acc: any) => ({
          id: acc.accountId, // Use accountId (YouTube channel ID) instead of database id
          platform: acc.platform,
          accountName: acc.displayName || acc.username || acc.accountName || 'Unknown Account',
          username: acc.username || acc.accountName || 'Unknown',
          isConnected: acc.isConnected || acc.isActive || false
        }))
        
        setPlatformAccounts(transformedAccounts)
      } else {
        console.error('Failed to fetch platform accounts:', result.error)
        // Fallback to empty array if API fails
        setPlatformAccounts([])
      }
    } catch (error) {
      console.error('Failed to fetch platform accounts:', error)
      // Fallback to empty array if API fails
      setPlatformAccounts([])
    }
  }

  const refreshAnalytics = async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/analytics/refresh', {
        method: 'POST'
      })
      const result = await response.json()

      if (result.success) {
        // Refresh the overview data after fetching new analytics
        await fetchAnalytics()
        // Use a more user-friendly notification instead of alert
        console.log('Analytics refreshed successfully!')
      } else {
        throw new Error(result.error?.message || 'Failed to refresh analytics')
      }
    } catch (error) {
      console.error('Failed to refresh analytics:', error)
      // Use a more user-friendly error notification instead of alert
      console.error('Failed to refresh analytics. Please try again.')
    } finally {
      setRefreshing(false)
    }
  }



  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0'
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, React.ReactNode> = {
      TWITTER: <XLogo className="h-5 w-5 text-white" />,
      LINKEDIN: <Linkedin className="h-5 w-5 text-white" />,
      INSTAGRAM: <Instagram className="h-5 w-5 text-white" />,
      YOUTUBE: <Youtube className="h-5 w-5 text-white" />,
      FACEBOOK: <Facebook className="h-5 w-5 text-white" />
    }
    return icons[platform] || <Globe2 className="h-5 w-5 text-white" />
  }

  const getPlatformIconBackground = (platform: string) => {
    const backgrounds: Record<string, string> = {
      TWITTER: 'from-neutral-800 to-neutral-900',
      LINKEDIN: 'from-sky-600 to-sky-800',
      INSTAGRAM: 'from-pink-500 to-purple-600',
      YOUTUBE: 'from-red-500 to-rose-600',
      FACEBOOK: 'from-blue-500 to-blue-700',
      TELEGRAM: 'from-blue-400 to-blue-600'
    }
    return backgrounds[platform] || 'from-gray-500 to-gray-600'
  }

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      TWITTER: '#1DA1F2',
      LINKEDIN: '#0A66C2',
      INSTAGRAM: '#E4405F',
      YOUTUBE: '#FF0000'
    }
    return colors[platform] || '#6B7280'
  }

  const getUniquePlatforms = () => {
    const platforms = new Set<string>()
    platformAccounts.forEach(account => {
      if (account.isConnected) {
        platforms.add(account.platform)
      }
    })
    return Array.from(platforms)
  }

  const getAccountsForPlatform = (platform: string) => {
    return platformAccounts.filter(acc => acc.platform === platform && acc.isConnected)
  }

  // Drawer component for post details
  const Drawer: React.FC<{ open: boolean; onClose: () => void; title?: string; children?: React.ReactNode }> = ({ open, onClose, title, children }) => (
    <div className={`fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`absolute right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-neutral-900 border-l border-black/10 dark:border-white/10 shadow-2xl transform transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-16 px-5 flex items-center justify-between border-b border-black/10 dark:border-white/10">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"><ChevronRight className="rotate-180"/></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto h-[calc(100%-4rem)]">
          {children}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-3xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-neutral-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!filteredData && !loading) {
    return (
      <div className="text-center py-8">
        <div className="space-y-4">
          <p className="opacity-60">No analytics data available</p>
          {error && (
            <div className="space-y-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchAnalytics}
                className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-lg transition-all duration-300 shadow-sm hover:shadow-lg transform hover:scale-[1.02]"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Ensure data exists before rendering
  if (!filteredData) {
    return (
      <div className="text-center py-8">
        <div className="space-y-4">
          <p className="opacity-60">No analytics data available</p>
          {error && (
            <div className="space-y-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchAnalytics}
                className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-lg transition-all duration-300 shadow-sm hover:shadow-lg transform hover:scale-[1.02]"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Debug: Show raw data when YouTube is selected
  if (selectedPlatform === 'YOUTUBE' && data) {
    console.log('🔍 Frontend Debug - Raw data available for YouTube:', {
      overview: data.overview,
      youtubeAnalytics: data.youtubeAnalytics,
      platformPerformance: data.platformPerformance,
      topPosts: data.topPosts,
      topPostsCount: data.topPosts?.length || 0,
      hasYouTubeAnalytics: !!data.youtubeAnalytics,
      youtubeViews: data.youtubeAnalytics?.views || 0,
      youtubeLikes: data.youtubeAnalytics?.likes || 0,
      youtubeComments: data.youtubeAnalytics?.comments || 0
    })
  }

  return (
    <div className="space-y-6">


      {/* Error Display */}
      {error && (
        <div className="rounded-3xl p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium">Error loading analytics</h3>
              <p className="text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto flex-shrink-0 text-red-400 hover:text-red-600"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

    
      {/* Connected Platforms - Modern Horizontal Cards */}
      <div className="rounded-3xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold mb-1">Connected Platforms</h3>
            <p className="text-sm opacity-60">Select a platform to filter analytics and manage accounts</p>
          </div>
          
          {/* Date Controls - Moved to header */}
          <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm opacity-70">
                <Calendar className="h-4 w-4" />
                <span>
                  {dateRange.startDate ? format(new Date(dateRange.startDate), 'MMM dd') : 'Unknown'} - {dateRange.endDate ? format(new Date(dateRange.endDate), 'MMM dd') : 'Unknown'}
                  {(period === 'custom') && <Badge variant="secondary" className="ml-2 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">Custom</Badge>}
                </span>
              </div>
            {/* Period Selector */}
            <div className="flex items-center gap-1 bg-white/60 dark:bg-neutral-800/30 rounded-xl p-1 border border-black/10 dark:border-white/10">
              {['7', '30', '90'].map((days) => (
                <button
                  key={days}
                  onClick={() => onPeriodChange(days)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    period === days
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/6'
                  }`}
                >
                  {days}d
                </button>
              ))}
              <button
                onClick={() => {
                  setShowDateModal(true); // Open the modal when custom is clicked
                  // Don't change period until dates are actually applied
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 relative ${
                  period === 'custom' || showDateModal
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/6'
                }`}
              >
                Custom
                {/* Date Range Dropdown */}
                <DateRangeDropdown
                  isOpen={showDateModal}
                  onClose={() => setShowDateModal(false)}
                  dateRange={dateRange}
                  onDateChange={onCustomDateChange}
                  onApply={() => {
                    onApplyCustomDateRange(); // This will set isCustomDateRange to true and period to 'custom'
                    setShowDateModal(false);
                  }}
                />
              </button>
            </div>

            {/* Refresh Button - Icon Only */}
            <button
              onClick={refreshAnalytics}
              disabled={refreshing}
              className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/6 transition-all duration-300 disabled:opacity-50"
            >
              {refreshing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        
        {platformAccounts.length === 0 ? (
          <div className="text-center py-8">
            <p className="opacity-60 mb-4">No social media accounts connected</p>
            <Link href="/settings">
              <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white transition-all duration-300 shadow-sm hover:shadow-lg transform hover:scale-[1.02]">Connect Your First Account</button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex gap-4 min-w-max pb-4">
              {/* All Platforms Card */}
              <div
                className={`min-w-[240px] p-4 border rounded-xl transition-all duration-300 cursor-pointer group relative overflow-hidden ${
                  selectedPlatform === 'all'
                    ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-900/20 shadow-lg shadow-rose-500/20' 
                    : 'border-black/10 dark:border-white/10 hover:border-rose-300 hover:bg-black/5 dark:hover:bg-white/6'
                }`}
                onClick={() => {
                  setSelectedPlatform('all');
                  setSelectedAccount('all');
                }}
              >
                {/* Selection Indicator */}
                {selectedPlatform === 'all' && (
                  <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
                )}
                
                {/* Platform Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {/* Modern Platform Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selectedPlatform === 'all' ? 'bg-gradient-to-br from-rose-500 to-pink-500' : 'bg-black/5 dark:bg-white/8'
                    }`}>
                      <span className="text-lg font-bold text-white">🌐</span>
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${selectedPlatform === 'all' ? 'text-rose-700 dark:text-rose-300' : ''}`}>
                        All Platforms
                      </p>
                      <p className="text-xs opacity-60">
                        Combined analytics
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Platform Stats */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs opacity-70">Total Posts</span>
                    <span className={`font-semibold text-sm ${selectedPlatform === 'all' ? 'text-rose-700 dark:text-rose-300' : ''}`}>
                      {filteredData?.overview?.totalPosts || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs opacity-70">Total Reach</span>
                    <span className={`font-semibold text-sm ${selectedPlatform === 'all' ? 'text-rose-700 dark:text-rose-300' : ''}`}>
                      {formatNumber(filteredData?.overview?.totalImpressions)}
                    </span>
                  </div>
                  
                  {/* Enhanced Progress Bar */}
                  <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-2 rounded-full transition-all duration-700 ${
                        selectedPlatform === 'all' ? 'bg-gradient-to-r from-rose-500 to-pink-500' : ''
                      }`}
                      style={{ 
                        width: `${Math.min(parseFloat(filteredData?.overview?.engagementRate || '0'), 100)}%`,
                        background: selectedPlatform === 'all'
                          ? 'linear-gradient(90deg, #f43f5e, #ec4899)' 
                          : 'linear-gradient(90deg, #6b7280, #9ca3af)'
                      }}
                    />
                  </div>
                </div>
                
                {/* Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>

              {getUniquePlatforms().map((platform, index) => {
                const accounts = getAccountsForPlatform(platform);
                const platformData = data?.platformPerformance?.find(p => p.platform === platform);
                const isSelected = selectedPlatform === platform;
                
                return (
                  <div
                    key={`${platform}-${index}`}
                    className={`min-w-[240px] p-4 border rounded-xl transition-all duration-300 cursor-pointer group relative overflow-hidden ${
                      isSelected 
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-900/20 shadow-lg shadow-rose-500/20' 
                        : 'border-black/10 dark:border-white/10 hover:border-rose-300 hover:bg-black/5 dark:hover:bg-white/6'
                    }`}
                    onClick={() => {
                      setSelectedPlatform(platform);
                      setSelectedAccount('all');
                    }}
                  >
                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
                    )}
                    
                    {/* Platform Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {/* Colorful Platform Icon */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${getPlatformIconBackground(platform)}`}>
                          {getPlatformIcon(platform)}
                        </div>
                        <div>
                          <p className={`font-semibold text-sm ${isSelected ? 'text-rose-700 dark:text-rose-300' : ''}`}>
                            {platform === 'TWITTER' ? 'X' : platform}
                          </p>
                          <p className="text-xs opacity-60">
                            {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Account Selection Dropdown - Always Visible */}
                    <div className="mb-3">
                      <select
                        value={selectedAccount}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedAccount(e.target.value);
                        }}
                        className={`w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 transition-colors ${
                          isSelected 
                            ? 'border-rose-200 dark:border-rose-700 bg-white/80 dark:bg-rose-800/50 text-rose-700 dark:text-rose-300 focus:ring-rose-500' 
                            : 'border-black/10 dark:border-white/10 bg-white/40 dark:bg-neutral-800/30 focus:ring-rose-400'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="all">All Accounts ({accounts.length})</option>
                        {accounts.map(account => (
                          <option key={account.id} value={account.id}>{account.accountName}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Platform Stats */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs opacity-70">Posts</span>
                        <span className={`font-semibold text-sm ${isSelected ? 'text-rose-700 dark:text-rose-300' : ''}`}>
                          {platformData?.posts || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs opacity-70">Engagement</span>
                        <span className={`font-semibold text-sm ${isSelected ? 'text-rose-700 dark:text-rose-300' : ''}`}>
                          {platformData?.avgEngagement || '0.00'}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm opacity-70">Total Reach</span>
                        <span className={`font-semibold text-sm ${isSelected ? 'text-rose-700 dark:text-rose-300' : ''}`}>
                          {formatNumber(platformData?.totalReach || 0)}
                        </span>
                      </div>
                      
                      {/* Enhanced Progress Bar */}
                      <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-2 rounded-full transition-all duration-700 ${
                            isSelected ? 'bg-gradient-to-r from-rose-500 to-pink-500' : ''
                          }`}
                          style={{ 
                            width: `${Math.min(parseFloat(platformData?.avgEngagement || '0'), 100)}%`,
                            background: isSelected 
                              ? 'linear-gradient(90deg, #f43f5e, #ec4899)' 
                              : `linear-gradient(90deg, ${getPlatformColor(platform)}, ${getPlatformColor(platform)}80)`
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Hover Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </div>
                );
              })}
            </div>
          </div>
          
        )}
        
      </div>






      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cache Status Indicator */}
        {selectedPlatform === 'YOUTUBE' && (
          <div className="col-span-full mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-blue-700 dark:text-blue-300">
                  📊 YouTube data is cached to prevent API quota issues
                </span>
              </div>
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/analytics/overview?action=clear-cache', { method: 'POST' })
                    window.location.reload()
                  } catch (error) {
                    console.error('Failed to clear cache:', error)
                  }
                }}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                🔄 Clear Cache
              </button>
            </div>
          </div>
        )}
        <div className="relative rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg overflow-hidden transition-transform hover:-translate-y-1">
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#f43f5e, #ec4899)' }} />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs opacity-70">Total Posts</div>
              <div className="mt-1 text-xl font-semibold tracking-tight">{filteredData?.overview?.totalPosts || 0}</div>
              <div className="mt-1 text-xs opacity-60">Published content</div>
              

            </div>
            <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><BarChart3 className="w-4 h-4 text-rose-600" /></div>
          </div>
        </div>

        <div className="relative rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg overflow-hidden transition-transform hover:-translate-y-1">
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#10b981, #06b6d4)' }} />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs opacity-70">Total Impressions</div>
              <div className="mt-1 text-xl font-semibold tracking-tight">{formatNumber(filteredData?.overview?.totalImpressions)}</div>
              <div className="mt-1 text-xs opacity-60">Content reach</div>
            </div>
            <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><Eye className="w-4 h-4 text-green-600" /></div>
          </div>
        </div>

        <div className="relative rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg overflow-hidden transition-transform hover:-translate-y-1">
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#f59e0b, #f97316)' }} />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs opacity-70">Total Engagement</div>
              <div className="mt-1 text-xl font-semibold tracking-tight">
                {formatNumber((filteredData?.overview?.totalLikes || 0) + (filteredData?.overview?.totalComments || 0) + (filteredData?.overview?.totalShares || 0))}
              </div>
              <div className="mt-1 text-xs opacity-60">Likes, comments, shares</div>
            </div>
            <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><Heart className="w-4 h-4 text-orange-600" /></div>
          </div>
        </div>

        <div className="relative rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg overflow-hidden transition-transform hover:-translate-y-1">
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#8b5cf6, #ec4899)' }} />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs opacity-70">Engagement Rate</div>
              <div className="mt-1 text-xl font-semibold tracking-tight">{filteredData?.overview?.engagementRate || '0.00'}%</div>
              <div className="mt-1 text-xs opacity-60">Average rate</div>
            </div>
            <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><TrendingUp className="w-4 h-4 text-purple-600" /></div>
          </div>
        </div>
      </div>

      {/* Additional YouTube Analytics Cards - Only show when YouTube is selected */}
      {selectedPlatform === 'YOUTUBE' && data?.youtubeAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* YouTube-specific metrics */}
          <div className="relative rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg overflow-hidden transition-transform hover:-translate-y-1">
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#ff0000, #ff4444)' }} />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs opacity-70">Subscribers</div>
                <div className="mt-1 text-lg font-semibold tracking-tight">
                  {formatNumber(data.youtubeAnalytics.subscribers || 0)}
                </div>
                <div className="mt-1 text-xs opacity-60">Total subscribers</div>
              </div>
              <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><Users className="h-4 w-4 text-red-600" /></div>
            </div>
          </div>

          <div className="relative rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg overflow-hidden transition-transform hover:-translate-y-1">
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#00ff00, #44ff44)' }} />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs opacity-70">Avg Views per Video</div>
                <div className="mt-1 text-lg font-semibold tracking-tight">
                  {formatNumber(Math.floor((data.youtubeAnalytics.views || 0) / Math.max(filteredData?.overview?.totalPosts || 1, 1)))}
                </div>
                <div className="mt-1 text-xs opacity-60">Average</div>
              </div>
              <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><Eye className="h-4 w-4 text-green-600" /></div>
            </div>
          </div>

          <div className="relative rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg overflow-hidden transition-transform hover:-translate-y-1">
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#0000ff, #4444ff)' }} />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs opacity-70">Total Channel Views</div>
                <div className="mt-1 text-lg font-semibold tracking-tight">
                  {formatNumber(data.youtubeAnalytics.views || 0)}
                </div>
                <div className="mt-1 text-xs opacity-60">All time</div>
              </div>
              <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><BarChart3 className="h-4 w-4 text-blue-600" /></div>
            </div>
          </div>

          <div className="relative rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg overflow-hidden transition-transform hover:-translate-y-1">
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#8b5cf6, #a855f7)' }} />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs opacity-70">Engagement Rate</div>
                <div className="mt-1 text-lg font-semibold tracking-tight">
                  {data.youtubeAnalytics.engagementRate || '0.00'}%
                </div>
                <div className="mt-1 text-xs opacity-60">From YouTube API</div>
              </div>
              <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><TrendingUp className="h-4 w-4 text-purple-600" /></div>
            </div>
          </div>
        </div>
      )}


      

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Posts */}
        <div className="rounded-3xl p-5 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">
          <div className="mb-4">
            <h3 className="text-base font-semibold mb-1">Top Performing Posts</h3>
            <p className="text-xs opacity-60">
              Your best content from the last {period || '30'} days
              {period === 'custom' && ' (Custom Range)'}
              {selectedPlatform !== 'all' && ` from ${selectedPlatform}`}
              {selectedAccount !== 'all' && selectedPlatform !== 'all' && ` (${platformAccounts.find(acc => acc.id === selectedAccount)?.accountName || 'Selected Account'})`}
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500">
            {filteredData?.topPosts?.map((post, index) => (
              <div 
                key={post.id || 'unknown'} 
                onClick={() => setSelectedPost(post)}
                className="p-4 border border-black/5 dark:border-white/5 rounded-xl hover:bg-black/3 dark:hover:bg-white/3 transition-all duration-200 cursor-pointer hover:shadow-sm group"
              >
                {/* Debug info for first post */}
                
                
                <div className="flex items-start gap-3">
                  {/* Left: Thumbnail */}
                  {(post.thumbnail || (post as any).media?.thumbnail || (post as any).image) ? (
                    <div className="flex-shrink-0">
                      <img 
                        src={post.thumbnail || (post as any).media?.thumbnail || (post as any).image} 
                        alt={post.content || 'Post thumbnail'}
                        className="w-16 h-12 object-cover rounded-lg"
                        onError={(e) => {
                          console.error('Thumbnail failed to load:', post.thumbnail || (post as any).media?.thumbnail || (post as any).image);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-16 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-gray-500">No img</span>
                    </div>
                  )}
                  
                  {/* Center: Title and Metrics */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-2">
                      {post.content || 'No title available'}
                    </h4>
                    
                    {/* Key Metrics Row */}
                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{formatNumber(post.metrics?.impressions || 0)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        <span>{formatNumber(post.metrics?.likes || 0)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        <span>{formatNumber(post.metrics?.comments || 0)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Share className="w-3 h-3" />
                        <span>{formatNumber(post.metrics?.shares || 0)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right: Platform Icon */}
                  <div className="flex-shrink-0">
                    {(post.platforms || []).map((platform) => (
                      <div key={platform} className="w-8 h-8 rounded-full flex items-center justify-center">
                        {platform === 'YOUTUBE' && (
                          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                            <Youtube className="w-4 h-4 text-white" />
                          </div>
                        )}
                        {platform === 'LINKEDIN' && (
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <Linkedin className="w-4 h-4 text-white" />
                          </div>
                        )}
                        {platform === 'X' && (
                          <div className="w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center">
                            <X className="w-4 h-4 text-white dark:text-black" />
                          </div>
                        )}
                        {platform === 'INSTAGRAM' && (
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full flex items-center justify-center">
                            <Instagram className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>



        {/* Daily Analytics Chart */}
        {filteredData?.dailyAnalytics && filteredData.dailyAnalytics.length > 0 ? (
          <div className="rounded-3xl p-5 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">

            
            <div className="mb-4">
              <h3 className="text-base font-semibold mb-1">Daily Performance</h3>
              <p className="text-xs opacity-60">
                Posts and engagement over time
                {selectedPlatform !== 'all' && ` for ${selectedPlatform}`}
                {selectedAccount !== 'all' && selectedPlatform !== 'all' && ` (${platformAccounts.find(acc => acc.id === selectedAccount)?.accountName || 'Selected Account'})`}
              </p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={filteredData?.dailyAnalytics || []}>
                <defs>
                  <linearGradient id="postsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.05} />
                <XAxis 
                  dataKey="date" 
                  stroke="currentColor" 
                  opacity={0.5}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  axisLine={{ stroke: 'currentColor', opacity: 0.1 }}
                  tickLine={{ stroke: 'currentColor', opacity: 0.1 }}
                />
                <YAxis 
                  stroke="currentColor" 
                  opacity={0.5}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  axisLine={{ stroke: 'currentColor', opacity: 0.1 }}
                  tickLine={{ stroke: 'currentColor', opacity: 0.1 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                    border: 'none', 
                    borderRadius: '16px', 
                    boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15)',
                    padding: '16px',
                    fontSize: '13px',
                    fontWeight: '500'
                  }} 
                />
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: '20px',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="posts" 
                  name="Posts"
                  stroke="#f43f5e" 
                  strokeWidth={3}
                  dot={{ fill: '#f43f5e', strokeWidth: 2, r: 4, stroke: '#ffffff' }}
                  activeDot={{ r: 6, stroke: '#f43f5e', strokeWidth: 2, fill: '#ffffff' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="engagement" 
                  name="Engagement"
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4, stroke: '#ffffff' }}
                  activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2, fill: '#ffffff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="rounded-3xl p-5 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">
            <div className="mb-4">
              <h3 className="text-base font-semibold mb-1">Daily Performance</h3>
              <p className="text-xs opacity-60">No daily analytics data available</p>
            </div>
          </div>
        )}

        {/* Platform Distribution - Only show when All Platforms is selected */}
        {selectedPlatform === 'all' && filteredData?.platformPerformance && filteredData.platformPerformance.length > 0 && (
          <div className="rounded-3xl p-5 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">
            <div className="mb-4">
              <h3 className="text-base font-semibold mb-1">Platform Distribution</h3>
              <p className="text-xs opacity-60">
                Posts by platform
                {selectedPlatform !== 'all' && ` (${selectedPlatform} only)`}
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <defs>
                    <linearGradient id="pieGradient1" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                    <linearGradient id="pieGradient2" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                    <linearGradient id="pieGradient3" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#0891b2" />
                    </linearGradient>
                    <linearGradient id="pieGradient4" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="pieGradient5" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={filteredData?.platformPerformance || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ platform, posts }) => `${platform}: ${posts}`}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="posts"
                    stroke="rgba(255, 255, 255, 0.95)"
                    strokeWidth={2}
                  >
                    {(filteredData?.platformPerformance || []).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`url(#pieGradient${(index % 5) + 1})`}
                        stroke="rgba(255, 255, 255, 0.95)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                      border: 'none', 
                      borderRadius: '16px', 
                      boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15)',
                      padding: '16px',
                      fontSize: '13px',
                      fontWeight: '500'
                    }} 
                  />
                </PieChart>
            </ResponsiveContainer>
          
            <div className="space-y-2">
              {filteredData?.platformPerformance?.map((platform, index) => (
                <div key={`platform-dist-${platform?.platform || 'unknown'}-${index}`} className="flex items-center justify-between p-3 border border-black/5 dark:border-white/5 rounded-xl hover:bg-black/3 dark:hover:bg-white/3 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center bg-gradient-to-br ${getPlatformIconBackground(platform?.platform || 'UNKNOWN')}`}>
                      {getPlatformIcon(platform?.platform || 'UNKNOWN')}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{platform?.platform === 'TWITTER' ? 'X' : platform?.platform || 'Unknown'}</p>
                      <p className="text-xs opacity-60">
                        {platform?.posts || 0} posts
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{platform?.avgEngagement || '0.00'}%</p>
                    <p className="text-xs opacity-60">{formatNumber(platform?.totalReach)} reach</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}

        {/* Engagement Trends */}
        {filteredData?.dailyAnalytics && filteredData.dailyAnalytics.length > 0 && (
          <div className="rounded-3xl p-5 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">
            <div className="mb-4">
              <h3 className="text-base font-semibold mb-1">Engagement Trends</h3>
              <p className="text-xs opacity-60">
                Daily impressions and engagement metrics
                {selectedPlatform !== 'all' && ` for ${selectedPlatform}`}
                {selectedAccount !== 'all' && selectedPlatform !== 'all' && ` (${platformAccounts.find(acc => acc.id === selectedAccount)?.accountName || 'Selected Account'})`}
              </p>
            </div>
                      <ResponsiveContainer width="100%" height={250}>
              <BarChart data={filteredData?.dailyAnalytics || []}>
                <defs>
                  <linearGradient id="impressionsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.05} />
                <XAxis 
                  dataKey="date" 
                  stroke="currentColor" 
                  opacity={0.5}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  axisLine={{ stroke: 'currentColor', opacity: 0.1 }}
                  tickLine={{ stroke: 'currentColor', opacity: 0.1 }}
                />
                <YAxis 
                  stroke="currentColor" 
                  opacity={0.5}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  axisLine={{ stroke: 'currentColor', opacity: 0.1 }}
                  tickLine={{ stroke: 'currentColor', opacity: 0.1 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                    border: 'none', 
                    borderRadius: '16px', 
                    boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15)',
                    padding: '16px',
                    fontSize: '13px',
                    fontWeight: '500'
                  }} 
                />
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: '20px',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                />
                <Bar 
                  dataKey="impressions" 
                  name="Impressions"
                  fill="url(#impressionsGradient)" 
                  radius={[6, 6, 0, 0]}
                />
                <Bar 
                  dataKey="engagement" 
                  name="Engagement"
                  fill="url(#engagementGradient)" 
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
        </div>
        )}

        {/* YouTube Specific Analytics - Only show when YouTube is selected */}
        {selectedPlatform === 'YOUTUBE' && data?.youtubeAnalytics && (
          <>
            {/* Demographics Chart */}
            <div className="rounded-3xl p-5 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold mb-1">Audience Demographics</h3>
                <p className="text-xs opacity-60">Viewer age and gender distribution</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Age Groups */}
                <div>
                  <h4 className="text-sm font-medium mb-3 text-center">Age Groups</h4>
                  <div className="space-y-2">
                    {data?.youtubeAnalytics?.demographics && data.youtubeAnalytics.demographics.length > 0 ? (
                      data.youtubeAnalytics.demographics
                        .filter(demo => demo.ageGroup !== 'Unknown')
                        .map((demo, index) => (
                          <div key={`${demo.ageGroup}-${demo.gender}-${index}`} className="flex items-center justify-between">
                            <span className="text-xs opacity-70">{demo.ageGroup}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 dark:bg-neutral-700 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-red-500 to-pink-500 h-2 rounded-full"
                                  style={{ width: `${demo.viewerPercentage}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium w-8 text-right">
                                {demo.viewerPercentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))
                    ) : (
                      // Fallback to placeholder data
                      ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'].map((ageGroup) => (
                        <div key={ageGroup} className="flex items-center justify-between">
                          <span className="text-xs opacity-70">{ageGroup}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 dark:bg-neutral-700 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-red-500 to-pink-500 h-2 rounded-full"
                                style={{ width: `${Math.random() * 30 + 10}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium w-8 text-right">
                              {Math.floor(Math.random() * 30 + 10)}%
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                {/* Gender Distribution */}
                <div>
                  <h4 className="text-sm font-medium mb-3 text-center">Gender Distribution</h4>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Male', value: 65, color: '#3b82f6' },
                          { name: 'Female', value: 30, color: '#ec4899' },
                          { name: 'Other', value: 5, color: '#8b5cf6' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {[
                          { name: 'Male', value: 65, color: '#3b82f6' },
                          { name: 'Female', value: 30, color: '#ec4899' },
                          { name: 'Other', value: 5, color: '#8b5cf6' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Traffic Sources */}
            <div className="rounded-3xl p-5 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold mb-1">Traffic Sources</h3>
                <p className="text-xs opacity-60">Where your viewers come from</p>
              </div>
              <div className="space-y-3">
                {data?.youtubeAnalytics?.trafficSources && data.youtubeAnalytics.trafficSources.length > 0 ? (
                  data.youtubeAnalytics.trafficSources.map((source, index) => {
                    const colors = ['#ef4444', '#f97316', '#eab308', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
                    const color = colors[index % colors.length];
                    const percentage = source.views > 0 ? (source.views / (data.youtubeAnalytics?.trafficSources?.reduce((sum, s) => sum + s.views, 0) || 1)) * 100 : 0;
                    
                    return (
                      <div key={source.source} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-sm font-medium">
                            {source.source === 'YT_SEARCH' ? 'YouTube Search' :
                             source.source === 'SHORTS' ? 'YouTube Shorts' :
                             source.source === 'PROMOTED' ? 'Promoted Content' :
                             source.source === 'PLAYLIST' ? 'Playlists' :
                             source.source === 'CHANNEL' ? 'Channel Pages' :
                             source.source === 'SUBSCRIBER' ? 'Subscriber Feed' :
                             source.source === 'NOTIFICATION' ? 'Notifications' :
                             source.source === 'PROMOTED_SPONSORED_VIDEO' ? 'Sponsored Videos' :
                             source.source === 'ADVERTISING' ? 'Advertising' :
                             source.source === 'ANNOTATION' ? 'Video Annotations' :
                             source.source === 'CARD' ? 'Video Cards' :
                             source.source === 'END_SCREEN' ? 'End Screens' :
                             source.source === 'HASHTAG' ? 'Hashtag Pages' :
                             source.source === 'LIVE' ? 'Live Streams' :
                             source.source === 'MOBILE' ? 'Mobile Apps' :
                             source.source === 'PODCAST' ? 'Podcast Pages' :
                             source.source === 'POST' ? 'Community Posts' :
                             source.source === 'STORY' ? 'Stories' :
                             source.source === 'TRAFFIC_SOURCE_OTHER' ? 'Other Sources' :
                             source.source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-gray-200 dark:bg-neutral-700 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full"
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: color
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Fallback to placeholder data
                  [
                    { source: 'YouTube Search', views: 45, color: '#ef4444' },
                    { source: 'Suggested Videos', views: 25, color: '#f97316' },
                    { source: 'External', views: 15, color: '#eab308' },
                    { source: 'Direct', views: 10, color: '#10b981' },
                    { source: 'Playlists', views: 5, color: '#8b5cf6' }
                  ].map((source, index) => (
                    <div key={source.source} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: source.color }}
                        />
                        <span className="text-sm font-medium">{source.source}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 dark:bg-neutral-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full"
                            style={{ 
                              width: `${source.views}%`,
                              backgroundColor: source.color
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{source.views}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Device Types */}
            <div className="rounded-3xl p-5 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">
              <div className="mb-4">
                <h3 className="text-base font-semibold mb-1">Device Types</h3>
                <p className="text-xs opacity-60">How viewers watch your content</p>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart 
                  data={
                    data?.youtubeAnalytics?.deviceTypes && data.youtubeAnalytics.deviceTypes.length > 0
                      ? data.youtubeAnalytics.deviceTypes.map((device, index) => {
                          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
                          return {
                            device: device.device === 'MOBILE' ? 'Mobile' : 
                                   device.device === 'DESKTOP' ? 'Desktop' : 
                                   device.device === 'TABLET' ? 'Tablet' : 
                                   device.device === 'TV' ? 'TV' : 
                                   device.device === 'GAME_CONSOLE' ? 'Gaming' : device.device,
                            views: device.views,
                            color: colors[index % colors.length]
                          };
                        })
                      : [
                          { device: 'Mobile', views: 65, color: '#3b82f6' },
                          { device: 'Desktop', views: 25, color: '#10b981' },
                          { device: 'Tablet', views: 8, color: '#f59e0b' },
                          { device: 'TV', views: 2, color: '#8b5cf6' }
                        ]
                  }
                  layout="horizontal"
                >
                  <defs>
                    <linearGradient id="deviceGradient1" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="deviceGradient2" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="deviceGradient3" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                      <stop offset="100%" stopColor="#d97706" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="deviceGradient4" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.05} />
                  <XAxis 
                    type="number" 
                    stroke="currentColor" 
                    opacity={0.5}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    axisLine={{ stroke: 'currentColor', opacity: 0.1 }}
                    tickLine={{ stroke: 'currentColor', opacity: 0.1 }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="device" 
                    stroke="currentColor" 
                    opacity={0.5}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    axisLine={{ stroke: 'currentColor', opacity: 0.1 }}
                    tickLine={{ stroke: 'currentColor', opacity: 0.1 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                      border: 'none', 
                      borderRadius: '16px', 
                      boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15)',
                      padding: '16px',
                      fontSize: '13px',
                      fontWeight: '500'
                    }} 
                  />
                  <Bar 
                    dataKey="views" 
                    fill="url(#deviceGradient1)"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Drawer for post details */}
        <Drawer open={!!selectedPost} onClose={() => setSelectedPost(null)} title={selectedPost ? selectedPost.content : ''}>
          {selectedPost && (
            <div className="space-y-4">
              {/* Thumbnail Section */}
              {selectedPost.thumbnail && (
                <div className="text-center">
                  <img 
                    src={selectedPost.thumbnail} 
                    alt={selectedPost.content}
                    className="w-full max-w-md mx-auto rounded-lg shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      if (selectedPost.platforms?.includes('YOUTUBE') && selectedPost.thumbnail) {
                        // Extract video ID from thumbnail URL and open YouTube
                        const videoId = selectedPost.thumbnail.match(/vi\/([^\/]+)/)?.[1]
                        if (videoId) {
                          window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank')
                        }
                      }
                    }}
                    title={selectedPost.platforms?.includes('YOUTUBE') ? "Click to watch on YouTube" : ""}
                  />
                  {selectedPost.platforms?.includes('YOUTUBE') && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      Click thumbnail to watch on YouTube
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm opacity-70">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="capitalize">{selectedPost.platforms?.[0] || 'Unknown'}</span>
                <span>•</span>
                <span>{selectedPost.publishedAt ? format(new Date(selectedPost.publishedAt), 'MMM dd, yyyy') : 'Unknown date'}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3 bg-white/50 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5">
                  <div className="text-xs opacity-60">Reach</div>
                  <div className="font-semibold">{formatNumber(selectedPost.metrics?.impressions)}</div>
                </div>
                <div className="rounded-xl p-3 bg-white/50 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5">
                  <div className="text-xs opacity-60">Likes</div>
                  <div className="font-semibold">{selectedPost.metrics?.likes || 0}</div>
                </div>
                <div className="rounded-xl p-3 bg-white/50 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5">
                  <div className="text-xs opacity-60">Comments</div>
                  <div className="font-semibold">{selectedPost.metrics?.comments || 0}</div>
                </div>
                <div className="rounded-xl p-3 bg-white/50 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5">
                  <div className="text-xs opacity-60">Shares</div>
                  <div className="font-semibold">{selectedPost.metrics?.shares || 0}</div>
                </div>
              </div>

              <div className="rounded-2xl p-3 bg-white/50 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5 text-sm">
                <div className="font-medium mb-1">Content</div>
                <p className="opacity-80 leading-relaxed">{selectedPost.content}</p>
              </div>

              {/* Lifetime Performance Chart */}
              {selectedPost.platforms?.includes('YOUTUBE') && (
                <div className="rounded-2xl p-4 bg-white/50 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5">
                  <div className="font-medium mb-3 text-center">Lifetime Performance</div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { metric: 'Views', value: selectedPost.metrics?.impressions || 0, color: '#3b82f6' },
                        { metric: 'Likes', value: selectedPost.metrics?.likes || 0, color: '#ef4444' },
                        { metric: 'Comments', value: selectedPost.metrics?.comments || 0, color: '#10b981' },
                        { metric: 'Shares', value: selectedPost.metrics?.shares || 0, color: '#8b5cf6' }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                        <XAxis 
                          dataKey="metric" 
                          stroke="currentColor" 
                          opacity={0.6}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          stroke="currentColor" 
                          opacity={0.6}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                            border: 'none', 
                            borderRadius: '12px', 
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                            padding: '12px',
                            fontSize: '12px'
                          }} 
                        />
                        <Bar 
                          dataKey="value" 
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {selectedPost.description && (
                <div className="rounded-2xl p-3 bg-white/50 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5 text-sm">
                  <div className="font-medium mb-1">Description</div>
                  <p className="opacity-80 leading-relaxed">{selectedPost.description}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button className="px-3 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-sm transition-all duration-300 shadow-sm hover:shadow-lg transform hover:scale-[1.02]">Boost Post</button>
                <button className="px-3 py-2 rounded-full border text-sm">View Original</button>
              </div>
            </div>
          )}
        </Drawer>

        {/* Date Range Modal - Removed since it's now embedded in the custom button */}
      </div>
    </div>
  )
}