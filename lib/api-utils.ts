// API utility functions - Updated for Supabase (snake_case -> camelCase)
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Standard API response helpers
export function apiSuccess(data: any, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function apiError(message: string, status: number = 400, code?: string) {
  return NextResponse.json({
    success: false, 
    error: { message, code } 
  }, { status })
}

// Validation helper
export function validateRequest<T>(schema: z.ZodSchema<T>, data: any): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('🔍 Validation error details:', error.errors)
      const errorMessages = error.errors?.map(e => {
        const path = e.path.length > 0 ? e.path.join('.') : 'root'
        return `${path}: ${e.message}`
      }) || ['Unknown validation error']
      throw new Error(errorMessages.join(', '))
    }
    throw error
  }
}

// Common validation schemas
export const schemas = {
  // User schemas
  createUser: z.object({
    email: z.string().email(),
    name: z.string().min(1),
    password: z.string().min(8)
  }),

  // Post schemas
  createPost: z.object({
    content: z.string().max(2000).nullable().optional(),
    hashtags: z.array(z.string()).optional(),
    imageUrl: z.string().nullable().optional(),
    images: z.array(z.string()).optional(),
    videoUrl: z.string().nullable().optional(),
    videos: z.array(z.string()).optional(),
    platform: z.string().optional(),
    socialAccountIds: z.array(z.string()).min(1, 'At least one social account must be selected'),
    scheduledAt: z.string().refine((val) => {
      if (!val) return true
      const date = new Date(val)
      return !isNaN(date.getTime())
    }, 'Invalid date format').optional(),
    title: z.string().max(100).optional(),
    description: z.string().max(5000).optional(),
    imageUploadIds: z.array(z.string()).nullable().optional(),
    videoUploadId: z.string().nullable().optional(),
    thumbnailUploadId: z.string().nullable().optional(),
    metadata: z.record(z.any()).optional(),
  }).refine((data) => {
    const hasContent = data.content && data.content.trim().length > 0
    const hasVideo = (data.videoUrl && data.videoUrl.length > 0) || (data.videos && data.videos.length > 0) || (data.videoUploadId && data.videoUploadId.length > 0)
    const hasImage = (data.imageUrl && data.imageUrl.length > 0) || (data.images && data.images.length > 0) || (data.imageUploadIds && data.imageUploadIds.length > 0)
    return hasContent || hasVideo || hasImage
  }, {
    message: "Post must have either text content, video, or image"
  }),

  updatePost: z.object({
    content: z.string().min(1).max(2000).optional(),
    hashtags: z.array(z.string()).optional(),
    imageUrl: z.string().optional(),
    images: z.array(z.string()).optional(),
    videoUrl: z.string().optional(),
    videos: z.array(z.string()).optional(),
    imageUploadIds: z.array(z.string()).nullable().optional(),
    videoUploadId: z.string().nullable().optional(),
    thumbnailUploadId: z.string().nullable().optional(),
    status: z.enum(['DRAFT', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'QUEUED']).optional(),
    scheduledAt: z.string().refine((val) => {
      if (!val) return true
      const date = new Date(val)
      return !isNaN(date.getTime())
    }, 'Invalid date format').optional()
  }),

  // Social account schemas
  connectSocialAccount: z.object({
    platform: z.string(),
    accessToken: z.string(),
    refreshToken: z.string().optional(),
    accountId: z.string(),
    accountName: z.string(),
    expiresAt: z.string().optional()
  }),

  // Chat message schemas
  chatMessage: z.object({
    content: z.string().min(1),
    type: z.enum(['USER', 'ASSISTANT', 'SYSTEM']).optional().default('USER'),
    metadata: z.any().optional()
  }),

  // Subscription schemas
  updateSubscription: z.object({
    tier: z.string()
  })
}

/** Build per-platform post data for Bundle.social postCreate/Update */
export function buildBundlePlatformData(
  content: string,
  uploadIds: string[],
  platforms: string[],
  metadata: any = {}
): Record<string, any> {
  const data: Record<string, any> = {}

  for (const platform of platforms) {
    const platformUploadIds = [...uploadIds]
    
    switch (platform) {
      case 'INSTAGRAM':
        data.INSTAGRAM = { text: content, uploadIds: platformUploadIds }
        break
      case 'FACEBOOK':
        data.FACEBOOK = { text: content, uploadIds: platformUploadIds }
        break
      case 'TWITTER':
        data.TWITTER = { text: content, uploadIds: platformUploadIds }
        break
      case 'LINKEDIN':
        data.LINKEDIN = { text: content, uploadIds: platformUploadIds }
        break
      case 'TIKTOK':
        data.TIKTOK = { 
          text: content, 
          uploadIds: platformUploadIds, 
          privacy: metadata.privacy || 'PUBLIC_TO_EVERYONE',
          title: metadata.title || undefined
        }
        break
      case 'YOUTUBE':
        data.YOUTUBE = { 
          title: metadata.title || 'Untitled Video',
          description: metadata.description || content || '',
          uploadIds: platformUploadIds, 
          type: metadata.type || 'VIDEO', 
          madeForKids: metadata.madeForKids !== undefined ? metadata.madeForKids : false,
          privacyStatus: metadata.privacyStatus || 'public'
        }
        if (metadata.thumbnailUploadId) {
          data.YOUTUBE.uploadIds = [metadata.thumbnailUploadId, ...platformUploadIds]
        }
        break
      case 'THREADS':
        data.THREADS = { text: content, uploadIds: platformUploadIds }
        break
      case 'PINTEREST':
        data.PINTEREST = { note: content, uploadIds: platformUploadIds }
        break
      case 'REDDIT':
        data.REDDIT = { text: content, title: metadata.title || content.substring(0, 300) }
        break
      case 'MASTODON':
        data.MASTODON = { text: content, uploadIds: platformUploadIds }
        break
      case 'BLUESKY':
        data.BLUESKY = { text: content, uploadIds: platformUploadIds }
        break
      case 'DISCORD':
        data.DISCORD = { content, uploadIds: platformUploadIds }
        break
      case 'SLACK':
        data.SLACK = { text: content, uploadIds: platformUploadIds }
        break
      case 'GOOGLE_BUSINESS':
        data.GOOGLE_BUSINESS = { summary: content, uploadIds: platformUploadIds }
        break
      default:
        data[platform] = { text: content, uploadIds: platformUploadIds }
    }
  }

  return data
}

