"use client"

import { useAuth } from "@/components/providers/auth-provider"
import React from 'react';
import { useQueryClient } from "@tanstack/react-query"
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from "react"
import { createPortal } from "react-dom"
import { useAppShell } from "@/components/layout/app-shell-context"
import { appQueryKeys, useDashboardInsightsQuery, useDashboardPostsQuery, useDashboardStatsQuery } from "@/hooks/queries/use-app-queries"
import PostMediaPreview from "@/components/content/post-media-preview"
import SelectedPostsList from "@/components/dashboard/SelectedPostsList"
import { useToast } from "@/hooks/use-toast"
import {
  Clock3,
  CheckCircle2,
  UploadCloud,
  PlayCircle,
  Zap,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  MessageSquare,
  Users,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  MessageCircle,
  RefreshCw,
  TrendingDown,
  Send,
  Clock,
  Menu
} from 'lucide-react'
import { PremiumStat, PlatformBar } from "@/components/dashboard/stats"
import { NotificationsCard } from "@/components/dashboard/notifications-card"
import { LineChart } from "@/components/dashboard/analytics-chart"
import { getPlatformIcon, getPlatformColor, generateAISuggestedTimes } from "@/components/dashboard/platform-utils"
const DashboardCalendar = dynamic(() => import("@/components/dashboard/dashboard-calendar").then(mod => mod.DashboardCalendar), {
  ssr: false,
  loading: () => <div className="h-96 rounded-3xl bg-gray-100 dark:bg-neutral-800 animate-pulse flex items-center justify-center">Loading Calendar...</div>
})
const HoverOverlay = dynamic(() => import("@/components/dashboard/hover-overlay").then(mod => mod.HoverOverlay), { ssr: false })
const AdvancedEditModal = dynamic(() => import("@/components/content/advanced-edit-modal").then(mod => mod.AdvancedEditModal), { ssr: false })
const ScheduleModal = dynamic(() => import("@/components/content/schedule-modal").then(mod => mod.ScheduleModal), { ssr: false })


interface DashboardStats {
  totalPosts: number
  postsThisMonth: number
  accountsConnected: number
  totalEngagement: number
  recentPosts: Array<{
    id: string
    content: string
    status: string
    createdAt: string
    platform?: string
    accountName?: string
    imageUrl?: string
    images?: string
    videoUrl?: string
    videos?: string
  }>
  platformBreakdown: {
    TWITTER: number
    LINKEDIN: number
    INSTAGRAM: number
    YOUTUBE: number
  }
  engagementMetrics?: {
    likes: number
    comments: number
    shares: number
    clicks: number
    currentWeek: number[]
    previousWeek: number[]
  }
  platformStats?: {
    [key: string]: {
      accountsConnected: number;
      postsPublished: number;
      drafts: number;
      scheduled: number;
    };
  };
}

const defaultDashboardStats: DashboardStats = {
  totalPosts: 0,
  postsThisMonth: 0,
  accountsConnected: 0,
  totalEngagement: 0,
  recentPosts: [],
  platformBreakdown: {
    TWITTER: 0,
    LINKEDIN: 0,
    INSTAGRAM: 0,
    YOUTUBE: 0,
  },
  engagementMetrics: {
    likes: 0,
    comments: 0,
    shares: 0,
    clicks: 0,
    currentWeek: [0, 0, 0, 0, 0, 0, 0],
    previousWeek: [0, 0, 0, 0, 0, 0, 0],
  },
  platformStats: {
    TWITTER: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
    LINKEDIN: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
    INSTAGRAM: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
    YOUTUBE: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
  },
}

interface NotificationItem {
  id: string
  type: 'success' | 'info' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

// Small polished line chart (no external lib)
// Components moved to @/components/dashboard/ folder for modularity

function DashboardContent({ initialSocialAccounts }: { initialSocialAccounts?: any[] }) {
  const { user: session } = useAuth()
  const { collapsed, setUnreadNotificationsCount } = useAppShell()
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [stats, setStats] = useState<DashboardStats>(defaultDashboardStats)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [shouldLoadInsights, setShouldLoadInsights] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dark = false // Theme is now handled by the top-right controls component
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [allPosts, setAllPosts] = useState<Record<string, any[]>>({})
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'week' | 'day'>('month')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingPost, setEditingPost] = useState<any | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [reschedulingPost, setReschedulingPost] = useState<any | null>(null)
  const [showAdvancedEditModal, setShowAdvancedEditModal] = useState(false)

