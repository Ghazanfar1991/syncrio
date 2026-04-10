"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from "@/components/providers/auth-provider"
import { useToast } from '@/hooks/use-toast'
import { appQueryKeys, useSocialAccountsQuery } from '@/hooks/queries/use-app-queries'
import { uploadProgressManager } from '@/components/upload-progress'
import { getIntegrationChannelSelectionState } from '@/lib/bundle-account-state'

// --- Interfaces ---

export interface SocialAccount {
  id: string
  platform: string
  accountId: string
  accountName: string
  displayName?: string
  username?: string
  avatarUrl?: string
  isActive: boolean
  isConnected: boolean
  accountType?: string
  permissions?: any[]
  lastSync?: string
  metadata?: any
  createdAt: string
  updatedAt: string
}

export interface GeneratedContent {
  platform: string
  content: string
  hashtags: string[]
  imagePrompt?: string
  imageUrl?: string
  images?: string[]
  videoUrl?: string
  videos?: string[]
  title?: string
  description?: string
  tags?: string[]
  category?: string
  privacy?: string
  caption?: string
  effects?: string[]
  sounds?: string
}

export interface ManualContent {
  platform: string
  content: string
  hashtags: string[]
  images?: File[]
  imageUrls?: string[]
  imageUploadIds?: string[]
  includeImages: boolean
  imageCount: number
  imageStyle: string
  video?: File | null
  videoUrl?: string
  videoKey?: string
  videoUploadId?: string
  videoFileName?: string
  includeVideo: boolean
  thumbnail?: File | null
  thumbnailUrl?: string
  thumbnailKey?: string
  thumbnailUploadId?: string
  thumbnailFileName?: string
  includeThumbnail: boolean
  title?: string
  description?: string
  tags?: string[]
  category?: string
  privacy?: 'public' | 'unlisted' | 'private'
  caption?: string
  effects?: string[]
  sounds?: string
  style?: string
  
  // Instagram Specific Options
  instagramType?: 'POST' | 'REEL' | 'STORY'
  shareToFeed?: boolean
  autoFitImage?: boolean
  autoCropImage?: boolean
  collaborators?: string[]
  locationId?: string
  altText?: string
  trialParams?: {
    graduationStrategy: 'MANUAL' | 'SS_PERFORMANCE'
  }
  taggedUsers?: Array<{ 
    username: string; 
    x?: number; 
    y?: number; 
    uploadId?: string 
  }>
}

export interface ManualCreationState {
  selectedTab: string
  generalContent: string
  generalHashtags: string
  generalImageUrls?: string[]
  generalImageUploadIds?: string[]
  generalVideoUrl?: string
  generalVideoUploadId?: string
  accountContent: Record<string, ManualContent>
}

export interface MediaOptions {
  includeImages: boolean
  imageCount?: number
  imageStyle?: string
  includeVideo: boolean
  videoDuration?: string
  videoDimensions?: 'vertical' | 'horizontal' | 'square'
  videoStyle?: string
}

