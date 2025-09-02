// Global type definitions for ConversAI Social

// Extend NextAuth session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

export interface User {
  id: string
  email: string
  name: string
  subscription: SubscriptionTier
  createdAt: Date
  updatedAt: Date
}

export interface SubscriptionTier {
  id: string
  name: "starter" | "growth" | "business" | "agency"
  price: number
  accounts: number
  posts: number // -1 for unlimited
}

export interface SocialAccount {
  id: string
  userId: string
  platform: "twitter" | "linkedin" | "instagram" | "youtube"
  accountId: string
  accountName: string
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  isActive: boolean
}

export interface Post {
  id: string
  userId: string
  content: string
  hashtags: string[]
  imageUrl?: string
  platforms: string[]
  status: "draft" | "approved" | "scheduled" | "published" | "failed"
  scheduledAt?: Date
  publishedAt?: Date
  createdAt: Date
}

export interface ChatMessage {
  id: string
  userId: string
  content: string
  type: "user" | "assistant" | "system"
  timestamp: Date
  metadata?: any
}

export interface Analytics {
  postId: string
  platform: string
  likes: number
  comments: number
  shares: number
  views: number
  engagement: number
  fetchedAt: Date
}

export interface AnalyticsOverview {
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
