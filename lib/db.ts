// Database layer — Supabase replaces Prisma
import { supabaseAdmin } from './supabase/admin'

// Re-export the admin client as `db` so existing API routes work after migration
export const db = supabaseAdmin

// Helper functions for subscription limits
export const getSubscriptionLimits = (tier: string) => {
  const limits: Record<string, { accounts: number; posts: number }> = {
    STARTER: { accounts: 3, posts: 50 },
    GROWTH: { accounts: 10, posts: 200 },
    BUSINESS: { accounts: 25, posts: -1 }, // unlimited
    AGENCY: { accounts: 100, posts: -1 },  // unlimited
  }
  return limits[tier] || limits.STARTER
}

// Helper function to check usage limits
export const checkUsageLimit = async (userId: string, tier: string): Promise<boolean> => {
  const limits = getSubscriptionLimits(tier)
  if (limits.posts === -1) return true // unlimited

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const { data } = await db
    .from('usage_tracking')
    .select('posts_used')
    .eq('user_id', userId)
    .eq('month', currentMonth)
    .eq('year', currentYear)
    .maybeSingle()

  return !data || (data.posts_used ?? 0) < limits.posts
}
