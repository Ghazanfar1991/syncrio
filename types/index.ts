// Shared auth types — replaces next-auth module augmentation
export interface SyncUser {
  id: string
  email: string
  name?: string | null
  image?: string | null
  subscriptionTier?: string
  subscription?: {
    tier: string
    status: string
  } | null
}

// Social platform enum — replaces Prisma enum
export type SocialPlatform =
  | 'TWITTER'
  | 'LINKEDIN'
  | 'INSTAGRAM'
  | 'YOUTUBE'
  | 'FACEBOOK'
  | 'TIKTOK'
  | 'TELEGRAM'
  | 'THREADS'
  | 'PINTEREST'
  | 'REDDIT'
  | 'BLUESKY'
  | 'DISCORD'
  | 'SLACK'

export type AccountType = 'PERSONAL' | 'BUSINESS' | 'CREATOR'
export type PostStatus = 'DRAFT' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION'
export type PublicationStatus = 'PENDING' | 'PUBLISHED' | 'FAILED' | 'RETRYING'
export type SubscriptionTier = 'STARTER' | 'GROWTH' | 'BUSINESS' | 'AGENCY'
export type SubscriptionStatus =
  | 'ACTIVE'
  | 'CANCELED'
  | 'INCOMPLETE'
  | 'INCOMPLETE_EXPIRED'
  | 'PAST_DUE'
  | 'TRIALING'
  | 'UNPAID'
export type TeamRole = 'ADMIN' | 'EDITOR' | 'MEMBER' | 'VIEWER'
export type AIFeature =
  | 'CHAT_ASSISTANT'
  | 'POST_GENERATOR'
  | 'HASHTAG_GENERATOR'
  | 'IMAGE_GENERATOR'
  | 'VIDEO_GENERATOR'
  | 'SCHEDULER_COPY'
  | 'SUMMARIZER'