const parseMetadata = (value: unknown) => {
  if (typeof value !== 'string') return value || {}
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

export interface ContentCreationStep {
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

// --- Constants ---
const CONTENT_TYPES = {
  TEXT_BASED: ['X', 'TWITTER', 'LINKEDIN', 'INSTAGRAM', 'FACEBOOK', 'THREADS', 'MASTODON', 'BLUESKY', 'DISCORD', 'SLACK'],
  VIDEO_BASED: ['YOUTUBE', 'TIKTOK']
}

// --- Helper Functions ---
const normalizeHashtags = (hashtags: string | string[]): string[] => {
  if (Array.isArray(hashtags)) {
    return hashtags.map(tag => tag.trim().replace(/^#/, ''))
  }
  return hashtags.split(/[\s,]+/).map(tag => tag.trim().replace(/^#/, '')).filter(Boolean)
}

const appendHashtagsToContent = (content: string, hashtags: string[]): string => {
  if (!hashtags || hashtags.length === 0) return content
  const hashtagString = hashtags.map(tag => `#${tag}`).join(' ')
  return `${content}\n\n${hashtagString}`
}

// --- Hook Implementation ---

export function useCreatePost() {
  const { user: session } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const socialAccountsQuery = useSocialAccountsQuery(Boolean(session))
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
    selectedTab: 'original',
    generalContent: '',
    generalHashtags: '',
    generalImageUrls: [],
    generalImageUploadIds: [],
    accountContent: {}
  })

  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [isSavingDrafts, setIsSavingDrafts] = useState(false)

  // Initialization
  const resetManualCreationState = useCallback(() => {
    setManualState({
      selectedTab: 'general',
      generalContent: '',
      generalHashtags: '',
      accountContent: {}
    })
    setCreationState(prev => ({ ...prev, selectedAccounts: [] }))
  }, [])

  const socialAccounts = useMemo(() => {
    const rawAccounts = socialAccountsQuery.data || []

    return rawAccounts
      .map((acc: any) => ({
        id: acc.id,
        platform: acc.platform,
        accountId: acc.account_id,
        accountName: acc.account_name,
        username: acc.username || acc.account_name,
        displayName: acc.display_name || acc.account_name,
        avatarUrl: acc.avatar_url,
        isActive: acc.is_active,
        isConnected: acc.is_connected,
        needsReauth: acc.needs_reauth || false,
        accountType: (acc.account_type || 'personal').toLowerCase(),
        permissions: Array.isArray(acc.permissions) ? acc.permissions : [],
        bundleSocialAccountId: acc.bundle_social_account_id,
        metadata: parseMetadata(acc.metadata),
        createdAt: acc.created_at,
        updatedAt: acc.updated_at,
      }))
      .filter(
        (account: SocialAccount) =>
          account.isActive &&
          account.isConnected &&
          !getIntegrationChannelSelectionState(account)
      )
  }, [socialAccountsQuery.data])

  const loadingAccounts = socialAccountsQuery.isLoading

  // --- Handlers ---

  const handleSocialAccountToggle = (accountId: string) => {
    setCreationState(prev => {
      const isSelected = prev.selectedAccounts.includes(accountId)
      const nextSelected = isSelected
        ? prev.selectedAccounts.filter(id => id !== accountId)
        : [...prev.selectedAccounts, accountId]
      
      // If we are selecting a new account, initialize its content if it's currently empty
      if (!isSelected) {
        setManualState(mPrev => {
          if (!mPrev.accountContent[accountId]) {
            const account = socialAccounts.find(acc => acc.id === accountId)
            return {
              ...mPrev,
              accountContent: {
                ...mPrev.accountContent,
                [accountId]: {
                  platform: account?.platform || '',
                  content: mPrev.generalContent,
                  hashtags: [],
                  imageUrls: mPrev.generalImageUrls || [],
                  imageUploadIds: mPrev.generalImageUploadIds || [],
                  videoUrl: mPrev.generalVideoUrl || '',
                  videoUploadId: mPrev.generalVideoUploadId || '',
                  includeImages: !!mPrev.generalImageUrls?.length,
                  includeVideo: !!mPrev.generalVideoUrl,
                  includeThumbnail: false,
                  imageCount: mPrev.generalImageUrls?.length || 0,
                  imageStyle: 'professional'
                }
              }
            }
          }
          return mPrev
        })
      }
      
      return { ...prev, selectedAccounts: nextSelected }
    })
  }

  const handleGeneralContentChange = (content: string) => {
    setManualState(prev => {
        const updatedAccountContent = { ...prev.accountContent }
        creationState.selectedAccounts.forEach(accountId => {
          const account = socialAccounts.find(acc => acc.id === accountId)
          if (account) {
            const existing = updatedAccountContent[accountId]
            // We overwrite if it's currently matching the previous general content
            // or if it's empty. This is the detaching logic.
            if (!existing || existing.content === prev.generalContent || !existing.content) {
              updatedAccountContent[accountId] = {
                ...existing,
                platform: account.platform,
                content: content,
                hashtags: existing?.hashtags || [],
                imageUrls: existing?.imageUrls?.length ? existing.imageUrls : prev.generalImageUrls,
                imageUploadIds: existing?.imageUploadIds?.length ? existing.imageUploadIds : prev.generalImageUploadIds,
                videoUrl: existing?.videoUrl || prev.generalVideoUrl,
                videoUploadId: existing?.videoUploadId || prev.generalVideoUploadId,
                includeImages: existing?.includeImages ?? !!prev.generalImageUrls?.length,
                includeVideo: existing?.includeVideo ?? !!prev.generalVideoUrl
              }
            }
          }
        })
        return { ...prev, generalContent: content, accountContent: updatedAccountContent }
    })
  }

  const handleAccountContentChange = useCallback((accountId: string, field: string, value: any) => {
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
  }, [])

  // Media Uploads
  const handleImageUpload = async (accountId: string | 'original', files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const platform = accountId === 'original' ? 'General' : socialAccounts.find(acc => acc.id === accountId)?.platform || 'Unknown'
    
    const taskId = uploadProgressManager.addTask({
      type: 'image',
      platform: platform,
      fileName: `Uploading ${fileArray.length} images`,
      progress: 0,
      status: 'uploading'
    })

    try {
      console.log(`📤 Starting image upload for ${platform}...`)
      const results: { url: string; uploadId: string }[] = []
      for (const file of fileArray) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('platform', platform)
        
        const res = await fetch('/api/upload/media', { method: 'POST', body: formData })
        if (!res.ok) {
          const errorText = await res.text()
          console.error(`❌ Upload failed with status ${res.status}:`, errorText)
          throw new Error(`Upload failed: ${res.status}`)
        }
        const result = await res.json()
        if (!result.success) throw new Error(result.error || 'Upload failed')
        results.push(result.data)
      }

      console.log(`✅ Upload complete. Syncing to state...`)

      if (accountId === 'original') {
        setManualState(prev => {
          const newUrls = [...(prev.generalImageUrls || []), ...results.map(r => r.url)]
          const newIds = [...(prev.generalImageUploadIds || []), ...results.map(r => r.uploadId)]
          
          const updatedAccountContent = { ...prev.accountContent }
          creationState.selectedAccounts.forEach(aid => {
            const existing = updatedAccountContent[aid]
            // Sync if account has no images or if its images match the previous general ones
            if (!existing || !existing.imageUrls?.length || JSON.stringify(existing.imageUrls) === JSON.stringify(prev.generalImageUrls)) {
              updatedAccountContent[aid] = {
                ...(existing || { 
                  platform: socialAccounts.find(acc => acc.id === aid)?.platform || '',
                  content: prev.generalContent,
                  hashtags: [],
                  includeThumbnail: false,
                  imageCount: 0,
                  imageStyle: 'professional',
                  includeVideo: false
                }),
                imageUrls: newUrls,
                imageUploadIds: newIds,
                includeImages: true
              }
            }
          })
          return { ...prev, generalImageUrls: newUrls, generalImageUploadIds: newIds, accountContent: updatedAccountContent }
        })
      } else {
        setManualState(prev => {
          const current = prev.accountContent[accountId] || {}
          return {
            ...prev,
            accountContent: {
              ...prev.accountContent,
              [accountId]: {
                ...current,
                imageUrls: [...(current.imageUrls || []), ...results.map(r => r.url)],
                imageUploadIds: [...(current.imageUploadIds || []), ...results.map(r => r.uploadId)],
                includeImages: true
              }
            }
          }
        })
      }
      
      uploadProgressManager.updateTask(taskId, { progress: 100, status: 'success' })
      toast({ title: "Success", description: "Images uploaded successfully", variant: "success" })
    } catch (error) {
      console.error('❌ handleImageUpload Error:', error)
      uploadProgressManager.updateTask(taskId, { status: 'error', error: error instanceof Error ? error.message : 'Upload failed' })
      toast({ title: "Upload Failed", description: error instanceof Error ? error.message : 'Unknown error', variant: "destructive" })
    }
  }

  // Publication Handlers
  const handleSaveToDrafts = async () => {
    if (creationState.selectedAccounts.length === 0) {
      toast({ title: "No Accounts Selected", variant: "destructive" })
      return
    }

    setIsSavingDrafts(true)
    try {
      let successfulDrafts = 0
      for (const accountId of creationState.selectedAccounts) {
        const account = socialAccounts.find(acc => acc.id === accountId)
        if (!account) continue

        const accountContent = manualState.accountContent[accountId]
        const content = accountContent?.content || manualState.generalContent || ''
        const hashtags = normalizeHashtags(accountContent?.hashtags || [])
        
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: appendHashtagsToContent(content, hashtags),
            hashtags,
            platform: account.platform,
            socialAccountIds: [accountId],
            status: 'DRAFT',
            imageUploadIds: accountContent?.imageUploadIds || [],
            videoUploadId: accountContent?.videoUploadId || null,
            thumbnailUploadId: accountContent?.thumbnailUploadId || null,
            title: accountContent?.title,
            description: accountContent?.description
          })
        })

        if (response.ok) successfulDrafts++
      }

      if (successfulDrafts > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: appQueryKeys.posts }),
          queryClient.invalidateQueries({ queryKey: ["post-analytics"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard-posts"] }),
          queryClient.invalidateQueries({ queryKey: appQueryKeys.dashboardStats }),
          queryClient.invalidateQueries({ queryKey: appQueryKeys.dashboardInsights }),
        ])
        toast({ title: "Drafts Saved", description: `Saved ${successfulDrafts} drafts successfully`, variant: "success" })
        resetManualCreationState()
      }
    } finally {
      setIsSavingDrafts(false)
    }
  }

  const handlePublishNow = async () => {
    if (creationState.selectedAccounts.length === 0) return

    setIsPublishing(true)
    try {
      let successfulPosts = 0
      for (const accountId of creationState.selectedAccounts) {
        const account = socialAccounts.find(acc => acc.id === accountId)
        const accountContent = manualState.accountContent[accountId]
        const content = accountContent?.content || manualState.generalContent || ''
        
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: content,
            platform: account?.platform,
            socialAccountIds: [accountId],
            imageUploadIds: accountContent?.imageUploadIds || [],
            videoUploadId: accountContent?.videoUploadId || null,
            metadata: accountContent || {}
          })
        })

        if (response.ok) {
          const data = await response.json()
          const pubRes = await fetch(`/api/posts/${data.data.post.id}/publish`, { method: 'POST' })
          if (pubRes.ok) successfulPosts++
        }
      }

      if (successfulPosts > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: appQueryKeys.posts }),
          queryClient.invalidateQueries({ queryKey: ["post-analytics"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard-posts"] }),
          queryClient.invalidateQueries({ queryKey: appQueryKeys.dashboardStats }),
          queryClient.invalidateQueries({ queryKey: appQueryKeys.dashboardInsights }),
        ])
        toast({ title: "Success", description: "Posts published successfully", variant: "success" })
        resetManualCreationState()
      }
    } finally {
      setIsPublishing(false)
    }
  }

  // AI Content Generation
  const generateContent = async () => {
    if (!creationState.topic.trim() || creationState.selectedAccounts.length === 0) return

    setCreationState(prev => ({ ...prev, isGenerating: true }))
    try {
      const response = await fetch('/api/generate/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: creationState.topic,
          platforms: socialAccounts.filter(a => creationState.selectedAccounts.includes(a.id)).map(a => a.platform),
          mediaOptions: creationState.mediaOptions
        })
      })

      if (!response.ok) throw new Error('Generation failed')
      const data = await response.json()
      
      setCreationState(prev => ({
        ...prev,
        step: 'preview',
        generatedContent: data.data,
        isGenerating: false
      }))
    } catch (error) {
      setCreationState(prev => ({ ...prev, isGenerating: false }))
      toast({ title: "Error", description: "AI generation failed", variant: "destructive" })
    }
  }

  return {
    socialAccounts,
    loadingAccounts,
    creationState,
    setCreationState,
    manualState,
    setManualState,
    showScheduleModal,
    setShowScheduleModal,
    isPublishing,
    setIsPublishing,
    autoSaveStatus,
    isSavingDrafts,
    handleSocialAccountToggle,
    handleGeneralContentChange,
    handleAccountContentChange,
    handleImageUpload,
    handleSaveToDrafts,
    handlePublishNow,
    generateContent
  }
}
