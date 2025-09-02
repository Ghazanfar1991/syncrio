"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { TopRightControls } from '@/components/layout/top-right-controls'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { ContentPreview } from '@/components/content/content-preview'
import { ScheduleModal } from '@/components/content/schedule-modal'
import { AdvancedEditModal } from '@/components/content/advanced-edit-modal'
import PostPreview from '@/components/content/PostPreview'
import { useToast } from '@/hooks/use-toast'
import { uploadProgressManager } from '@/components/upload-progress'
import { HashtagInput } from '@/components/ui/hashtag-input'
import {
  Sparkles,
  Send,
  Calendar,
  Image as ImageIcon,
  Hash,
  Clock,
  ArrowLeft,
  Wand2,
  Edit,
  RefreshCw,
  CheckCircle,
  FileText,
  Loader2,
  Users,
  MessageSquare,
  Eye,
  Settings,
  Zap,
  Target,
  Palette,
  Rocket,
  Plus,
  Save,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Facebook,
  Info,
  Upload,
  X
} from 'lucide-react'
import Link from 'next/link'

// Custom X Logo Component
const XLogo = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    fill="currentColor"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

// New interfaces for the redesigned flow
interface SocialAccount {
  id: string
  platform: string
  accountId: string
  accountName: string
  displayName?: string
  username?: string
  isActive: boolean
  isConnected: boolean
  accountType?: string
  permissions?: any[]
  lastSync?: string
  metadata?: any
  createdAt: string
  updatedAt: string
}

interface GeneratedContent {
  platform: string
  content: string
  hashtags: string[]
  imagePrompt?: string
  imageUrl?: string
  images?: string[]
  // Video fields
  videoUrl?: string // Single video URL
  videos?: string[] // Array of video URLs for multiple videos
  // Video platform specific fields
  title?: string // For YouTube
  description?: string // For YouTube
  tags?: string[] // For YouTube
  category?: string // For YouTube
  privacy?: string // For YouTube
  caption?: string // For TikTok
  effects?: string[] // For TikTok
  sounds?: string // For TikTok
}

// New interfaces for enhanced functionality
interface ManualContent {
  platform: string
  content: string
  hashtags: string[]
  images?: File[]
  includeImages: boolean
  imageCount: number
  imageStyle: string
  // Video fields
  video?: File | null
  videoUrl?: string // R2 URL for uploaded video
  videoKey?: string // R2 key for video management
  videoFileName?: string // Original filename
  includeVideo: boolean
  // Thumbnail fields (for YouTube)
  thumbnail?: File | null
  thumbnailUrl?: string // R2 URL for uploaded thumbnail
  thumbnailKey?: string // R2 key for thumbnail management
  thumbnailFileName?: string // Original filename
  includeThumbnail: boolean
  // Platform-specific fields for YouTube
  title?: string // Required for YouTube
  description?: string // Required for YouTube
  tags?: string[] // Required for YouTube (different from hashtags)
  category?: string // Required for YouTube
  privacy?: 'public' | 'unlisted' | 'private' // Required for YouTube
  // Platform-specific fields for TikTok
  caption?: string // Required for TikTok (different from content)
  effects?: string[] // Optional for TikTok
  sounds?: string // Optional for TikTok
  // Common video fields (removed duration and dimensions for manual mode)
  style?: string // For all platforms
}

interface ManualCreationState {
  selectedTab: string // 'general' or account ID
  generalContent: string
  generalHashtags: string
  accountContent: Record<string, ManualContent>
}

interface MediaOptions {
  includeImages: boolean
  imageCount?: number
  imageStyle?: string
  includeVideo: boolean
  videoDuration?: string
  videoDimensions?: 'vertical' | 'horizontal'
  videoStyle?: string
}

interface ContentCreationStep {
  step: 'mode-selection' | 'input' | 'generating' | 'preview' | 'scheduling'
  mode: 'ai-generate' | 'manual-create' | null
  topic: string
  selectedAccounts: string[]
  mediaOptions: MediaOptions
  generatedContent: GeneratedContent[]
  manualContent: ManualContent[]
  isGenerating: boolean
  scheduledAt?: string
}

// Platform content type definitions
const CONTENT_TYPES = {
  TEXT_BASED: ['X', 'TWITTER', 'LINKEDIN', 'INSTAGRAM', 'FACEBOOK'], // Include both X and TWITTER for compatibility
  VIDEO_BASED: ['YOUTUBE', 'TIKTOK']
} as const

// Platform compatibility groups for AI generation
const COMPATIBLE_GROUPS = [
  ['X', 'TWITTER', 'LINKEDIN', 'INSTAGRAM', 'FACEBOOK'], // Text-based platforms (AI can adjust tone per platform)
  ['YOUTUBE', 'TIKTOK'], // Video content
] as const

