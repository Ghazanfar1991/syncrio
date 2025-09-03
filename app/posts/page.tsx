"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { TopRightControls } from '@/components/layout/top-right-controls'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Calendar, Eye, Heart, FileText, Share, Edit, Trash2, Plus, Clock, Send, MoreHorizontal, Filter, TrendingUp, Users, Zap, Menu, Search, Bell, Sun, Moon, Home, Rocket, BarChart3, Settings, MoreVertical } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {AdvancedEditModal} from '@/components/content/advanced-edit-modal'
import {ScheduleModal} from '@/components/content/schedule-modal'
import { VideoPreview } from '@/components/video-preview'
import { getImageErrorMessage, platformSupportsImages } from '@/lib/social/image-handler'
import { convertImageForPlatform } from '@/lib/social/image-converter'

interface Post {
  id: string
  content: string
  hashtags?: string[]
  imageUrl?: string
  images?: string
  videoUrl?: string
  videos?: string
  status: string
  platform?: string  // Primary platform for this post
  publishedAt?: string
  scheduledAt?: string
  createdAt: string
  publications?: Array<{
    platform: string
    publishedAt?: string
    status: string
    socialAccount?: {
      id: string
      accountName: string
      platform: string
    }
  }>
  analytics?: Array<{
    platform: string
    impressions: number
    likes: number
    comments: number
    shares: number
  }>
}

interface GeneratedContent {
  platform: string
  content: string
  hashtags: string[]
  imagePrompt?: string
  imageUrl?: string
  images?: string[]
  videoUrl?: string
  videos?: string[]
}

