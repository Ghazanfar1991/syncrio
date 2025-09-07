"use client"

import { useState, useEffect, useRef } from 'react'
import React from 'react';
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Plus, Clock, CheckCircle, XCircle, AlertTriangle, Calendar, FileText, Settings, RefreshCw, Filter } from 'lucide-react'
import { TopRightControls } from '@/components/layout/top-right-controls'
import { Sidebar } from '@/components/layout/sidebar'
import Link from 'next/link'
import { AdvancedEditModal } from '@/components/content/advanced-edit-modal'
import { ScheduleModal } from '@/components/content/schedule-modal'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import PostMediaPreview from "@/components/content/post-media-preview";
import SelectedPostsList from "@/components/dashboard/SelectedPostsList";

interface CalendarPost {
  id: string
  title: string
  content: string
  scheduledAt: string // API returns string, we'll convert to Date
  status: string
  platforms: string[]
  imageUrl?: string
  videoUrl?: string
  platform: string
  accountName?: string
  time: string
}

interface PostPreview {
  id: string
  content: string
  platform: string
  scheduledAt: string
  status: string
  time: string
  imageUrl?: string
  platforms: string[]
  publications: Array<{
    platform: string
    status: string
    accountName: string
  }>
}

type ViewMode = 'month' | 'week' | 'day'

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarData, setCalendarData] = useState<{ [date: string]: CalendarPost[] }>({})
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [loading, setLoading] = useState(true)
  const postDetailsRef = useRef<HTMLDivElement>(null)
  const [editingPost, setEditingPost] = useState<CalendarPost | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [schedulingPost, setSchedulingPost] = useState<CalendarPost | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  const [draggedPost, setDraggedPost] = useState<CalendarPost | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [hoveredPost, setHoveredPost] = useState<CalendarPost | null>(null)
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null)
  const [originalTime, setOriginalTime] = useState<string>('')
  const [aiSuggestedTimes, setAiSuggestedTimes] = useState<string[]>([])
  const [isScheduling, setIsScheduling] = useState(false)
  const { toast } = useToast()
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
  if (typeof window === "undefined") return false;
  try {
    return JSON.parse(localStorage.getItem("sidebar:collapsed") ?? "false");
  } catch {
    return false;
  }
});