export default function CreatePage() {
  const { data: session, status } = useSession()
  const { toast } = useToast()

  // New state management for the redesigned flow
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [creationState, setCreationState] = useState<ContentCreationStep>({
    step: 'mode-selection',
    mode: null,
    topic: '',
    selectedAccounts: [],
    mediaOptions: {
      includeImages: false,
      imageCount: 1,
      imageStyle: 'professional',
      includeVideo: false,
      videoDuration: '30s',
      videoDimensions: 'vertical',
      videoStyle: 'engaging'
    },
    generatedContent: [],
    manualContent: [],
    isGenerating: false
  })

  const [manualState, setManualState] = useState<ManualCreationState>({
    selectedTab: 'general',
    generalContent: '',
    generalHashtags: '',
    accountContent: {}
  })
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [collapsed, setCollapsed] = useState(false)

  // Advanced Edit Modal state
  const [isAdvancedEditOpen, setIsAdvancedEditOpen] = useState(false)
  const [selectedContent, setSelectedContent] = useState<any>(null)

  // Preview Modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [previewContent, setPreviewContent] = useState<any>(null)

  // Manual mode action states
  const [isSavingDrafts, setIsSavingDrafts] = useState(false)

  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (session) {
      fetchSocialAccounts()
    }
  }, [session])

  // Auto-save when user is about to leave the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (creationState.generatedContent.length > 0 && autoSaveStatus !== 'saving' && !isPublishing && !showScheduleModal) {
        // Auto-save before leaving
        autoSaveAsDrafts(creationState.generatedContent)
        e.preventDefault()
        e.returnValue = ''
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden && creationState.generatedContent.length > 0 && autoSaveStatus !== 'saving' && !isPublishing && !showScheduleModal) {
        // Auto-save when tab becomes hidden
        autoSaveAsDrafts(creationState.generatedContent)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [creationState.generatedContent, autoSaveStatus, isPublishing, showScheduleModal])

  // Periodic auto-save every 2 minutes while user is working
  useEffect(() => {
    if (creationState.generatedContent.length > 0 && creationState.step === 'preview') {
      const interval = setInterval(() => {
        if (autoSaveStatus === 'idle' && !isPublishing && !showScheduleModal) {
          autoSaveAsDrafts(creationState.generatedContent)
        }
      }, 2 * 60 * 1000) // 2 minutes

      return () => clearInterval(interval)
    }
  }, [creationState.generatedContent, creationState.step, autoSaveStatus, isPublishing, showScheduleModal])

  // Check for backup content when component mounts
  useEffect(() => {
    if (creationState.step === 'input' && creationState.generatedContent.length === 0) {
      const hasBackup = restoreFromBackup()
      if (hasBackup) {
        // Show a notification that content was restored
        setTimeout(() => {
          toast({
            title: "Content Restored",
            description: "🔄 Your previously generated content has been restored from backup!",
            variant: "success"
          })
        }, 500)
      }
    }
  }, [])

  // Clean up orphaned drafts when component mounts
  useEffect(() => {
    const cleanupOrphanedDrafts = async () => {
      try {
        const response = await fetch('/api/posts/cleanup-orphaned-drafts', {
          method: 'POST'
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${data.cleanedCount} orphaned drafts on component mount`)
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to cleanup orphaned drafts on mount:', error)
      }
    }

    // Only run cleanup if user is authenticated and component is mounted
    if (session) {
      cleanupOrphanedDrafts()
    }
  }, [session])



  // Early returns after all hooks are called
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
              <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 mx-auto animate-pulse">
                <Wand2 className="h-8 w-8 text-white" />
              </div>
              <div className="w-12 h-12 border-3 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg text-gray-600 font-medium">Loading content creator...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    redirect('/auth/signin')
  }

  const fetchSocialAccounts = async () => {
    try {
      setLoadingAccounts(true)
      const response = await fetch('/api/social/accounts')
      const data = await response.json()

      if (data.success && data.data && Array.isArray(data.data)) {
        setSocialAccounts(data.data.filter((account: SocialAccount) => account.isActive && account.isConnected))
      } else {
        console.error('Invalid response format:', data)
        setSocialAccounts([])
      }
    } catch (error) {
      console.error('Failed to fetch social accounts:', error)
      setSocialAccounts([])
    } finally {
      setLoadingAccounts(false)
    }
  }

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      X: '/x.png',
      TWITTER: '/x.png', // Legacy support
      LINKEDIN: '/linkdin.png',
      INSTAGRAM: '/insta.png',
      YOUTUBE: '/youtube.png',
      FACEBOOK: '/facebook.png'
    }
    return icons[platform] || '📱'
  }

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      X: 'bg-black dark:bg-white',
      TWITTER: 'bg-black dark:bg-white', // Legacy support
      LINKEDIN: 'bg-blue-600',
      INSTAGRAM: 'bg-gradient-to-r from-pink-500 to-purple-600',
      YOUTUBE: 'bg-red-600',
      FACEBOOK: 'bg-blue-500'
    }
    return colors[platform] || 'bg-gray-500'
  }

  const getPlatformGradient = (platform: string) => {
    const gradients: Record<string, string> = {
      X: '',
      TWITTER: '', // Legacy support
      LINKEDIN: '',
      INSTAGRAM: '',
      YOUTUBE: '',
      FACEBOOK: ''
    }
    return gradients[platform] || ''
  }

  // New functions for the redesigned flow
  const handleSocialAccountToggle = (accountId: string) => {
    const account = socialAccounts.find(acc => acc.id === accountId)
    if (!account) return

    const newSelectedAccounts = creationState.selectedAccounts.includes(accountId)
      ? creationState.selectedAccounts.filter(id => id !== accountId)
      : [...creationState.selectedAccounts, accountId]

    // For AI generation mode, validate platform compatibility
    if (creationState.mode === 'ai-generate' && newSelectedAccounts.length > 1) {
      const selectedPlatforms = socialAccounts
        .filter(acc => newSelectedAccounts.includes(acc.id))
        .map(acc => acc.platform)

      const validation = validatePlatformCompatibility(selectedPlatforms)

      if (!validation.isValid) {
        toast({
          title: "Platform Compatibility",
          description: validation.message,
          variant: "destructive"
        })
        return
      }
    }

    setCreationState(prev => ({
      ...prev,
      selectedAccounts: newSelectedAccounts
    }))
  }

  const handleTopicChange = (topic: string) => {
    setCreationState(prev => ({ ...prev, topic }))
  }

  const handleImageToggle = (includeImages: boolean) => {
    setCreationState(prev => ({
      ...prev,
      mediaOptions: { ...prev.mediaOptions, includeImages }
    }))
  }

  // New handlers for enhanced functionality
  const handleModeSelection = (mode: 'ai-generate' | 'manual-create') => {
    setCreationState(prev => ({
      ...prev,
      mode,
      step: 'input'
    }))
  }

  const handleMediaOptionsChange = (options: Partial<MediaOptions>) => {
    setCreationState(prev => ({
      ...prev,
      mediaOptions: { ...prev.mediaOptions, ...options }
    }))
  }

  // Manual content handlers
  const handleTabChange = (tabId: string) => {
    setManualState(prev => ({ ...prev, selectedTab: tabId }))
  }

  // Initialize tab selection based on number of selected accounts
  useEffect(() => {
    if (creationState.mode === 'manual-create' && creationState.selectedAccounts.length > 0) {
      if (creationState.selectedAccounts.length === 1) {
        // Single account: set tab to that account ID
        setManualState(prev => ({ ...prev, selectedTab: creationState.selectedAccounts[0] }))
      } else {
        // Multiple accounts: set tab to general
        setManualState(prev => ({ ...prev, selectedTab: 'general' }))
      }
    }
  }, [creationState.selectedAccounts, creationState.mode])

  const handleGeneralContentChange = (content: string) => {
    setManualState(prev => {
      const updatedAccountContent = { ...prev.accountContent }

      // Auto-populate to all selected accounts only if they don't have custom content
      creationState.selectedAccounts.forEach(accountId => {
        const account = socialAccounts.find(acc => acc.id === accountId)
        if (account) {
          const existingContent = updatedAccountContent[accountId]

          // Only update if account doesn't have custom content or if it matches the previous general content
          const shouldUpdate = !existingContent ||
                              !existingContent.content ||
                              existingContent.content === prev.generalContent ||
                              existingContent.content.trim() === ''

          if (shouldUpdate) {
            updatedAccountContent[accountId] = {
              ...existingContent,
              platform: account.platform,
              content: content,
              hashtags: existingContent?.hashtags || (prev.generalHashtags ? prev.generalHashtags.split(' ').filter(tag => tag.trim()) : []),
              includeImages: existingContent?.includeImages || false,
              imageCount: existingContent?.imageCount || 1,
              imageStyle: existingContent?.imageStyle || 'professional',
              includeVideo: existingContent?.includeVideo || false,
              includeThumbnail: existingContent?.includeThumbnail || false
            }
          }
        }
      })

      return {
        ...prev,
        generalContent: content,
        accountContent: updatedAccountContent
      }
    })
  }

  const handleGeneralHashtagsChange = (hashtags: string) => {
    setManualState(prev => {
      const updatedAccountContent = { ...prev.accountContent }
      const hashtagArray = hashtags.split(' ').filter(tag => tag.trim())

      // Auto-populate to all accounts that don't have custom hashtags or match previous general hashtags
      creationState.selectedAccounts.forEach(accountId => {
        const account = socialAccounts.find(acc => acc.id === accountId)
        if (account) {
          const existingContent = updatedAccountContent[accountId]
          const previousGeneralHashtags = prev.generalHashtags ? prev.generalHashtags.split(' ').filter(tag => tag.trim()) : []

          // Only update if account doesn't have custom hashtags or if it matches the previous general hashtags
          const shouldUpdate = !existingContent ||
                              !existingContent.hashtags ||
                              existingContent.hashtags.length === 0 ||
                              JSON.stringify(existingContent.hashtags) === JSON.stringify(previousGeneralHashtags)

          if (shouldUpdate) {
            updatedAccountContent[accountId] = {
              ...existingContent,
              platform: account.platform,
              content: existingContent?.content || prev.generalContent || '',
              hashtags: hashtagArray,
              includeImages: existingContent?.includeImages || false,
              imageCount: existingContent?.imageCount || 1,
              imageStyle: existingContent?.imageStyle || 'professional',
              includeVideo: existingContent?.includeVideo || false,
              includeThumbnail: existingContent?.includeThumbnail || false
            }
          }
        }
      })

      return {
        ...prev,
        generalHashtags: hashtags,
        accountContent: updatedAccountContent
      }
    })
  }

  const handleAccountContentChange = (accountId: string, field: string, value: any) => {
    setManualState(prev => ({
      ...prev,
      accountContent: {
        ...prev.accountContent,
        [accountId]: {
          ...prev.accountContent[accountId],
          [field]: value
        }
      }
    }))
  }



  // Image upload handlers
  const handleImageUpload = (accountId: string, files: FileList | File[]) => {
    const account = socialAccounts.find(acc => acc.id === accountId)
    if (!account) return

    // Platform image limits
    const platformLimits: Record<string, number> = {
      'X': 4,
      'TWITTER': 4, // Legacy support
      'LINKEDIN': 9,
      'INSTAGRAM': 10,
      'FACEBOOK': 10
    }

    const maxImages = platformLimits[account.platform] || 4
    const currentImages = manualState.accountContent[accountId]?.images || []
    const remainingSlots = maxImages - currentImages.length

    if (remainingSlots <= 0) {
      toast({
        title: "Image Limit Reached",
        description: `Maximum ${maxImages} images allowed for ${account.platform}.`,
        variant: "destructive"
      })
      return
    }

    const fileArray = Array.from(files).slice(0, remainingSlots)

    // Validate file types
    const validFiles = fileArray.filter(file =>
      file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB limit
    )

    if (validFiles.length !== fileArray.length) {
      toast({
        title: "Invalid Files",
        description: "Some files were skipped. Only images under 10MB are allowed.",
        variant: "destructive"
      })
    }

    // Add to existing images instead of replacing
    const updatedImages = [...currentImages, ...validFiles]
    handleAccountContentChange(accountId, 'images', updatedImages)

    // Auto-share images to other selected accounts that have images enabled
    setManualState(prev => {
      const updatedAccountContent = { ...prev.accountContent }

      creationState.selectedAccounts.forEach(otherAccountId => {
        if (otherAccountId !== accountId) {
          const otherAccount = socialAccounts.find(acc => acc.id === otherAccountId)
          const otherAccountContent = updatedAccountContent[otherAccountId]

          // Only auto-share if the other account has images enabled
          if (otherAccount && otherAccountContent?.includeImages) {
            const otherMaxImages = platformLimits[otherAccount.platform] || 4
            const otherCurrentImages = otherAccountContent.images || []
            const availableSlots = otherMaxImages - otherCurrentImages.length

            if (availableSlots > 0) {
              const imagesToAdd = validFiles.slice(0, availableSlots)
              updatedAccountContent[otherAccountId] = {
                ...otherAccountContent,
                images: [...otherCurrentImages, ...imagesToAdd]
              }
            }
          }
        }
      })

      return {
        ...prev,
        accountContent: updatedAccountContent
      }
    })
  }

  const handleImageRemove = (accountId: string, index: number) => {
    const currentImages = manualState.accountContent[accountId]?.images || []
    const updatedImages = currentImages.filter((_, i) => i !== index)
    handleAccountContentChange(accountId, 'images', updatedImages)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent, accountId: string, type: 'image' | 'video' | 'thumbnail' = 'image') => {
    e.preventDefault()
    e.stopPropagation()

    const files = e.dataTransfer.files
    if (files.length > 0) {
      if (type === 'video') {
        handleVideoUpload(accountId, files)
      } else if (type === 'thumbnail') {
        handleThumbnailUpload(accountId, files)
      } else {
        handleImageUpload(accountId, files)
      }
    }
  }

  // Video upload handlers with R2 cloud storage
  const handleVideoUpload = async (accountId: string, files: FileList | File[]) => {
    const account = socialAccounts.find(acc => acc.id === accountId)
    if (!account) return

    const fileArray = Array.from(files)
    const videoFile = fileArray.find(file => file.type.startsWith('video/'))

    if (!videoFile) {
      toast({
        title: "Invalid File",
        description: "Please select a valid video file.",
        variant: "destructive"
      })
      return
    }

    console.log('📹 Starting video upload for:', account.platform)

    // Validate file size (100MB limit for R2 upload)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (videoFile.size > maxSize) {
      toast({
        title: "File Too Large",
        description: `Video file is ${Math.round(videoFile.size / 1024 / 1024)}MB. Maximum size is 100MB.`,
        variant: "destructive"
      })
      return
    }

    // Create upload task for progress tracking
    const taskId = uploadProgressManager.addTask({
      type: 'video',
      platform: account.platform,
      fileName: `Uploading video for ${account.platform}`,
      progress: 0,
      status: 'uploading'
    })

    try {
      // Create FormData for upload
      const formData = new FormData()
      formData.append('video', videoFile)
      formData.append('platform', account.platform)

      // Upload to R2
      const response = await fetch('/api/upload/video', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      console.log('✅ Video uploaded successfully:', result.data)

      // Update state with video URL instead of File object
      setManualState(prev => ({
        ...prev,
        accountContent: {
          ...prev.accountContent,
          [accountId]: {
            ...prev.accountContent[accountId],
            videoUrl: result.data.url,
            videoKey: result.data.key,
            videoFileName: result.data.fileName,
            video: null // Clear the File object
          }
        }
      }))

      uploadProgressManager.updateTask(taskId, { progress: 100, status: 'success' })

      toast({
        title: "Video Uploaded",
        description: `Video uploaded successfully for ${account.platform}`,
        variant: "success"
      })

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        uploadProgressManager.removeTask(taskId)
      }, 3000)

    } catch (error) {
      console.error('❌ Video upload failed:', error)
      uploadProgressManager.updateTask(taskId, {
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      })

      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : 'Failed to upload video',
        variant: "destructive"
      })
    }
  }

  const handleVideoRemove = async (accountId: string) => {
    const accountContent = manualState.accountContent[accountId]

    // If there's a video key, delete from R2
    if (accountContent?.videoKey) {
      try {
        await fetch('/api/upload/video', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ key: accountContent.videoKey })
        })
        console.log('✅ Video deleted from R2:', accountContent.videoKey)
      } catch (error) {
        console.error('❌ Failed to delete video from R2:', error)
        // Continue with local removal even if R2 deletion fails
      }
    }

    // Clear video data from state
    setManualState(prev => ({
      ...prev,
      accountContent: {
        ...prev.accountContent,
        [accountId]: {
          ...prev.accountContent[accountId],
          video: null,
          videoUrl: undefined,
          videoKey: undefined,
          videoFileName: undefined
        }
      }
    }))
  }

  // Thumbnail upload handlers (for YouTube)
  const handleThumbnailUpload = async (accountId: string, files: FileList | File[]) => {
    const account = socialAccounts.find(acc => acc.id === accountId)
    if (!account) return

    const fileArray = Array.from(files)
    const thumbnailFile = fileArray.find(file => file.type.startsWith('image/'))

    if (!thumbnailFile) {
      toast({
        title: "Invalid File",
        description: "Please select a valid image file.",
        variant: "destructive"
      })
      return
    }

    console.log('🖼️ Starting thumbnail upload for:', account.platform)

    // Validate file size (2MB limit for thumbnails)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (thumbnailFile.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Thumbnail must be under 2MB. Please compress your image.",
        variant: "destructive"
      })
      return
    }

    try {
      // Convert to base64 for upload
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1]) // Remove data:image/jpeg;base64, prefix
        }
        reader.onerror = reject
        reader.readAsDataURL(thumbnailFile)
      })

      console.log('📤 Uploading thumbnail to R2...')

      // Upload to R2
      const uploadResponse = await fetch('/api/upload/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          image: base64,
          filename: thumbnailFile.name,
          contentType: thumbnailFile.type
        })
      })

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`)
      }

      const uploadResult = await uploadResponse.json()
      console.log('✅ Thumbnail uploaded successfully:', uploadResult.url)

      // Update state with thumbnail data
      setManualState(prev => ({
        ...prev,
        accountContent: {
          ...prev.accountContent,
          [accountId]: {
            ...prev.accountContent[accountId],
            thumbnail: thumbnailFile,
            thumbnailUrl: uploadResult.url,
            thumbnailKey: uploadResult.key,
            thumbnailFileName: thumbnailFile.name
          }
        }
      }))

      toast({
        title: "Thumbnail Uploaded",
        description: `Successfully uploaded ${thumbnailFile.name}`,
      })

    } catch (error) {
      console.error('❌ Thumbnail upload failed:', error)
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : 'Failed to upload thumbnail',
        variant: "destructive"
      })
    }
  }

  const handleThumbnailRemove = async (accountId: string) => {
    const accountContent = manualState.accountContent[accountId]

    // If there's a thumbnail key, delete from R2
    if (accountContent?.thumbnailKey) {
      try {
        await fetch('/api/upload/image', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ key: accountContent.thumbnailKey })
        })
        console.log('✅ Thumbnail deleted from R2:', accountContent.thumbnailKey)
      } catch (error) {
        console.error('❌ Failed to delete thumbnail from R2:', error)
        // Continue with local removal even if R2 deletion fails
      }
    }

    // Clear thumbnail data from state
    setManualState(prev => ({
      ...prev,
      accountContent: {
        ...prev.accountContent,
        [accountId]: {
          ...prev.accountContent[accountId],
          thumbnail: null,
          thumbnailUrl: undefined,
          thumbnailKey: undefined,
          thumbnailFileName: undefined
        }
      }
    }))
  }

  // Background upload helper
  const uploadInBackground = async (
    accountId: string,
    postData: any,
    action: 'draft' | 'schedule' | 'publish'
  ) => {
    const account = socialAccounts.find(acc => acc.id === accountId)
    if (!account) return null

    const taskId = uploadProgressManager.addTask({
      type: 'video',
      platform: account.platform,
      fileName: `${action} to ${account.platform}`,
      progress: 0,
      status: 'uploading'
    })

    try {
      console.log(`Starting background upload for ${account.platform}:`, postData)

      // Simulate progress updates
      uploadProgressManager.updateTask(taskId, { progress: 25 })

      const endpoint = '/api/posts'
      console.log(`Making request to ${endpoint}`)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(postData)
      })

      console.log(`Response received:`, {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })

      uploadProgressManager.updateTask(taskId, { progress: 75 })

      if (!response.ok) {
        let errorText = ''
        try {
          errorText = await response.text()
        } catch (textError) {
          console.error('Failed to read response text:', textError)
          errorText = 'Could not read response'
        }

        console.error(`Background upload failed for ${account.platform}:`, {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          type: response.type,
          redirected: response.redirected,
          response: errorText,
          postDataSize: JSON.stringify(postData).length,
          hasVideo: !!postData.videos?.length || !!postData.videoUrl
        })

        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`)
        }

        const errorMessage = typeof errorData.error === 'string'
          ? errorData.error
          : errorData.error?.message || errorData.message || `Failed to ${action}`
        throw new Error(errorMessage)
      }

      const result = await response.json()
      uploadProgressManager.updateTask(taskId, { progress: 100, status: 'success' })

      // Auto-dismiss progress after 5 seconds to give user time to see success
      setTimeout(() => {
        uploadProgressManager.removeTask(taskId)
      }, 5000)

      return result
    } catch (error) {
      uploadProgressManager.updateTask(taskId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      })
      throw error
    }
  }

  // Handle Save & Preview Content
  const handleSaveAndPreview = () => {
    if (creationState.selectedAccounts.length === 0) {
      toast({
        title: "No Accounts Selected",
        description: "Please select at least one social media account to preview content.",
        variant: "destructive"
      })
      return
    }

    // Check if there's content to preview
    const hasContent = manualState.generalContent ||
      creationState.selectedAccounts.some((accountId: string) => manualState.accountContent[accountId]?.content)

    if (!hasContent) {
      toast({
        title: "No Content to Preview",
        description: "Please enter some content in the General tab or individual account tabs.",
        variant: "destructive"
      })
      return
    }

    // Open advanced edit modal for the first selected account
    const firstAccountId = creationState.selectedAccounts[0]
    const account = socialAccounts.find(acc => acc.id === firstAccountId)
    const accountContent = manualState.accountContent[firstAccountId]

    if (account) {
      // Convert File objects to URLs for preview
      const imageUrls = accountContent?.images?.map((file: File) => {
        if (file instanceof File) {
          return URL.createObjectURL(file)
        }
        return file // Already a URL string
      }) || []

      // Handle video URLs
      let videoUrl: string | null = null
      let videoUrls: string[] = []

      if (accountContent?.videoUrl) {
        videoUrl = accountContent.videoUrl
        videoUrls = [accountContent.videoUrl]
      } else if (accountContent?.video && accountContent.video instanceof File) {
        videoUrl = URL.createObjectURL(accountContent.video)
        videoUrls = [videoUrl]
      }

      const previewContent = {
        platform: account.platform,
        content: accountContent?.content || manualState.generalContent || '',
        hashtags: accountContent?.hashtags || [],
        images: imageUrls,
        imageUrl: imageUrls[0],
        videoUrl: videoUrl,
        videos: videoUrls
      }

      // Set the content for the advanced edit modal
      setSelectedContent(previewContent)
      setIsAdvancedEditOpen(true)
    }
  }

  // Advanced Edit Modal handlers
  const handleAdvancedEditSave = async (updatedContent: any) => {
    // Update the manual state with the edited content
    const firstAccountId = creationState.selectedAccounts[0]
    if (firstAccountId) {
      handleAccountContentChange(firstAccountId, 'content', updatedContent.content)
      handleAccountContentChange(firstAccountId, 'hashtags', updatedContent.hashtags)
      handleAccountContentChange(firstAccountId, 'images', updatedContent.images)
      // Save video data if present
      if (updatedContent.videoUrl) {
        handleAccountContentChange(firstAccountId, 'videoUrl', updatedContent.videoUrl)
      }
      if (updatedContent.videos) {
        handleAccountContentChange(firstAccountId, 'videos', updatedContent.videos)
      }
    }
  }

  const handleAdvancedEditRegenerateContent = async () => {
    // Placeholder for content regeneration
    console.log('Regenerating content...')
  }

  const handleAdvancedEditRegenerateImage = async () => {
    // Placeholder for image regeneration
    console.log('Regenerating image...')
  }

  // Manual mode action handlers
  const handlePreview = () => {
    if (creationState.selectedAccounts.length === 0) {
      toast({
        title: "No Accounts Selected",
        description: "Please select at least one social media account to preview content.",
        variant: "destructive"
      })
      return
    }

    // Create preview content for all selected accounts
    const allPreviews = creationState.selectedAccounts.map(accountId => {
      const account = socialAccounts.find(acc => acc.id === accountId)
      const accountContent = manualState.accountContent[accountId]

      if (account) {
        // Convert File objects to URLs for preview
        const imageUrls = accountContent?.images?.map((file: File) => {
          if (file instanceof File) {
            return URL.createObjectURL(file)
          }
          return file // Already a URL string
        }) || []

        // Handle video URLs - use existing URL or create object URL for File
        let videoUrl: string | null = null
        let videoUrls: string[] = []

        if (accountContent?.videoUrl) {
          videoUrl = accountContent.videoUrl
          videoUrls = [accountContent.videoUrl]
        } else if (accountContent?.video && accountContent.video instanceof File) {
          videoUrl = URL.createObjectURL(accountContent.video)
          videoUrls = [videoUrl]
        }

        return {
          accountId: account.id,
          accountName: account.accountName,
          platform: account.platform,
          text: accountContent?.content || manualState.generalContent || '',
          hashtags: accountContent?.hashtags || [],
          images: imageUrls,
          image: imageUrls[0],
          videoUrl: videoUrl,
          videos: videoUrls,
          includeImages: accountContent?.includeImages !== false, // Default to true
          includeVideo: accountContent?.includeVideo !== false    // Default to true
        }
      }
      return null
    }).filter(Boolean)

    console.log('Preview content for all accounts:', allPreviews)
    setPreviewContent(allPreviews)
    setIsPreviewModalOpen(true)
  }

  const handleSaveToDrafts = async () => {
    if (creationState.selectedAccounts.length === 0) {
      toast({
        title: "No Accounts Selected",
        description: "Please select at least one social media account.",
        variant: "destructive"
      })
      return
    }

    setIsSavingDrafts(true)

    try {
      // Convert File objects to base64 for API
      const convertFilesToBase64 = async (files: File[]): Promise<string[]> => {
        const promises = files.map((file) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          })
        })
        return Promise.all(promises)
      }

      // Check if there's any content to save (text, video, or images)
      const hasGeneralContent = manualState.generalContent && manualState.generalContent.trim()
      const hasAccountSpecificContent = creationState.selectedAccounts.some(accountId => {
        const accountContent = manualState.accountContent[accountId]
        const hasText = accountContent?.content && accountContent.content.trim()
        const hasVideo = accountContent?.video || accountContent?.videoUrl
        const hasImages = accountContent?.images && accountContent.images.length > 0
        const hasThumbnail = accountContent?.thumbnail || accountContent?.thumbnailUrl
        const hasYouTubeTitle = socialAccounts.find(acc => acc.id === accountId)?.platform === 'YOUTUBE' && accountContent?.title?.trim()

        console.log(`🔍 Content check for account ${accountId}:`, {
          hasText: !!hasText,
          hasVideo: !!hasVideo,
          hasImages: !!hasImages,
          hasThumbnail: !!hasThumbnail,
          hasYouTubeTitle: !!hasYouTubeTitle,
          platform: socialAccounts.find(acc => acc.id === accountId)?.platform
        })

        return hasText || hasVideo || hasImages || hasThumbnail || hasYouTubeTitle
      })

      console.log('🔍 Overall content validation:', {
        hasGeneralContent: !!hasGeneralContent,
        hasAccountSpecificContent: !!hasAccountSpecificContent,
        selectedAccountsCount: creationState.selectedAccounts.length
      })

      if (!hasGeneralContent && !hasAccountSpecificContent) {
        toast({
          title: "No Content",
          description: "Please enter some content, upload a video, add images, or provide a title (for YouTube) before saving to drafts.",
          variant: "destructive"
        })
        setIsSavingDrafts(false)
        return
      }

      // Create separate drafts for each selected account
      let successfulDrafts = 0
      let totalDrafts = creationState.selectedAccounts.length

      for (const accountId of creationState.selectedAccounts) {
        const account = socialAccounts.find(acc => acc.id === accountId)
        if (!account) continue

        const accountContent = manualState.accountContent[accountId]

        // Use account-specific content if available, otherwise use general content
        const contentToSave = accountContent?.content || manualState.generalContent || ''
        const hashtagsToSave = accountContent?.hashtags || []

        // Check if there's either text content, video content, or YouTube title
        const hasTextContent = contentToSave.trim()
        const hasVideoContent = accountContent?.videoUrl || accountContent?.video
        const hasYouTubeTitle = account.platform === 'YOUTUBE' && accountContent?.title?.trim()

        if (!hasTextContent && !hasVideoContent && !hasYouTubeTitle) {
          console.log(`Skipping ${account.platform} - no content, video, or title`)
          totalDrafts--
          continue
        }

        // Convert account-specific images to base64
        let imageUrls: string[] = []
        let videoUrls: string[] = []

        if (accountContent?.images && accountContent.images.length > 0) {
          imageUrls = await convertFilesToBase64(accountContent.images)
        }

        // Use video URL from R2 if available
        if (accountContent?.videoUrl) {
          console.log(`Using R2 video URL for ${account.platform}:`, accountContent.videoUrl)
          videoUrls = [accountContent.videoUrl]
        }

        // Handle YouTube thumbnail as primary image
        if (account.platform === 'YOUTUBE' && accountContent?.thumbnailUrl) {
          console.log(`Using R2 thumbnail URL for ${account.platform}:`, accountContent.thumbnailUrl)
          // For YouTube, thumbnail becomes the primary image
          imageUrls.unshift(accountContent.thumbnailUrl) // Add to beginning of array
        }

        const postData = {
          content: contentToSave.trim() || null, // Send null instead of empty string
          hashtags: hashtagsToSave,
          images: imageUrls,
          imageUrl: imageUrls[0] || null, // First image (thumbnail for YouTube)
          videos: videoUrls,
          videoUrl: videoUrls[0] || null,
          platform: account.platform,
          socialAccountIds: [accountId], // Single account per request
          // Include YouTube-specific fields
          ...(account.platform === 'YOUTUBE' && {
            title: accountContent?.title || 'Untitled Video',
            description: accountContent?.description || contentToSave.trim() || ''
          })
          // Note: No scheduledAt for drafts
        }

        console.log(`Saving draft for ${account.platform} (${account.accountName}):`, postData)

        try {
          // Regular API call for all posts (videos are already uploaded to R2)
          const response = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Include authentication cookies
            body: JSON.stringify(postData)
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error(`Failed to save draft for ${account.platform}. Status: ${response.status}, Response:`, errorText)
            continue
          }

          const result = await response.json()
          console.log(`Draft save response for ${account.platform}:`, result)
          successfulDrafts++
        } catch (error) {
          console.error(`Error saving draft for ${account.platform}:`, error)
        }
      }

      // Show immediate feedback for non-background uploads
      const backgroundUploads = totalDrafts - successfulDrafts

      // Only show toast messages if there are no background uploads to avoid interference
      if (backgroundUploads === 0) {
        if (successfulDrafts === totalDrafts) {
          toast({
            title: "Drafts Saved",
            description: `Successfully saved drafts for all ${totalDrafts} account${totalDrafts > 1 ? 's' : ''}.`,
            variant: "success"
          })
          // Reset the page after successful save
          setTimeout(() => {
            resetManualCreationState()
          }, 1500)
        } else if (successfulDrafts > 0) {
          toast({
            title: "Partial Success",
            description: `Saved ${successfulDrafts}/${totalDrafts} drafts successfully.`,
            variant: "destructive"
          })
        } else {
          toast({
            title: "Save Failed",
            description: "Failed to save drafts. Please try again.",
            variant: "destructive"
          })
        }
      }
      // For background uploads, the progress window will handle all user feedback
    } catch (error) {
      console.error('Failed to save drafts:', error)
      toast({
        title: "Error",
        description: "Failed to save drafts. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSavingDrafts(false)
    }
  }

  const handleManualSchedule = () => {
    if (creationState.selectedAccounts.length === 0) {
      toast({
        title: "No Accounts Selected",
        description: "Please select at least one social media account.",
        variant: "destructive"
      })
      return
    }

    // Check if there's any content to schedule (text or video)
    const hasGeneralContent = manualState.generalContent && manualState.generalContent.trim()
    const hasAccountSpecificContent = creationState.selectedAccounts.some(accountId => {
      const accountContent = manualState.accountContent[accountId]
      return (accountContent?.content && accountContent.content.trim()) || accountContent?.video
    })

    if (!hasGeneralContent && !hasAccountSpecificContent) {
      toast({
        title: "No Content",
        description: "Please enter some content or upload a video before scheduling.",
        variant: "destructive"
      })
      return
    }

    setShowScheduleModal(true)
  }

  // Handle schedule submission from modal
  const handleScheduleSubmit = async (scheduledAt: string) => {
    setIsPublishing(true)

    try {
      // Convert File objects to base64 for API
      const convertFilesToBase64 = async (files: File[]): Promise<string[]> => {
        const promises = files.map((file) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          })
        })
        return Promise.all(promises)
      }

      // Create separate posts for each selected account
      let successfulSchedules = 0
      let totalSchedules = creationState.selectedAccounts.length

      for (const accountId of creationState.selectedAccounts) {
        const account = socialAccounts.find(acc => acc.id === accountId)
        if (!account) continue

        const accountContent = manualState.accountContent[accountId]

        // Use account-specific content if available, otherwise use general content
        const contentToSchedule = accountContent?.content || manualState.generalContent || ''
        const hashtagsToSchedule = accountContent?.hashtags || []

        // Check if there's either text content, video content, or YouTube title
        const hasTextContent = contentToSchedule.trim()
        const hasVideoContent = accountContent?.videoUrl || accountContent?.video
        const hasYouTubeTitle = account.platform === 'YOUTUBE' && accountContent?.title?.trim()

        if (!hasTextContent && !hasVideoContent && !hasYouTubeTitle) {
          console.log(`Skipping ${account.platform} - no content, video, or title`)
          totalSchedules--
          continue
        }

        // Convert account-specific images to base64
        let imageUrls: string[] = []
        let videoUrls: string[] = []

        if (accountContent?.images && accountContent.images.length > 0) {
          imageUrls = await convertFilesToBase64(accountContent.images)
        }

        // Use video URL from R2 if available
        if (accountContent?.videoUrl) {
          console.log(`Using R2 video URL for ${account.platform}:`, accountContent.videoUrl)
          videoUrls = [accountContent.videoUrl]
        }

        // Handle YouTube thumbnail as primary image
        if (account.platform === 'YOUTUBE' && accountContent?.thumbnailUrl) {
          console.log(`Using R2 thumbnail URL for ${account.platform}:`, accountContent.thumbnailUrl)
          // For YouTube, thumbnail becomes the primary image
          imageUrls.unshift(accountContent.thumbnailUrl) // Add to beginning of array
        }

        const postData = {
          content: contentToSchedule.trim() || null, // Send null instead of empty string
          hashtags: hashtagsToSchedule,
          images: imageUrls,
          imageUrl: imageUrls[0] || null, // First image (thumbnail for YouTube)
          videos: videoUrls,
          videoUrl: videoUrls[0] || null,
          platform: account.platform,
          socialAccountIds: [accountId], // Single account per request
          scheduledAt: scheduledAt,
          // Include YouTube-specific fields
          ...(account.platform === 'YOUTUBE' && {
            title: accountContent?.title || 'Untitled Video',
            description: accountContent?.description || contentToSchedule.trim() || ''
          })
        }

        console.log(`Scheduling post for ${account.platform} (${account.accountName}):`, postData)

        try {
          // Regular API call for all posts (videos are already uploaded to R2)
          const response = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Include authentication cookies
            body: JSON.stringify(postData)
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error(`Failed to schedule for ${account.platform}. Status: ${response.status}, Response:`, errorText)
            continue
          }

          const result = await response.json()
          console.log(`Schedule response for ${account.platform}:`, result)
          successfulSchedules++
        } catch (error) {
          console.error(`Error scheduling for ${account.platform}:`, error)
        }
      }

      // Show immediate feedback for non-background uploads
      const backgroundSchedules = totalSchedules - successfulSchedules

      // Only show toast messages if there are no background uploads to avoid interference
      if (backgroundSchedules === 0) {
        if (successfulSchedules === totalSchedules) {
          toast({
            title: "Posts Scheduled",
            description: `Successfully scheduled posts for all ${totalSchedules} account${totalSchedules > 1 ? 's' : ''}.`,
            variant: "success"
          })
          setShowScheduleModal(false)
          // Reset the page after successful schedule
          setTimeout(() => {
            resetManualCreationState()
          }, 1500)
        } else if (successfulSchedules > 0) {
          toast({
            title: "Partial Success",
            description: `Scheduled ${successfulSchedules}/${totalSchedules} posts successfully.`,
            variant: "destructive"
          })
        } else {
          toast({
            title: "Schedule Failed",
            description: "Failed to schedule posts. Please try again.",
            variant: "destructive"
          })
        }
      } else {
        // For background uploads, close the modal but let progress window handle feedback
        setShowScheduleModal(false)
      }
    } catch (error) {
      console.error('Failed to schedule posts:', error)
      toast({
        title: "Error",
        description: "Failed to schedule posts. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsPublishing(false)
    }
  }

  const handleManualPublishNow = async () => {
    if (creationState.selectedAccounts.length === 0) {
      toast({
        title: "No Accounts Selected",
        description: "Please select at least one social media account.",
        variant: "destructive"
      })
      return
    }

    // Check if there's any content to publish (text or video)
    const hasGeneralContent = manualState.generalContent && manualState.generalContent.trim()
    const hasAccountSpecificContent = creationState.selectedAccounts.some(accountId => {
      const accountContent = manualState.accountContent[accountId]
      return (accountContent?.content && accountContent.content.trim()) || accountContent?.video
    })

    if (!hasGeneralContent && !hasAccountSpecificContent) {
      toast({
        title: "No Content",
        description: "Please enter some content or upload a video before publishing.",
        variant: "destructive"
      })
      return
    }

    setIsPublishing(true)

    try {
      // Convert File objects to base64 for API
      const convertFilesToBase64 = async (files: File[]): Promise<string[]> => {
        const promises = files.map((file) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          })
        })
        return Promise.all(promises)
      }

      // Publish to each selected account separately
      let successfulPosts = 0
      let totalPosts = creationState.selectedAccounts.length

      for (const accountId of creationState.selectedAccounts) {
        const account = socialAccounts.find(acc => acc.id === accountId)
        if (!account) continue

        const accountContent = manualState.accountContent[accountId]

        // Use account-specific content if available, otherwise use general content
        const contentToPublish = accountContent?.content || manualState.generalContent || ''
        const hashtagsToPublish = accountContent?.hashtags || []

        if (!contentToPublish.trim()) {
          console.log(`Skipping ${account.platform} - no content`)
          totalPosts--
          continue
        }

        // Convert account-specific images and videos to base64
        let imageUrls: string[] = []
        let videoUrls: string[] = []

        if (accountContent?.images && accountContent.images.length > 0) {
          imageUrls = await convertFilesToBase64(accountContent.images)
        }

        if (accountContent?.video) {
          const videoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(accountContent.video!)
          })
          videoUrls = [videoBase64]
        }

        const postData = {
          content: contentToPublish,
          hashtags: hashtagsToPublish,
          images: imageUrls,
          imageUrl: imageUrls[0] || null,
          videos: videoUrls,
          videoUrl: videoUrls[0] || null,
          platform: account.platform,
          socialAccountIds: [accountId] // Single account per request
          // Note: No scheduledAt for immediate publishing
        }

        console.log(`Publishing to ${account.platform} (${account.accountName}):`, postData)

        try {
          const response = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error(`Failed to publish to ${account.platform}. Status: ${response.status}, Response:`, errorText)
            continue
          }

          const result = await response.json()
          console.log(`Publish response for ${account.platform}:`, result)
          successfulPosts++
        } catch (error) {
          console.error(`Error publishing to ${account.platform}:`, error)
        }
      }

      if (successfulPosts === totalPosts) {
        toast({
          title: "Posts Published",
          description: `Successfully published to all ${totalPosts} account${totalPosts > 1 ? 's' : ''}.`,
          variant: "success"
        })
        // Reset the page after successful publish
        setTimeout(() => {
          resetManualCreationState()
        }, 1500) // Small delay to let user see the success message
      } else if (successfulPosts > 0) {
        toast({
          title: "Partial Success",
          description: `Published to ${successfulPosts}/${totalPosts} accounts successfully.`,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Publish Failed",
          description: "Failed to publish posts. Please try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to publish posts:', error)
      toast({
        title: "Error",
        description: "Failed to publish posts. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsPublishing(false)
    }
  }

  // Platform compatibility validation
  const validatePlatformCompatibility = (selectedPlatforms: string[]): { isValid: boolean; message?: string } => {
    if (selectedPlatforms.length <= 1) return { isValid: true }

    const textPlatforms = selectedPlatforms.filter(p => CONTENT_TYPES.TEXT_BASED.includes(p as any))
    const videoPlatforms = selectedPlatforms.filter(p => CONTENT_TYPES.VIDEO_BASED.includes(p as any))

    if (textPlatforms.length > 0 && videoPlatforms.length > 0) {
      return {
        isValid: false,
        message: "Cannot mix text-based platforms (Twitter, LinkedIn, Instagram, Facebook) with video platforms (YouTube, TikTok) as they require different content types."
      }
    }

    // All text platforms can now be selected together - AI will adjust tone per platform
    return { isValid: true }
  }

  // Check if a draft already exists for the given content and account
  const checkExistingDraft = async (content: string, platform: string, socialAccountId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/posts/check-existing-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          platform,
          socialAccountId
        })
      })

      if (response.ok) {
        const data = await response.json()
        return data.exists
      }
    } catch (error) {
      console.warn('⚠️ Failed to check existing draft:', error)
    }
    return false
  }

  // Check if content already exists as scheduled or published
  const checkIfContentExists = async (content: string, platform: string, socialAccountId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/posts/check-existing-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          platform,
          socialAccountId
        })
      })

      if (response.ok) {
        const data = await response.json()
        return data.exists
      }
    } catch (error) {
      console.warn('⚠️ Failed to check existing content:', error)
    }
    return false
  }

  // Auto-save generated content as drafts to prevent data loss
  const autoSaveAsDrafts = async (content: GeneratedContent[]) => {
    try {
      setAutoSaveStatus('saving')
      console.log('🔄 Auto-saving generated content as drafts...')
      
      // Also save to localStorage as backup
      try {
        localStorage.setItem('social-bot-draft-backup', JSON.stringify({
          content,
          topic: creationState.topic,
          timestamp: new Date().toISOString()
        }))
        console.log('💾 Local backup saved')
      } catch (localStorageError) {
        console.warn('⚠️ Local storage backup failed:', localStorageError)
      }
      
      let savedCount = 0
      let skippedCount = 0
      
      for (const contentItem of content) {
        const accountsForPlatform = socialAccounts.filter(
          account => account.platform === contentItem.platform &&
          creationState.selectedAccounts.includes(account.id)
        )

        for (const account of accountsForPlatform) {
          try {
            // Check if a draft already exists for this content and account
            const existingDraft = await checkExistingDraft(contentItem.content, contentItem.platform, account.id)
            
            if (existingDraft) {
              console.log(`📝 Draft already exists for ${account.platform} (${account.accountName}), skipping auto-save`)
              skippedCount++
              continue
            }

            // Also check if this content is already scheduled or published
            const isAlreadyScheduledOrPublished = await checkIfContentExists(contentItem.content, contentItem.platform, account.id)
            
            if (isAlreadyScheduledOrPublished) {
              console.log(`📝 Content already scheduled/published for ${account.platform} (${account.accountName}), skipping auto-save`)
              skippedCount++
              continue
            }

            const postData = {
              content: contentItem.content,
              hashtags: contentItem.hashtags,
              platform: contentItem.platform,
              socialAccountIds: [account.id],
              imageUrl: contentItem.imageUrl,
              images: contentItem.images || (contentItem.imageUrl ? [contentItem.imageUrl] : [])
            }

            console.log(`📝 Auto-saving draft for ${account.platform} (${account.accountName})`)

            const response = await fetch('/api/posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(postData)
            })

            const data = await response.json()
            if (data.success) {
              console.log(`✅ Auto-saved draft for ${account.platform} (${account.accountName})`)
              savedCount++
            } else {
              console.warn(`⚠️ Failed to auto-save draft for ${account.platform}: ${data.error?.message || 'Unknown error'}`)
            }
          } catch (error) {
            console.warn(`⚠️ Error auto-saving draft for ${account.platform}:`, error)
          }
        }
      }
      
      console.log(`🎉 Auto-save completed: ${savedCount} saved, ${skippedCount} skipped`)
      setAutoSaveStatus('saved')
      
      // Reset status after 3 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('❌ Auto-save failed:', error)
      setAutoSaveStatus('error')
      // Reset error status after 5 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 5000)
    }
  }

  // Restore content from localStorage backup if available
  const restoreFromBackup = () => {
    try {
      const backup = localStorage.getItem('social-bot-draft-backup')
      if (backup) {
        const backupData = JSON.parse(backup)
        const backupAge = new Date().getTime() - new Date(backupData.timestamp).getTime()
        const maxAge = 24 * 60 * 60 * 1000 // 24 hours
        
        if (backupAge < maxAge) {
          console.log('🔄 Restoring content from backup...')
          setCreationState(prev => ({
            ...prev,
            step: 'preview',
            topic: backupData.topic || '',
            generatedContent: backupData.content || []
          }))
          
          // Clear the backup after restoring
          localStorage.removeItem('social-bot-draft-backup')
          console.log('✅ Content restored from backup')
          return true
        } else {
          // Clear old backup
          localStorage.removeItem('social-bot-draft-backup')
          console.log('🗑️ Old backup cleared')
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to restore from backup:', error)
      localStorage.removeItem('social-bot-draft-backup')
    }
    return false
  }

  const generateContent = async () => {
    if (!creationState.topic.trim() || creationState.selectedAccounts.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please enter a topic and select at least one social account",
        variant: "warning"
      })
      return
    }

    // Check if we're generating the same topic (to prevent duplicate generation)
    if (creationState.generatedContent.length > 0 && 
        creationState.topic === creationState.generatedContent[0]?.content?.substring(0, 50)) {
      console.log('⚠️ Same topic detected, skipping generation to prevent duplicates')
      setCreationState(prev => ({ ...prev, step: 'preview' }))
      return
    }

    // Clean up any existing drafts for the previous content before generating new content
    if (creationState.generatedContent.length > 0) {
      console.log('🧹 Cleaning up previous content drafts before generating new content...')
      await cleanupDraftsForContent(creationState.generatedContent)
    }

    setCreationState(prev => ({ ...prev, step: 'generating', isGenerating: true }))

    try {
      // Get selected platforms
      const selectedPlatforms = socialAccounts
        .filter(account => creationState.selectedAccounts.includes(account.id))
        .map(account => account.platform)

      // Generate content for each platform
      const contentPromises = selectedPlatforms.map(async (platform) => {
        console.log(`Generating content for ${platform}...`)

        let aiPrompt = ''
        if (CONTENT_TYPES.VIDEO_BASED.includes(platform as any)) {
          if (platform === 'YOUTUBE') {
            aiPrompt = `Create YouTube video content about: ${creationState.topic}.
            Provide:
            1. An engaging title (max 100 characters)
            2. A detailed description (2-3 paragraphs)
            3. Relevant tags (10-15 tags, comma-separated)
            4. Main content/script outline
            5. Suggested hashtags
            Make it optimized for YouTube's algorithm and engaging for viewers.`
          } else if (platform === 'TIKTOK') {
            aiPrompt = `Create TikTok video content about: ${creationState.topic}.
            Provide:
            1. An engaging caption (max 150 characters)
            2. Trending hashtags (8-12 hashtags)
            3. Video concept/script outline
            4. Suggested effects or trends to use
            5. Music/sound suggestions
            Make it trendy, engaging, and optimized for TikTok's algorithm.`
          }
        } else {
          // Text-based platforms
          aiPrompt = `Create a ${platform.toLowerCase()} post about: ${creationState.topic}.
          Adjust the tone appropriately:
          - LinkedIn: Professional, thought-leadership tone
          - X: Concise, engaging, conversational
          - Instagram: Visual-focused, lifestyle-oriented
          - Facebook: Community-focused, personal
          Include relevant hashtags and make it platform-optimized.`
        }

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: aiPrompt,
            platform: platform
          })
        })

        console.log(`Response status for ${platform}:`, response.status)

        const data = await response.json()
        if (!data.success) {
          console.error(`API Error for ${platform}:`, data)
          throw new Error(`Failed to generate content for ${platform}: ${data.error?.message || 'Unknown error'}`)
        }

        // Extract content and hashtags from the API response
        const responseData = data.data
        const content = responseData.content || ''
        const hashtags = responseData.metadata?.hashtags || []

        // Also extract hashtags from content if not provided in metadata
        const hashtagMatches = content.match(/#\w+/g) || []
        const allHashtags = [...new Set([...hashtags, ...hashtagMatches])]
        const cleanContent = content.replace(/#\w+/g, '').trim()

        return {
          platform,
          content: cleanContent,
          hashtags: allHashtags,
          imagePrompt: creationState.mediaOptions.includeImages ?
            `Create a professional ${platform.toLowerCase()} image for: ${creationState.topic}` : undefined,
          imageUrl: undefined as string | undefined
        }
      })

      const generatedContent = await Promise.all(contentPromises)

      // Generate images if requested
      if (creationState.mediaOptions.includeImages) {
        const imageResponse = await fetch('/api/ai/generate-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Professional social media image for: ${creationState.topic}`,
            platforms: selectedPlatforms,
            style: creationState.mediaOptions.imageStyle,
            count: creationState.mediaOptions.imageCount
          })
        })

        const imageData = await imageResponse.json()
        if (imageData.success) {
          // Add images to generated content
          generatedContent.forEach(content => {
            const imageResult = imageData.data.images[content.platform]
            if (imageResult && imageResult.success) {
              content.imageUrl = imageResult.imageUrl
            }
          })
        }
      }

      setCreationState(prev => ({
        ...prev,
        step: 'preview',
        generatedContent,
        isGenerating: false
      }))

      // Auto-save generated content as drafts
      await autoSaveAsDrafts(generatedContent)

    } catch (error) {
      console.error('Content generation failed:', error)
      
      // Check if it's an AI service error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('User not found')) {
        toast({
          title: "AI Service Error",
          description: "AI service is not properly configured. Please check your OpenRouter API key.",
          variant: "destructive"
        })
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('credits')) {
        toast({
          title: "AI Service Limit",
          description: "AI service limit reached. Please try again later or check your OpenRouter account.",
          variant: "warning"
        })
      } else {
        toast({
          title: "Generation Failed",
          description: "Failed to generate content. Please try again.",
          variant: "destructive"
        })
      }
      
      setCreationState(prev => ({ ...prev, step: 'input', isGenerating: false }))
    }
  }

  const handlePublishNow = async () => {
    if (creationState.generatedContent.length === 0) return

    setIsPublishing(true)

    try {
      console.log('Starting publication process...')
      console.log('Generated content:', creationState.generatedContent)
      console.log('Selected accounts:', creationState.selectedAccounts)

      let totalPosts = 0
      let successfulPosts = 0
      let failedPosts = 0
      const errors: string[] = []
      const createdPostIds: string[] = []

      // Create posts for each platform
      for (const content of creationState.generatedContent) {
        const accountsForPlatform = socialAccounts.filter(
          account => account.platform === content.platform &&
          creationState.selectedAccounts.includes(account.id)
        )

        console.log(`Publishing to ${content.platform}, found ${accountsForPlatform.length} accounts`)

        for (const account of accountsForPlatform) {
          totalPosts++
          console.log(`Creating post for account: ${account.accountName} (${account.platform})`)

          try {
            const postData = {
              content: content.content,
              hashtags: content.hashtags,
              platform: content.platform, // Include the platform
              socialAccountIds: [account.id],
              imageUrl: content.imageUrl,
              images: content.images || (content.imageUrl ? [content.imageUrl] : [])
            }

            console.log('Post data:', postData)

            const response = await fetch('/api/posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(postData)
            })

            const data = await response.json()
            console.log('Create post response:', data)

            if (data.success) {
              createdPostIds.push(data.data.post.id)
              console.log(`Post created with ID: ${data.data.post.id}, now publishing...`)

              // Immediately publish the post
              const publishResponse = await fetch(`/api/posts/${data.data.post.id}/publish`, {
                method: 'POST'
              })

              const publishData = await publishResponse.json()
              console.log('Publish response:', publishData)

              if (publishData.success) {
                successfulPosts++
                console.log(`✅ Successfully published to ${account.platform} (${account.accountName})`)
              } else {
                failedPosts++
                const errorMsg = `Failed to publish to ${account.platform} (${account.accountName}): ${publishData.error?.message || 'Unknown error'}`
                console.error(errorMsg)
                errors.push(errorMsg)
              }
            } else {
              failedPosts++
              const errorMsg = `Failed to create post for ${account.platform} (${account.accountName}): ${data.error?.message || 'Unknown error'}`
              console.error(errorMsg)
              errors.push(errorMsg)
            }
          } catch (error) {
            failedPosts++
            const errorMsg = `Error processing ${account.platform} (${account.accountName}): ${error instanceof Error ? error.message : 'Unknown error'}`
            console.error(errorMsg)
            errors.push(errorMsg)
          }
        }
      }

      // Clean up any remaining drafts for this content
      if (createdPostIds.length > 0) {
        await cleanupDraftsForContent(creationState.generatedContent)
      }

      // Show appropriate success/error message
      if (successfulPosts === totalPosts) {
        toast({
          title: "Success!",
          description: `🎉 All ${totalPosts} posts published successfully!`,
          variant: "success"
        })
        resetCreationState()
      } else if (successfulPosts > 0) {
        toast({
          title: "Partial Success",
          description: `⚠️ ${successfulPosts}/${totalPosts} posts published successfully. Check console for errors.`,
          variant: "warning"
        })
      } else {
        toast({
          title: "Publication Failed",
          description: `❌ Failed to publish any posts. Check console for errors.`,
          variant: "destructive"
        })
      }

    } catch (error) {
      console.error('Failed to publish content:', error)
      toast({
        title: "Publication Failed",
        description: "Failed to publish content. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsPublishing(false)
    }
  }

  const handleSchedule = async (scheduledAt: string) => {
    if (creationState.generatedContent.length === 0) return

    setIsPublishing(true)

    try {
      console.log('📅 Starting to schedule content for:', new Date(scheduledAt).toLocaleString())
      console.log('📝 Content to schedule:', creationState.generatedContent.length, 'items')
      
      // Create posts for each platform first
      const createdPosts = []
      
      for (const content of creationState.generatedContent) {
        const accountsForPlatform = socialAccounts.filter(
          account => account.platform === content.platform &&
          creationState.selectedAccounts.includes(account.id)
        )

        console.log(`📱 Found ${accountsForPlatform.length} accounts for platform ${content.platform}`)

        for (const account of accountsForPlatform) {
          try {
            const postData = {
              content: content.content,
              hashtags: content.hashtags,
              platform: content.platform,
              socialAccountIds: [account.id],
              imageUrl: content.imageUrl,
              images: content.images || (content.imageUrl ? [content.imageUrl] : []),
              scheduledAt: scheduledAt
            }

            console.log(`📝 Creating scheduled post for ${account.platform} (${account.accountName})`)
            
            const response = await fetch('/api/posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(postData)
            })

            const data = await response.json()
            console.log(`📝 Post creation response for ${account.platform}:`, data)
            
            if (data.success) {
              createdPosts.push({
                postId: data.data.post.id,
                platform: content.platform,
                accountName: account.accountName
              })
              console.log(`✅ Successfully created scheduled post: ${data.data.post.id}`)
            } else {
              throw new Error(`Failed to create post for ${account.platform}: ${data.error?.message || 'Unknown error'}`)
            }
          } catch (error) {
            console.error(`❌ Error creating post for ${account.platform}:`, error)
            throw error
          }
        }
      }

      console.log(`📊 Total posts created: ${createdPosts.length}`)

      // Clean up any remaining drafts for this content AFTER successful creation
      if (createdPosts.length > 0) {
        console.log('🧹 Cleaning up drafts after successful scheduling...')
        await cleanupDraftsForContent(creationState.generatedContent)
      }

      // Show success message with actual count
      const scheduledTime = new Date(scheduledAt).toLocaleString()
      toast({
        title: "Content Scheduled",
        description: `Content scheduled successfully! ${createdPosts.length} posts will be published at ${scheduledTime}`,
        variant: "success"
      })
      
      console.log(`🎉 Scheduling completed successfully. ${createdPosts.length} posts scheduled for ${scheduledTime}`)
      resetCreationState()
    } catch (error) {
      console.error('❌ Failed to schedule content:', error)
      toast({
        title: "Scheduling Failed",
        description: `Failed to schedule content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      })
    } finally {
      setIsPublishing(false)
      setShowScheduleModal(false)
    }
  }

  const handleSaveAsDraft = async () => {
    if (creationState.generatedContent.length === 0) return

    setIsPublishing(true)

    try {
      let totalPosts = 0
      let successfulPosts = 0
      let failedPosts = 0
      const errors: string[] = []

      // Create draft posts for each platform
      for (const content of creationState.generatedContent) {
        const accountsForPlatform = socialAccounts.filter(
          account => account.platform === content.platform &&
          creationState.selectedAccounts.includes(account.id)
        )

        for (const account of accountsForPlatform) {
          totalPosts++
          try {
            const postData = {
              content: content.content,
              hashtags: content.hashtags,
              platform: content.platform, // Include the platform
              socialAccountIds: [account.id],
              imageUrl: content.imageUrl,
              images: content.images || (content.imageUrl ? [content.imageUrl] : [])
            }

            const response = await fetch('/api/posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(postData)
            })

            const data = await response.json()
            
            if (data.success) {
              successfulPosts++
              console.log(`✅ Draft saved for ${account.platform} (${account.accountName})`)
            } else {
              failedPosts++
              const errorMsg = `Failed to save draft for ${account.platform}: ${data.error?.message || 'Unknown error'}`
              console.error(errorMsg)
              errors.push(errorMsg)
            }
          } catch (error) {
            failedPosts++
            const errorMsg = `Error saving draft for ${account.platform}: ${error instanceof Error ? error.message : 'Unknown error'}`
            console.error(errorMsg)
            errors.push(errorMsg)
          }
        }
      }

      // Show appropriate success/error message
      if (successfulPosts === totalPosts) {
        toast({
          title: "Drafts Saved",
          description: `🎉 All ${totalPosts} drafts saved successfully!`,
          variant: "success"
        })
        resetCreationState()
      } else if (successfulPosts > 0) {
        toast({
          title: "Partial Success",
          description: `⚠️ ${successfulPosts}/${totalPosts} drafts saved successfully. Check console for errors.`,
          variant: "warning"
        })
      } else {
        toast({
          title: "Draft Saving Failed",
          description: `❌ Failed to save any drafts. Check console for errors.`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to save drafts:', error)
      toast({
        title: "Draft Saving Failed",
        description: "Failed to save drafts. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsPublishing(false)
    }
  }

  const resetCreationState = () => {
    setCreationState({
      step: 'mode-selection',
      mode: null,
      topic: '',
      selectedAccounts: [],
      mediaOptions: {
        includeImages: false,
        imageCount: 1,
        imageStyle: 'professional',
        includeVideo: false,
        videoDuration: '30s',
        videoDimensions: 'vertical',
        videoStyle: 'engaging'
      },
      generatedContent: [],
      manualContent: [],
      isGenerating: false
    })
  }

  // Complete page reset for manual mode
  const resetManualCreationState = () => {
    // Reset creation state
    setCreationState({
      step: 'mode-selection',
      mode: null,
      topic: '',
      selectedAccounts: [],
      mediaOptions: {
        includeImages: false,
        imageCount: 1,
        imageStyle: 'professional',
        includeVideo: false,
        videoDuration: '30s',
        videoDimensions: 'vertical',
        videoStyle: 'engaging'
      },
      generatedContent: [],
      manualContent: [],
      isGenerating: false
    })

    // Reset manual state
    setManualState({
      selectedTab: 'general',
      generalContent: '',
      generalHashtags: '',
      accountContent: {}
    })

    // Reset modal states
    setShowScheduleModal(false)
    setIsAdvancedEditOpen(false)
    setIsPreviewModalOpen(false)
    setSelectedContent(null)
    setPreviewContent(null)

    // Reset loading states
    setIsSavingDrafts(false)
    setIsPublishing(false)
    setAutoSaveStatus('idle')

    // Clear any localStorage backups
    try {
      localStorage.removeItem('social-bot-draft-backup')
    } catch (error) {
      console.warn('Failed to clear localStorage backup:', error)
    }

    console.log('🔄 Page state reset successfully')
  }

  // Clean up drafts for content that has been scheduled or published
  const cleanupDraftsForContent = async (content: GeneratedContent[]) => {
    try {
      console.log('🧹 Cleaning up drafts for published/scheduled content...')
      
      let totalCleaned = 0
      
      // Find and remove any draft posts that match this content
      for (const contentItem of content) {
        const accountsForPlatform = socialAccounts.filter(
          account => account.platform === contentItem.platform &&
          creationState.selectedAccounts.includes(account.id)
        )

        for (const account of accountsForPlatform) {
          try {
            // Find draft posts with matching content for this account
            const response = await fetch(`/api/posts/cleanup-drafts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: contentItem.content,
                platform: contentItem.platform,
                socialAccountId: account.id
              })
            })

            if (response.ok) {
              const data = await response.json()
              if (data.success) {
                console.log(`✅ Cleaned up ${data.cleanedCount} drafts for ${account.platform} (${account.accountName})`)
                totalCleaned += data.cleanedCount
              }
            }
          } catch (error) {
            console.warn(`⚠️ Failed to cleanup drafts for ${account.platform}:`, error)
          }
        }
      }

      console.log(`🧹 Total drafts cleaned up: ${totalCleaned}`)

      // Clear localStorage backup since content is now saved
      try {
        localStorage.removeItem('social-bot-draft-backup')
        console.log('🗑️ Local backup cleared')
      } catch (error) {
        console.warn('⚠️ Failed to clear local backup:', error)
      }

      // Refresh the posts list to show updated state
      try {
        window.dispatchEvent(new CustomEvent('posts-updated', { 
          detail: { action: 'drafts-cleaned', count: totalCleaned } 
        }))
        console.log('📡 Posts update event dispatched')
      } catch (error) {
        console.warn('⚠️ Failed to dispatch posts update event:', error)
      }
    } catch (error) {
      console.error('❌ Draft cleanup failed:', error)
    }
  }

  const handleEditContent = async (platformIndex: number, updatedContent: GeneratedContent) => {
    // Update local state first
    setCreationState(prev => ({
      ...prev,
      generatedContent: prev.generatedContent.map((content, index) =>
        index === platformIndex ? updatedContent : content
      )
    }))

    // Also save as draft to database if this is a new edit
    try {
      const accountsForPlatform = socialAccounts.filter(
        account => account.platform === updatedContent.platform &&
        creationState.selectedAccounts.includes(account.id)
      )

      if (accountsForPlatform.length > 0) {
        const account = accountsForPlatform[0] // Use first account for this platform
        const postData = {
          content: updatedContent.content,
          hashtags: updatedContent.hashtags,
          socialAccountIds: [account.id],
          imageUrl: updatedContent.imageUrl,
          images: updatedContent.images || (updatedContent.imageUrl ? [updatedContent.imageUrl] : [])
        }

        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData)
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            console.log(`✅ Content for ${updatedContent.platform} saved as draft`)
          }
        }
      }
    } catch (error) {
      console.error('Failed to save content as draft:', error)
    }
  }

  const handleRegenerateImage = async (platformIndex: number) => {
    const content = creationState.generatedContent[platformIndex]
    if (!content || !content.imagePrompt) return

    try {
      const response = await fetch('/api/ai/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: content.imagePrompt,
          platforms: [content.platform]
        })
      })

      const data = await response.json()
      if (data.success && data.data.images[content.platform]?.success) {
        const newImageUrl = data.data.images[content.platform].imageUrl
        setCreationState(prev => ({
          ...prev,
          generatedContent: prev.generatedContent.map((c, index) =>
            index === platformIndex ? { ...c, imageUrl: newImageUrl } : c
          )
        }))
      }
    } catch (error) {
      console.error('Failed to regenerate image:', error)
    }
  }

  const handleRegenerateContent = async (platformIndex?: number) => {
    // Implementation for regenerating specific platform content or all content
    if (platformIndex !== undefined) {
      // Regenerate specific platform
      const platform = creationState.generatedContent[platformIndex].platform
      // Add regeneration logic here
    } else {
      // Regenerate all content
      await generateContent()
    }
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
                <h2 className="text-xl font-bold tracking-tight mb-1">AI Content Creator</h2>
                <p className="text-sm opacity-60">Generate engaging content for multiple social platforms</p>
              </div>
            <div className="flex items-center gap-4">
              <TopRightControls unreadNotificationsCount={3} />
            </div>
          </div>

          <div className="space-y-6">
          {/* Header */}
        

          {/* Mode Selection */}
          {creationState.step === 'mode-selection' && (
            <div className="rounded-3xl p-8 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Choose Creation Mode</h3>
                <p className="text-gray-600 dark:text-gray-300">Select how you'd like to create your content</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* AI Generate Mode */}
                <div
                  onClick={() => handleModeSelection('ai-generate')}
                  className="group cursor-pointer rounded-2xl border-2 border-transparent bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 p-8 transition-all duration-300 hover:border-rose-300 hover:shadow-xl hover:scale-[1.02]"
                >
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300">
                      <Sparkles className="h-10 w-10 text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">AI Generate</h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">Let AI create engaging content optimized for each platform automatically</p>
                    <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <Zap className="h-4 w-4" />
                        <span>Smart platform optimization</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Palette className="h-4 w-4" />
                        <span>Auto-generated images</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Hash className="h-4 w-4" />
                        <span>Relevant hashtags</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Manual Create Mode */}
                <div
                  onClick={() => handleModeSelection('manual-create')}
                  className="group cursor-pointer rounded-2xl border-2 border-transparent bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-8 transition-all duration-300 hover:border-blue-300 hover:shadow-xl hover:scale-[1.02]"
                >
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300">
                      <Edit className="h-10 w-10 text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Manual Create</h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">Create custom content with full control over every detail for each platform</p>
                    <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <Settings className="h-4 w-4" />
                        <span>Full customization</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Target className="h-4 w-4" />
                        <span>Platform-specific fields</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Multi-account support</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step-based Content */}
          {creationState.step === 'input' && creationState.mode === 'ai-generate' && (
            <div className="rounded-3xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg">
              <div className="space-y-6">
                  {/* Topic Input */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-rose-200 to-pink-400 dark:from-rose-900/30 dark:to-pink-800/30 rounded-xl flex items-center justify-center shadow-lg">
                        <Target className="h-6 w-6 text-white dark:text-white" />
                      </div>
                      <div>
                        <Label htmlFor="topic" className="text-lg font-semibold text-gray-900 dark:text-white">What would you like to post about?</Label>
                        <p className="text-sm opacity-70 text-gray-600 dark:text-gray-300">Describe your topic, idea, or message in detail</p>
                      </div>
                    </div>
                    <Textarea
                      id="topic"
                      placeholder="e.g., Latest AI trends in 2024, New product launch, Industry insights, Company culture highlights..."
                      value={creationState.topic}
                      onChange={(e) => handleTopicChange(e.target.value)}
                      className="min-h-[140px] text-base border border-black/10 dark:border-white/10 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-800 rounded-xl transition-all duration-300 resize-none p-4 bg-white/40 dark:bg-neutral-800/30 focus:bg-white/60 dark:focus:bg-neutral-800/50"
                    />
                  </div>

                  {/* Select Social Accounts */}
                  <div className="rounded-3xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-br from-rose-200 to-pink-400 dark:from-rose-900/30 dark:to-pink-800/30 rounded-xl flex items-center justify-center shadow-lg">
                        <Users className="h-6 w-6 text-white dark:text-white" />
                      </div>
                      <div>
                        <Label className="text-lg font-semibold text-gray-900 dark:text-white">Select Social Accounts</Label>
                        <p className="text-sm opacity-70 text-gray-600 dark:text-gray-300">Choose which platforms to generate content for</p>
                      </div>
                    </div>

                    {loadingAccounts ? (
                      <div className="flex items-center justify-center p-8 text-center">
                        <div className="space-y-4">
                          <Loader2 className="w-12 h-12 animate-spin mx-auto text-rose-600" />
                          <p className="text-sm opacity-60">Loading social accounts...</p>
                        </div>
                      </div>
                    ) : socialAccounts.length === 0 ? (
                      <div className="text-center p-8 border-2 border-dashed border-black/10 dark:border-white/10 rounded-2xl bg-white/40 dark:bg-neutral-800/30">
                        <Users className="w-16 h-16 opacity-40 mx-auto mb-4" />
                        <p className="text-lg font-medium mb-2">No social accounts connected</p>
                        <p className="text-sm opacity-60 mb-6">Connect your social media accounts to start creating content</p>
                        <Link href="/integrations">
                          <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-sm font-medium transition-all shadow-sm hover:shadow-lg transform hover:scale-[1.02]">
                            Connect Social Accounts
                          </button>
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {socialAccounts.map((account) => (
                          <div
                            key={account.id}
                            className={`group rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/50 p-4 cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-lg ${
                              creationState.selectedAccounts.includes(account.id)
                                ? 'ring-2 ring-rose-500 bg-rose-50/80 dark:bg-rose-900/30'
                                : 'hover:bg-white/80 dark:hover:bg-neutral-800/70'
                            }`}
                            onClick={() => handleSocialAccountToggle(account.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`inline-flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 px-3 py-2 bg-white/60 dark:bg-neutral-900/60`}>
                                <div className={`h-6 w-6 grid place-items-center rounded-lg text-white ${
                                  account.platform === 'TWITTER' 
                                    ? 'bg-gradient-to-br from-neutral-800 to-neutral-900'
                                    : account.platform === 'LINKEDIN'
                                    ? 'bg-gradient-to-br from-sky-600 to-sky-800'
                                    : account.platform === 'INSTAGRAM'
                                    ? 'bg-gradient-to-br from-pink-500 to-purple-600'
                                    : account.platform === 'YOUTUBE'
                                    ? 'bg-gradient-to-br from-red-500 to-rose-600'
                                    : account.platform === 'FACEBOOK'
                                    ? 'bg-gradient-to-br from-blue-500 to-blue-700'
                                    : 'bg-gradient-to-br from-gray-500 to-gray-600'
                                }`}>
                                  {account.platform === 'TWITTER' ? (
                                    <XLogo className="h-3.5 w-3.5 text-white" />
                                  ) : account.platform === 'LINKEDIN' ? (
                                    <Linkedin className="h-3.5 w-3.5 text-white" />
                                  ) : account.platform === 'INSTAGRAM' ? (
                                    <Instagram className="h-3.5 w-3.5 text-white" />
                                  ) : account.platform === 'YOUTUBE' ? (
                                    <Youtube className="h-3.5 w-3.5 text-white" />
                                  ) : account.platform === 'FACEBOOK' ? (
                                    <Facebook className="h-3.5 w-3.5 text-white" />
                                  ) : (
                                    <span className="text-white text-xs font-bold">?</span>
                                  )}
                                </div>
                                <span className="text-xs font-medium">
                                  {account.platform === 'TWITTER' ? 'X' : account.platform}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                  {account.displayName || account.accountName}
                                </p>
                                <p className="truncate text-xs text-neutral-500">
                                  @{account.username || account.accountName}
                                </p>
                              </div>
                              <div className="ml-auto flex items-center gap-2">
                                <Badge 
                                  variant="secondary" 
                                  className={`rounded-full ${
                                    creationState.selectedAccounts.includes(account.id)
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                      : "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300"
                                  }`}
                                >
                                  {creationState.selectedAccounts.includes(account.id) ? "Selected" : "Not Selected"}
                                </Badge>
                                <Checkbox
                                  checked={creationState.selectedAccounts.includes(account.id)}
                                  onChange={() => handleSocialAccountToggle(account.id)}
                                  className="w-4 h-4 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Enhanced Media Options */}
                  <div className="rounded-3xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-rose-600 to-pink-400 rounded-2xl flex items-center justify-center shadow-lg">
                        <Palette className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <Label className="text-lg font-semibold text-gray-900 dark:text-white">Media Options</Label>
                        <p className="text-sm opacity-70 text-gray-600 dark:text-gray-300">
                          Configure AI-generated media for your content
                        </p>
                      </div>
                    </div>

                    {/* Determine content type based on selected platforms */}
                    {(() => {
                      const selectedPlatforms = socialAccounts
                        .filter(acc => creationState.selectedAccounts.includes(acc.id))
                        .map(acc => acc.platform)

                      const hasTextPlatforms = selectedPlatforms.some(p => CONTENT_TYPES.TEXT_BASED.includes(p as any))
                      const hasVideoPlatforms = selectedPlatforms.some(p => CONTENT_TYPES.VIDEO_BASED.includes(p as any))

                      if (hasVideoPlatforms && !hasTextPlatforms) {
                        // Video platforms only (YouTube, TikTok)
                        return (
                          <div className="space-y-6">
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-800 dark:to-orange-800 flex items-center justify-center">
                                  <Youtube className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </div>
                                <h4 className="font-semibold text-red-700 dark:text-red-300">Video Content Options</h4>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-red-700 dark:text-red-300">Video Format</Label>
                                  <select
                                    value={creationState.mediaOptions.videoDimensions}
                                    onChange={(e) => handleMediaOptionsChange({ videoDimensions: e.target.value as 'vertical' | 'horizontal' })}
                                    className="w-full px-3 py-2 border border-red-200 dark:border-red-800 rounded-lg bg-white/60 dark:bg-neutral-800/30"
                                  >
                                    <option value="vertical">Vertical (9:16) - TikTok Style</option>
                                    <option value="horizontal">Horizontal (16:9) - YouTube Style</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-red-700 dark:text-red-300">Duration</Label>
                                  <select
                                    value={creationState.mediaOptions.videoDuration}
                                    onChange={(e) => handleMediaOptionsChange({ videoDuration: e.target.value })}
                                    className="w-full px-3 py-2 border border-red-200 dark:border-red-800 rounded-lg bg-white/60 dark:bg-neutral-800/30"
                                  >
                                    <option value="15s">15 seconds</option>
                                    <option value="30s">30 seconds</option>
                                    <option value="60s">1 minute</option>
                                    <option value="3m">3 minutes</option>
                                    <option value="5m">5 minutes</option>
                                  </select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                  <Label className="text-sm font-medium text-red-700 dark:text-red-300">Video Style</Label>
                                  <select
                                    value={creationState.mediaOptions.videoStyle}
                                    onChange={(e) => handleMediaOptionsChange({ videoStyle: e.target.value })}
                                    className="w-full px-3 py-2 border border-red-200 dark:border-red-800 rounded-lg bg-white/60 dark:bg-neutral-800/30"
                                  >
                                    <option value="engaging">Engaging & Dynamic</option>
                                    <option value="educational">Educational</option>
                                    <option value="entertaining">Entertaining</option>
                                    <option value="professional">Professional</option>
                                    <option value="trendy">Trendy & Modern</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      } else if (hasTextPlatforms && !hasVideoPlatforms) {
                        // Text platforms only (Twitter, LinkedIn, Instagram, Facebook)
                        return (
                          <div className="space-y-6">
                            {/* Image Toggle */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-800 dark:to-pink-800 flex items-center justify-center">
                                  <ImageIcon className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                                </div>
                                <Label className="text-base font-medium text-gray-900 dark:text-white">Include Images</Label>
                              </div>
                              <button
                                onClick={() => handleImageToggle(!creationState.mediaOptions.includeImages)}
                                className={`relative w-16 h-8 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:ring-offset-2 ${
                                  creationState.mediaOptions.includeImages
                                    ? 'bg-gradient-to-r from-rose-500 to-pink-600 shadow-lg'
                                    : 'bg-gray-300 dark:bg-neutral-600 shadow-md'
                                }`}
                              >
                                <div className={`absolute top-0.5 w-7 h-7 bg-white rounded-full transition-all duration-300 shadow-lg ${
                                  creationState.mediaOptions.includeImages ? 'translate-x-8' : 'translate-x-0'
                                }`} />
                              </button>
                            </div>

                            {/* Image Options */}
                            {creationState.mediaOptions?.includeImages && (
                              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 border border-rose-200 dark:border-rose-800">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium text-rose-700 dark:text-rose-300">Number of Images</Label>
                                    <select
                                      value={creationState.mediaOptions?.imageCount ?? 1}
                                      onChange={(e) => handleMediaOptionsChange({ imageCount: parseInt(e.target.value) })}
                                      className="w-full px-3 py-2 border border-rose-200 dark:border-rose-800 rounded-lg bg-white/60 dark:bg-neutral-800/30"
                                    >
                                      <option value="1">1 image</option>
                                      <option value="2">2 images</option>
                                      <option value="3">3 images</option>
                                      <option value="4">4 images</option>
                                    </select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium text-rose-700 dark:text-rose-300">Image Style</Label>
                                    <select
                                      value={creationState.mediaOptions?.imageStyle ?? 'professional'}
                                      onChange={(e) => handleMediaOptionsChange({ imageStyle: e.target.value })}
                                      className="w-full px-3 py-2 border border-rose-200 dark:border-rose-800 rounded-lg bg-white/60 dark:bg-neutral-800/30"
                                    >
                                      <option value="professional">Professional</option>
                                      <option value="casual">Casual</option>
                                      <option value="creative">Creative</option>
                                      <option value="minimalist">Minimalist</option>
                                      <option value="vibrant">Vibrant</option>
                                      <option value="elegant">Elegant</option>
                                    </select>
                                  </div>
                                </div>
                                <p className="text-sm text-rose-600 dark:text-rose-400 mt-3">
                                  AI will generate {creationState.mediaOptions?.imageCount ?? 1} {creationState.mediaOptions?.imageStyle ?? ''} image{((creationState.mediaOptions?.imageCount ?? 1) > 1 ? 's' : '')} optimized for your selected platforms
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      } else {
                        // No platforms selected or mixed platforms (show compatibility message)
                        return (
                          <div className="p-4 rounded-2xl bg-gradient-to-r from-gray-50 to-neutral-50 dark:from-gray-900/20 dark:to-neutral-900/20 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-gray-100 to-neutral-100 dark:from-gray-800 dark:to-neutral-800 flex items-center justify-center">
                                <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              </div>
                              <h4 className="font-semibold text-gray-700 dark:text-gray-300">Media Options</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {selectedPlatforms.length === 0
                                ? "Select social accounts to configure media options"
                                : "Media options will appear based on your platform selection"
                              }
                            </p>
                          </div>
                        )
                      }
                    })()}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-6 flex gap-4">
                    <button
                      onClick={() => setCreationState(prev => ({ ...prev, step: 'mode-selection' }))}
                      className="px-6 py-3 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/6 transition-all duration-300 flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:shadow-md"
                    >
                      <ArrowLeft className="h-5 w-5" />
                      Back to Mode Selection
                    </button>
                    <button
                      onClick={generateContent}
                      disabled={!creationState.topic.trim() || creationState.selectedAccounts.length === 0 || creationState.isGenerating}
                      className="flex-1 px-6 py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white flex items-center justify-center gap-3 font-semibold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-lg transform hover:scale-[1.02]"
                    >
                      <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                        <Wand2 className="h-5 w-5 text-white" />
                      </div>
                      Generate Content with AI
                    </button>
                  </div>
                </div>
              </div>
           
          )}

          {/* Manual Create Mode */}
          {creationState.step === 'input' && creationState.mode === 'manual-create' && (
            <div className="space-y-6">
              {/* Account Selection for Manual Mode */}
              <div className="rounded-3xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-200 to-indigo-400 dark:from-blue-900/30 dark:to-indigo-800/30 rounded-xl flex items-center justify-center shadow-lg">
                    <Users className="h-6 w-6 text-white dark:text-white" />
                  </div>
                  <div>
                    <Label className="text-lg font-semibold text-gray-900 dark:text-white">Select Accounts</Label>
                    <p className="text-sm opacity-70 text-gray-600 dark:text-gray-300">Choose accounts to create custom content for</p>
                  </div>
                </div>

                {loadingAccounts ? (
                  <div className="flex items-center justify-center p-8 text-center">
                    <div className="space-y-4">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
                      <p className="text-sm opacity-60">Loading social accounts...</p>
                    </div>
                  </div>
                ) : socialAccounts.length === 0 ? (
                  <div className="text-center p-8 border-2 border-dashed border-black/10 dark:border-white/10 rounded-2xl bg-white/40 dark:bg-neutral-800/30">
                    <Users className="w-16 h-16 opacity-40 mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">No social accounts connected</p>
                    <p className="text-sm opacity-60 mb-6">Connect your social media accounts to start creating content</p>
                    <Link href="/integrations">
                      <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-sm font-medium transition-all shadow-sm hover:shadow-lg transform hover:scale-[1.02]">
                        Connect Social Accounts
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {socialAccounts.map((account) => (
                      <div
                        key={account.id}
                        className={`group rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/50 p-4 cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-lg ${
                          creationState.selectedAccounts.includes(account.id)
                            ? 'ring-2 ring-blue-500 bg-blue-50/80 dark:bg-blue-900/30'
                            : 'hover:bg-white/80 dark:hover:bg-neutral-800/70'
                        }`}
                        onClick={() => handleSocialAccountToggle(account.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`inline-flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 px-3 py-2 bg-white/60 dark:bg-neutral-900/60`}>
                            <div className={`h-6 w-6 grid place-items-center rounded-lg text-white ${getPlatformColor(account.platform)}`}>
                              {account.platform === 'TWITTER' ? (
                                <XLogo className="h-3.5 w-3.5 text-white" />
                              ) : account.platform === 'LINKEDIN' ? (
                                <Linkedin className="h-3.5 w-3.5 text-white" />
                              ) : account.platform === 'INSTAGRAM' ? (
                                <Instagram className="h-3.5 w-3.5 text-white" />
                              ) : account.platform === 'YOUTUBE' ? (
                                <Youtube className="h-3.5 w-3.5 text-white" />
                              ) : account.platform === 'FACEBOOK' ? (
                                <Facebook className="h-3.5 w-3.5 text-white" />
                              ) : (
                                <span className="text-white text-xs font-bold">?</span>
                              )}
                            </div>
                            <span className="text-xs font-medium">
                              {account.platform === 'TWITTER' ? 'X' : account.platform}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                              {account.displayName || account.accountName}
                            </p>
                            <p className="truncate text-xs text-neutral-500">
                              @{account.username || account.accountName}
                            </p>
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={`rounded-full ${
                                creationState.selectedAccounts.includes(account.id)
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300"
                              }`}
                            >
                              {creationState.selectedAccounts.includes(account.id) ? "Selected" : "Not Selected"}
                            </Badge>
                            <Checkbox
                              checked={creationState.selectedAccounts.includes(account.id)}
                              onChange={() => handleSocialAccountToggle(account.id)}
                              className="w-4 h-4 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Enhanced Tabbed Content Creation */}
              {creationState.selectedAccounts.length > 0 && (
                <div className="rounded-3xl bg-gradient-to-br from-white/80 to-white/60 dark:from-neutral-900/80 dark:to-neutral-900/60 border border-black/5 dark:border-white/5 shadow-2xl backdrop-blur-xl overflow-hidden">
                  {/* Header */}
                  <div className="p-8 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Edit className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create Content</h3>
                        <p className="text-sm opacity-70 text-gray-600 dark:text-gray-300">Customize content for each selected platform</p>
                      </div>
                    </div>
                  </div>

                  {/* Tab Navigation */}
                  <div className="px-8 pt-6 pb-2">
                    <div className="flex flex-wrap gap-2 p-1 bg-gray-100/60 dark:bg-neutral-800/60 rounded-2xl backdrop-blur-sm">
                      {/* General Tab - Only show when multiple accounts are selected */}
                      {creationState.selectedAccounts.length > 1 && (
                        <button
                          onClick={() => handleTabChange('general')}
                          className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                            manualState.selectedTab === 'general'
                              ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-lg ring-1 ring-blue-200 dark:ring-blue-800'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-neutral-700/50'
                          }`}
                        >
                          <Settings className="h-4 w-4" />
                          General
                        </button>
                      )}

                      {/* Account Tabs */}
                      {creationState.selectedAccounts.map((accountId) => {
                        const account = socialAccounts.find(acc => acc.id === accountId)
                        if (!account) return null

                        return (
                          <button
                            key={accountId}
                            onClick={() => handleTabChange(accountId)}
                            className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center gap-2 max-w-[200px] ${
                              manualState.selectedTab === accountId
                                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-lg ring-1 ring-blue-200 dark:ring-blue-800'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-neutral-700/50'
                            }`}
                          >
                            <div className={`h-5 w-5 grid place-items-center rounded text-white text-xs ${getPlatformColor(account.platform)}`}>
                              {account.platform === 'TWITTER' ? (
                                <XLogo className="h-3 w-3 text-white" />
                              ) : account.platform === 'LINKEDIN' ? (
                                <Linkedin className="h-3 w-3 text-white" />
                              ) : account.platform === 'INSTAGRAM' ? (
                                <Instagram className="h-3 w-3 text-white" />
                              ) : account.platform === 'YOUTUBE' ? (
                                <Youtube className="h-3 w-3 text-white" />
                              ) : account.platform === 'FACEBOOK' ? (
                                <Facebook className="h-3 w-3 text-white" />
                              ) : (
                                <span className="text-white text-xs font-bold">?</span>
                              )}
                            </div>
                            <span className="text-sm font-medium truncate">
                              {account.displayName || account.accountName || (account.platform === 'TWITTER' ? 'X' : account.platform)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="p-8 pt-4">
                    {(manualState.selectedTab === 'general' && creationState.selectedAccounts.length > 1) ? (
                      // General Tab Content - Only show when multiple accounts are selected
                      <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50/60 to-indigo-50/60 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-800/50">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                              <Settings className="h-4 w-4 text-white" />
                            </div>
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100">General Content</h4>
                          </div>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                            Content entered here will be automatically applied to all platforms. You can customize individual platforms in their respective tabs.
                          </p>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="general-content" className="text-base font-medium text-gray-900 dark:text-white">Content</Label>
                            <Textarea
                              id="general-content"
                              placeholder="Write your content here. This will be applied to all selected platforms..."
                              value={manualState.generalContent}
                              onChange={(e) => handleGeneralContentChange(e.target.value)}
                              className="min-h-[140px] resize-none text-base border-2 border-gray-200/60 dark:border-gray-700/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 rounded-xl bg-white/60 dark:bg-neutral-800/60"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="general-hashtags" className="text-base font-medium text-gray-900 dark:text-white">Hashtags</Label>
                            <HashtagInput
                              value={manualState.generalHashtags ? manualState.generalHashtags.split(' ').filter(tag => tag.trim()) : []}
                              onChange={(hashtags) => handleGeneralHashtagsChange(hashtags.join(' '))}
                              placeholder="Add hashtags..."
                              className="text-base border-2 border-gray-200/60 dark:border-gray-700/60 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200 dark:focus-within:ring-blue-800 bg-white/60 dark:bg-neutral-800/60"
                              maxTags={30}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Individual Account Tab Content
                      (() => {
                        const account = socialAccounts.find(acc => acc.id === manualState.selectedTab)
                        if (!account) return null

                        const isVideoPlatform = CONTENT_TYPES.VIDEO_BASED.includes(account.platform as any)
                        const accountContent = manualState.accountContent[account.id] || {
                          platform: account.platform,
                          content: manualState.generalContent,
                          hashtags: manualState.generalHashtags ? manualState.generalHashtags.split(' ').filter(tag => tag.trim()) : [],
                          includeImages: false,
                          imageCount: 1,
                          imageStyle: 'professional',
                          includeVideo: false,
                          includeThumbnail: false
                        }

                        return (
                          <div className="space-y-6">


                            {/* Platform-Specific Form */}
                            <div className="space-y-4">
                              {isVideoPlatform ? (
                                // Video Platform Fields
                                <>
                                  {account.platform === 'YOUTUBE' ? (
                                    // YouTube-specific fields
                                    <>
                                      <div className="space-y-2">
                                        <Label className="text-base font-medium text-gray-900 dark:text-white">Title <span className="text-red-500">*</span></Label>
                                        <Input
                                          placeholder="Enter YouTube video title..."
                                          value={accountContent.title || ''}
                                          onChange={(e) => handleAccountContentChange(account.id, 'title', e.target.value)}
                                          className="text-base border-2 border-gray-200/60 dark:border-gray-700/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 rounded-xl bg-white/60 dark:bg-neutral-800/60"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-base font-medium text-gray-900 dark:text-white">Description <span className="text-red-500">*</span></Label>
                                        <Textarea
                                          placeholder="Enter YouTube video description..."
                                          value={accountContent.description || ''}
                                          onChange={(e) => handleAccountContentChange(account.id, 'description', e.target.value)}
                                          className="min-h-[120px] resize-none text-base border-2 border-gray-200/60 dark:border-gray-700/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 rounded-xl bg-white/60 dark:bg-neutral-800/60"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-base font-medium text-gray-900 dark:text-white">Tags <span className="text-red-500">*</span></Label>
                                        <Input
                                          placeholder="tag1, tag2, tag3 (comma-separated)"
                                          value={Array.isArray(accountContent.tags) ? accountContent.tags.join(', ') : ''}
                                          onChange={(e) => handleAccountContentChange(account.id, 'tags', e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                                          className="text-base border-2 border-gray-200/60 dark:border-gray-700/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 rounded-xl bg-white/60 dark:bg-neutral-800/60"
                                        />
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label className="text-base font-medium text-gray-900 dark:text-white">Category</Label>
                                          <select
                                            value={accountContent.category || 'Entertainment'}
                                            onChange={(e) => handleAccountContentChange(account.id, 'category', e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-gray-200/60 dark:border-gray-700/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 rounded-xl bg-white/60 dark:bg-neutral-800/60 text-base"
                                          >
                                            <option value="Entertainment">Entertainment</option>
                                            <option value="Education">Education</option>
                                            <option value="Science & Technology">Science & Technology</option>
                                            <option value="Gaming">Gaming</option>
                                            <option value="Music">Music</option>
                                            <option value="Sports">Sports</option>
                                            <option value="News & Politics">News & Politics</option>
                                            <option value="Howto & Style">Howto & Style</option>
                                            <option value="Travel & Events">Travel & Events</option>
                                            <option value="People & Blogs">People & Blogs</option>
                                          </select>
                                        </div>
                                        <div className="space-y-2">
                                          <Label className="text-base font-medium text-gray-900 dark:text-white">Privacy</Label>
                                          <select
                                            value={accountContent.privacy || 'public'}
                                            onChange={(e) => handleAccountContentChange(account.id, 'privacy', e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-gray-200/60 dark:border-gray-700/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 rounded-xl bg-white/60 dark:bg-neutral-800/60 text-base"
                                          >
                                            <option value="public">Public</option>
                                            <option value="unlisted">Unlisted</option>
                                            <option value="private">Private</option>
                                          </select>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    // TikTok-specific fields
                                    <>
                                      <div className="space-y-2">
                                        <Label className="text-base font-medium text-gray-900 dark:text-white">Caption <span className="text-red-500">*</span></Label>
                                        <Textarea
                                          placeholder="Enter TikTok caption..."
                                          value={accountContent.caption || ''}
                                          onChange={(e) => handleAccountContentChange(account.id, 'caption', e.target.value)}
                                          className="min-h-[100px] resize-none text-base border-2 border-gray-200/60 dark:border-gray-700/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 rounded-xl bg-white/60 dark:bg-neutral-800/60"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-base font-medium text-gray-900 dark:text-white">Hashtags</Label>
                                        <HashtagInput
                                          value={Array.isArray(accountContent.hashtags) ? accountContent.hashtags : []}
                                          onChange={(hashtags) => handleAccountContentChange(account.id, 'hashtags', hashtags)}
                                          placeholder="Add hashtags..."
                                          className="text-base border-2 border-gray-200/60 dark:border-gray-700/60 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200 dark:focus-within:ring-blue-800 bg-white/60 dark:bg-neutral-800/60"
                                          maxTags={30}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-base font-medium text-gray-900 dark:text-white">Effects (Optional)</Label>
                                        <Input
                                          placeholder="effect1, effect2, effect3 (comma-separated)"
                                          value={Array.isArray(accountContent.effects) ? accountContent.effects.join(', ') : ''}
                                          onChange={(e) => handleAccountContentChange(account.id, 'effects', e.target.value.split(',').map(effect => effect.trim()).filter(effect => effect))}
                                          className="text-base border-2 border-gray-200/60 dark:border-gray-700/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 rounded-xl bg-white/60 dark:bg-neutral-800/60"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-base font-medium text-gray-900 dark:text-white">Sound/Music (Optional)</Label>
                                        <Input
                                          placeholder="Enter sound or music name..."
                                          value={accountContent.sounds || ''}
                                          onChange={(e) => handleAccountContentChange(account.id, 'sounds', e.target.value)}
                                          className="text-base border-2 border-gray-200/60 dark:border-gray-700/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 rounded-xl bg-white/60 dark:bg-neutral-800/60"
                                        />
                                      </div>
                                    </>
                                  )}

                                  {/* Video Upload Section - 2 Column Layout for Video Platforms */}
                                  {['TWITTER', 'X', 'LINKEDIN', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'TIKTOK'].includes(account.platform) && (
                                  <div className="space-y-4">
                                    {/* Video Upload Toggles - 2 Column Layout */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Video Upload Toggle */}
                                      <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-red-50/60 to-orange-50/60 dark:from-red-800/60 dark:to-orange-800/60 border border-red-200/50 dark:border-red-700/50">
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center">
                                              <Upload className="h-4 w-4 text-white" />
                                            </div>
                                            <Label className="text-base font-medium text-gray-900 dark:text-white">Upload Video</Label>
                                          </div>
                                          <Switch
                                            checked={accountContent.includeVideo || false}
                                            onCheckedChange={(checked) => handleAccountContentChange(account.id, 'includeVideo', checked)}
                                          />
                                        </div>
                                      </div>

                                      {/* Thumbnail Upload Toggle (YouTube only) */}
                                      {account.platform === 'YOUTUBE' && (
                                        <div className="space-y-4">
                                          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-orange-50/60 to-yellow-50/60 dark:from-orange-800/60 dark:to-yellow-800/60 border border-orange-200/50 dark:border-orange-700/50">
                                            <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-xl flex items-center justify-center">
                                                <ImageIcon className="h-4 w-4 text-white" />
                                              </div>
                                              <Label className="text-base font-medium text-gray-900 dark:text-white">Custom Thumbnail</Label>
                                            </div>
                                            <Switch
                                              checked={accountContent.includeThumbnail || false}
                                              onCheckedChange={(checked) => handleAccountContentChange(account.id, 'includeThumbnail', checked)}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Fixed Dimension Media Container for Video Platforms */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {/* Video Upload Container */}
                                      {accountContent.includeVideo && (
                                        <div className="space-y-4">
                                          <div className="h-80 p-4 rounded-xl bg-gradient-to-br from-red-50/60 to-orange-50/60 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200/50 dark:border-red-800/50 overflow-hidden">
                                            {!accountContent.video && !accountContent.videoUrl ? (
                                              <div
                                                className="h-full border-2 border-dashed border-red-300 dark:border-red-700 rounded-xl flex flex-col items-center justify-center text-center bg-white/40 dark:bg-neutral-800/40 transition-all duration-300 hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50/40 dark:hover:bg-red-900/10"
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, account.id, 'video')}
                                              >
                                                <input
                                                  type="file"
                                                  accept="video/*"
                                                  onChange={(e) => e.target.files && handleVideoUpload(account.id, e.target.files)}
                                                  className="hidden"
                                                  id={`video-upload-${account.id}`}
                                                />
                                                <label htmlFor={`video-upload-${account.id}`} className="cursor-pointer flex flex-col items-center gap-3">
                                                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center">
                                                    <Upload className="h-6 w-6 text-white" />
                                                  </div>
                                                  <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                      Drop video here or click to upload
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                      MP4, MOV, AVI up to 500MB
                                                    </p>
                                                  </div>
                                                </label>
                                              </div>
                                            ) : (
                                              <div className="h-full relative">
                                                <div className="w-full h-full rounded-lg overflow-hidden">
                                                  <video
                                                    src={accountContent.videoUrl || (accountContent.video ? URL.createObjectURL(accountContent.video) : '')}
                                                    className="w-full h-full object-contain"
                                                    controls
                                                    preload="metadata"
                                                    playsInline
                                                    muted
                                                  />
                                                </div>
                                                <button
                                                  onClick={() => handleVideoRemove(account.id)}
                                                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-200 z-10"
                                                >
                                                  ×
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                          {/* Video Info with Requirements */}
                                          <div className="text-xs text-red-600 dark:text-red-400 space-y-1">
                                            <div className="flex items-center gap-2 group relative">
                                              <Info className="h-3 w-3 cursor-help" />
                                              <span>Video requirements for {account.platform}</span>

                                              {/* Tooltip with detailed requirements */}
                                              <div className="absolute bottom-full left-0 mb-2 w-80 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                                  {account.platform} Video Requirements
                                                </div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                            {account.platform === 'TWITTER' || account.platform === 'X' ? (
                                              <>
                                                <div>• Formats: MP4, MOV</div>
                                                <div>• Max size: 512MB</div>
                                                <div>• Max duration: 2 minutes 20 seconds</div>
                                                <div>• Recommended: Landscape (16:9) or Square (1:1)</div>
                                                <div className="text-amber-600 dark:text-amber-400">• Note: Upload works, publishing coming soon</div>
                                              </>
                                            ) : account.platform === 'LINKEDIN' ? (
                                              <>
                                                <div>• Formats: MP4, MOV, AVI, MKV, WMV, FLV, WebM, ASF</div>
                                                <div>• Max size: 5GB</div>
                                                <div>• Max duration: 10 minutes</div>
                                                <div>• Recommended: Landscape (16:9) or Square (1:1)</div>
                                                <div className="text-amber-600 dark:text-amber-400">• Note: Upload works, publishing coming soon</div>
                                              </>
                                            ) : account.platform === 'INSTAGRAM' ? (
                                              <>
                                                <div>• Formats: MP4, MOV</div>
                                                <div>• Max size: 4GB</div>
                                                <div>• Max duration: 60 minutes</div>
                                                <div>• Recommended: Square (1:1) or Vertical (4:5)</div>
                                                <div className="text-amber-600 dark:text-amber-400">• Note: Upload works, publishing coming soon</div>
                                              </>
                                            ) : account.platform === 'FACEBOOK' ? (
                                              <>
                                                <div>• Formats: MP4, MOV, AVI</div>
                                                <div>• Max size: 4GB</div>
                                                <div>• Max duration: 4 hours</div>
                                                <div>• Recommended: Landscape (16:9) or Square (1:1)</div>
                                                <div className="text-amber-600 dark:text-amber-400">• Note: Upload works, publishing coming soon</div>
                                              </>
                                            ) : account.platform === 'YOUTUBE' ? (
                                              <>
                                                <div>• Formats: MP4, MOV, AVI, WMV, FLV, WebM</div>
                                                <div>• Max size: 128GB (for verified channels)</div>
                                                <div>• Max duration: 12 hours</div>
                                                <div>• Recommended: MP4 with H.264 video codec</div>
                                                <div className="text-green-600 dark:text-green-400">• Ready for upload and publishing!</div>
                                              </>
                                            ) : account.platform === 'TIKTOK' ? (
                                              <>
                                                <div>• Formats: MP4, MOV, AVI</div>
                                                <div>• Max size: 500MB</div>
                                                <div>• Max duration: 10 minutes</div>
                                                <div>• Recommended: Vertical (9:16) aspect ratio</div>
                                                <div className="text-amber-600 dark:text-amber-400">• Note: Upload works, publishing coming soon</div>
                                              </>
                                            ) : null}
                                                </div>
                                                {/* Arrow pointing down */}
                                                <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800"></div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Thumbnail Upload Container (YouTube only) */}
                                      {account.platform === 'YOUTUBE' && accountContent.includeThumbnail && (
                                        <div className="space-y-4">
                                          <div className="h-80 p-4 rounded-xl bg-gradient-to-br from-orange-50/60 to-yellow-50/60 dark:from-orange-900/20 dark:to-yellow-900/20 border border-orange-200/50 dark:border-orange-800/50 overflow-hidden">
                                            {!accountContent.thumbnail ? (
                                              <div
                                                className="h-full border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-xl flex flex-col items-center justify-center text-center bg-white/40 dark:bg-neutral-800/40 transition-all duration-300 hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-50/40 dark:hover:bg-orange-900/10"
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, account.id, 'thumbnail')}
                                              >
                                                <input
                                                  type="file"
                                                  accept="image/*"
                                                  onChange={(e) => e.target.files && handleThumbnailUpload(account.id, e.target.files)}
                                                  className="hidden"
                                                  id={`thumbnail-upload-${account.id}`}
                                                />
                                                <label htmlFor={`thumbnail-upload-${account.id}`} className="cursor-pointer flex flex-col items-center gap-3">
                                                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-2xl flex items-center justify-center">
                                                    <ImageIcon className="h-6 w-6 text-white" />
                                                  </div>
                                                  <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                      Drop thumbnail here or click to upload
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                      JPG, PNG up to 2MB
                                                    </p>
                                                  </div>
                                                </label>
                                              </div>
                                            ) : (
                                              <div className="h-full relative">
                                                <div className="w-full h-full rounded-lg overflow-hidden">
                                                  <img
                                                    src={accountContent.thumbnail ? URL.createObjectURL(accountContent.thumbnail) : ''}
                                                    alt="Thumbnail preview"
                                                    className="w-full h-full object-contain"
                                                  />
                                                </div>
                                                <button
                                                  onClick={() => handleThumbnailRemove(account.id)}
                                                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-200 z-10"
                                                >
                                                  ×
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                          {/* Thumbnail Info */}
                                          <div className="text-xs text-orange-600 dark:text-orange-400 space-y-1">
                                            <div className="flex items-center gap-2 group relative">
                                              <Info className="h-3 w-3 cursor-help" />
                                              <span>Thumbnail requirements</span>

                                              {/* Tooltip with thumbnail requirements */}
                                              <div className="absolute bottom-full left-0 mb-2 w-80 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                                  YouTube Thumbnail Requirements
                                                </div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                                  <div>• Formats: JPG, PNG, GIF, BMP</div>
                                                  <div>• Max size: 2MB</div>
                                                  <div>• Recommended: 1280x720px (16:9)</div>
                                                  <div>• Minimum: 640x360px</div>
                                                  <div className="text-green-600 dark:text-green-400">• Custom thumbnails available for verified channels</div>
                                                </div>
                                                {/* Arrow pointing down */}
                                                <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800"></div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  )}
                                </>
                              ) : (
                                // Text Platform Fields
                                <>
                                  <div className="space-y-2">
                                    <Label className="text-base font-medium text-gray-900 dark:text-white">Content</Label>
                                    <Textarea
                                      placeholder={`Write your ${account.platform === 'TWITTER' ? 'X' : account.platform.toLowerCase()} post...`}
                                      value={accountContent.content}
                                      onChange={(e) => handleAccountContentChange(account.id, 'content', e.target.value)}
                                      className="min-h-[140px] resize-none text-base border-2 border-gray-200/60 dark:border-gray-700/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 rounded-xl bg-white/60 dark:bg-neutral-800/60"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-base font-medium text-gray-900 dark:text-white">Hashtags</Label>
                                    <HashtagInput
                                      value={Array.isArray(accountContent.hashtags) ? accountContent.hashtags : []}
                                      onChange={(hashtags) => handleAccountContentChange(account.id, 'hashtags', hashtags)}
                                      placeholder="Add hashtags..."
                                      className="text-base border-2 border-gray-200/60 dark:border-gray-700/60 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200 dark:focus-within:ring-blue-800 bg-white/60 dark:bg-neutral-800/60"
                                      maxTags={30}
                                    />
                                  </div>

                                  {/* Media Upload Options - 2 Column Layout */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Image Upload Toggle */}
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-50/60 to-pink-50/60 dark:from-purple-800/60 dark:to-pink-800/60 border border-purple-200/50 dark:border-purple-700/50">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                                            <ImageIcon className="h-4 w-4 text-white" />
                                          </div>
                                          <Label className="text-base font-medium text-gray-900 dark:text-white">Include Images</Label>
                                        </div>
                                        <Switch
                                          checked={accountContent.includeImages}
                                          onCheckedChange={(checked) => {
                                            handleAccountContentChange(account.id, 'includeImages', checked)

                                            // If enabling images, auto-share existing images from other accounts
                                            if (checked) {
                                              const platformLimits: Record<string, number> = {
                                                'TWITTER': 4,
                                                'LINKEDIN': 9,
                                                'INSTAGRAM': 10,
                                                'FACEBOOK': 10
                                              }

                                              const maxImages = platformLimits[account.platform] || 4

                                              // Find images from other selected accounts
                                              let imagesToShare: File[] = []
                                              for (const otherAccountId of creationState.selectedAccounts) {
                                                if (otherAccountId !== account.id) {
                                                  const otherAccountContent = manualState.accountContent[otherAccountId]
                                                  if (otherAccountContent?.images && otherAccountContent.images.length > 0) {
                                                    imagesToShare = [...otherAccountContent.images]
                                                    break
                                                  }
                                                }
                                              }

                                              // Share images if found
                                              if (imagesToShare.length > 0) {
                                                const imagesToAdd = imagesToShare.slice(0, maxImages)
                                                handleAccountContentChange(account.id, 'images', imagesToAdd)
                                              }
                                            }
                                          }}
                                        />
                                      </div>
                                    </div>

                                    {/* Video Upload Toggle */}
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-red-50/60 to-orange-50/60 dark:from-red-800/60 dark:to-orange-800/60 border border-red-200/50 dark:border-red-700/50">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center">
                                            <Upload className="h-4 w-4 text-white" />
                                          </div>
                                          <Label className="text-base font-medium text-gray-900 dark:text-white">Include Video</Label>
                                        </div>
                                        <Switch
                                          checked={accountContent.includeVideo || false}
                                          onCheckedChange={(checked) => handleAccountContentChange(account.id, 'includeVideo', checked)}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Fixed Dimension Media Container */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Image Upload Container */}
                                    {accountContent.includeImages && (
                                      <div className="space-y-4">
                                        <div className="h-80 p-4 rounded-xl bg-gradient-to-br from-purple-50/60 to-pink-50/60 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200/50 dark:border-purple-800/50 overflow-hidden">
                                          {/* Upload Area or Preview Grid */}
                                          {!accountContent.images || accountContent.images.length === 0 ? (
                                            <div
                                              className="h-full border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-xl flex flex-col items-center justify-center text-center bg-white/40 dark:bg-neutral-800/40 transition-all duration-300 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50/40 dark:hover:bg-purple-900/10"
                                              onDragOver={handleDragOver}
                                              onDrop={(e) => handleDrop(e, account.id)}
                                            >
                                              <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={(e) => e.target.files && handleImageUpload(account.id, e.target.files)}
                                                className="hidden"
                                                id={`image-upload-${account.id}`}
                                              />
                                              <label htmlFor={`image-upload-${account.id}`} className="cursor-pointer flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
                                                  <Upload className="h-6 w-6 text-white" />
                                                </div>
                                                <div>
                                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    Drop images here or click to upload
                                                  </p>
                                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                                    JPG, PNG, GIF up to 10MB each
                                                  </p>
                                                </div>
                                              </label>
                                            </div>
                                          ) : (
                                            <div className="h-full overflow-y-auto">
                                              <div className="grid grid-cols-2 gap-2 p-2">
                                                {accountContent.images.map((image, index) => (
                                                  <div key={index} className="relative group">
                                                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-purple-200 dark:border-purple-800">
                                                      <img
                                                        src={URL.createObjectURL(image)}
                                                        alt={`Upload ${index + 1}`}
                                                        className="w-full h-full object-cover"
                                                      />
                                                    </div>
                                                    <button
                                                      onClick={() => handleImageRemove(account.id, index)}
                                                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-200 opacity-0 group-hover:opacity-100"
                                                    >
                                                      ×
                                                    </button>
                                                  </div>
                                                ))}
                                                {/* Add more button */}
                                                <div
                                                  className="aspect-square border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
                                                  onClick={() => {
                                                    const input = document.createElement('input')
                                                    input.type = 'file'
                                                    input.multiple = true
                                                    input.accept = 'image/*'
                                                    input.onchange = (e) => {
                                                      const files = (e.target as HTMLInputElement).files
                                                      if (files) handleImageUpload(account.id, files)
                                                    }
                                                    input.click()
                                                  }}
                                                >
                                                  <Plus className="h-6 w-6 text-purple-500" />
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                        {/* Image Info */}
                                        <div className="text-xs text-purple-600 dark:text-purple-400 space-y-1">
                                          <div className="flex items-center gap-2">
                                            <Info className="h-3 w-3" />
                                            <span>Max {account.platform === 'TWITTER' || account.platform === 'X' ? '4' : account.platform === 'LINKEDIN' ? '9' : '10'} images</span>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Video Upload Container */}
                                    {accountContent.includeVideo && (
                                      <div className="space-y-4">
                                        <div className="h-80 p-4 rounded-xl bg-gradient-to-br from-red-50/60 to-orange-50/60 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200/50 dark:border-red-800/50 overflow-hidden">
                                          {!accountContent.video && !accountContent.videoUrl ? (
                                            <div
                                              className="h-full border-2 border-dashed border-red-300 dark:border-red-700 rounded-xl flex flex-col items-center justify-center text-center bg-white/40 dark:bg-neutral-800/40 transition-all duration-300 hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50/40 dark:hover:bg-red-900/10"
                                              onDragOver={handleDragOver}
                                              onDrop={(e) => handleDrop(e, account.id, 'video')}
                                            >
                                              <input
                                                type="file"
                                                accept="video/*"
                                                onChange={(e) => e.target.files && handleVideoUpload(account.id, e.target.files)}
                                                className="hidden"
                                                id={`video-upload-${account.id}`}
                                              />
                                              <label htmlFor={`video-upload-${account.id}`} className="cursor-pointer flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center">
                                                  <Upload className="h-6 w-6 text-white" />
                                                </div>
                                                <div>
                                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    Drop video here or click to upload
                                                  </p>
                                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                                    MP4, MOV, AVI up to 500MB
                                                  </p>
                                                </div>
                                              </label>
                                            </div>
                                          ) : (
                                            <div className="h-full relative">
                                              {/* Use VideoPreview component for better playback */}
                                              <div className="w-full h-full rounded-lg overflow-hidden">
                                                <video
                                                  src={accountContent.videoUrl || (accountContent.video ? URL.createObjectURL(accountContent.video) : '')}
                                                  className="w-full h-full object-contain"
                                                  controls
                                                  preload="metadata"
                                                  playsInline
                                                  muted
                                                />
                                              </div>
                                              <button
                                                onClick={() => handleVideoRemove(account.id)}
                                                className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-200 z-10"
                                              >
                                                ×
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                        {/* Video Info with Requirements */}
                                        <div className="text-xs text-red-600 dark:text-red-400 space-y-1">
                                          <div className="flex items-center gap-2 group relative">
                                            <Info className="h-3 w-3 cursor-help" />
                                            <span>Video requirements for {account.platform}</span>

                                            {/* Tooltip with detailed requirements */}
                                            <div className="absolute bottom-full left-0 mb-2 w-80 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                              <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                                {account.platform} Video Requirements
                                              </div>
                                              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                                {account.platform === 'TWITTER' || account.platform === 'X' ? (
                                                  <>
                                                    <div>• Formats: MP4, MOV</div>
                                                    <div>• Max size: 512MB</div>
                                                    <div>• Max duration: 2 minutes 20 seconds</div>
                                                    <div>• Recommended: Landscape (16:9) or Square (1:1)</div>
                                                    <div className="text-amber-600 dark:text-amber-400">• Note: Upload works, publishing coming soon</div>
                                                  </>
                                                ) : account.platform === 'LINKEDIN' ? (
                                                  <>
                                                    <div>• Formats: MP4, MOV, AVI, MKV, WMV, FLV, WebM, ASF</div>
                                                    <div>• Max size: 5GB</div>
                                                    <div>• Max duration: 10 minutes</div>
                                                    <div>• Recommended: Landscape (16:9) or Square (1:1)</div>
                                                    <div className="text-amber-600 dark:text-amber-400">• Note: Upload works, publishing coming soon</div>
                                                  </>
                                                ) : account.platform === 'INSTAGRAM' ? (
                                                  <>
                                                    <div>• Formats: MP4, MOV</div>
                                                    <div>• Max size: 4GB</div>
                                                    <div>• Max duration: 60 minutes</div>
                                                    <div>• Recommended: Square (1:1) or Vertical (4:5)</div>
                                                    <div className="text-amber-600 dark:text-amber-400">• Note: Upload works, publishing coming soon</div>
                                                  </>
                                                ) : account.platform === 'FACEBOOK' ? (
                                                  <>
                                                    <div>• Formats: MP4, MOV, AVI</div>
                                                    <div>• Max size: 4GB</div>
                                                    <div>• Max duration: 4 hours</div>
                                                    <div>• Recommended: Landscape (16:9) or Square (1:1)</div>
                                                    <div className="text-amber-600 dark:text-amber-400">• Note: Upload works, publishing coming soon</div>
                                                  </>
                                                ) : account.platform === 'YOUTUBE' ? (
                                                  <>
                                                    <div>• Formats: MP4, MOV, AVI, WMV, FLV, WebM</div>
                                                    <div>• Max size: 128GB (for verified channels)</div>
                                                    <div>• Max duration: 12 hours</div>
                                                    <div>• Recommended: MP4 with H.264 video codec</div>
                                                    <div className="text-green-600 dark:text-green-400">• Ready for upload and publishing!</div>
                                                  </>
                                                ) : account.platform === 'TIKTOK' ? (
                                                  <>
                                                    <div>• Formats: MP4, MOV, AVI</div>
                                                    <div>• Max size: 500MB</div>
                                                    <div>• Max duration: 10 minutes</div>
                                                    <div>• Recommended: Vertical (9:16) aspect ratio</div>
                                                    <div className="text-amber-600 dark:text-amber-400">• Note: Upload works, publishing coming soon</div>
                                                  </>
                                                ) : null}
                                              </div>
                                              {/* Arrow pointing down */}
                                              <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800"></div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                </>
                              )}
                            </div>
                          </div>
                        )
                      })()
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="p-8 pt-4 bg-gradient-to-r from-gray-50/60 to-gray-100/60 dark:from-gray-800/60 dark:to-gray-900/60 border-t border-black/5 dark:border-white/5">
                    <div className="flex gap-4">
                      <button
                        onClick={() => setCreationState(prev => ({ ...prev, step: 'mode-selection' }))}
                        className="px-6 py-3 rounded-xl border-2 border-gray-200/60 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-300 flex items-center gap-3 text-gray-700 dark:text-gray-200 font-medium"
                      >
                        <ArrowLeft className="h-5 w-5" />
                        Back to Mode Selection
                      </button>
                    </div>

                    {/* Manual Mode Action Buttons */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                      <button
                        onClick={handlePreview}
                        className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white flex items-center justify-center gap-2 font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </button>

                      <button
                        onClick={handleSaveToDrafts}
                        disabled={isSavingDrafts}
                        className="px-4 py-3 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white flex items-center justify-center gap-2 font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSavingDrafts ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                        Save to Drafts
                      </button>

                      <button
                        onClick={handleManualSchedule}
                        className="px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white flex items-center justify-center gap-2 font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                      >
                        <Calendar className="h-4 w-4" />
                        Schedule
                      </button>

                      <button
                        onClick={handleManualPublishNow}
                        disabled={isPublishing}
                        className="px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex items-center justify-center gap-2 font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPublishing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Publish
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Generating Step */}
          {creationState.step === 'generating' && (
            <div className="rounded-3xl p-12 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm text-center">
              <div className="space-y-8">
                <div className="w-24 h-24 bg-gradient-to-br from-rose-600 to-pink-400 rounded-3xl flex items-center justify-center mx-auto animate-pulse shadow-2xl">
                  <Wand2 className="h-12 w-12 text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Generating Your Content</h3>
                  <p className="text-base opacity-70 text-gray-600 dark:text-gray-300 max-w-lg mx-auto leading-relaxed">
                    AI is creating personalized, platform-optimized content for your selected social media accounts...
                  </p>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-center gap-4 text-base">
                    <div className="w-8 h-8 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-rose-600" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Creating platform-specific content</span>
                  </div>
                  {creationState.mediaOptions.includeImages && (
                    <div className="flex items-center justify-center gap-4 text-base">
                      <div className="w-8 h-8 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-pink-600" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-200">Generating optimized images</span>
                    </div>
                  )}
                </div>
                <div className="w-full max-w-md mx-auto">
                  <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-rose-600 to-pink-600 rounded-full animate-pulse transition-all duration-1000" style={{ width: '60%' }}></div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Processing...</p>
                </div>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {creationState.step === 'preview' && (
            <div className="space-y-6">
              <div className="rounded-3xl p-8 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Preview Your Content</h3>
                  <p className="text-base opacity-70 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
                    Review how your AI-generated posts will look on each platform before publishing
                  </p>
                  
                  {/* Auto-save Status Indicator */}
                  {autoSaveStatus !== 'idle' && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      {autoSaveStatus === 'saving' && (
                        <>
                          <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                          <span className="text-sm text-blue-600 dark:text-blue-400">Auto-saving drafts...</span>
                        </>
                      )}
                      {autoSaveStatus === 'saved' && (
                        <>
                          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-sm text-green-600 dark:text-green-400">Drafts auto-saved successfully!</span>
                        </>
                      )}
                      {autoSaveStatus === 'error' && (
                        <>
                          <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-xs text-white font-bold">!</span>
                          </div>
                          <span className="text-sm text-red-600 dark:text-red-400">Auto-save failed, but your content is safe</span>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Auto-save Info Message */}
                  <div className="mt-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      💾 Your content is automatically saved as drafts every 2 minutes and when you leave the page
                    </p>
                  </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {creationState.generatedContent.map((content, index) => (
                    <div key={`${content.platform}-${index}`} className="w-full">
                      <ContentPreview
                        content={content}
                        index={index}
                        onEdit={handleEditContent}
                        onRegenerate={handleRegenerateContent}
                        onRegenerateImage={handleRegenerateImage}
                      />
                    </div>
                  ))}
                </div>

                {/* Enhanced Action Buttons */}
                <div className="flex flex-wrap gap-4 justify-center">
                  <button
                    onClick={() => setCreationState(prev => ({ ...prev, step: 'input' }))}
                    className="px-6 py-3 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/6 transition-all duration-300 flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:shadow-md"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    Back to Setup
                  </button>
                  <button
                    onClick={handleSaveAsDraft}
                    disabled={isPublishing}
                    className="px-6 py-3 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/6 transition-all duration-300 flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:shadow-md"
                  >
                    <Save className="h-5 w-5" />
                    Save as Draft
                  </button>
                  <button
                    onClick={() => autoSaveAsDrafts(creationState.generatedContent)}
                    disabled={isPublishing || autoSaveStatus === 'saving'}
                    className="px-6 py-3 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/6 transition-all duration-300 flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:shadow-md"
                  >
                    <RefreshCw className={`h-4 w-4 ${autoSaveStatus === 'saving' ? 'animate-spin' : ''}`} />
                    {autoSaveStatus === 'saving' ? 'Saving...' : 'Backup Now'}
                  </button>
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="px-6 py-3 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/6 transition-all duration-300 flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:shadow-md"
                  >
                    <Calendar className="h-5 w-5" />
                    Schedule
                  </button>
                  <button
                    onClick={handlePublishNow}
                    disabled={isPublishing}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white flex items-center gap-3 disabled:opacity-50 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    {isPublishing ? (
                      <>
                        <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        </div>
                        Publishing...
                      </>
                    ) : (
                      <>
                        <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center">
                          <Rocket className="h-4 w-4 text-white" />
                        </div>
                        Publish Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Modal */}
          <ScheduleModal
            isOpen={showScheduleModal}
            onClose={() => setShowScheduleModal(false)}
            onSchedule={creationState.mode === 'ai-generate' ? handleSchedule : handleScheduleSubmit}
            isLoading={isPublishing}
          />

          {/* Advanced Edit Modal */}
          <AdvancedEditModal
            isOpen={isAdvancedEditOpen}
            onClose={() => setIsAdvancedEditOpen(false)}
            content={selectedContent}
            onSave={handleAdvancedEditSave}
            onRegenerateContent={handleAdvancedEditRegenerateContent}
            onRegenerateImage={handleAdvancedEditRegenerateImage}
          />

          {/* Preview Modal */}
          {isPreviewModalOpen && previewContent && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-[95vw] w-full max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Post Preview</h2>
                    <button
                      onClick={() => setIsPreviewModalOpen(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                  {Array.isArray(previewContent) ? (
                    <div className={`grid gap-8 ${
                      previewContent.length === 1 ? 'grid-cols-1 max-w-lg mx-auto' :
                      previewContent.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
                      previewContent.length === 3 ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' :
                      'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
                    }`}>
                      {previewContent.map((content: any, index: number) => (
                        <div key={content.accountId || index} className="space-y-4">
                          <PostPreview
                            platform={content.platform}
                            text={content.text}
                            image={content.image}
                            images={content.images}
                            hashtags={content.hashtags}
                            videoUrl={content.videoUrl}
                            videos={content.videos}
                            includeImages={content.includeImages}
                            includeVideo={content.includeVideo}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="max-w-lg mx-auto">
                      <PostPreview
                        platform={previewContent.platform}
                        text={previewContent.text}
                        image={previewContent.image}
                        images={previewContent.images}
                        hashtags={previewContent.hashtags}
                        videoUrl={previewContent.videoUrl}
                        videos={previewContent.videos}
                        includeImages={previewContent.includeImages}
                        includeVideo={previewContent.includeVideo}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  )
}