// Pagination helper
export function paginate(page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit
  return { skip, take: limit }
}

// Parse query parameters
export function parseQueryParams(url: string) {
  const { searchParams } = new URL(url)
  return {
    page: parseInt(searchParams.get('page') || '1'),
    limit: Math.min(parseInt(searchParams.get('limit') || '10'), 100),
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') || undefined,
    platform: searchParams.get('platform') || undefined
  }
}

// Date helpers
export function parseDate(dateString?: string): Date | undefined {
  if (!dateString) return undefined
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? undefined : date
}

// Response formatting - Converts snake_case from Supabase to camelCase for Frontend
export function formatUser(user: any) {
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    bundleSocialTeamId: user.bundle_social_team_id,
    subscriptionTier: user.subscription?.tier || user.subscription_tier,
    subscription: user.subscription ? formatSubscription(user.subscription) : null,
    socialAccounts: user.social_accounts?.map(formatSocialAccount) || [],
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    _count: user._count
  }
}

export function formatSubscription(sub: any) {
  if (!sub) return null
  return {
    id: sub.id,
    userId: sub.user_id,
    tier: sub.tier,
    status: sub.status,
    currentPeriodStart: sub.current_period_start,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    createdAt: sub.created_at,
    updatedAt: sub.updated_at
  }
}

export function formatPost(post: any) {
  if (!post) return null
  return {
    id: post.id,
    userId: post.user_id,
    content: post.content,
    hashtags: post.hashtags,
    imageUrl: post.image_url,
    images: post.images,
    videoUrl: post.video_url,
    videos: post.videos,
    platform: post.platform,
    status: post.status,
    scheduledAt: post.scheduled_at,
    publishedAt: post.published_at,
    title: post.title,
    description: post.description,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    publications: post.publications?.map(formatPublication) || [],
    analytics: post.analytics?.map(formatAnalytics) || []
  }
}

export function formatPublication(pub: any) {
  if (!pub) return null
  return {
    id: pub.id,
    postId: pub.post_id,
    socialAccountId: pub.social_account_id,
    platform: pub.platform,
    status: pub.status,
    publishedAt: pub.published_at,
    errorMessage: pub.error_message,
    socialAccount: pub.social_account ? formatSocialAccount(pub.social_account) : null,
    createdAt: pub.created_at,
    updatedAt: pub.updated_at
  }
}

export function formatSocialAccount(account: any) {
  if (!account) return null
  return {
    id: account.id,
    userId: account.user_id,
    platform: account.platform,
    accountId: account.account_id,
    accountName: account.account_name,
    displayName: account.display_name,
    username: account.username,
    accountType: account.account_type,
    isConnected: account.is_connected,
    isActive: account.is_active,
    bundleSocialAccountId: account.bundle_social_account_id,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
    hasValidTokens: !!(account.access_token && (!account.expires_at || new Date(account.expires_at) > new Date()))
  }
}

export function formatAnalytics(analytics: any) {
  if (!analytics) return null
  return {
    id: analytics.id,
    postId: analytics.post_id,
    platform: analytics.platform,
    likes: analytics.likes,
    comments: analytics.comments,
    shares: analytics.shares,
    clicks: analytics.clicks,
    reach: analytics.reach,
    lastFetchedAt: analytics.last_fetched_at
  }
}

// Helper functions for hashtag conversion
export function hashtagsToString(hashtags: string[]): string {
  return JSON.stringify(hashtags || [])
}

export function hashtagsFromString(hashtagsString: string): string[] {
  try {
    if (!hashtagsString) return []
    if (Array.isArray(hashtagsString)) return hashtagsString
    return JSON.parse(hashtagsString)
  } catch {
    return []
  }
}

export function formatPostWithHashtags(post: any) {
  if (!post) return null
  const formatted = formatPost(post)
  return {
    ...formatted,
    hashtags: hashtagsFromString(post.hashtags)
  }
}