React.useEffect(() => {
  localStorage.setItem("sidebar:collapsed", JSON.stringify(collapsed));
}, [collapsed]);

  useEffect(() => {
    if (session) {
      console.log(`Calendar effect triggered - viewMode: ${viewMode}, currentDate: ${currentDate.toISOString()}`)
      fetchCalendarData()
    }
  }, [session, currentDate, viewMode])

  if (status === 'loading') {
    return (
      <div className="min-h-screen font-sans bg-gradient-to-br from-white to-slate-50 dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-colors">
   
        <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 ${collapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-2xl flex items-center justify-center mb-6 mx-auto animate-pulse shadow-xl">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <div className="w-12 h-12 border-3 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg opacity-60 font-medium">Loading calendar...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    redirect('/auth/signin')
  }

  // Helper function to get posts for a specific date (same as dashboard)
  const getAllPostsForDate = (date: Date) => {
    // Use local date instead of UTC to avoid timezone shift issues
    const dateString = date.toLocaleDateString('en-CA') // en-CA format: YYYY-MM-DD
    return calendarData[dateString] || []
  }

  const fetchCalendarData = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)

      // Use the same approach as dashboard - fetch posts for the month
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1

      console.log(`Fetching calendar data for: ${year}-${month}`)

      const response = await fetch(`/api/dashboard/posts?month=${month}&year=${year}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      const result = await response.json()

      if (result.success) {
        const data = result.data.allPosts || {}
        console.log('Calendar data fetched successfully:', Object.keys(data))
        setCalendarData(data)
      } else {
        console.error('Calendar API error:', result.error)
        setCalendarData({})
      }
    } catch (error) {
      console.error('Failed to fetch calendar data:', error)
      setCalendarData({})
    } finally {
      setLoading(false)
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setDate(currentDate.getDate() - 7)
    } else {
      newDate.setDate(currentDate.getDate() + 7)
    }
    setCurrentDate(newDate)
  }

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setDate(currentDate.getDate() - 1)
    } else {
      newDate.setDate(currentDate.getDate() + 1)
    }
    setCurrentDate(newDate)
  }

  const getMonthName = (date: Date) => {
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
    
    // Format: "Dec 16 - Dec 22, 2024" or "Dec 16 - Jan 5, 2025" for cross-month weeks
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'SCHEDULED':
        return <Clock className="w-4 h-4 text-blue-500" />
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'FAILED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'TWITTER':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'LINKEDIN':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
      case 'INSTAGRAM':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
      case 'YOUTUBE':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
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

  const refreshCalendar = () => {
    fetchCalendarData()
  }

  const handleEditPost = (post: CalendarPost) => {
    setEditingPost(post)
    setShowEditModal(true)
  }

  const handleReschedulePost = (post: CalendarPost) => {
    setSchedulingPost(post)
    setShowScheduleModal(true)
  }

  const handleSaveEdit = async (updatedContent: any) => {
    if (!editingPost) return

    try {
      const response = await fetch(`/api/posts/${editingPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: updatedContent.content,
          hashtags: updatedContent.hashtags,
          imageUrl: updatedContent.imageUrl,
          images: updatedContent.images || null
        })
      })

      if (response.ok) {
        // Refresh calendar data to show updated post
        fetchCalendarData()
        setShowEditModal(false)
        setEditingPost(null)
      } else {
        console.error('Failed to update post')
      }
    } catch (error) {
      console.error('Failed to update post:', error)
    }
  }

  const convertCalendarPostToGeneratedContent = (post: CalendarPost) => {
    return {
      platform: post.platform,
      content: post.content,
      hashtags: [], // Calendar posts don't have hashtags in current structure
      imageUrl: post.imageUrl || '',
      images: post.imageUrl ? [post.imageUrl] : [],
      videoUrl: post.videoUrl || '',
      videos: post.videoUrl ? [post.videoUrl] : []
    }
  }

  const handleScheduleSubmit = async (scheduledAt: string) => {
    if (!schedulingPost) return

    setIsScheduling(true)
    
    try {
      let finalScheduledAt = scheduledAt
      
      // If this is a reschedule from drag & drop, use the target date
      if (dropTargetDate) {
        // The scheduledAt from modal is in format "YYYY-MM-DDTHH:MM:SS"
        // We need to extract the time and combine it with the target date
        const timePart = scheduledAt.split('T')[1] || '00:00:00'
        
        // Create the date in local timezone to avoid timezone offset issues
        const [year, month, day] = dropTargetDate.split('-').map(Number)
        const [hours, minutes, seconds] = timePart.split(':').map(Number)
        
        // Create date in local timezone
        const targetDateTime = new Date(year, month - 1, day, hours, minutes, seconds || 0)
        
        // Convert to UTC ISO string
        finalScheduledAt = targetDateTime.toISOString()
        
        console.log(`Rescheduling: ${dropTargetDate} ${timePart} -> ${finalScheduledAt}`)
      }

      const response = await fetch(`/api/posts/${schedulingPost.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: finalScheduledAt })
      })

      if (response.ok) {
        // Immediately refresh calendar data to show updated schedule
        try {
        await fetchCalendarData()
          console.log('Calendar data refreshed immediately after reschedule')
        } catch (error) {
          console.error('Failed to refresh calendar data immediately:', error)
        }
        
        // Clear drag & drop state if this was a reschedule
        if (dropTargetDate) {
          setDropTargetDate(null)
          setDraggedPost(null)
          setOriginalTime('')
          setAiSuggestedTimes([])
        }
        
        // Close modal and clear scheduling state
        setShowScheduleModal(false)
        setSchedulingPost(null)
        
        // Force another refresh calendar data to ensure UI is fully updated
        // Use a longer delay to ensure the modal is fully closed
        setTimeout(async () => {
          try {
            await fetchCalendarData()
            console.log('Calendar data refreshed after modal close')
          } catch (error) {
            console.error('Failed to refresh calendar data after modal close:', error)
          }
        }, 300)
        
        // Show success toast AFTER modal is closed
        setTimeout(() => {
          if (dropTargetDate) {
            // This was a reschedule
            const timeString = scheduledAt.split('T')[1]?.substring(0, 5) || '00:00'
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
            // This was a new schedule
            toast({
              title: "Post Scheduled Successfully!",
              description: `Post scheduled for ${new Date(scheduledAt).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })} at ${scheduledAt.split('T')[1]?.substring(0, 5) || '00:00'}`,
              variant: "success",
            })
          }
        }, 100)
        
      } else {
        const errorData = await response.json()
        toast({
          title: "Failed to Schedule Post",
          description: errorData.message || "An error occurred while scheduling the post",
          variant: "destructive",
        })
        console.error('Failed to schedule post')
      }
    } catch (error) {
      toast({
        title: "Failed to Schedule Post",
        description: "An error occurred while scheduling the post",
        variant: "destructive",
      })
      console.error('Failed to schedule post:', error)
    } finally {
      setIsScheduling(false)
    }
  }



  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, post: CalendarPost) => {
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

  const handleDragOver = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDate(dateKey)
  }

  const handleDragLeave = () => {
    setDragOverDate(null)
  }

  const handleDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault()
    if (!draggedPost) return

    const originalDate = new Date(draggedPost.scheduledAt).toISOString().split('T')[0]
    if (originalDate === targetDate) {
      setDragOverDate(null)
      setDraggedPost(null)
      return
    }

    // Store drop information for rescheduling
    setDropTargetDate(targetDate)
    
    // Extract original time from scheduledAt in 24-hour format
    const originalTimeString = new Date(draggedPost.scheduledAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    setOriginalTime(originalTimeString)
    
    // Generate AI suggested times
    const suggestedTimes = generateAISuggestedTimes(targetDate, draggedPost.platform)
    setAiSuggestedTimes(suggestedTimes)
    
    // Show schedule modal for rescheduling
    setSchedulingPost(draggedPost)
    setShowScheduleModal(true)
    
    setDragOverDate(null)
    // Don't clear draggedPost yet - keep it for the reschedule function
  }

  // AI suggested times based on platform and date
  const generateAISuggestedTimes = (date: string, platform: string): string[] => {
    const dayOfWeek = new Date(date).getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
    // Platform-specific optimal posting times in 24-hour format
    const platformTimes: { [key: string]: { weekday: string[], weekend: string[] } } = {
      'TWITTER': {
        weekday: ['09:00', '12:00', '17:00', '19:00'],
        weekend: ['09:00', '14:00', '18:00']
      },
      'LINKEDIN': {
        weekday: ['08:00', '09:00', '12:00', '17:00'],
        weekend: ['08:00', '11:00', '15:00']
      },
      'INSTAGRAM': {
        weekday: ['11:00', '13:00', '15:00', '19:00'],
        weekend: ['10:00', '14:00', '17:00', '20:00']
      },
      'FACEBOOK': {
        weekday: ['09:00', '13:00', '15:00', '19:00'],
        weekend: ['10:00', '14:00', '18:00']
      },
      'YOUTUBE': {
        weekday: ['14:00', '17:00', '20:00'],
        weekend: ['11:00', '15:00', '19:00']
      }
    }
    
    const times = platformTimes[platform] || platformTimes['TWITTER']
    return isWeekend ? times.weekend : times.weekday
  }

  // Hover overlay functions
  const handlePostHover = (e: React.MouseEvent, post: CalendarPost) => {
    setHoveredPost(post)
    setHoverPosition({ x: e.clientX, y: e.clientY })
  }

  const handlePostLeave = () => {
    setHoveredPost(null)
    setHoverPosition({ x: 0, y: 0 })
  }



  // Grid View (Traditional Calendar)
  const renderGridView = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const calendarDays = []
    const currentDay = new Date(startDate)

    while (currentDay <= lastDay || currentDay.getDay() !== 0) {
      const dateKey = currentDay.toLocaleDateString('en-CA') // Use same format as dashboard
      const isCurrentMonth = currentDay.getMonth() === month
      const isToday = currentDay.toDateString() === new Date().toDateString()
      const dayPosts = getAllPostsForDate(currentDay)

      calendarDays.push(
        <div
          key={dateKey}
          className={`min-h-[120px] p-3 rounded-2xl flex flex-col transition-all ${
            isCurrentMonth ? 'bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm' : 'bg-gray-50/60 dark:bg-neutral-900/60 backdrop-blur-sm'
          } ${isToday ? 'ring-2 ring-blue-500 bg-blue-50/60 dark:bg-blue-900/20' : ''} ${
            selectedDate === dateKey ? 'ring-2 ring-indigo-500 bg-indigo-50/60 dark:bg-indigo-900/20' : ''
          } ${dragOverDate === dateKey ? 'ring-2 ring-green-500 bg-green-50/60 dark:bg-green-900/20 scale-105' : ''} border border-black/5 dark:border-white/5 hover:scale-[1.01] transition-all`}
          onClick={() => {
            const newSelectedDate = selectedDate === dateKey ? null : dateKey
            setSelectedDate(newSelectedDate)
            if (newSelectedDate && dayPosts.length > 0) {
              setTimeout(() => {
                postDetailsRef.current?.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'start' 
                })
              }, 100)
            }
          }}
          onDragOver={(e) => handleDragOver(e, dateKey)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, dateKey)}
        >
          <span className="font-medium text-sm mb-2">{currentDay.getDate()}</span>
          {dayPosts.length > 0 && (
            <div className="space-y-1 flex-1">
              {dayPosts.slice(0, 3).map((post, idx) => (
                <div
                  key={idx}
                  className="bg-white/60 dark:bg-neutral-700/60 rounded-lg p-2 border border-white/20 dark:border-neutral-600/20 cursor-pointer hover:bg-white/80 dark:hover:bg-neutral-700/80 transition-colors shadow-sm relative group"
                  draggable
                  onDragStart={(e) => handleDragStart(e, post)}
                  onMouseEnter={(e) => {
                    setTimeout(() => handlePostHover(e, post), 150)
                  }}
                  onMouseLeave={() => {
                    setTimeout(() => handlePostLeave(), 100)
                  }}
                  onClick={(e) => { e.stopPropagation(); handleEditPost(post); }}
                >
                  <div className="flex items-center gap-2 mb-2">
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
                  
                  {/* Media Preview (supports multiple items) */}
                  {(() => {
                    const media: any[] = [];
                    if (Array.isArray((post as any).media)) media.push(...(post as any).media);
                    if (Array.isArray((post as any).mediaItems)) media.push(...(post as any).mediaItems);
                    if ((post as any).imageUrls) media.push(...(post as any).imageUrls.map((u: string) => ({ type: 'image', url: u })));
                    if ((post as any).videoUrls) media.push(...(post as any).videoUrls.map((u: string) => ({ type: 'video', url: u })));
                    if (post.imageUrl) media.push({ type: 'image', url: post.imageUrl });
                    if (post.videoUrl) media.push({ type: 'video', url: post.videoUrl });
                    return media.length > 0 ? (
                      <PostMediaPreview media={media as any} height={60} rounded="rounded-md" onOpen={() => handleEditPost(post)} />
                    ) : null;
                  })()}
                  
                  {/* Time */}
                  <div className="text-xs opacity-70 text-center">
                    {post.time || 'Scheduled'}
                  </div>
                </div>
              ))}
              {dayPosts.length > 3 && (
                <div className="text-xs opacity-60 text-center py-1">
                  +{dayPosts.length - 3} more
                </div>
              )}
            </div>
          )}
        </div>
      )

      currentDay.setDate(currentDay.getDate() + 1)
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-3 text-center font-medium text-gray-500 dark:text-gray-400 bg-gray-50/60 dark:bg-neutral-800/60 backdrop-blur-sm rounded-2xl border border-black/5 dark:border-white/5">
            {day}
          </div>
        ))}
        {calendarDays}
      </div>
    )
  }


    





  // Portal-based Hover Overlay Component
  const HoverOverlay = ({ post, isVisible, position }: { 
    post: CalendarPost | null, 
    isVisible: boolean, 
    position: { x: number, y: number } 
  }) => {
    if (!isVisible || !post) return null

    return createPortal(
      <div 
        className="fixed z-[999999] bg-white dark:bg-neutral-800 rounded-lg p-4 shadow-xl border border-gray-200 dark:border-neutral-600 max-w-80 transition-all duration-200 ease-in-out"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -100%)',
          marginTop: '-8px'
        }}
      >
        <div className="space-y-3">
          {/* Header with Platform and Status */}
          <div className="flex items-center gap-2">
            {getPlatformIcon(post.platform)}
            <span className="text-sm font-semibold">{post.platform}</span>
            <Badge className={`${getStatusColor(post.status)} text-xs`}>
              {post.status}
            </Badge>
                        </div>
          
          {/* Account Name and Date */}
          <div className="text-sm font-medium">{post.accountName || 'Account'}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {new Date(post.scheduledAt).toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
                })}
              </div>
              
          {/* Image Section */}
          {post.imageUrl && (
            <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-neutral-600 border border-gray-200 dark:border-neutral-500">
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
              {/* Fallback icon when image fails to load */}
              <div className="hidden w-full h-full flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        {getPlatformIcon(post.platform)}
                      </div>
                        </div>
                        </div>
          )}
          
          {/* Content */}
          <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3 leading-relaxed">
            {post.content}
          </p>
          
          {/* Action Hints */}
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-neutral-600">
            Drag to reschedule • Click to edit
                      </div>
                    </div>
                    
        {/* Arrow pointing down to the post card */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white dark:border-t-neutral-800"></div>
      </div>,
      document.body
    )
  }

  // Week View with Post Previews
  const renderWeekView = () => {
    // Calculate week start based on the current date (not first day of month)
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // Calculate week start (Monday) based on current date
    const weekStart = new Date(currentDate)
    const currentDayOfWeek = currentDate.getDay()
    const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1
    weekStart.setDate(currentDate.getDate() - daysFromMonday)
    
    // Calculate week end (7 days later)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    
    console.log('Week view rendering:', {
      currentDate: currentDate.toISOString(),
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      calendarDataKeys: Object.keys(calendarData),
      calendarDataLength: Object.keys(calendarData).length
    })



    const weekDays = []
    const currentDay = new Date(weekStart)



        // Get 7 days starting from the week start
    for (let i = 0; i < 7; i++) {
      const dateKey = currentDay.toLocaleDateString('en-CA') // Use same format as dashboard
      const isCurrentMonth = currentDay.getMonth() === new Date().getMonth() && currentDay.getFullYear() === new Date().getFullYear()
      const isToday = currentDay.toDateString() === new Date().toDateString()
      const dayPosts = getAllPostsForDate(currentDay)

      console.log(`Day ${dateKey}:`, { dayPosts: dayPosts.length, posts: dayPosts })
      
      
      
      weekDays.push(
        <div
          key={dateKey}
          className={`min-h-[120px] p-3 rounded-2xl flex flex-col transition-all ${
            isCurrentMonth ? 'bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm' : 'bg-gray-50/60 dark:bg-neutral-900/60 backdrop-blur-sm'
          } ${isToday ? 'ring-2 ring-blue-500 bg-blue-50/60 dark:bg-blue-900/20' : ''} ${
            selectedDate === dateKey ? 'ring-2 ring-indigo-500 bg-indigo-50/60 dark:bg-indigo-900/20' : ''
          } ${dragOverDate === dateKey ? 'ring-2 ring-green-500 bg-green-50/60 dark:bg-green-900/20 scale-105' : ''} border border-black/5 dark:border-white/5 hover:scale-[1.01] transition-all`}
          onClick={() => {
            const newSelectedDate = selectedDate === dateKey ? null : dateKey
            setSelectedDate(newSelectedDate)
            if (newSelectedDate && dayPosts.length > 0) {
              setTimeout(() => {
                postDetailsRef.current?.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'start' 
                })
              }, 100)
            }
          }}
          onDragOver={(e) => handleDragOver(e, dateKey)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, dateKey)}
        >
          {/* Date Header - Match Month View styling */}
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm">{currentDay.getDate()}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {currentDay.toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
          </div>
          
          {dayPosts.length > 0 && (
            <div className="space-y-1 flex-1">
              {dayPosts.slice(0, 3).map((post, idx) => (
                <div
                  key={idx}
                  className="bg-white/60 dark:bg-neutral-700/60 rounded-lg p-2 border border-white/20 dark:border-neutral-600/20 cursor-pointer hover:bg-white/80 dark:hover:bg-neutral-700/80 transition-colors shadow-sm relative group"
                  draggable
                          onDragStart={(e) => handleDragStart(e, post)}
                          onMouseEnter={(e) => {
                            setTimeout(() => handlePostHover(e, post), 150)
                          }}
                          onMouseLeave={() => {
                            setTimeout(() => handlePostLeave(), 100)
                          }}
                  onClick={() => handleEditPost(post)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {/* Platform Icon */}
                    {post.platform && (
                      <div className="w-3 h-3 flex-shrink-0 flex items-center justify-center">
                        {getPlatformIcon(post.platform)}
                      </div>
                    )}
                    {/* Account Name */}
                    <div className="text-xs font-medium truncate min-w-0 flex-1">
                      {post.accountName || post.platform || 'Post'}
                            </div>
                          </div>
                          
                  {/* Media Preview (supports multiple items) */}
                  {(() => {
                    const media: any[] = [];
                    if (Array.isArray((post as any).media)) media.push(...(post as any).media);
                    if (Array.isArray((post as any).mediaItems)) media.push(...(post as any).mediaItems);
                    if ((post as any).imageUrls) media.push(...(post as any).imageUrls.map((u: string) => ({ type: 'image', url: u })));
                    if ((post as any).videoUrls) media.push(...(post as any).videoUrls.map((u: string) => ({ type: 'video', url: u })));
                    if (post.imageUrl) media.push({ type: 'image', url: post.imageUrl });
                    if (post.videoUrl) media.push({ type: 'video', url: post.videoUrl });
                    return media.length > 0 ? (
                      <PostMediaPreview media={media as any} height={48} rounded="rounded-md" onOpen={() => handleEditPost(post)} />
                    ) : null;
                  })()}
                  
                  {/* Time - Match Month View styling */}
                  <div className="text-xs opacity-70 text-center">
                    {post.time || 'Scheduled'}
                    </div>
                  </div>
              ))}
              {dayPosts.length > 3 && (
                <div className="text-xs opacity-60 text-center py-1">
                  +{dayPosts.length - 3} more
            </div>
              )}
          </div>
          )}
        </div>
      )

      currentDay.setDate(currentDay.getDate() + 1)
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays}
      </div>
    )
  }

  // Day View with Detailed Post Previews
  const renderDayView = () => {
    const dayPosts = getAllPostsForDate(currentDate)
    const isToday = currentDate.toDateString() === new Date().toDateString()
    const dateKey = currentDate.toLocaleDateString('en-CA')

    console.log(`Day view: ${dateKey} has ${dayPosts.length} posts`, dayPosts)

    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {currentDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}
          </h3>
          {isToday && (
            <div className="inline-block mt-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
              Today
          </div>
          )}
        </div>
        
        {dayPosts.length > 0 ? (
          <div className="space-y-4">
            {dayPosts.map((post, idx) => (
              <div
                key={idx}
                className="bg-white/80 dark:bg-neutral-800/80 rounded-2xl p-6 border border-white/20 dark:border-neutral-600/20 shadow-lg hover:scale-[1.01] transition-all cursor-pointer group"
                draggable
                onDragStart={(e) => handleDragStart(e, post)}
                onMouseEnter={(e) => {
                  setTimeout(() => handlePostHover(e, post), 150)
                }}
                onMouseLeave={() => {
                  setTimeout(() => handlePostLeave(), 100)
                }}
                onClick={() => handleEditPost(post)}
              >
                {/* Detailed Post Preview */}
                <div className="flex items-start gap-4">
                  {/* Media Section - Always show, with fallback */}
                  <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-neutral-600 border border-gray-200 dark:border-neutral-500">
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
                          <div className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
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
                    ) : (
                      // Platform placeholder when no media
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getPlatformIcon(post.platform)}
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {post.accountName || post.platform}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {post.time} • {post.platform}
                          </div>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(post.status)} text-sm px-3 py-1`}>
                    {post.status}
                  </Badge>
                </div>
                    
                    <p className="text-gray-700 dark:text-gray-200 mb-4 leading-relaxed">
                      {post.content}
                    </p>
                    
                    <div className="flex items-center gap-4">
                      {post.platforms && post.platforms.length > 1 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Platforms:</span>
                          <div className="flex gap-2">
                            {post.platforms.map((platform, pIdx) => (
                              <div key={pIdx} className="w-5 h-5">
                                {getPlatformIcon(platform)}
              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                {post.status !== 'PUBLISHED' && post.status !== 'published' && (
                        <div className="flex gap-2">
                    <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditPost(post)
                            }}
                            className="px-3 py-1 rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 text-white text-sm hover:bg-rose-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReschedulePost(post)
                            }}
                            className="px-3 py-1 rounded-lg bg-white/60 dark:bg-neutral-800/60 border border-black/10 dark:border-white/10 text-sm hover:bg-white/80 dark:hover:bg-neutral-700/80 transition-colors"
                    >
                      Reschedule
                    </button>
                        </div>
                )}
                  </div>
              </div>
            </div>
                        </div>
                      ))}
                    </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
        </div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No posts scheduled for this day
            </h4>
            <p className="text-gray-500 dark:text-gray-400">
              Create a new post or schedule an existing one
            </p>
            <Button 
              onClick={() => window.location.href = '/create'} 
              className="mt-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-700 hover:to-pink-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Post
            </Button>
          </div>
        )}
          </div>
    )
  }

  return (
    <div className="min-h-screen font-sans bg-gradient-to-br from-white to-slate-50 dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar 
        collapsed={collapsed}
        onToggleCollapse={setCollapsed}
        showPlanInfo={true}
      />

      <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 ${collapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
        <main className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
                          <div>
                <h2 className="text-xl font-semibold tracking-tight mb-1">Content Calendar</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  Plan and manage your content schedule • {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View
                </p>
              </div>
            <div className="flex items-center gap-4">
              <TopRightControls unreadNotificationsCount={3} />
            </div>
          </div>



          <div className="space-y-6">


            {/* Calendar View */}
            <Card className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-950/40 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* View Mode Selection */}
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-neutral-800 rounded-2xl p-1 border border-black/5 dark:border-white/5">
                      <Button
                        variant={viewMode === 'month' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          setViewMode('month')
                          // When switching to month view, show current month
                          const today = new Date()
                          setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))
                        }}
                        className={viewMode === 'month' ? 'bg-white dark:bg-neutral-700 shadow-sm rounded-xl' : 'hover:bg-white/50 dark:hover:bg-neutral-700/50 rounded-xl'}
                      >
                        <Calendar className="w-4 h-4 mr-1" />
                        Month
                      </Button>
                      <Button
                        variant={viewMode === 'week' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          setViewMode('week')
                          // When switching to week view, adjust to show current week
                          const today = new Date()
                          const currentDayOfWeek = today.getDay()
                          const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1 // Sunday = 0, but we want Monday = 0
                          const mondayOfCurrentWeek = new Date(today)
                          mondayOfCurrentWeek.setDate(today.getDate() - daysFromMonday)
                          setCurrentDate(mondayOfCurrentWeek)
                        }}
                        className={viewMode === 'week' ? 'bg-white dark:bg-neutral-700 shadow-sm rounded-xl' : 'hover:bg-white/50 dark:hover:bg-neutral-700/50 rounded-xl'}
                      >
                        <Calendar className="w-4 h-4 mr-1" />
                        Week
                      </Button>
                      <Button
                        variant={viewMode === 'day' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          setViewMode('day')
                          // When switching to day view, show current date
                          setCurrentDate(new Date())
                        }}
                        className={viewMode === 'day' ? 'bg-white dark:bg-neutral-700 shadow-sm rounded-xl' : 'hover:bg-white/50 dark:hover:bg-neutral-700/50 rounded-xl'}
                      >
                        <Calendar className="w-4 h-4 mr-1" />
                        Day
                      </Button>
                    </div>
                    
                    {/* Dynamic Toggle Based on View Mode */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (viewMode === 'month') {
                            navigateMonth('prev')
                          } else if (viewMode === 'week') {
                            navigateWeek('prev')
                          } else if (viewMode === 'day') {
                            navigateDay('prev')
                          }
                        }}
                        className="p-2 hover:bg-white/60 dark:hover:bg-neutral-700/60 rounded-xl"
                        title={`Previous ${viewMode === 'month' ? 'Month' : viewMode === 'week' ? 'Week' : 'Day'}`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      
                      <div 
                        className="text-center px-4 py-2 bg-white/60 dark:bg-neutral-800/60 rounded-xl border border-black/5 dark:border-white/5 cursor-pointer hover:bg-white/80 dark:hover:bg-neutral-700/80 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 group relative"
                        onClick={(e) => {
                          console.log('Date display clicked!')
                          
                          // Get the position of the clicked element
                          const rect = e.currentTarget.getBoundingClientRect()
                          
                          // Create a date input and position it exactly where the button is
                          const input = document.createElement('input')
                          input.type = 'date'
                          input.style.position = 'fixed'
                          input.style.top = `${rect.top}px`
                          input.style.left = `${rect.left}px`
                          input.style.width = `${rect.width}px`
                          input.style.height = `${rect.height}px`
                          input.style.zIndex = '9999'
                          input.style.opacity = '0'
                          input.style.pointerEvents = 'none'
                          input.style.border = 'none'
                          input.style.background = 'transparent'
                          
                          // Set the current date value
                          const year = currentDate.getFullYear()
                          const month = String(currentDate.getMonth() + 1).padStart(2, '0')
                          const day = String(currentDate.getDate()).padStart(2, '0')
                          input.value = `${year}-${month}-${day}`
                          
                          // Add event listener for date change
                          input.addEventListener('change', (e) => {
                            const target = e.target as HTMLInputElement
                            if (target.value) {
                              const newDate = new Date(target.value)
                              if (!isNaN(newDate.getTime())) {
                                setCurrentDate(newDate)
                                console.log('Date changed to:', newDate)
                              }
                            }
                            // Clean up only when user selects a date
                            if (document.body.contains(input)) {
                              document.body.removeChild(input)
                            }
                          })
                          
                          // Add event listener for when picker is closed without selection
                          input.addEventListener('cancel', () => {
                            console.log('Date picker cancelled')
                            // Clean up when user closes the picker
                            if (document.body.contains(input)) {
                              document.body.removeChild(input)
                            }
                          })
                          
                          // Add to DOM and trigger
                          document.body.appendChild(input)
                          
                          // Use a small delay to ensure the input is properly positioned
                          setTimeout(() => {
                            input.focus()
                            input.showPicker()
                          }, 10)
                          
                          console.log('Date picker opened for:', input.value)
                        }}
                        title="Click to pick a date"
                      >
                        <span className="text-sm font-semibold">
                          {viewMode === 'month' && currentDate.toLocaleDateString('en-US', { 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                          {viewMode === 'week' && getWeekRange(currentDate)}
                          {viewMode === 'day' && currentDate.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (viewMode === 'month') {
                            navigateMonth('next')
                          } else if (viewMode === 'week') {
                            navigateWeek('next')
                          } else if (viewMode === 'day') {
                            navigateDay('next')
                          }
                        }}
                        className="p-2 hover:bg-white/60 dark:hover:bg-neutral-700/60 rounded-xl"
                        title={`Next ${viewMode === 'month' ? 'Month' : viewMode === 'week' ? 'Week' : 'Day'}`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const today = new Date()
                          if (viewMode === 'month') {
                            // For month view, go to first day of current month
                            setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))
                          } else if (viewMode === 'week') {
                            // For week view, go to Monday of current week
                            const currentDayOfWeek = today.getDay()
                            const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1
                            const mondayOfCurrentWeek = new Date(today)
                            mondayOfCurrentWeek.setDate(today.getDate() - daysFromMonday)
                            setCurrentDate(mondayOfCurrentWeek)
                          } else {
                            // For day view, go to current date
                            setCurrentDate(today)
                          }
                        }}
                        className="px-3 py-2 rounded-xl border-black/10 dark:border-white/10 hover:bg-white/60 dark:hover:bg-neutral-700/60"
                      >
                        Today
                      </Button>
                      

                    </div>
              </div>
              
                  {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshCalendar}
                  className="rounded-xl border-black/10 dark:border-white/10 hover:bg-white/60 dark:hover:bg-neutral-700/60"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                
                <Button onClick={() => window.location.href = '/create'} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg hover:from-rose-700 hover:to-pink-800">
                  <Plus className="w-4 h-4" />
                  Create Post
                </Button>
              </div>
            </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {viewMode === 'month' && renderGridView()}
                    {viewMode === 'week' && renderWeekView()}
                    {viewMode === 'day' && renderDayView()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selected Date Details - Only show for Month view */}
            {selectedDate && viewMode === 'month' && (() => {
              // Convert selectedDate string back to Date object to use getAllPostsForDate
              const selectedDateObj = new Date(selectedDate + 'T00:00:00')
              const posts = getAllPostsForDate(selectedDateObj)
              return posts.length > 0 ? (
                <Card ref={postDetailsRef} className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-950/40 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4 -mt-7">
                      <h4 className="font-semibold text-lg">
                        Scheduled Posts for {new Date(selectedDate).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </h4>
                      <button
                        onClick={() => setSelectedDate(null)}
                        className="text-sm opacity-60 hover:opacity-100 transition p-2 rounded-lg hover:bg-white/60 dark:hover:bg-neutral-800/60"
                      >
                        ✕
                      </button>
                    </div>
                    <SelectedPostsList
                      posts={posts}
                      getPlatformIcon={getPlatformIcon}
                      onOpen={(post) => handleEditPost(post as any)}
                    />
                  </CardContent>
                </Card>
              ) : null
            })()}
            </div>
          </main>

          {/* Edit Modal */}
          {editingPost && (
            <AdvancedEditModal
              isOpen={showEditModal}
              onClose={() => {
                setShowEditModal(false)
                setEditingPost(null)
              }}
                          content={convertCalendarPostToGeneratedContent(editingPost)}
              postId={editingPost.id}
              onSave={handleSaveEdit}
              onRegenerateContent={async () => Promise.resolve()}
              onRegenerateImage={async () => Promise.resolve()}
            />
          )}

          {/* Schedule Modal */}
          {schedulingPost && (
            <ScheduleModal
              isOpen={showScheduleModal}
              onClose={() => {
                setShowScheduleModal(false)
                setSchedulingPost(null)
                // Also clear drag & drop state
                setDropTargetDate(null)
                setDraggedPost(null)
                setOriginalTime('')
                setAiSuggestedTimes([])
              }}
              onSchedule={handleScheduleSubmit}
              postId={schedulingPost.id}
              postContent={schedulingPost.content}
              isLoading={isScheduling}
              isRescheduling={!!dropTargetDate}
              originalDate={schedulingPost.scheduledAt}
              originalTime={originalTime}
              aiSuggestedTimes={aiSuggestedTimes}
              targetDate={dropTargetDate || undefined}
            />
          )}
          
          {/* Portal-based Hover Overlay */}
          <HoverOverlay 
            post={hoveredPost}
            isVisible={!!hoveredPost}
            position={hoverPosition}
          />
       
    
      
      {/* Toast Notifications */}
          
      <Toaster />

    </div>
    </div>
  ) 
  
}
