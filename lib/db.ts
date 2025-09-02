// Database configuration with Prisma and Redis
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

// Prisma client singleton
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Redis client singleton (optional for development)
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

let redis: Redis | null = null

// Only initialize Redis if URL is provided
if (process.env.REDIS_URL) {
  try {
    redis = globalForRedis.redis ?? new Redis(process.env.REDIS_URL)
    if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis
    console.log('Redis connected successfully')
  } catch (error) {
    console.warn('Redis connection failed, continuing without Redis:', error)
    redis = null
  }
} else {
  console.log('Redis URL not provided, running without Redis')
}

export { redis }

// Helper functions for subscription limits
export const getSubscriptionLimits = (tier: string) => {
  const limits = {
    STARTER: { accounts: 3, posts: 50 },
    GROWTH: { accounts: 10, posts: 200 },
    BUSINESS: { accounts: 25, posts: -1 }, // unlimited
    AGENCY: { accounts: 100, posts: -1 }   // unlimited
  }
  return limits[tier as keyof typeof limits] || limits.STARTER
}

// Helper function to check usage limits
export const checkUsageLimit = async (userId: string, tier: string) => {
  const limits = getSubscriptionLimits(tier)
  if (limits.posts === -1) return true // unlimited

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const usage = await db.usageTracking.findUnique({
    where: {
      userId_month_year: {
        userId,
        month: currentMonth,
        year: currentYear
      }
    }
  })

  return !usage || usage.postsUsed < limits.posts
}
