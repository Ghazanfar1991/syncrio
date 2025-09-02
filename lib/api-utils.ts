// API utility functions
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
      console.error('🔍 Received data:', JSON.stringify(data, null, 2))
      console.error('🔍 Full error object:', error)
      const errorMessages = error.errors?.map(e => {
        const path = e.path.length > 0 ? e.path.join('.') : 'root'
        return `${path}: ${e.message}`
      }) || ['Unknown validation error']
      throw new Error(`Validation error: ${errorMessages.join(', ')}`)
    }
    console.error('🔍 Non-Zod validation error:', error)
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
    content: z.string().max(2000).nullable().optional(), // Allow null/empty content for video-only posts
    hashtags: z.array(z.string()).optional(),
    imageUrl: z.string().nullable().optional(), // Allow null values
    images: z.array(z.string()).optional(),
    videoUrl: z.string().nullable().optional(), // Allow null values
    videos: z.array(z.string()).optional(),
    platform: z.string().optional(),
    socialAccountIds: z.array(z.string()).min(1, 'At least one social account must be selected'),
    scheduledAt: z.string().refine((val) => {
      if (!val) return true
      const date = new Date(val)
      return !isNaN(date.getTime())
    }, 'Invalid date format').optional(),
    // YouTube-specific fields
    title: z.string().max(100).optional(), // YouTube title limit
    description: z.string().max(5000).optional() // YouTube description limit
  }).refine((data) => {
    // Require either content or video content or image content
    const hasContent = data.content && data.content.trim().length > 0
    const hasVideo = (data.videoUrl && data.videoUrl.length > 0) || (data.videos && data.videos.length > 0)
    const hasImage = (data.imageUrl && data.imageUrl.length > 0) || (data.images && data.images.length > 0)

    console.log('🔍 Validation check:', {
      hasContent,
      hasVideo,
      hasImage,
      contentLength: data.content?.length || 0,
      videoUrl: data.videoUrl?.substring(0, 50) || 'none',
      videosCount: data.videos?.length || 0
    })

    return hasContent || hasVideo || hasImage
  }, {
    message: "Post must have either text content, video, or image"
  }),

  updatePost: z.object({
    content: z.string().min(1).max(2000).optional(),
    hashtags: z.array(z.string()).optional(),
    imageUrl: z.string().optional(), // Accept any string (including base64)
    images: z.array(z.string()).optional(), // Accept any string (including base64)
    videoUrl: z.string().optional(), // Accept any string (including base64)
    videos: z.array(z.string()).optional(), // Accept any string (including base64)
    status: z.enum(['DRAFT', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'FAILED']).optional(),
    scheduledAt: z.string().refine((val) => {
      if (!val) return true
      const date = new Date(val)
      return !isNaN(date.getTime())
    }, 'Invalid date format').optional()
  }),

  // Social account schemas
  connectSocialAccount: z.object({
    platform: z.enum(['TWITTER', 'LINKEDIN', 'INSTAGRAM', 'YOUTUBE']),
    accessToken: z.string(),
    refreshToken: z.string().optional(),
    accountId: z.string(),
    accountName: z.string(),
    expiresAt: z.string().datetime().optional()
  }),

  // Chat message schemas
  chatMessage: z.object({
    content: z.string().min(1),
    type: z.enum(['USER', 'ASSISTANT', 'SYSTEM']).optional().default('USER'),
    metadata: z.any().optional()
  }),

  // Subscription schemas
  updateSubscription: z.object({
    tier: z.enum(['STARTER', 'GROWTH', 'BUSINESS', 'AGENCY'])
  })
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

// Response formatting
export function formatUser(user: any) {
  const { password, ...userWithoutPassword } = user
  return userWithoutPassword
}

export function formatPost(post: any) {
  return {
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    scheduledAt: post.scheduledAt?.toISOString(),
    publishedAt: post.publishedAt?.toISOString()
  }
}

export function formatSocialAccount(account: any) {
  const { accessToken, refreshToken, ...accountWithoutTokens } = account
  return {
    ...accountWithoutTokens,
    hasValidTokens: !!(accessToken && (!account.expiresAt || account.expiresAt > new Date()))
  }
}

// Helper functions for hashtag conversion (SQLite compatibility)
export function hashtagsToString(hashtags: string[]): string {
  return JSON.stringify(hashtags || [])
}

export function hashtagsFromString(hashtagsString: string): string[] {
  try {
    return JSON.parse(hashtagsString || '[]')
  } catch {
    return []
  }
}

export function formatPostWithHashtags(post: any) {
  return {
    ...formatPost(post),
    hashtags: hashtagsFromString(post.hashtags)
  }
}
