"use client"

import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import {AdvancedEditModal} from "@/components/content/advanced-edit-modal"
import { ScheduleModal } from "@/components/content/schedule-modal"
import { TopRightControls } from "@/components/layout/top-right-controls"
import { Sidebar } from "@/components/layout/sidebar"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
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

interface NotificationItem {
  id: string
  type: 'success' | 'info' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

// Small polished line chart (no external lib)
const LineChart: React.FC<{ series: number[]; series2?: number[]; loading?: boolean }> = ({ series, series2, loading }) => {
  if (loading) {
    return (
      <div className="w-full h-[160px] bg-gray-100 dark:bg-neutral-800 rounded-lg animate-pulse flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  const w = 520; const h = 160; const pad = 10;
  const all = [...series, ...(series2 || [])];
  const max = Math.max(...all) || 1;
  const stepX = (w - pad * 2) / (series.length - 1);
  const path = (arr: number[]) => arr.map((v,i)=> {
    const x = pad + i * stepX;
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${i===0? 'M':'L'}${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[160px]">
      <defs>
        <linearGradient id="a" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {series2 && (
        <>
          <path d={path(series2)} stroke="currentColor" strokeWidth={2} className="opacity-40 text-slate-400 dark:text-slate-500 fill-none" />
          <path d={`${path(series2)} L ${w-pad},${h-pad} L ${pad},${h-pad} Z`} fill="url(#a)" className="text-slate-400 dark:text-slate-500" />
        </>
      )}
      <path d={path(series)} stroke="currentColor" strokeWidth={2.5} className="text-indigo-600 dark:text-indigo-400 fill-none" />
    </svg>
  );
};

const PremiumStat: React.FC<{ title:string, value:string, delta?:string, icon?:React.ReactNode, accent?:string, loading?: boolean }> = ({ title, value, delta, icon, accent, loading }) => (
  <div className="relative rounded-3xl p-5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg overflow-hidden transition-transform hover:-translate-y-1">
    <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-20" style={{ background: accent || 'linear-gradient(135deg,#fff7ed, #fff)' }} />
    <div className="flex items-start justify-between">
      <div>
        <div className="text-xs opacity-70">{title}</div>
        {loading ? (
          <div className="mt-2 h-8 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse"></div>
        ) : (
          <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
        )}
        {delta && <div className="mt-1 text-xs opacity-60">{delta}</div>}
      </div>
      <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8">{icon}</div>
    </div>
  </div>
);

const PlatformBar: React.FC<{label:string, value:number, icon?:React.ReactNode, loading?: boolean}> = ({ label, value, icon, loading }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between text-sm opacity-85">
      <div className="flex items-center gap-2">{icon}<span>{label}</span></div>
      {loading ? (
        <div className="w-8 h-4 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse"></div>
      ) : (
        <div className="text-xs opacity-60">{value}%</div>
      )}
    </div>
    <div className="h-2 rounded-full bg-gradient-to-r from-slate-100 to-white dark:from-neutral-800 dark:to-neutral-900 overflow-hidden">
      {loading ? (
        <div className="h-full bg-gray-200 dark:bg-neutral-700 rounded-full animate-pulse"></div>
      ) : (
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: 'linear-gradient(90deg,#7c3aed,#06b6d4)' }} />
      )}
    </div>
  </div>
);

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dark = false // Theme is now handled by the top-right controls component
  const [collapsed, setCollapsed] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
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
  
  const { toast } = useToast()

  // Real engagement data (will be fetched from API)
  const engagement = useMemo(() => stats?.engagementMetrics?.currentWeek || [10, 12, 9, 14, 18, 20, 22, 21, 24, 28, 26, 30], [stats?.engagementMetrics?.currentWeek]);
  const prev = useMemo(() => stats?.engagementMetrics?.previousWeek || [8,9,7,11,12,15,16,15,18,20,19,22], [stats?.engagementMetrics?.previousWeek]);

  useEffect(() => {
    if (status === "loading") return
    if (!session) router.push("/auth/signin")
  }, [session, status, router])

  useEffect(() => {
    if (session) {
      fetchDashboardStats()
      fetchNotifications()
    }
  }, [session])

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

  const fetchDashboardStats = async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true)
      setError(null)
      
      const response = await fetch('/api/dashboard/stats')
      const data = await response.json()
      
      if (data.success) {
        console.log('Dashboard stats received:', data.data)
        setStats(data.data)
      } else {
        setError(data.error || 'Failed to fetch dashboard data')
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
      setError('Failed to connect to server. Please check your internet connection.')
    } finally {
      setIsLoading(false)
      if (showRefresh) setIsRefreshing(false)
    }
  }