export default function PostsPage() {
  const { data: session, status } = useSession()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'drafts' | 'scheduled' | 'published'>('drafts')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date().toISOString().split('T')[0], // Today
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
  })
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [schedulingPost, setSchedulingPost] = useState<Post | null>(null)
  const [viewingPost, setViewingPost] = useState<Post | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [isViewing, setIsViewing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [postToDelete, setPostToDelete] = useState<Post | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')
  const [isDeleting, setIsDeleting] = useState(false)
  const [publishingPosts, setPublishingPosts] = useState<Set<string>>(new Set())
  const [publishedPosts, setPublishedPosts] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState(false)



  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (session) {
      fetchPosts()
    }
  }, [session])

  // Listen for posts updates from other pages (e.g., when drafts are cleaned up)
  useEffect(() => {
    const handlePostsUpdate = (event: CustomEvent) => {
      console.log('📡 Posts update event received:', event.detail)
      if (event.detail?.action === 'drafts-cleaned') {
        console.log('🔄 Refreshing posts due to drafts cleanup')
        fetchPosts()
      }
    }

    window.addEventListener('posts-updated', handlePostsUpdate as EventListener)
    
    return () => {
      window.removeEventListener('posts-updated', handlePostsUpdate as EventListener)
    }
  }, [])

  // Update date range when filter changes
  useEffect(() => {
    resetDateRange()
  }, [filter, posts])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteModal) {
          setShowDeleteModal(false)
          setPostToDelete(null)
        }
        if (showViewModal) {
          setShowViewModal(false)
          setViewingPost(null)
          setIsViewing(false)
        }
        if (showEditModal) {
          setShowEditModal(false)
          setEditingPost(null)
        }
        if (showScheduleModal) {
          closeScheduleModal()
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showDeleteModal, showViewModal, showEditModal, showScheduleModal])



  // Early returns after all hooks are called
  if (status === 'loading') {
    return (
              <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center hover:from-slate-100 hover:via-blue-100 hover:to-indigo-200 transition-all duration-200">
                  <div className="text-center hover:scale-105 transition-transform duration-200">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 mx-auto animate-pulse hover:scale-110 transition-transform duration-200">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
          <div className="w-12 h-12 border-3 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4 hover:scale-110 transition-transform duration-200"></div>
          <p className="text-lg text-gray-600 font-medium hover:text-indigo-600 transition-colors duration-200">Loading posts...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    redirect('/auth/signin')
  }

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/posts')
      const data = await response.json()
      
      console.log('Posts API response:', data)
      
      if (data.success) {
        console.log('Setting posts:', data.data.posts)
        setPosts(data.data.posts)
        
        // Clean up any duplicate posts in the database
        await cleanupDuplicatePosts()
      } else {
        console.error('Posts API failed:', data.error)
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get user display name and username
  const getUserDisplayName = () => {
    if (session?.user?.name) {
      return session.user.name;
    }
    if (session?.user?.email) {
      return session.user.email.split('@')[0];
    }
    return 'User';
  };
  
  const getUserUsername = () => {
    if (session?.user?.email) {
      return session.user.email.split('@')[0];
    }
    return 'user';
  };

  // Clean up duplicate posts in the database
  const cleanupDuplicatePosts = async () => {
    try {
      const response = await fetch('/api/posts/cleanup-duplicates', {
        method: 'POST'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.cleanedCount > 0) {
          console.log(`🧹 Cleaned up ${data.cleanedCount} duplicate posts`)
          // Refresh posts after cleanup
          setTimeout(() => {
            fetchPosts()
          }, 1000)
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to cleanup duplicate posts:', error)
    }
  }



  const handlePublishNow = async (postId: string) => {
    // Add post to publishing state
    setPublishingPosts(prev => new Set(prev).add(postId))
    
    try {
      const response = await fetch(`/api/posts/${postId}/publish`, {
        method: 'POST'
      })

      if (response.ok) {
        const publishData = await response.json()
        
        // Check if publishing actually succeeded
        if (publishData.success && publishData.data) {
          const { successCount, totalCount, publishResults, hasWarnings } = publishData.data
          
          if (successCount === totalCount && successCount > 0) {
            // All platforms succeeded
            showToastMessage(`Post published successfully to all ${totalCount} platforms!`, 'success')
          } else if (successCount > 0) {
            // Some platforms succeeded, some failed
            showToastMessage(`⚠️ Post published with errors: ${successCount}/${totalCount} platforms succeeded`, 'info')
          } else {
            // All platforms failed
            showToastMessage(`❌ Post publishing failed on all platforms`, 'error')
            // Don't show success animation or cleanup drafts
            setPublishingPosts(prev => {
              const newSet = new Set(prev)
              newSet.delete(postId)
              return newSet
            })
            return
          }
          
          // Remove from publishing state and add to published state only if some publishing succeeded
          setPublishingPosts(prev => {
            const newSet = new Set(prev)
            newSet.delete(postId)
            return newSet
          })
          
          // Only show success animation and cleanup drafts if at least one platform succeeded
          if (successCount > 0) {
            setPublishedPosts(prev => new Set(prev).add(postId))
            
            // Show success animation for 2 seconds then refresh
            setTimeout(() => {
              setPublishedPosts(prev => {
                const newSet = new Set(prev)
                newSet.delete(postId)
                return newSet
              })
              fetchPosts()
            }, 2000)
            
            // Clean up any duplicate drafts for this post
            await cleanupDuplicateDrafts(postId)
          } else {
            // All platforms failed, just refresh the posts list
            fetchPosts()
          }
        } else {
          // API response indicates failure
          showToastMessage(`Failed to publish post: ${publishData.error?.message || 'Unknown error'}`, 'error')
          setPublishingPosts(prev => {
            const newSet = new Set(prev)
            newSet.delete(postId)
            return newSet
          })
        }
      } else {
        const error = await response.json()
        
        // Handle different types of error responses
        if (error.data && error.data.successCount === 0) {
          // All platforms failed
          showToastMessage(`❌ ${error.message || 'Post publishing failed on all platforms'}`, 'error')
        } else if (error.data && error.data.successCount > 0) {
          // Some platforms succeeded, some failed
          showToastMessage(`⚠️ ${error.message || 'Post published with errors'}`, 'info')
        } else {
          // General API error
          showToastMessage(`Failed to publish post: ${error.message || 'Unknown error'}`, 'error')
        }
        
        // Remove from publishing state on error
        setPublishingPosts(prev => {
          const newSet = new Set(prev)
          newSet.delete(postId)
          return newSet
        })
      }
    } catch (error) {
      console.error('Failed to publish post:', error)
      showToastMessage('Failed to publish post', 'error')
      
      // Remove from publishing state on error
      setPublishingPosts(prev => {
        const newSet = new Set(prev)
        newSet.delete(postId)
        return newSet
      })
    }
  }

  const handleSchedulePost = (post: Post) => {
    setSchedulingPost(post)
    setShowScheduleModal(true)
  }

  const handleScheduleSubmit = async (scheduledAt: string) => {
    if (!schedulingPost) return

    try {
      // Check if this is a reschedule (post already has scheduledAt) or new schedule
      const isReschedule = schedulingPost.scheduledAt
      
      const response = await fetch(`/api/posts/${schedulingPost.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt })
      })

      if (response.ok) {
        const message = isReschedule ? 'Post rescheduled successfully!' : 'Post scheduled successfully!'
        showToastMessage(message, 'success')
        
        // Clean up any duplicate drafts for this post
        await cleanupDuplicateDrafts(schedulingPost.id)
        
        // Refresh posts to get updated status
        fetchPosts()
      } else {
        const error = await response.json()
        const action = isReschedule ? 'reschedule' : 'schedule'
        showToastMessage(`Failed to ${action} post: ${error.error?.message || 'Unknown error'}`, 'error')
      }
    } catch (error) {
      console.error('Failed to schedule/reschedule post:', error)
      showToastMessage('Failed to schedule/reschedule post', 'error')
    }
  }

  const closeScheduleModal = () => {
    setShowScheduleModal(false)
    setSchedulingPost(null)
  }

  // Clean up duplicate drafts when a post is published or scheduled
  const cleanupDuplicateDrafts = async (postId: string) => {
    try {
      // Get the post details to find matching content
      const post = posts.find(p => p.id === postId)
      if (!post) return

      console.log('🧹 Cleaning up duplicate drafts for post:', postId)
      
      // Find and remove any draft posts with matching content for the same platforms
      const response = await fetch(`/api/posts/cleanup-duplicate-drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          content: post.content,
          platform: post.platform
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          console.log(`✅ Cleaned up ${data.cleanedCount} duplicate drafts`)
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to cleanup duplicate drafts:', error)
    }
  }

  const handleViewPost = (post: Post) => {
    setIsViewing(true)
    setViewingPost(post)
    setShowViewModal(true)
    setIsViewing(false)
  }

  const handleReschedulePost = (post: Post) => {
    setSchedulingPost(post)
    setShowScheduleModal(true)
  }

  const showToastMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
    // Auto-dismiss after 4 seconds
    setTimeout(() => setShowToast(false), 4000)
  }

  const handleDeletePost = (post: Post) => {
    setPostToDelete(post)
    setShowDeleteModal(true)
  }

  const confirmDeletePost = async () => {
    if (!postToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/posts/${postToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showToastMessage('Post deleted successfully!', 'success')
        fetchPosts()
      } else {
        showToastMessage('Failed to delete post', 'error')
      }
    } catch (error) {
      console.error('Failed to delete post:', error)
      showToastMessage('Failed to delete post', 'error')
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
      setPostToDelete(null)
    }
  }

  const handleEditPost = (post: Post) => {
    setEditingPost(post)
    setShowEditModal(true)
  }

  const handleSaveEdit = async (updatedContent: GeneratedContent) => {
    // Determine which post we're editing (could be from edit or view mode)
    const postToEdit = editingPost || viewingPost
    if (!postToEdit) {
      console.error('No post to edit')
      return
    }

    try {
      const response = await fetch(`/api/posts/${postToEdit.id}`, {
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
        showToastMessage('Post updated successfully!', 'success')
        fetchPosts()
        
        // Close appropriate modal and clear state
        if (editingPost) {
          setShowEditModal(false)
          setEditingPost(null)
        }
        if (viewingPost) {
          setShowViewModal(false)
          setViewingPost(null)
          setIsViewing(false)
        }
      } else {
        showToastMessage('Failed to update post', 'error')
      }
    } catch (error) {
      console.error('Failed to update post:', error)
      showToastMessage('Failed to update post', 'error')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'PUBLISHED': return 'bg-green-100 text-green-800 border-green-200'
      case 'FAILED': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return '📝'
      case 'SCHEDULED': return '⏰'
      case 'PUBLISHED': return '✅'
      case 'FAILED': return '❌'
      default: return '📄'
    }
  }

  const getFailureReason = (post: any): string => {
    // Check publications for platform-specific errors
    if (post.publications && Array.isArray(post.publications) && post.publications.length > 0) {
      const publication = post.publications[0]
      if (publication.errorMessage) {
        // Clean up technical error messages and make them user-friendly
        const errorMsg = publication.errorMessage
        
        // Handle specific LinkedIn errors
        if (errorMsg.includes('URN doesn\'t start with \'urn:\'') || errorMsg.includes('data:image/png;base64')) {
          return 'Image format not supported. Please use a direct image URL instead of embedded images.'
        }
        
        if (errorMsg.includes('insufficient permissions') || errorMsg.includes('ACCESS_DENIED')) {
          return 'LinkedIn account permissions are insufficient. Please reconnect your LinkedIn account.'
        }
        
        if (errorMsg.includes('rate limit')) {
          return 'Rate limit exceeded. Please try again in a few minutes.'
        }
        
        if (errorMsg.includes('authentication') || errorMsg.includes('401') || errorMsg.includes('403')) {
          return 'LinkedIn authentication failed. Please reconnect your LinkedIn account.'
        }
        
        if (errorMsg.includes('content policy') || errorMsg.includes('community guidelines')) {
          return 'Post content violates LinkedIn guidelines. Please review and edit your content.'
        }
        
        if (errorMsg.includes('VERSION_MISSING') || errorMsg.includes('INVALID_VERSION')) {
          return 'LinkedIn API version issue. Please try again or contact support.'
        }
        
        if (errorMsg.includes('Unpermitted fields') || errorMsg.includes('RESOURCE_KEY')) {
          return 'LinkedIn profile access issue. Please reconnect your LinkedIn account.'
        }
        
        if (errorMsg.includes('Invalid request format') || errorMsg.includes('400')) {
          return 'LinkedIn API format issue. The system has been updated to use the correct API. Please try again.'
        }
        
        if (errorMsg.includes('w_member_social')) {
          return 'LinkedIn posting permission issue. Your app needs the w_member_social permission. Please check your LinkedIn app settings.'
        }
        
        if (errorMsg.includes('media') || errorMsg.includes('image')) {
          // Check if this is an image-related error
          const platform = publication.platform
          if (platform && platformSupportsImages(platform)) {
            // Use the new image converter for better error messages
            const imageUrl = post.imageUrl || post.images
            if (imageUrl) {
              const result = convertImageForPlatform(imageUrl, platform)
              if (!result.success) {
                return result.error || 'Image format not supported by this platform.'
              }
            }
            return getImageErrorMessage(platform, imageUrl)
          } else {
            return 'Media upload failed. Please check your image format and try again.'
          }
        }
        
        // For other technical errors, provide a generic but helpful message
        if (errorMsg.length > 100) {
          return 'Technical error occurred. Please check your account connection and try again.'
        }
        
        return errorMsg
      }
      
      // Generate user-friendly error messages based on platform and status
      switch (publication.platform) {
        case 'TWITTER':
        case 'X':
          return 'Twitter API rate limit exceeded or authentication failed. Please try again in a few minutes.'
        case 'LINKEDIN':
          return 'LinkedIn publishing failed. Check the error details below and try again.'
        case 'INSTAGRAM':
          return 'Instagram API authentication failed or post content doesn\'t meet platform requirements.'
        case 'FACEBOOK':
          return 'Facebook API authentication failed or post content violates community standards.'
        case 'YOUTUBE':
          return 'YouTube API authentication failed or video upload exceeded size limits.'
        case 'TIKTOK':
          return 'TikTok API authentication failed or post content doesn\'t comply with platform rules.'
        default:
          return 'Social media platform API error. Please check your account connection and try again.'
      }
    }
    
    // Default generic error message
    return 'Publishing failed due to a technical issue. Please try again or contact support if the problem persists.'
  }

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      TWITTER: '/x.png',
      LINKEDIN: '/linkdin.png',
      INSTAGRAM: '/insta.png',
      YOUTUBE: '/youtube.png',
      FACEBOOK: '/facebook.png',
      TIKTOK: '/tiktok.png',
      WHATSAPP: '/whatsapp.png',
      TELEGRAM: '/telegram.png',
      THREADS: '/threads.png'
    }
    return icons[platform] || '/globe.svg'
  }

  const getPlatformImage = (platform: string) => {
    const iconPath = getPlatformIcon(platform)
    return (
      <img 
        src={iconPath} 
        alt={platform} 
        className="w-5 h-5 object-contain"
      />
    )
  }

  // Deduplicate posts based on content and platform to prevent showing duplicates
  const deduplicatedPosts = posts.reduce((unique: Post[], post: Post) => {
    const existingPost = unique.find(p => 
      p.content === post.content && 
      p.platform === post.platform &&
      p.status === post.status
    )
    
    if (!existingPost) {
      unique.push(post)
    } else {
      // Keep the most recent post if there are duplicates
      if (new Date(post.createdAt) > new Date(existingPost.createdAt)) {
        const index = unique.indexOf(existingPost)
        unique[index] = post
      }
    }
    
    return unique
  }, [])

  const filteredPosts = deduplicatedPosts.filter(post => {
    console.log('Filtering post:', { id: post.id, status: post.status, filter, createdAt: post.createdAt, scheduledAt: post.scheduledAt, publishedAt: post.publishedAt })
    
    // Filter by status
    const statusMatch = 
      (filter === 'drafts' && (post.status === 'DRAFT' || post.status === 'FAILED')) ||
      (filter === 'scheduled' && post.status === 'SCHEDULED') ||
      (filter === 'published' && post.status === 'PUBLISHED')
    
    console.log('Status match:', statusMatch, 'Post status:', post.status, 'Filter:', filter)
    
    if (!statusMatch) return false
    
    // Filter by date range based on post status
    let postDate: Date
    let dateFieldUsed: string
    
    if (filter === 'scheduled' && post.scheduledAt) {
      // For scheduled posts, use scheduledAt
      postDate = new Date(post.scheduledAt)
      dateFieldUsed = 'scheduledAt'
    } else if (filter === 'published' && post.publishedAt) {
      // For published posts, use publishedAt
      postDate = new Date(post.publishedAt)
      dateFieldUsed = 'publishedAt'
    } else {
      // For drafts or if specific date field is missing, use createdAt
      postDate = new Date(post.createdAt)
      dateFieldUsed = 'createdAt'
    }
    
    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)
    endDate.setHours(23, 59, 59, 999) // Include the entire end date
    
    const dateMatch = postDate >= startDate && postDate <= endDate
    console.log('Date match:', dateMatch, 'Post date:', postDate, 'Range:', startDate, 'to', endDate, 'Field used:', dateFieldUsed)
    
    return dateMatch
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTotalEngagement = (analytics: Post['analytics']) => {
    if (!analytics || !Array.isArray(analytics)) return 0
    return analytics.reduce((total, metric) =>
      total + metric.likes + metric.comments + metric.shares, 0
    )
  }

  const getTotalImpressions = (analytics: Post['analytics']) => {
    if (!analytics || !Array.isArray(analytics)) return 0
    return analytics.reduce((total, metric) => total + metric.impressions, 0)
  }

  // Function to reset date range based on current filter
  const resetDateRange = useCallback(() => {
    if (filter === 'drafts') {
      // For drafts, find the first draft date and set range from there to next 30 days
      const draftPosts = posts.filter(post => post.status === 'DRAFT' || post.status === 'FAILED')
      if (draftPosts.length > 0) {
        const firstDraftDate = new Date(Math.min(...draftPosts.map(post => new Date(post.createdAt).getTime())))
        const endDate = new Date(firstDraftDate.getTime() + 30 * 24 * 60 * 60 * 1000)
        
        setDateRange({
          start: firstDraftDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        })
      } else {
        // If no drafts, default to today + 30 days
        setDateRange({
          start: new Date().toISOString().split('T')[0],
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
      }
    } else if (filter === 'published') {
      // For published posts, show last 30 days from today
      const endDate = new Date()
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      
      setDateRange({
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      })
    } else {
      // For scheduled posts, show next 30 days from today
      setDateRange({
        start: new Date().toISOString().split('T')[0],
        end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })
    }
  }, [filter, posts])

  // Helper function to safely parse hashtags for display
  const getDisplayHashtags = (hashtags: any): string[] => {
    if (!hashtags) return []
    
    if (typeof hashtags === 'string') {
      try {
        // First try to parse as JSON
        const parsed = JSON.parse(hashtags)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        // If JSON parsing fails, split by comma
        return hashtags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
      }
    } else if (Array.isArray(hashtags)) {
      return hashtags
    }
    
    return []
  }

  // Convert Post to GeneratedContent for edit modal
  const convertPostToGeneratedContent = (post: Post): GeneratedContent => {
    // Get the primary platform from the post or fallback to publications
    const primaryPlatform = post.platform || post.publications?.[0]?.platform || 'TWITTER'
    
    // Parse images from database (could be JSON string or single imageUrl)
    let images: string[] = []
    if (post.images) {
      try {
        const parsedImages = JSON.parse(post.images)
        if (Array.isArray(parsedImages)) {
          images = parsedImages
        }
      } catch {
        // If parsing fails, treat as single image
        images = [post.images]
      }
    } else if (post.imageUrl) {
      images = [post.imageUrl]
    }

    // Parse videos from database (could be JSON string or single videoUrl)
    let videos: string[] = []
    if (post.videos) {
      try {
        const parsedVideos = JSON.parse(post.videos)
        if (Array.isArray(parsedVideos)) {
          videos = parsedVideos
        }
      } catch {
        // If parsing fails, treat as single video
        videos = [post.videos]
      }
    } else if (post.videoUrl) {
      videos = [post.videoUrl]
    }

    return {
      platform: primaryPlatform,
      content: post.content,
      hashtags: getDisplayHashtags(post.hashtags),
      imageUrl: post.imageUrl,
      images: images,
      videoUrl: post.videoUrl,
      videos: videos
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen font-sans bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-all duration-200">
        {/* Sidebar */}
        <Sidebar 
          collapsed={collapsed}
          onToggleCollapse={setCollapsed}
          showPlanInfo={true}
        />

        <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 ${collapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-20 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-all duration-200">
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
 
              <h2 className="text-xl font-semibold tracking-tight mb-1">Posts</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Manage and track your social media content
              </p>
            </div>
            <div className="flex items-center gap-4">
              <TopRightControls unreadNotificationsCount={3} />
            </div>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="relative rounded-3xl p-5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
              <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#3b82f6, #06b6d4)' }} />
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs opacity-70">Total Posts</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">{posts.length}</div>
                  <div className="mt-1 text-xs opacity-60">All content</div>
                </div>
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><MessageSquare className="w-5 h-5 text-indigo-600" /></div>
              </div>
            </div>

            <div className="relative rounded-3xl p-5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
              <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#10b981, #06b6d4)' }} />
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs opacity-70">Published</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">{posts.filter(p => p.status === 'PUBLISHED' || p.status === 'FAILED').length}</div>
                  <div className="mt-1 text-xs opacity-60">Live content & issues</div>
                </div>
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><Send className="w-5 h-5 text-green-600" /></div>
              </div>
            </div>

            <div className="relative rounded-3xl p-5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
              <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#f59e0b, #f97316)' }} />
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs opacity-70">Scheduled</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">{posts.filter(p => p.status === 'SCHEDULED').length}</div>
                  <div className="mt-1 text-xs opacity-60">Upcoming</div>
                </div>
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><Clock className="w-5 h-5 text-orange-600" /></div>
              </div>
            </div>

            <div className="relative rounded-3xl p-5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
              <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#8b5cf6, #ec4899)' }} />
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs opacity-70">Drafts</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">{posts.filter(p => p.status === 'DRAFT').length}</div>
                  <div className="mt-1 text-xs opacity-60">In progress</div>
                </div>
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><Edit className="w-5 h-5 text-purple-600" /></div>
              </div>
            </div>
          </div>

                {/* Filters */}
                <div className="rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg hover:shadow-xl transition-all duration-200">
      <div className="flex items-center justify-between mb-1">
        <div className="font-semibold">Filter Posts</div>
        <Link href="/create">
          <button className="px-3 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white flex items-center gap-2 shadow text-sm hover:scale-105 active:scale-95 transition-all duration-200">
            <Plus className="w-4 h-4" /> New Post
          </button>
        </Link>
      </div>

      {/* Filters and Date Picker in a single row */}
      <div className="flex flex-wrap -mb-2 items-center gap-3 p-3 rounded-2xl bg-white/40 dark:bg-neutral-800/30 hover:bg-white/50 dark:hover:bg-neutral-800/40 transition-colors duration-200">
       
      {[
          { key: 'drafts', label: 'Drafts', count: posts.filter((p) => p.status === 'DRAFT' || p.status === 'FAILED').length },
  { key: 'scheduled', label: 'Scheduled', count: posts.filter((p) => p.status === 'SCHEDULED').length },
          { key: 'published', label: 'Published', count: posts.filter((p) => p.status === 'PUBLISHED').length },
].map((filterOption) => {
  const isSelected = filter === filterOption.key
  return (
    <button
      key={filterOption.key}
      onClick={() => setFilter(filterOption.key as 'drafts' | 'scheduled' | 'published')}
      className={`px-3 py-2 rounded-lg transition-all duration-200 text-sm border flex items-center gap-1
        ${
          isSelected
            ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white '
            : 'hover:bg-black/5 dark:hover:bg-white/6 border-black/10 dark:border-white/10 hover:scale-105 active:scale-95'
        }`}
    >
      <span>{filterOption.label}</span>
      <span
        className={`text-xs ${
          isSelected ? 'text-white' : 'text-neutral-400 dark:text-neutral-500'
        }`}
      >
        ({filterOption.count})
      </span>
    </button>
  )
})}

       
        {/* Date Range Picker */}
        <div className="flex items-center gap-2 ml-2">
          <label className="text-sm font-medium">From:</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-neutral-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">To:</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-neutral-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200"
          />
        </div>
        {filter === 'drafts' ? (
          <button
            onClick={resetDateRange}
            className="px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:scale-105 active:scale-95 rounded-lg transition-all duration-200"
            title="Reset to first draft date + 30 days"
          >
            Reset Range
          </button>
        ) : filter === 'published' ? (
          <button
            onClick={resetDateRange}
            className="px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:scale-105 active:scale-95 rounded-lg transition-all duration-200"
            title="Reset to last 30 days from today"
          >
            Last 30 Days
          </button>
        ) : (
          <button
            onClick={resetDateRange}
            className="px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:scale-105 active:scale-95 rounded-lg transition-all duration-200"
            title="Reset to next 30 days from today"
          >
            Next 30 Days
          </button>
        )}
      </div>
      
      {/* Info text for different tabs */}
      {filter === 'drafts' && (
        <div className="mt-2 ml-130 -mb-2 text-xs text-gray-600 dark:text-gray-400 text-center">
          Showing {filteredPosts.length} drafts from {dateRange.start} to {dateRange.end}
        </div>
      )}
      {filter === 'published' && (
        <div className="mt-2 ml-118 -mb-2 text-xs text-gray-600 dark:text-gray-400 text-center">
          Showing {filteredPosts.length} published posts from {dateRange.start} to {dateRange.end}
        </div>
      )}
      {filter === 'scheduled' && (
        <div className="mt-2 ml-118 -mb-2 text-xs text-gray-600 dark:text-gray-400 text-center">
          Showing {filteredPosts.length} scheduled posts from {dateRange.start} to {dateRange.end}
        </div>
      )}
    </div>

          {/* Posts Grid */}
          {filteredPosts.length === 0 ? (
        <div className="rounded-3xl p-16 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg text-center hover:shadow-xl transition-all duration-200">
          <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 hover:scale-110 transition-transform duration-200">
                  <MessageSquare className="h-10 w-10 text-white" />
                </div>
          <h3 className="text-2xl font-bold mb-3 hover:text-rose-600 dark:hover:text-rose-400 transition-colors duration-200">No posts found</h3>
          <p className="text-sm opacity-60 mb-8 max-w-md mx-auto hover:opacity-80 transition-opacity duration-200">
                  {`No ${filter === 'published' ? 'published or failed' : filter} posts found. Try adjusting your filter or create new content.`}
                </p>
                <Link href="/create">
            <button className="px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white flex items-center gap-2 mx-auto hover:scale-105 active:scale-95 transition-all duration-200">
              <Plus className="w-4 h-4" />
                    Create Your First Post
            </button>
                </Link>
        </div>
          ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPosts.map((post) => (
            <div 
              key={post.id} 
              className={`rounded-3xl p-4 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg hover:scale-[1.01] hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 group cursor-pointer flex flex-col h-full min-h-[300px] active:scale-[0.99] ${isViewing ? 'opacity-75 pointer-events-none scale-95' : ''} ${post.status === 'FAILED' ? 'border-red-300 dark:border-red-600 bg-red-50/30 dark:bg-red-900/10' : ''} ${publishingPosts.has(post.id) ? 'border-blue-300 dark:border-blue-600 bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
              onClick={() => !isViewing && (post.status === 'PUBLISHED' ? handleViewPost(post) : handleEditPost(post))}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (!isViewing) handleViewPost(post)
                }
              }}
            >
            
{/* Platform Badge */}
{post.platform && (
  <div className="flex items-center gap-2">
    {getPlatformImage(post.platform)}
    <div className="flex flex-col leading-tight">
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {getUserDisplayName()}
      </span>
      <span className="text-xs text-gray-700 dark:text-gray-300">
        {getUserUsername()}
      </span>
    </div>
  </div>
)}

  {/* Status and Actions */}
              <div className="flex items-center justify-between mb-3 flex-shrink-0 -mt-10 ml-40 -mr-10">
                <div className="flex items-center gap-2 ">
                  <div className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(post.status)} hover:scale-105 transition-transform duration-200 ${post.status === 'FAILED' ? 'animate-pulse' : ''}`}>
                    {getStatusIcon(post.status)} {post.status === 'FAILED' ? 'FAILED' : post.status}
                 

                </div>
                {isViewing && (
                  <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                    <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"></div>
                    Opening...
                  </div>
                )}
                <div className="">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                      <button 
                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/6 mr-6 mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                              <MoreVertical className="h-4 w-3" />
                      </button>
                          </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-xl border border-black/5 dark:border-white/5 shadow-lg">
                            {post.status !== 'PUBLISHED' && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditPost(post); }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Post
                              </DropdownMenuItem>
                            )}
                            {post.status === 'PUBLISHED' && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewPost(post); }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Post
                              </DropdownMenuItem>
                            )}
                            {post.status === 'DRAFT' && (
                              <>
                                <DropdownMenuItem 
                                  onClick={(e) => { e.stopPropagation(); handlePublishNow(post.id); }}
                                  disabled={publishingPosts.has(post.id)}
                                  className={publishingPosts.has(post.id) ? 'opacity-50 cursor-not-allowed' : ''}
                                >
                                  {publishingPosts.has(post.id) ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                                      Publishing...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="h-4 w-4 mr-2" />
                                      Publish Now
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSchedulePost(post); }}>
                                  <Clock className="h-4 w-4 mr-2" />
                                  Schedule Post
                                </DropdownMenuItem>
                              </>
                            )}
                            {post.status === 'SCHEDULED' && (
                              <>
                                <DropdownMenuItem 
                                  onClick={(e) => { e.stopPropagation(); handlePublishNow(post.id); }}
                                  disabled={publishingPosts.has(post.id)}
                                  className={publishingPosts.has(post.id) ? 'opacity-50 cursor-not-allowed' : ''}
                                >
                                  {publishingPosts.has(post.id) ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                                      Publishing...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="h-4 w-4 mr-2" />
                                      Publish Now
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReschedulePost(post); }}>
                                  <Clock className="h-4 w-4 mr-2" />
                                  Reschedule
                                </DropdownMenuItem>
                              </>
                            )}
                            {post.status === 'PUBLISHED' && (
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); handleDeletePost(post); }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Post
                              </DropdownMenuItem>
                            )}
                            {post.status === 'FAILED' && (
                              <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditPost(post); }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit & Retry
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => { e.stopPropagation(); handlePublishNow(post.id); }}
                                  disabled={publishingPosts.has(post.id)}
                                  className={publishingPosts.has(post.id) ? 'opacity-50 cursor-not-allowed' : ''}
                                >
                                  {publishingPosts.has(post.id) ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                                      Retrying...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="h-4 w-4 mr-2" />
                                      Retry Publishing
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); handleDeletePost(post); }}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Post
                                </DropdownMenuItem>
                              </>
                            )}
                            {(post.status !== 'PUBLISHED' && post.status !== 'FAILED') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); handleDeletePost(post); }}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Post
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>



                    {/* Content */}
              <div className="space-y-3 flex-1 my-3">
                <p className="text-sm line-clamp-4 leading-relaxed group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">{post.content}</p>
                
                {/* Publishing Status Indicators */}
                {publishingPosts.has(post.id) && (
                  <div className="mt-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                          Publishing...
                        </h4>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Your post is being published to social media platforms
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {publishedPosts.has(post.id) && (
                  <div className="mt-3 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                        <span className="text-green-600 dark:text-green-400 text-lg">✅</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-1">
                          Published Successfully!
                        </h4>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          Your post is now live on social media
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Failure Reason Box for Failed Posts */}
                {post.status === 'FAILED' && (
                  <div className="mt-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 overflow-hidden">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center">
                        <span className="text-red-600 dark:text-red-400 text-sm">⚠️</span>
                      </div>
                      <div className="flex-1 min-w-0 max-w-full">
                        <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                          Publishing Failed
                        </h4>
                        <div className="mb-3">
                          <p className="text-sm text-red-700 dark:text-red-300 break-words overflow-hidden leading-relaxed max-h-20 overflow-y-auto">
                            {getFailureReason(post)}
                          </p>
                          {getFailureReason(post).length > 100 && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 italic">
                              💡 Tip: Long error messages are automatically shortened for better readability
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditPost(post); }}
                            className="px-3 py-2 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-800/50 dark:hover:bg-red-800/70 text-red-700 dark:text-red-200 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 dark:focus:ring-offset-gray-900"
                          >
                            Edit & Retry
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePublishNow(post.id); }}
                            disabled={publishingPosts.has(post.id)}
                            className={`px-3 py-2 text-xs rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 dark:focus:ring-offset-gray-900 shadow-sm ${
                              publishingPosts.has(post.id)
                                ? 'bg-red-400 dark:bg-red-500 text-white cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white hover:scale-105 active:scale-95'
                            }`}
                          >
                            {publishingPosts.has(post.id) ? (
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Republishing...
                              </div>
                            ) : (
                              'Republish Now'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                      {(() => {
                        const displayHashtags = getDisplayHashtags(post.hashtags)
                        return displayHashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 flex-shrink-0 mt-2">
                      {displayHashtags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700">
                                {tag}
                        </span>
                      ))}
                      {displayHashtags.length > 3 && (
                        <span className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-600">
                          +{displayHashtags.length - 3}
                        </span>
                            )}
                          </div>
                        )
                      })()}

                      {/* Images */}
                      {(() => {
                        let images: string[] = []
                        if (post.images) {
                          try {
                            const parsedImages = JSON.parse(post.images)
                            if (Array.isArray(parsedImages)) {
                              images = parsedImages
                            }
                          } catch {
                            images = [post.images]
                          }
                        } else if (post.imageUrl) {
                          images = [post.imageUrl]
                        }
                        
                        return images.length > 0 && (
                          <div className="mt-2 flex-shrink-0">
                            <div className="grid grid-cols-2 gap-1">
                              {images.slice(0, 4).map((imageUrl, index) => (
                                <div key={index} className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden" style={{ maxHeight: '60px' }}>
                                  <img
                                    src={imageUrl}
                                    alt={`Post image ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                              {images.length > 4 && (
                                <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-xs text-gray-500" style={{ maxHeight: '60px' }}>
                                  +{images.length - 4}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })()}

                      {/* Video Preview */}
                      {(() => {
                        let videos: string[] = []

                        // Parse videos from different sources
                        if (post.videos) {
                          try {
                            const parsedVideos = JSON.parse(post.videos)
                            if (Array.isArray(parsedVideos)) {
                              videos = parsedVideos
                            }
                          } catch {
                            videos = [post.videos]
                          }
                        } else if (post.videoUrl) {
                          videos = [post.videoUrl]
                        }

                        return videos.length > 0 && (
                          <div className="mt-2 flex-shrink-0">
                            <div className="space-y-2">
                              {videos.slice(0, 1).map((videoUrl, index) => (
                                <div key={index} className="w-full">
                                  <VideoPreview
                                    videoUrl={videoUrl}
                                    platform={post.platform || 'GENERAL'}
                                    className="max-h-32"
                                    autoPlay={false}
                                    controls={true}
                                    muted={true}
                                    onVideoClick={(e) => {
                                      // Prevent opening edit modal when clicking on video
                                      e.stopPropagation()
                                    }}
                                  />
                                </div>
                              ))}
                              {videos.length > 1 && (
                                <div className="text-xs text-gray-500 text-center">
                                  +{videos.length - 1} more video{videos.length > 2 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </div>

              {/* Analytics */}
              {post.analytics && Array.isArray(post.analytics) && post.analytics.length > 0 && (
                <div className="mt-3 p-3 rounded-2xl bg-white/40 dark:bg-neutral-800/30 flex-shrink-0">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="flex items-center gap-2">
                      <Eye className="h-3 w-3 text-blue-500" />
                      <span>{getTotalImpressions(post.analytics).toLocaleString()}</span>
                    </div>
                          <div className="flex items-center gap-2">
                      <Heart className="h-3 w-3 text-red-500" />
                      <span>{getTotalEngagement(post.analytics).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Date and View Button - Fixed at bottom */}
              <div className="mt-auto pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                <div className="text-xs opacity-60">
                      {post.publishedAt
                        ? `Published ${formatDate(post.publishedAt)}`
                        : post.scheduledAt
                          ? `Scheduled for ${formatDate(post.scheduledAt)}`
                          : `Created ${formatDate(post.createdAt)}`
                      }
                    </div>
                    <button 
                      className="px-3 py-1 text-xs bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-gray-900 hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                      onClick={(e) => { e.stopPropagation(); if (!isViewing) handleViewPost(post); }}
                      disabled={isViewing}
                    >
                      {isViewing ? 'Opening...' : 'View'}
                    </button>
                  </div>
            </div>
              ))}
            </div>
          )}

          {/* Edit Modal */}
          {editingPost && (
            <AdvancedEditModal
              isOpen={showEditModal}
              onClose={() => {
                setShowEditModal(false)
                setEditingPost(null)
              }}
              content={convertPostToGeneratedContent(editingPost)}
              onSave={handleSaveEdit}
              onRegenerateContent={async () => Promise.resolve()} // Not needed for editing existing posts
              onRegenerateImage={async () => Promise.resolve()} // Not needed for editing existing posts
            />
          )}

          {/* Schedule Modal */}
          {showScheduleModal && schedulingPost && (
            <ScheduleModal
              isOpen={showScheduleModal}
              onClose={closeScheduleModal}
              onSchedule={handleScheduleSubmit}
              postId={schedulingPost.id}
              postContent={schedulingPost.content}
            />
          )}

          {/* View Modal */}
          {viewingPost && (
            <AdvancedEditModal
              isOpen={showViewModal}
              onClose={() => {
                setShowViewModal(false)
                setViewingPost(null)
                setIsViewing(false)
              }}
              content={convertPostToGeneratedContent(viewingPost)}
              postId={viewingPost.id}
              onSave={handleSaveEdit}
              onRegenerateContent={async () => Promise.resolve()} // Not needed for viewing posts
              onRegenerateImage={async () => Promise.resolve()} // Not needed for viewing posts
            />
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && postToDelete && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
              onClick={() => {
                setShowDeleteModal(false)
                setPostToDelete(null)
              }}
            >
              <div 
                className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-black/5 dark:border-white/5 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Delete Post</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Are you sure you want to delete this post? This action cannot be undone.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false)
                        setPostToDelete(null)
                      }}
                      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeletePost}
                      disabled={isDeleting}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white transition-colors flex items-center gap-2"
                    >
                      {isDeleting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Deleting...
                        </>
                      ) : (
                        'Delete Post'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Toast Notification */}
          {showToast && (
            <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-2 duration-300">
              <div className={`px-6 py-4 rounded-2xl shadow-2xl border border-black/5 dark:border-white/5 transition-all duration-300 ${
                toastType === 'success' 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700' 
                  : toastType === 'error'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full ${
                    toastType === 'success' 
                      ? 'bg-green-500' 
                      : toastType === 'error'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  }`}></div>
                  <span className="font-medium">{toastMessage}</span>
                  <button
                    onClick={() => setShowToast(false)}
                    className="ml-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  >
                    <span className="sr-only">Close</span>
                    <div className="w-4 h-4 relative">
                      <div className="absolute inset-0 w-0.5 h-4 bg-current transform rotate-45 origin-center"></div>
                      <div className="absolute inset-0 w-0.5 h-4 bg-current transform -rotate-45 origin-center"></div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
        </div>
    </div>
  )
}