  // Drag and Drop states
  const [draggedPost, setDraggedPost] = useState<any | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null)
  const [originalTime, setOriginalTime] = useState<string>('')
  const [aiSuggestedTimes, setAiSuggestedTimes] = useState<string[]>([])
  const [isScheduling, setIsScheduling] = useState(false)

  // Hover states
  const [hoveredPost, setHoveredPost] = useState<any | null>(null)
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })
  const currentMonth = currentDate.getMonth() + 1
  const currentYear = currentDate.getFullYear()
  const statsQuery = useDashboardStatsQuery(Boolean(session))
  const insightsQuery = useDashboardInsightsQuery(Boolean(session) && shouldLoadInsights)
  const postsQuery = useDashboardPostsQuery(currentMonth, currentYear, Boolean(session))

  const { toast } = useToast()
  const isInsightsLoading = !insightsQuery.data
  const allMonthPosts = useMemo(() => Object.values(allPosts).flat() as Array<{
    id?: string
    status?: string
    scheduledAt?: string
    publishedAt?: string
    platform?: string
  }>, [allPosts])
  const publishingCounts = useMemo(() => {
    const normalizeStatus = (status?: string) => (status || '').toUpperCase()

    return allMonthPosts.reduce(
      (acc, post) => {
        const status = normalizeStatus(post.status)

        if (status === 'DRAFT') acc.drafts++
        else if (status === 'SCHEDULED' || status === 'QUEUED') acc.scheduled++
        else if (status === 'PUBLISHED') acc.published++
        else if (status === 'FAILED') acc.failed++

        return acc
      },
      { drafts: 0, scheduled: 0, published: 0, failed: 0 }
    )
  }, [allMonthPosts])
  const nextScheduledPost = useMemo(() => {
    return allMonthPosts
      .filter((post) => {
        const status = (post.status || '').toUpperCase()
        return (status === 'SCHEDULED' || status === 'QUEUED') && !!post.scheduledAt
      })
      .sort((a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime())[0] || null
  }, [allMonthPosts])
  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = []
    const now = new Date()

    if (publishingCounts.failed > 0) {
      items.push({
        id: 'failed-posts',
        type: 'warning',
        title: 'Publishing attention needed',
        message: `${publishingCounts.failed} post${publishingCounts.failed === 1 ? '' : 's'} failed and may need review`,
        timestamp: now,
        read: false,
      })
    }

    if (nextScheduledPost?.scheduledAt) {
      items.push({
        id: 'next-scheduled',
        type: 'info',
        title: 'Next post in queue',
        message: `Scheduled for ${new Date(nextScheduledPost.scheduledAt).toLocaleString()}`,
        timestamp: new Date(nextScheduledPost.scheduledAt),
        read: false,
      })
    }

    if (publishingCounts.published > 0) {
      items.push({
        id: 'published-posts',
        type: 'success',
        title: 'Posts already published',
        message: `${publishingCounts.published} published post${publishingCounts.published === 1 ? '' : 's'} in the current view`,
        timestamp: now,
        read: false,
      })
    }

    if (stats.accountsConnected > 0) {
      items.push({
        id: 'connected-accounts',
        type: 'info',
        title: 'Connected channels ready',
        message: `${stats.accountsConnected} connected account${stats.accountsConnected === 1 ? '' : 's'} available for publishing`,
        timestamp: now,
        read: false,
      })
    }

    return items.slice(0, 3)
  }, [nextScheduledPost, publishingCounts.failed, publishingCounts.published, stats.accountsConnected])

  const invalidateSharedPostQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: appQueryKeys.dashboardStats }),
      queryClient.invalidateQueries({ queryKey: appQueryKeys.dashboardInsights }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-posts"] }),
      queryClient.invalidateQueries({ queryKey: appQueryKeys.posts }),
      queryClient.invalidateQueries({ queryKey: ["post-analytics"] }),
    ])
  }, [queryClient])

  // Real engagement data (will be fetched from API)
  const engagement = useMemo(() => stats?.engagementMetrics?.currentWeek || [0, 0, 0, 0, 0, 0, 0], [stats?.engagementMetrics?.currentWeek]);
  const prev = useMemo(() => stats?.engagementMetrics?.previousWeek || [0, 0, 0, 0, 0, 0, 0], [stats?.engagementMetrics?.previousWeek]);

  useEffect(() => {
    if (statsQuery.data) {
      setStats((currentStats) => ({
        ...currentStats,
        ...(statsQuery.data as Partial<DashboardStats>),
      }))
      setError(null)
      setIsLoading(false)
    }
  }, [statsQuery.data])

  useEffect(() => {
    if (!session || !statsQuery.data) {
      return
    }

    let timeoutId: number | null = null
    let idleId: number | null = null

    const enableInsights = () => setShouldLoadInsights(true)

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = (window as Window & {
        requestIdleCallback: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
      }).requestIdleCallback(() => enableInsights(), { timeout: 1200 })
    } else if (typeof window !== "undefined") {
      timeoutId = window.setTimeout(enableInsights, 600)
    }

    return () => {
      if (
        idleId !== null &&
        typeof window !== "undefined" &&
        "cancelIdleCallback" in window
      ) {
        ;(window as Window & {
          cancelIdleCallback: (handle: number) => void
        }).cancelIdleCallback(idleId)
      }

      if (timeoutId !== null && typeof window !== "undefined") {
        window.clearTimeout(timeoutId)
      }
    }
  }, [session, statsQuery.data])

  useEffect(() => {
    if (insightsQuery.data) {
      setStats((currentStats) => ({
        ...currentStats,
        ...(insightsQuery.data as Partial<DashboardStats>),
      }))
    }
  }, [insightsQuery.data])

  useEffect(() => {
    if (statsQuery.error) {
      setError(statsQuery.error instanceof Error ? statsQuery.error.message : 'Failed to fetch dashboard data')
      setIsLoading(false)
    }
  }, [statsQuery.error])

  useEffect(() => {
    if (insightsQuery.error) {
      console.error('Failed to fetch dashboard insights:', insightsQuery.error)
    }
  }, [insightsQuery.error])

  useEffect(() => {
    setAllPosts((postsQuery.data?.allPosts as Record<string, any[]> | undefined) || {})
  }, [postsQuery.data])

  useEffect(() => {
    // Handle OAuth callback notifications
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'twitter_connected') {
      setNotification({
        type: 'success',
        message: 'Twitter account connected successfully! 🎉'
      })
    } else if (success === 'linkedin_connected') {
      setNotification({
        type: 'success',
        message: 'LinkedIn account connected successfully! 🎉'
      })
    } else if (success === 'instagram_connected') {
      setNotification({
        type: 'success',
        message: 'Instagram account connected successfully! 🎉'
      })
    } else if (success === 'youtube_connected') {
      setNotification({
        type: 'success',
        message: 'YouTube channel connected successfully! 🎉'
      })
    } else if (error) {
      const errorMessages: Record<string, string> = {
        'twitter_oauth_failed': 'Twitter connection failed. Please try again.',
        'twitter_connection_failed': 'Failed to connect Twitter account. Please try again.',
        'linkedin_oauth_failed': 'LinkedIn connection failed. Please try again.',
        'linkedin_connection_failed': 'Failed to connect LinkedIn account. Please try again.',
        'instagram_oauth_failed': 'Instagram connection failed. Please try again.',
        'instagram_connection_failed': 'Failed to connect Instagram account. Please try again.',
        'youtube_oauth_failed': 'YouTube connection failed. Please try again.',
        'youtube_connection_failed': 'Failed to connect YouTube channel. Please try again.',
        'account_limit_reached': 'You have reached your account limit. Please upgrade your plan.',
        'oauth_callback_failed': 'OAuth callback failed. Please try again.'
      }

      setNotification({
        type: 'error',
        message: errorMessages[error] || 'An error occurred. Please try again.'
      })
    }

    // Clear notification after 5 seconds
    if (success || error) {
      const timer = setTimeout(() => {
        setNotification(null)
        // Clean up URL parameters
        router.replace('/dashboard', undefined)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [searchParams, router])

  useEffect(() => {
    setUnreadNotificationsCount(notifications.filter(n => !n.read).length)

    return () => {
      setUnreadNotificationsCount(3)
    }
  }, [notifications, setUnreadNotificationsCount])

  const fetchDashboardStats = async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true)
      setError(null)
      const summaryResult = await statsQuery.refetch()
      if (summaryResult.data) {
        setStats((currentStats) => ({
          ...currentStats,
          ...(summaryResult.data as Partial<DashboardStats>),
        }))
      }

      if (!shouldLoadInsights) {
        setShouldLoadInsights(true)
      }

      const insightsResult = await insightsQuery.refetch()
      if (insightsResult.data) {
        setStats((currentStats) => ({
          ...currentStats,
          ...(insightsResult.data as Partial<DashboardStats>),
        }))
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
      setError('Failed to connect to server. Please check your internet connection.')
    } finally {
      setIsLoading(false)
      if (showRefresh) setIsRefreshing(false)
    }
  }

  const handleLogout = () => {
    // Logout is now handled by the top-right controls component
  }

  const handleRefresh = () => {
    fetchDashboardStats(true)
  }

  const handleSaveEdit = async (updatedContent: any) => {
    if (!editingPost) {
      return
    }

    try {
      const requestBody = {
        content: updatedContent.content,
        hashtags: updatedContent.hashtags,
        imageUrl: updatedContent.imageUrl,
        images: updatedContent.images || null
      }

      const response = await fetch(`/api/posts/${editingPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        await response.json()

        setNotification({
          type: 'success',
          message: 'Post updated successfully!'
        })

        await invalidateSharedPostQueries()
        await fetchDashboardStats()

        setShowEditModal(false)
        setEditingPost(null)
      } else {
        const errorData = await response.text()
        console.error('Failed to update post:', response.status, errorData)

        setNotification({
          type: 'error',
          message: `Failed to update post: ${response.status} ${response.statusText}`
        })
      }
    } catch (error) {
      console.error('Failed to update post:', error)
      setNotification({
        type: 'error',
        message: `Failed to update post: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  const convertPostToGeneratedContent = (post: any) => {
    // Get the primary platform from the post or fallback to publications
    const primaryPlatform = post.platform || 'TWITTER'

    // Handle images - the post might already have processed images or raw database values
    let images: string[] = []
    if (post.images) {
      if (Array.isArray(post.images)) {
        // Already an array (from scheduled posts API)
        images = post.images
      } else if (typeof post.images === 'string') {
        try {
          // Try to parse as JSON (raw database value)
          const parsedImages = JSON.parse(post.images)
          if (Array.isArray(parsedImages)) {
            images = parsedImages
          } else {
            // Single image string
            images = [post.images]
          }
        } catch {
          // If parsing fails, treat as single image
          images = [post.images]
        }
      }
    } else if (post.imageUrl) {
      images = [post.imageUrl]
    }

    // Handle videos - the post might already have processed videos or raw database values
    let videos: string[] = []
    if (post.videos) {
      if (Array.isArray(post.videos)) {
        // Already an array (from scheduled posts API)
        videos = post.videos
      } else if (typeof post.videos === 'string') {
        try {
          // Try to parse as JSON (raw database value)
          const parsedVideos = JSON.parse(post.videos)
          if (Array.isArray(parsedVideos)) {
            videos = parsedVideos
          } else {
            // Single video string
            videos = [post.videos]
          }
        } catch {
          // If parsing fails, treat as single video
          videos = [post.videos]
        }
      }
    } else if (post.videoUrl) {
      videos = [post.videoUrl]
    }

    // Handle hashtags - the post might already have processed hashtags or raw database values
    let hashtags: string[] = []
    if (post.hashtags) {
      if (Array.isArray(post.hashtags)) {
        // Already an array (from scheduled posts API)
        hashtags = post.hashtags
      } else if (typeof post.hashtags === 'string') {
        // Raw database value (comma-separated string)
        hashtags = post.hashtags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
      }
    }

    const result = {
      platform: primaryPlatform,
      content: post.content || '',
      hashtags: hashtags,
      imageUrl: post.imageUrl || '',
      images: images,
      videoUrl: post.videoUrl || '',
      videos: videos
    }

    return result
  }

  // Handlers moved or simplified
  const handleDragStart = (e: React.DragEvent, post: any) => {
    if (post.status === 'PUBLISHED' || post.status === 'published') return
    setDraggedPost(post)
  }
  const handleDragOver = (e: React.DragEvent, date: Date) => e.preventDefault()
  const handleDragLeave = () => setDragOverDate(null)
  const handlePostHover = (e: React.MouseEvent, post: any) => {
    setHoveredPost(post)
    setHoverPosition({ x: e.clientX, y: e.clientY })
  }
  const handlePostLeave = () => setHoveredPost(null)
  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault()
    if (!draggedPost) return

    const targetDateString = targetDate.toLocaleDateString('en-CA')

    // Use publishedAt for published posts, scheduledAt for scheduled posts
    let originalDateString = ''
    if (draggedPost.status === 'PUBLISHED' || draggedPost.status === 'published') {
      if (draggedPost.publishedAt) {
        originalDateString = new Date(draggedPost.publishedAt).toLocaleDateString('en-CA')
      }
    } else if (draggedPost.scheduledAt) {
      originalDateString = new Date(draggedPost.scheduledAt).toLocaleDateString('en-CA')
    }

    if (targetDateString === originalDateString) {
      setDragOverDate(null)
      return
    }

    // Generate AI suggested times for the new date
    const suggestedTimes = generateAISuggestedTimes(targetDate, draggedPost.platform)
    setAiSuggestedTimes(suggestedTimes)

    // Extract original time
    let originalTimeString = ''
    if (draggedPost.status === 'PUBLISHED' || draggedPost.status === 'published') {
      if (draggedPost.publishedAt) {
        originalTimeString = new Date(draggedPost.publishedAt).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      }
    } else if (draggedPost.scheduledAt) {
      originalTimeString = new Date(draggedPost.scheduledAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    }
    setOriginalTime(originalTimeString)

    // Set up for rescheduling
    setDropTargetDate(targetDateString)
    setReschedulingPost(draggedPost)
    setShowScheduleModal(true)

    // Clear drag states
    setDraggedPost(null)
    setDragOverDate(null)
  }

  // Hover Overlay moved to modular component

  const fetchPosts = async (month: number, year: number) => {
    try {
      const result = await postsQuery.refetch()
      setAllPosts(result.data?.allPosts || {})
    } catch (error) {
      console.error('Failed to fetch posts:', error)
      setAllPosts({})
    }
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
  }

  if (!session) {
    return null
  }

  // Platform utilities moved to @/components/dashboard/platform-utils.tsx

  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-colors">
      <style jsx>{`
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl border animate-slide-up max-w-md ${notification.type === 'success'
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-red-50 border-red-200 text-red-800'
          }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-current hover:opacity-70 transition-opacity"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-4 rounded-xl border bg-red-50 border-red-200 text-red-800 animate-slide-up max-w-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="font-medium">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-current hover:opacity-70 transition-opacity"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <div className={`max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-3 pb-24 md:pb-8 ${collapsed ? 'md:ml-16' : 'md:ml-64'} transition-all duration-300 overflow-x-hidden relative`}>
        {/* Main area */}
        <main className="space-y-3">
          {/* KPI Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
            <div className="flex flex-col">
              <h2 className="text-xl font-semibold tracking-tight mb-1">
                Dashboard Overview
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Overview of your social media performance
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <PremiumStat
              title="Total Posts"
              value={stats?.totalPosts?.toString() || "0"}
              delta="+12% vs last week"
              icon={<MessageSquare className="text-indigo-600" />}
              accent={'linear-gradient(135deg,#3b82f6, #06b6d4)'}
              loading={isLoading}
            />
            <PremiumStat
              title="This Month"
              value={stats?.postsThisMonth?.toString() || "0"}
              delta="Next 14 days"
              icon={<Clock3 className="text-green-600" />}
              accent={'linear-gradient(135deg,#10b981, #06b6d4)'}
              loading={isLoading}
            />
            <PremiumStat
              title="Connected"
              value={stats?.accountsConnected?.toString() || "0"}
              delta="This week"
              icon={<Zap className="text-orange-600" />}
              accent={'linear-gradient(135deg,#f59e0b, #f97316)'}
              loading={isLoading}
            />
            <PremiumStat
              title="Engagement"
              value={stats?.totalEngagement?.toLocaleString() || "0"}
              delta="+4.1%"
              icon={<div className='w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center text-white'>U</div>}
              accent={'linear-gradient(135deg,#8b5cf6, #ec4899)'}
              loading={isLoading || isInsightsLoading}
            />
          </div>

          {/* Engagement and Notifications Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Engagement card - Takes 2 columns on lg screens and above */}
            <section className="lg:col-span-2 rounded-3xl p-4 sm:p-5 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold">Engagement</div>
                  <div className="text-xs opacity-60">Current week vs previous</div>
                </div>
                <div className="flex items-center gap-3 text-sm opacity-70">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-600 block" /> This week</div>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-400 block" /> Previous</div>
                </div>
              </div>

              <LineChart series={engagement} series2={prev} loading={isInsightsLoading} />

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm opacity-70">
                {isInsightsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex flex-col">
                      <div className="text-xs">Loading...</div>
                      <div className="h-6 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse"></div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex flex-col">
                      <div className="text-xs">Likes</div>
                      <div className="font-semibold">{stats?.engagementMetrics?.likes?.toLocaleString() || '0'}</div>
                    </div>
                    <div className="flex flex-col">
                      <div className="text-xs">Comments</div>
                      <div className="font-semibold">{stats?.engagementMetrics?.comments?.toLocaleString() || '0'}</div>
                    </div>
                    <div className="flex flex-col">
                      <div className="text-xs">Shares</div>
                      <div className="font-semibold">{stats?.engagementMetrics?.shares?.toLocaleString() || '0'}</div>
                    </div>
                    <div className="flex flex-col">
                      <div className="text-xs">Clicks</div>
                      <div className="font-semibold">{stats?.engagementMetrics?.clicks?.toLocaleString() || '0'}</div>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Notifications card - Moved to modular component */}
            <NotificationsCard notifications={notifications} />
          </div>

          {/* AI Content, Recent Posts, and Platform Overview - 3 Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Content Pipeline */}
            <div className="rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg min-h-[300px]">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">Content Pipeline</div>
                <button
                  onClick={() => router.push('/create')}
                  className="text-xs px-2 py-1 rounded-md bg-white/60 dark:bg-neutral-800/60 border border-black/10 dark:border-white/10 hover:bg-white/80 dark:hover:bg-neutral-700/80 transition-colors"
                >
                  Create post
                </button>
              </div>

              <div className="grid gap-3">
                {[
                  { label: 'Drafts', value: publishingCounts.drafts, href: '/posts' },
                  { label: 'Scheduled', value: publishingCounts.scheduled, href: '/calendar' },
                  { label: 'Published', value: publishingCounts.published, href: '/posts' },
                  { label: 'Failed', value: publishingCounts.failed, href: '/posts' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => router.push(item.href)}
                    className="p-3 rounded-2xl border border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-900/30 flex items-center justify-between text-left hover:bg-white/70 dark:hover:bg-neutral-800/60 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs opacity-60">Open {item.label.toLowerCase()}</div>
                    </div>
                    <div className="text-2xl font-semibold">{item.value}</div>
                  </button>
                ))}
              </div>

              <div className="mt-3 rounded-2xl border border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-900/30 p-3">
                <div className="text-xs uppercase tracking-[0.18em] opacity-50">Next up</div>
                {nextScheduledPost?.scheduledAt ? (
                  <div className="mt-2">
                    <div className="text-sm font-medium">Scheduled publish</div>
                    <div className="text-xs opacity-70">
                      {new Date(nextScheduledPost.scheduledAt).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-sm opacity-60">No upcoming scheduled post in the current calendar view.</div>
                )}
              </div>
            </div>

            {/* Recent Posts */}
            <div className="rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg min-h-[300px]">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">Recent Posts</div>
                <button
                  onClick={() => router.push('/posts')}
                  className="text-xs px-2 py-1 rounded-md bg-white/60 dark:bg-neutral-800/60 border border-black/10 dark:border-white/10 hover:bg-white/80 dark:hover:bg-neutral-700/80 transition-colors"
                >
                  View all
                </button>
              </div>

              <div className="space-y-3">
                {isInsightsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-3 rounded-2xl bg-gradient-to-br from-white to-white/60 dark:from-neutral-950 dark:to-neutral-900 border border-black/5 dark:border-white/5 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))
                ) : stats?.recentPosts && stats.recentPosts.length > 0 ? (
                  stats.recentPosts.slice(0, 3).map((post, idx) => (
                    <div key={post.id} className="p-3 rounded-2xl bg-gradient-to-br from-white to-white/60 dark:from-neutral-950 dark:to-neutral-900 border border-black/5 dark:border-white/5 hover:scale-[1.01] transition">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {post.platform && (
                            <div className="w-4 h-4 flex items-center justify-center">
                              {getPlatformIcon(post.platform)}
                            </div>
                          )}
                          <div className="text-sm font-medium">
                            {post.accountName || post.platform || 'Post'}
                          </div>
                        </div>
                        <div className="text-xs opacity-60">{new Date(post.createdAt).toLocaleDateString()}</div>
                      </div>

                      {/* Content with media preview */}
                      <div className="flex gap-3">
                        {/* Small media preview */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 flex-shrink-0">
                          {post.videoUrl ? (
                            // Video Preview
                            <div className="relative w-full h-full">
                              <video
                                src={post.videoUrl}
                                className="w-full h-full object-cover"
                                preload="metadata"
                                muted
                                onError={(e) => {
                                  // Fallback to platform icon if video fails
                                  const target = e.target as HTMLVideoElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              {/* Video overlay icon */}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="w-3 h-3 bg-white/90 rounded-full flex items-center justify-center">
                                  <svg className="w-2 h-2 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                              </div>
                              {/* Fallback when video fails */}
                              <div className="hidden w-full h-full flex items-center justify-center">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                  <div className="w-3 h-3 flex items-center justify-center">
                                    {getPlatformIcon(post.platform || 'UNKNOWN')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : post.imageUrl ? (
                            // Image Preview
                            <img
                              src={post.imageUrl}
                              alt="Post"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : (
                            // Platform placeholder when no media
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <div className="w-3 h-3 flex items-center justify-center">
                                  {getPlatformIcon(post.platform || 'UNKNOWN')}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Fallback icon when image fails to load */}
                          {post.imageUrl && !post.videoUrl && (
                            <div className="hidden w-full h-full flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <div className="w-3 h-3 flex items-center justify-center">
                                  {getPlatformIcon(post.platform || 'UNKNOWN')}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Text content */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm opacity-80 line-clamp-2">{post.content}</div>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => {
                            // Open Advanced Edit Modal for this specific post
                            setEditingPost(post)
                            setShowEditModal(true)
                          }}
                          className="px-3 py-1 rounded-md bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 transition-all duration-300 text-xs font-medium shadow-sm hover:shadow-lg transform hover:scale-[1.02]"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-sm opacity-60">No posts yet</div>
                )}
              </div>
            </div>

            {/* Platform Overview - Enhanced with subcards showing key stats */}
            <div className="rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg min-h-[300px]">
              <div className="font-semibold mb-3">Platform Overview</div>
              <div className="grid grid-cols-1 gap-3">
                {isInsightsLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-20 rounded-xl bg-white/40 dark:bg-neutral-800/30 animate-pulse border border-black/5 dark:border-white/6" />
                  ))
                ) : Object.entries(stats?.platformBreakdown || {})
                  .filter(([platform, count]) => {
                    const platformData = stats?.platformStats?.[platform]
                    return platformData?.accountsConnected && platformData.accountsConnected > 0
                  })
                  .map(([platform, count]) => {
                    const platformData = (stats?.platformStats?.[platform] || {}) as {
                      accountsConnected?: number;
                      postsPublished?: number;
                      drafts?: number;
                      scheduled?: number;
                    }
                    const allMonthPosts = Object.values(allPosts).flat()
                    const platformPosts = allMonthPosts.filter(post => post.platform === platform)
                    const published = platformPosts.filter(post => post.status === 'PUBLISHED' || post.status === 'published').length
                    const scheduled = platformPosts.filter(post => post.status === 'SCHEDULED' || post.status === 'scheduled').length
                    const failed = platformPosts.filter(post => post.status === 'FAILED' || post.status === 'failed').length
                    return (
                      <div key={platform} className="p-3 rounded-xl bg-white/40 dark:bg-neutral-800/30 border border-black/5 dark:border-white/6 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 flex items-center justify-center">
                              {getPlatformIcon(platform)}
                            </div>
                            <span className="text-sm font-medium capitalize">{platform}</span>
                          </div>
                          <div className="text-xs opacity-60">{count} connected {count === 1 ? 'account' : 'accounts'}</div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <div className="text-green-600 dark:text-green-400 font-semibold flex items-center justify-center gap-1">
                              <Users className="w-3 h-3" />
                              {platformData?.accountsConnected ?? 0}
                            </div>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                            <div className="text-blue-600 dark:text-blue-400 font-semibold flex items-center justify-center gap-1">
                              <Send className="w-3 h-3" />
                              {platformData?.postsPublished ?? 0}
                            </div>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                            <div className="text-orange-600 dark:text-orange-400 font-semibold flex items-center justify-center gap-1">
                              <Clock className="w-3 h-3" />
                              {(platformData?.drafts ?? 0) + (platformData?.scheduled ?? 0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>

          {/* Quick Actions - Full Width */}
          <div className="rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg">
            <div className="font-semibold mb-3">Quick Actions</div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {[
                { text: 'Generate Post', action: () => router.push('/create') },
                { text: 'Import CSV', action: () => router.push('/posts') },
                { text: 'Bulk Schedule', action: () => router.push('/posts') },
                { text: 'Brand Kit', action: () => router.push('/settings') },
                { text: 'UTM Builder', action: () => router.push('/settings') },
                { text: 'Invite Team', action: () => router.push('/settings') }
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={item.action}
                  className="px-3 py-2 rounded-md bg-white/60 dark:bg-neutral-800/60 border border-black/10 dark:border-white/10 hover:bg-white/80 dark:hover:bg-neutral-700/80 transition-colors text-sm"
                >
                  {item.text}
                </button>
              ))}
            </div>
          </div>

          {/* Publishing Calendar - Full Width */}
          <DashboardCalendar
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            calendarViewMode={calendarViewMode}
            setCalendarViewMode={setCalendarViewMode}
            selectedDate={selectedDate}
            onDateClick={handleDateClick}
            allPosts={allPosts}
            dragOverDate={dragOverDate}
            handleDragStart={handleDragStart}
            handleDragOver={handleDragOver}
            handleDragLeave={handleDragLeave}
            handleDrop={handleDrop}
            handlePostHover={handlePostHover}
            handlePostLeave={handlePostLeave}
            onPostClick={(post) => { setEditingPost(post); setShowEditModal(true); }}
          />
        </main>
      </div>

      {/* Hover Overlay */}
      <HoverOverlay hoveredPost={hoveredPost} hoverPosition={hoverPosition} />

      {/* Advanced Edit Modal */}
      {showEditModal && editingPost && (
        <AdvancedEditModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingPost(null)
          }}
          generatedContent={convertPostToGeneratedContent(editingPost)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Reschedule Modal */}
      {showScheduleModal && reschedulingPost && (
        <ScheduleModal
          isOpen={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false)
            setReschedulingPost(null)
            setDropTargetDate(null)
            setOriginalTime('')
            setAiSuggestedTimes([])
          }}
          postContent={reschedulingPost.content}
          isLoading={isScheduling}
          isRescheduling={true}
          originalDate={reschedulingPost.status === 'PUBLISHED' || reschedulingPost.status === 'published'
            ? reschedulingPost.publishedAt
            : reschedulingPost.scheduledAt
          }
          originalTime={originalTime}
          aiSuggestedTimes={aiSuggestedTimes}
          targetDate={dropTargetDate ? new Date(dropTargetDate).toISOString().split('T')[0] : undefined}
          onSchedule={async (scheduledAt: string) => {
            setIsScheduling(true)
            try {
              let finalScheduledAt = scheduledAt

              // If this is a reschedule from drag & drop, use the target date
              if (dropTargetDate) {
                const timePart = scheduledAt.split('T')[1] || '00:00:00'
                const targetDateTime = new Date(dropTargetDate + 'T' + timePart)
                finalScheduledAt = targetDateTime.toISOString()
              }

              const response = await fetch(`/api/posts/${reschedulingPost.id}/schedule`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ scheduledAt: finalScheduledAt }),
              })

              if (response.ok) {
                await invalidateSharedPostQueries()
                await fetchPosts(currentDate.getMonth() + 1, currentDate.getFullYear())

                // Close modal and clear states
                setShowScheduleModal(false)
                setReschedulingPost(null)
                setDropTargetDate(null)
                setOriginalTime('')
                setAiSuggestedTimes([])

                // Show success toast
                setTimeout(() => {
                  const timeString = scheduledAt.split('T')[1]?.substring(0, 5) || '00:00'
                  if (dropTargetDate) {
                    toast({
                      title: "Post Rescheduled Successfully!",
                      description: `Post moved to ${new Date(dropTargetDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })} at ${timeString}`,
                      variant: "success",
                    })
                  } else {
                    toast({
                      title: "Post Rescheduled Successfully!",
                      description: `Post rescheduled for ${new Date(scheduledAt).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })} at ${timeString}`,
                      variant: "success",
                    })
                  }
                }, 100)

              } else {
                throw new Error('Failed to reschedule post')
              }
            } catch (error) {
              console.error('Error rescheduling post:', error)
              toast({
                title: "Failed to Reschedule Post",
                description: "An error occurred while rescheduling the post",
                variant: "destructive",
              })
            } finally {
              setIsScheduling(false)
            }
          }}
        />
      )}
    </div>
  )
}

export default function DashboardPageFallback({ initialSocialAccounts }: { initialSocialAccounts?: any[] }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-rose-500"></div>
      </div>
    }>
      <DashboardContent initialSocialAccounts={initialSocialAccounts} />
    </Suspense>
  )
}