  const fetchNotifications = async () => {
    try {
      // Mock notifications for now - in a real app, this would fetch from an API
      const mockNotifications: NotificationItem[] = [
        {
          id: '1',
          type: 'success',
          title: 'Post approved',
          message: 'Product launch teaser • 2m ago',
          timestamp: new Date(Date.now() - 2 * 60 * 1000),
          read: false
        },
        {
          id: '2',
          type: 'info',
          title: 'Scheduled',
          message: '6 posts for next week • 15m ago',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          read: false
        },
        {
          id: '3',
          type: 'warning',
          title: 'Account limit',
          message: 'You\'re approaching your monthly post limit • 1h ago',
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
          read: false
        }
      ]
      setNotifications(mockNotifications)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  const handleLogout = () => {
    // Logout is now handled by the top-right controls component
  }

  const handleRefresh = () => {
    fetchDashboardStats(true)
  }

  const handleSaveEdit = async (updatedContent: any) => {
    console.log('🔄 handleSaveEdit ENTRY - editingPost:', editingPost)
    console.log('🔄 handleSaveEdit ENTRY - updatedContent:', updatedContent)
    
    if (!editingPost) {
      console.log('❌ handleSaveEdit - No editingPost, returning early')
      return
    }

    console.log('🔄 handleSaveEdit called with:', {
      editingPost,
      updatedContent
    })

    try {
      const requestBody = {
        content: updatedContent.content,
        hashtags: updatedContent.hashtags,
        imageUrl: updatedContent.imageUrl,
        images: updatedContent.images || null
      }
      
      console.log('📤 Sending PUT request to:', `/api/posts/${editingPost.id}`)
      console.log('📤 Request body:', requestBody)

      const response = await fetch(`/api/posts/${editingPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      console.log('📥 Response status:', response.status)
      console.log('📥 Response ok:', response.ok)

      if (response.ok) {
        const responseData = await response.json()
        console.log('📥 Response data:', responseData)
        
        setNotification({
          type: 'success',
          message: 'Post updated successfully!'
        })
        
        // Refresh the dashboard data
        await fetchDashboardStats()
        
        setShowEditModal(false)
        setEditingPost(null)
      } else {
        const errorData = await response.text()
        console.error('❌ Response not ok. Status:', response.status, 'Error:', errorData)
        
        setNotification({
          type: 'error',
          message: `Failed to update post: ${response.status} ${response.statusText}`
        })
      }
    } catch (error) {
      console.error('❌ Exception in handleSaveEdit:', error)
      setNotification({
        type: 'error',
        message: `Failed to update post: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  const convertPostToGeneratedContent = (post: any) => {
    console.log('🔄 convertPostToGeneratedContent - Input post:', post)
    
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
    
    console.log('🔄 convertPostToGeneratedContent - Result:', result)
    
    return result
  }

  // Calendar utility functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    return { daysInMonth, startingDayOfWeek }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setDate(prev.getDate() - 7)
      } else {
        newDate.setDate(prev.getDate() + 7)
      }
      return newDate
    })
  }

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setDate(prev.getDate() - 1)
      } else {
        newDate.setDate(prev.getDate() + 1)
      }
      return newDate
    })
  }

  // Fetch posts (scheduled and published) when month changes
  useEffect(() => {
    if (currentDate) {
      fetchPosts(currentDate.getMonth() + 1, currentDate.getFullYear())
    }
  }, [currentDate])

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const getWeekRange = (date: Date) => {
    // Calculate week start (Monday) based on current date
    const start = new Date(date)
    const currentDayOfWeek = date.getDay()
    const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1
    start.setDate(date.getDate() - daysFromMonday)
    
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    
    // Format: "Aug 25 - 31, 2025" or "Aug 25 - Sep 1, 2025" for cross-month weeks
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
    const startDay = start.getDate()
    const endDay = end.getDate()
    const year = end.getFullYear()
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
    }
  }

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getAllPostsForDate = (date: Date) => {
    // Use local date instead of UTC to avoid timezone shift issues
    const dateString = date.toLocaleDateString('en-CA') // en-CA format: YYYY-MM-DD
    return allPosts[dateString] || []
  }

  // Generate AI suggested times based on platform and day
  const generateAISuggestedTimes = (platform: string, dayOfWeek: number) => {
    const baseTimes = {
      TWITTER: ['09:00', '12:00', '17:00', '19:00'],
      LINKEDIN: ['08:00', '12:00', '17:00'],
      INSTAGRAM: ['11:00', '13:00', '19:00', '21:00'],
      YOUTUBE: ['15:00', '18:00', '20:00'],
      FACEBOOK: ['09:00', '13:00', '18:00', '20:00']
    }
    
    const platformTimes = baseTimes[platform as keyof typeof baseTimes] || baseTimes.TWITTER
    
    // Adjust times based on day of week
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
      return platformTimes.map(time => {
        const [hour, minute] = time.split(':')
        const adjustedHour = Math.max(10, Math.min(22, parseInt(hour) + 1))
        return `${adjustedHour.toString().padStart(2, '0')}:${minute}`
      })
    }
    
    return platformTimes
  }

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, post: any) => {
    // Prevent dragging published posts
    if (post.status === 'PUBLISHED' || post.status === 'published') {
      e.preventDefault()
      toast({
        title: "Cannot Move Published Posts",
        description: "Published posts cannot be rescheduled or moved. They are already live on social media.",
        variant: "destructive",
      })
      return
    }
    
    setDraggedPost(post)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', post.id)
  }

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const dateString = date.toLocaleDateString('en-CA')
    setDragOverDate(dateString)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverDate(null)
  }

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
    const dayOfWeek = targetDate.getDay()
    const suggestedTimes = generateAISuggestedTimes(draggedPost.platform, dayOfWeek)
    setAiSuggestedTimes(suggestedTimes)
    
    // Extract original time
    let originalTime = ''
    if (draggedPost.status === 'PUBLISHED' || draggedPost.status === 'published') {
      if (draggedPost.publishedAt) {
        originalTime = new Date(draggedPost.publishedAt).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      }
    } else if (draggedPost.scheduledAt) {
      originalTime = new Date(draggedPost.scheduledAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    }
    setOriginalTime(originalTime)
    
    // Set up for rescheduling
    setDropTargetDate(targetDateString)
    setReschedulingPost(draggedPost)
    setShowScheduleModal(true)
    
    // Clear drag states
    setDraggedPost(null)
    setDragOverDate(null)
  }

  // Hover handlers
  const handlePostHover = (e: React.MouseEvent, post: any) => {
    setHoveredPost(post)
    setHoverPosition({ x: e.clientX, y: e.clientY })
  }

  const handlePostLeave = () => {
    setHoveredPost(null)
  }

  // Hover Overlay Component
  const HoverOverlay = () => {
    if (!hoveredPost) return null

    return createPortal(
      <div
        className="fixed z-[1000] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl shadow-2xl p-4 max-w-xs pointer-events-none"
        style={{
          left: hoverPosition.x + 10,
          top: hoverPosition.y - 10,
          transform: 'translateY(-100%)'
        }}
      >
        <div className="space-y-3">
          {/* Header with Platform and Status */}
          <div className="flex items-center gap-2">
            {hoveredPost.platform && getPlatformIcon(hoveredPost.platform)}
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {hoveredPost.platform}
            </span>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              hoveredPost.status === 'PUBLISHED' || hoveredPost.status === 'published'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
            }`}>
              {hoveredPost.status}
            </div>
          </div>
          
          {/* Account Name */}
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {hoveredPost.accountName || 'Account'}
          </div>
          
          {/* Image Section */}
          {hoveredPost.imageUrl && (
            <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-neutral-600 border border-gray-200 dark:border-neutral-500">
              <img 
                src={hoveredPost.imageUrl} 
                alt="Post" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              {/* Fallback icon when image fails to load */}
              <div className="hidden w-full h-full flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  {getPlatformIcon(hoveredPost.platform)}
                </div>
              </div>
            </div>
          )}
          
          {/* Content */}
          <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3 leading-relaxed">
            {hoveredPost.content}
          </p>
          
          {/* Time and Status */}
          <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
            {hoveredPost.status === 'PUBLISHED' || hoveredPost.status === 'published' 
              ? `Published at ${hoveredPost.time || 'TBD'}`
              : `Scheduled for ${hoveredPost.time || 'TBD'}`
            }
          </div>
        </div>
      </div>,
      document.body
    )
  }

  const fetchPosts = async (month: number, year: number) => {
    try {
      const response = await fetch(`/api/dashboard/posts?month=${month}&year=${year}`)
      const data = await response.json()
      
      if (data.success) {
        setAllPosts(data.data.allPosts || {})
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
      setAllPosts({})
    }
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    const posts = getAllPostsForDate(date)
    // Don't update allPosts here - it should remain as the full month data
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center mb-4 mx-auto animate-bounce-gentle">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const getPlatformIcon = (platform: string) => {
    const iconSize = "h-4 w-4"
    switch (platform) {
      case 'TWITTER': 
        return <img src="/x.png" alt="X (Twitter)" className={iconSize} />
      case 'LINKEDIN': 
        return <img src="/linkdin.png" alt="LinkedIn" className={iconSize} />
      case 'INSTAGRAM': 
        return <img src="/insta.png" alt="Instagram" className={iconSize} />
      case 'YOUTUBE': 
        return <img src="/youtube.png" alt="YouTube" className={iconSize} />
      case 'FACEBOOK': 
        return <img src="/facebook.png" alt="Facebook" className={iconSize} />
      case 'TIKTOK': 
        return <img src="/tiktok.png" alt="TikTok" className={iconSize} />
      case 'WHATSAPP': 
        return <img src="/whatsapp.png" alt="WhatsApp" className={iconSize} />
      case 'TELEGRAM': 
        return <img src="/telegram.png" alt="Telegram" className={iconSize} />
      case 'THREADS': 
        return <img src="/threads.png" alt="Threads" className={iconSize} />
      default: 
        return <img src="/globe.svg" alt="Platform" className={iconSize} />
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'TWITTER': return 'text-blue-500'
      case 'LINKEDIN': return 'text-blue-700'
      case 'INSTAGRAM': return 'text-pink-500'
      case 'YOUTUBE': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const unreadNotificationsCount = notifications.filter(n => !n.read).length

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
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl border animate-slide-up max-w-md ${
          notification.type === 'success'
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

      {/* Sidebar */}
      <Sidebar 
        collapsed={collapsed}
        onToggleCollapse={setCollapsed}
        showPlanInfo={true}
      />

      <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 ${collapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
        {/* Main area */}
        <main className="space-y-3">
          {/* KPI Row */}
          <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
  <h2 className="text-xl font-semibold tracking-tight mb-1">
    Dashboard Overview
  </h2>
  <p className="text-sm text-neutral-600 dark:text-neutral-400">
    Overview of your social media performance
  </p>
</div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-md bg-white/60 dark:bg-neutral-800/60 border border-black/10 dark:border-white/10 hover:bg-white/80 dark:hover:bg-neutral-700/80 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <TopRightControls unreadNotificationsCount={unreadNotificationsCount} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              loading={isLoading}
            />
          </div>

          {/* Engagement and Notifications Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Engagement card - Takes 2 columns on lg screens and above */}
            <section className="lg:col-span-2 rounded-3xl p-5 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold">Engagement</div>
                <div className="text-xs opacity-60">Current week vs previous</div>
              </div>
              <div className="flex items-center gap-3 text-sm opacity-70">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-600 block"/> This week</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-400 block"/> Previous</div>
              </div>
          </div>

            <LineChart series={engagement} series2={prev} loading={isLoading} />

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm opacity-70">
              {isLoading ? (
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

            {/* Notifications card - Takes 1 column on lg screens and above */}
            <div className="rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">Notifications</div>
                <button 
                  onClick={() => router.push('/posts')}
                  className="text-xs px-2 py-1 rounded-md bg-white/60 dark:bg-neutral-800/60 border border-black/10 dark:border-white/10 hover:bg-white/80 dark:hover:bg-neutral-700/80 transition-colors"
                >
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {notifications.slice(0, 3).map((notification) => (
                  <div key={notification.id} className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      notification.type === 'success' ? 'bg-green-50 dark:bg-green-900/20' :
                      notification.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                      notification.type === 'error' ? 'bg-red-50 dark:bg-red-900/20' :
                      'bg-indigo-50 dark:bg-indigo-900/20'
                    }`}>
                      {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-600"/> :
                       notification.type === 'warning' ? <AlertCircle className="w-5 h-5 text-yellow-600"/> :
                       notification.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-600"/> :
                       <CheckCircle2 className="w-5 h-5 text-indigo-600"/>}
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-xs opacity-60">{notification.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Content, Recent Posts, and Platform Overview - 3 Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* AI Content Ideas */}
            <div className="rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg min-h-[300px]">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">AI Content Ideas</div>
                <button 
                  onClick={() => router.push('/create')}
                  className="text-xs px-2 py-1 rounded-md bg-white/60 dark:bg-neutral-800/60 border border-black/10 dark:border-white/10 hover:bg-white/80 dark:hover:bg-neutral-700/80 transition-colors"
                >
                  Generate
                </button>
              </div>

              <div className="grid gap-3">
                {['Reel hook: 3 quick tips','Thread: How we scaled to 10k followers','Before/After: Customer success'].map((t,i)=> (
                  <div key={i} className="p-3 rounded-2xl border border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-900/30 flex items-center justify-between">
                    <div className="text-sm">{t}</div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => router.push('/create')}
                        className="px-2 py-1 rounded-md bg-black text-white text-xs hover:bg-gray-800 transition-colors"
                      >
                        Draft
                      </button>
                      <button 
                        onClick={() => router.push('/posts')}
                        className="px-2 py-1 rounded-md bg-white/60 dark:bg-neutral-800/60 border border-black/10 dark:border-white/10 text-xs hover:bg-white/80 dark:hover:bg-neutral-700/80 transition-colors"
                      >
                        Schedule
                      </button>
                    </div>
                  </div>
                ))}
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
                {isLoading ? (
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
                                    <path d="M8 5v14l11-7z"/>
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
                {Object.entries(stats?.platformBreakdown || {})
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
                          <div className="text-xs opacity-60">{count} posts</div>
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
                {text: 'Generate Post', action: () => router.push('/create')},
                {text: 'Import CSV', action: () => router.push('/posts')},
                {text: 'Bulk Schedule', action: () => router.push('/posts')},
                {text: 'Brand Kit', action: () => router.push('/settings')},
                {text: 'UTM Builder', action: () => router.push('/settings')},
                {text: 'Invite Team', action: () => router.push('/settings')}
              ].map((item,i)=> (
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
          <div className="rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold">Publishing Calendar</div>
              <div className="flex items-center gap-4">
                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                      <button
                      onClick={() => {
                        setCalendarViewMode('month')
                        // Adjust to first day of current month when switching to month view
                        const firstDayOfMonth = new Date()
                        firstDayOfMonth.setDate(1)
                        setCurrentDate(firstDayOfMonth)
                      }}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        calendarViewMode === 'month' 
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                    >
                      Month
                    </button>
                                      <button
                      onClick={() => {
                        setCalendarViewMode('week')
                        // Adjust to Monday of current week when switching to week view
                        const currentDayOfWeek = currentDate.getDay()
                        const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1
                        const mondayOfCurrentWeek = new Date(currentDate)
                        mondayOfCurrentWeek.setDate(currentDate.getDate() - daysFromMonday)
                        setCurrentDate(mondayOfCurrentWeek)
                      }}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        calendarViewMode === 'week' 
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                    >
                      Week
                    </button>
                                      <button
                      onClick={() => {
                        setCalendarViewMode('day')
                        // Adjust to current day when switching to day view
                        setCurrentDate(new Date())
                      }}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        calendarViewMode === 'day' 
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                    >
                      Day
                    </button>
                </div>
                
                {/* Navigation */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (calendarViewMode === 'month') navigateMonth('prev')
                      else if (calendarViewMode === 'week') navigateWeek('prev')
                      else navigateDay('prev')
                    }}
                    className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/6 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium min-w-[120px] text-center">
                    {calendarViewMode === 'month' && formatMonthYear(currentDate)}
                    {calendarViewMode === 'week' && getWeekRange(currentDate)}
                    {calendarViewMode === 'day' && getDayName(currentDate)}
                  </span>
                  <button
                    onClick={() => {
                      if (calendarViewMode === 'month') navigateMonth('next')
                      else if (calendarViewMode === 'week') navigateWeek('next')
                      else navigateDay('next')
                    }}
                    className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/6 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

  {/* Calendar Grid */}
  {calendarViewMode === 'month' && (
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-xs font-medium text-center py-2 opacity-60">
                    {day}
                  </div>
                ))}
                
                {(() => {
                  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate)
                  const days = []
                  
                  // Add empty cells for days before the first day of the month
                  for (let i = 0; i < startingDayOfWeek; i++) {
                    days.push(<div key={`empty-${i}`} className="aspect-square" />)
                  }
                  
                  // Add days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                    const posts = getAllPostsForDate(date)
                    const hasPosts = posts.length > 0
                    const isToday = date.toDateString() === new Date().toDateString()
                    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()
                    const dateString = date.toLocaleDateString('en-CA')
                    const isDragOver = dragOverDate === dateString
                    
                    days.push(
                      <div
                        key={day}
                        className={`min-h-[100px] p-2 rounded-xl flex flex-col transition-all shadow-sm ${
                          isSelected 
                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 shadow-md' 
                            : isDragOver
                              ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-600 shadow-lg'
                              : hasPosts 
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 shadow-md' 
                                : isToday 
                                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-md' 
                                  : 'bg-white/80 dark:bg-neutral-800/60 hover:bg-white/90 dark:hover:bg-neutral-700/70 shadow-sm'
                        }`}
                        onClick={() => handleDateClick(date)}
                        onDragOver={(e) => handleDragOver(e, date)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, date)}
                      >
                        <span className="font-medium text-sm mb-1">{day}</span>
                        {hasPosts && (
                          <div className="space-y-1 flex-1">
                            {posts.slice(0, 2).map((post: any, idx: number) => (
                              <div
                                key={idx}
                                draggable={post.status !== 'PUBLISHED' && post.status !== 'published'}
                                onDragStart={(e) => handleDragStart(e, post)}
                                onMouseEnter={(e) => {
                                  setTimeout(() => handlePostHover(e, post), 150)
                                }}
                                onMouseLeave={() => {
                                  setTimeout(() => handlePostLeave(), 100)
                                }}
                                className="bg-white/60 dark:bg-neutral-700/60 rounded-lg p-2 border border-white/20 dark:border-neutral-600/20 cursor-pointer hover:bg-white/80 dark:hover:bg-neutral-700/80 transition-colors shadow-sm relative group"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Open Advanced Edit modal in view-only mode (and keep date selected)
                                try { setEditingPost(post); setShowEditModal(true); } catch {}
                                handleDateClick(date)
                              }}
                              >
                                <div className="flex items-center gap-2 mb-1.5">
                                  {/* Platform Icon */}
                                  {post.platform && (
                                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                                      {getPlatformIcon(post.platform)}
                                    </div>
  )}
                                  {/* Account Name */}
                                  <div className="text-xs font-medium truncate min-w-0 flex-1">
                                    {post.accountName || post.platform || 'Post'}
                                  </div>
                                </div>
                                
                                {/* Media Preview (supports multiple images/videos) */}
                                {(() => {
                                  const media: any[] = [];
                                  if (Array.isArray(post.media)) media.push(...post.media);
                                  if (Array.isArray((post as any).mediaItems)) media.push(...(post as any).mediaItems);
                                  if (Array.isArray(post.imageUrls)) media.push(...post.imageUrls.map((u: string) => ({ type: 'image', url: u })));
                                  if (Array.isArray(post.videoUrls)) media.push(...post.videoUrls.map((u: string) => ({ type: 'video', url: u })));
                                  if (post.imageUrl) media.push({ type: 'image', url: post.imageUrl });
                                  if (post.videoUrl) media.push({ type: 'video', url: post.videoUrl });
                                  return media.length > 0 ? (
                                    <PostMediaPreview media={media as any} height={60} rounded="rounded-md" onOpen={() => { try { setEditingPost(post); setShowEditModal(true); } catch {} }} />
                                  ) : null;
                                })()}
                                
                                {/* Time */}
                                <div className="text-xs opacity-70 text-center">
                                  {post.time || 'Scheduled'}
                                </div>
                              </div>
                            ))}
                            {posts.length > 2 && (
                              <div className="text-xs opacity-60 text-center py-1">
                                +{posts.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }
                  
                  return days
                })()}
              </div>
            )}

  {/* Week View */}
  {calendarViewMode === 'week' && (
              <div className="grid grid-cols-7 gap-1 mb-4">
                {(() => {
                  const weekStart = new Date(currentDate)
                  weekStart.setDate(currentDate.getDate() - currentDate.getDay())
                  
                  const weekDays = []
                  for (let i = 0; i < 7; i++) {
                    const dayDate = new Date(weekStart)
                    dayDate.setDate(weekStart.getDate() + i)
                    const posts = getAllPostsForDate(dayDate)
                    const isToday = dayDate.toDateString() === new Date().toDateString()
                    const isSelected = selectedDate && dayDate.toDateString() === selectedDate.toDateString()
                    const dateString = dayDate.toLocaleDateString('en-CA')
                    const isDragOver = dragOverDate === dateString
                    
                    weekDays.push(
                      <div
                        key={i}
                        className={`min-h-[120px] p-2 rounded-xl flex flex-col transition-all shadow-sm ${
                          isSelected 
                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 shadow-md' 
                            : isDragOver
                              ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-600 shadow-lg'
                              : isToday 
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-md' 
                                : 'bg-white/80 dark:bg-neutral-800/60 hover:bg-white/90 dark:hover:bg-neutral-700/70 shadow-sm'
                        }`}
                        onClick={() => handleDateClick(dayDate)}
                        onDragOver={(e) => handleDragOver(e, dayDate)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, dayDate)}
                      >
                        <div className="text-xs font-medium mb-1 text-center">
                          {dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="space-y-1 flex-1">
                          {posts.map((post: any, idx: number) => (
                            <div
                              key={idx}
                              draggable={post.status !== 'PUBLISHED' && post.status !== 'published'}
                              onDragStart={(e) => handleDragStart(e, post)}
                              onMouseEnter={(e) => {
                                setTimeout(() => handlePostHover(e, post), 150)
                              }}
                              onMouseLeave={() => {
                                setTimeout(() => handlePostLeave(), 100)
                              }}
                              className="bg-white/60 dark:bg-neutral-700/60 rounded-lg p-2 border border-white/20 dark:border-neutral-600/20 cursor-pointer hover:bg-white/80 dark:hover:bg-neutral-700/80 transition-colors shadow-sm relative group"
                              onClick={(e) => {
                                e.stopPropagation()
                                try { setEditingPost(post); setShowEditModal(true); } catch {}
                                handleDateClick(dayDate)
                              }}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                {/* Platform Icon */}
                                {post.platform && (
                                  <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                                    {getPlatformIcon(post.platform)}
                                  </div>
  )}
                                {/* Account Name */}
                                <div className="text-xs font-medium truncate min-w-0 flex-1">
                                  {post.accountName || post.platform || 'Post'}
                                </div>
                              </div>
                              
                              {/* Media Preview (supports multiple images/videos) */}
                              {(() => {
                                const media: any[] = [];
                                if (Array.isArray(post.media)) media.push(...post.media);
                                if (Array.isArray((post as any).mediaItems)) media.push(...(post as any).mediaItems);
                                if (Array.isArray(post.imageUrls)) media.push(...post.imageUrls.map((u: string) => ({ type: 'image', url: u })));
                                if (Array.isArray(post.videoUrls)) media.push(...post.videoUrls.map((u: string) => ({ type: 'video', url: u })));
                                if (post.imageUrl) media.push({ type: 'image', url: post.imageUrl });
                                if (post.videoUrl) media.push({ type: 'video', url: post.videoUrl });
                                return media.length > 0 ? (
                                  <PostMediaPreview media={media as any} height={60} rounded="rounded-md" onOpen={() => { try { setEditingPost(post); setShowEditModal(true); } catch {} }} />
                                ) : null;
                              })()}
                              
                              {/* Time */}
                              <div className="text-xs opacity-70 text-center">
                                {post.time || 'Scheduled'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }
                  
                  return weekDays
                })()}
              </div>
            )}

            {/* Day View */}
            {calendarViewMode === 'day' && (
              <div className="mb-4">
                <div className="text-center py-4">
                  <h3 className="text-lg font-medium">
                    {currentDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h3>
                </div>
                
                {(() => {
                  const posts = getAllPostsForDate(currentDate)
                  
                  if (posts.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No posts scheduled for this day
                      </div>
                    )
                  }
                  
                  return (
                    <div className="space-y-4">
                      {posts.map((post: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-600 shadow-lg p-4"
                          draggable
                          onDragStart={(e) => handleDragStart(e, post)}
                          onMouseEnter={(e) => {
                            setTimeout(() => handlePostHover(e, post), 150)
                          }}
                          onMouseLeave={() => {
                            setTimeout(() => handlePostLeave(), 100)
                          }}
                        >
                          {/* Header Section */}
                          <div className="flex items-start justify-between mb-4 ml-35">
                            <div className="flex items-center gap-3">
                              {/* Platform Icon */}
                              {post.platform && (
                                <div className="w-8 h-8 bg-gray-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center">
                                  {getPlatformIcon(post.platform)}
                                </div>
                              )}
                              {/* Account Info */}
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {post.accountName || 'Account'}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {post.time || 'Scheduled'} • {post.platform}
                                </span>
                              </div>
                            </div>
                            
                            {/* Status Badge */}
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              post.status === 'PUBLISHED' || post.status === 'published'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}>
                              {post.status === 'PUBLISHED' || post.status === 'published' ? 'PUBLISHED' : 'SCHEDULED'}
                            </div>
                          </div>
                          
                          {/* Content Section */}
                          <div className="flex gap-4 -mt-13 mb-8">
                            {/* Media Preview - Always show */}
                            <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-500 flex-shrink-0">
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
                                    <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                                      <svg className="w-4 h-4 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z"/>
                                      </svg>
                                    </div>
                                  </div>
                                  {/* Fallback when video fails */}
                                  <div className="hidden w-full h-full flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                      {getPlatformIcon(post.platform)}
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
                              ) : null}

                              {/* Platform placeholder when no media or media fails */}
                              {(!post.imageUrl && !post.videoUrl) && (
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    {getPlatformIcon(post.platform)}
                                  </div>
                                </div>
                              )}

                              {/* Fallback icon when image fails to load */}
                              {post.imageUrl && !post.videoUrl && (
                                <div className="hidden w-full h-full flex items-center justify-center">
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    {getPlatformIcon(post.platform)}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Text Content */}
                            <div className="flex-1 min-w-0 mt-10 ml-10">
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {post.content}
                              </p>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="-mt-9 flex gap-2 ml-35">
                          
                            {post.status !== 'PUBLISHED' && post.status !== 'published' ? (
                              <>
                                <button 
                                  onClick={() => {
                                    setEditingPost(post)
                                    setShowEditModal(true)
                                  }}
                                  className="px-3 py-1 rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs hover:bg-rose-700 transition-colors"
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={() => {
                                    setReschedulingPost(post)
                                    setShowScheduleModal(true)
                                  }}
                                  className="px-3 py-1 rounded-lg bg-white/60 dark:bg-neutral-800/60 border border-black/10 dark:border-white/10 text-xs hover:bg-white/80 dark:hover:bg-neutral-700/80 transition-colors"
                                >
                                  Reschedule
 </button>
    </>
  ) : null}
</div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Selected Date Details (hide in Day view to avoid duplicates) */}
            {calendarViewMode !== 'day' && selectedDate && (() => {
              const posts = getAllPostsForDate(selectedDate)
              return posts.length > 0 ? (
                <div className="border-t border-black/5 dark:border-white/6 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">
                      Scheduled Posts for {selectedDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h4>
                    <button
                      onClick={() => setSelectedDate(null)}
                      className="text-xs opacity-60 hover:opacity-100 transition"
                    >
                      ✕
                    </button>
                  </div>
                  <SelectedPostsList
                    posts={posts}
                    getPlatformIcon={getPlatformIcon}
                    onOpen={(post) => { try { setEditingPost(post); setShowEditModal(true); } catch {} }}
                  />
                  <div className="space-y-2 hidden">
                    {posts.map((post: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-white/40 dark:bg-neutral-800/30 border border-black/5 dark:border-white/6 shadow-sm cursor-pointer hover:bg-white/60 dark:hover:bg-neutral-800/50 transition-colors"
                        draggable
                        onDragStart={(e) => handleDragStart(e, post)}
                        onMouseEnter={(e) => {
                          setTimeout(() => handlePostHover(e, post), 150)
                        }}
                        onMouseLeave={() => {
                          setTimeout(() => handlePostLeave(), 100)
                        }}
                        onClick={() => { try { setEditingPost(post); setShowEditModal(true); } catch {} }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {/* Platform Icon */}
                          {post.platform && (
                            <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                              {getPlatformIcon(post.platform)}
                            </div>
                          )}
                          {/* Account Name */}
                          <div className="text-sm font-medium">{post.accountName || 'Account'}</div>
                        </div>
                        
                        {/* Media Preview (images/videos, compact grid) */}
                        {(() => {
                          const media: any[] = [];
                          if (Array.isArray(post.media)) media.push(...post.media);
                          if (Array.isArray((post as any).mediaItems)) media.push(...(post as any).mediaItems);
                          if (Array.isArray(post.imageUrls)) media.push(...post.imageUrls.map((u: string) => ({ type: 'image', url: u })));
                          if (Array.isArray(post.videoUrls)) media.push(...post.videoUrls.map((u: string) => ({ type: 'video', url: u })));
                          if (post.imageUrl) media.push({ type: 'image', url: post.imageUrl });
                          if (post.videoUrl) media.push({ type: 'video', url: post.videoUrl });
                          return media.length > 0 ? (
                            <PostMediaPreview media={media as any} height={96} onOpen={() => { try { setEditingPost(post); setShowEditModal(true); } catch {} }} />
                          ) : null;
                        })()}
                        
                        <p className="text-sm opacity-80 line-clamp-2">{post.content}</p>
                        <div className="mt-2 flex gap-2">
                          {post.status !== 'PUBLISHED' && post.status !== 'published' ? (
                            <>
                              <button 
                                onClick={() => {
                                  // Open Advanced Edit Modal for this specific post
                                  setEditingPost(post)
                                  setShowEditModal(true)
                                }}
                                className="px-2 py-1 rounded-md bg-indigo-600 text-white text-xs hover:bg-indigo-700 transition-colors"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => {
                                  // Open Schedule Modal for this specific post
                                  setReschedulingPost(post)
                                  setShowScheduleModal(true)
                                }}
                                className="px-2 py-1 rounded-md bg-white/60 dark:bg-neutral-800/60 border border-black/10 dark:border-white/10 text-xs hover:bg-white/80 dark:hover:bg-neutral-700/80 transition-colors"
                              >
                                Reschedule
                              </button>
                            </>
                          ) : (
                            <div className="px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
                              ✓ Published
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            })()}
          </div>

          {/* Advanced Edit Modal */}
          {showEditModal && editingPost && (
            <AdvancedEditModal
              isOpen={showEditModal}
              onClose={() => {
                setShowEditModal(false)
                setEditingPost(null)
              }}
              content={convertPostToGeneratedContent(editingPost)}
              postId={editingPost.id}
              onSave={handleSaveEdit}
              onRegenerateContent={async () => {}} // Not needed for editing existing posts
              onRegenerateImage={async () => {}} // Not needed for editing existing posts
            />
          )}

          {/* Schedule Modal */}
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
              postId={reschedulingPost.id}
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
                    // Refresh scheduled posts
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
        </main>
      </div>
      
      {/* Hover Overlay */}
      <HoverOverlay />
      
      {/* Toast Notifications */}
      <Toaster />
    </div>
  )
}
import PostMediaPreview from "@/components/content/post-media-preview";
import SelectedPostsList from "@/components/dashboard/SelectedPostsList";
