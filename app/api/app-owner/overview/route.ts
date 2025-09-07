import { NextResponse } from 'next/server'
import { PrismaClient, PostStatus, PublicationStatus, SubscriptionStatus } from '@prisma/client'

// Reuse Prisma across hot reloads in dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error'] : [] })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function GET() {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Core counts
    const [
      totalUsers,
      activeSessionsDistinctUsers,
      totalPosts,
      scheduledPosts,
      publishedPosts,
      failedPosts,
      postsThisMonth,
      newUsersThisMonth,
      usageSum,
      subscriptionsByStatus,
      accountsByPlatform,
      postsByPlatform,
      publishedByPlatform,
      failedByPlatform,
      publishedPublicationsCount,
      failedPublicationsCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.session.findMany({
        where: { expires: { gt: now } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      prisma.post.count(),
      prisma.post.count({ where: { status: PostStatus.SCHEDULED } }),
      prisma.post.count({ where: { status: PostStatus.PUBLISHED } }),
      prisma.post.count({ where: { status: PostStatus.FAILED } }),
      prisma.post.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.usageTracking.aggregate({
        where: { month: now.getMonth() + 1, year: now.getFullYear() },
        _sum: { postsUsed: true },
      }),
      prisma.subscription.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.socialAccount.groupBy({ by: ['platform'], _count: { _all: true }, where: { isConnected: true } }),
      prisma.post.groupBy({ by: ['platform'], _count: { _all: true } }),
      prisma.post.groupBy({ by: ['platform'], where: { status: PostStatus.PUBLISHED }, _count: { _all: true } }),
      prisma.post.groupBy({ by: ['platform'], where: { status: PostStatus.FAILED }, _count: { _all: true } }),
      prisma.postPublication.count({ where: { status: PublicationStatus.PUBLISHED } }),
      prisma.postPublication.count({ where: { status: PublicationStatus.FAILED } }),
    ])

    const activeUsers = activeSessionsDistinctUsers.length

    // Subscriptions breakdown
    const subMap: Record<string, number> = {}
    for (const s of subscriptionsByStatus) subMap[s.status] = s._count._all
    const totalSubscriptions = Object.values(subMap).reduce((a, b) => a + b, 0)
    const activeSubscriptions = subMap[SubscriptionStatus.ACTIVE] ?? 0
    const trialingSubscriptions = subMap[SubscriptionStatus.TRIALING] ?? 0
    const canceledSubscriptions = subMap[SubscriptionStatus.CANCELED] ?? 0

    // Platform breakdown merged
    const mapPlatforms = new Map<string, { platform: string; posts: number; published: number; failed: number; accounts: number }>()
    for (const a of accountsByPlatform) {
      mapPlatforms.set(a.platform, { platform: a.platform, posts: 0, published: 0, failed: 0, accounts: a._count._all })
    }
    for (const p of postsByPlatform) {
      const m = mapPlatforms.get(p.platform) ?? { platform: p.platform, posts: 0, published: 0, failed: 0, accounts: 0 }
      m.posts = p._count._all
      mapPlatforms.set(p.platform, m)
    }
    for (const p of publishedByPlatform) {
      const m = mapPlatforms.get(p.platform) ?? { platform: p.platform, posts: 0, published: 0, failed: 0, accounts: 0 }
      m.published = p._count._all
      mapPlatforms.set(p.platform, m)
    }
    for (const p of failedByPlatform) {
      const m = mapPlatforms.get(p.platform) ?? { platform: p.platform, posts: 0, published: 0, failed: 0, accounts: 0 }
      m.failed = p._count._all
      mapPlatforms.set(p.platform, m)
    }
    const platformBreakdown = Array.from(mapPlatforms.values()).sort((a, b) => b.posts - a.posts)

    // Recent activity: users + publications
    const [recentUsers, recentPublications] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, email: true, createdAt: true } }),
      prisma.postPublication.findMany({
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: 15,
        select: {
          id: true,
          status: true,
          publishedAt: true,
          createdAt: true,
          errorMessage: true,
          socialAccount: { select: { platform: true, accountName: true } },
        },
      }),
    ])

    const activityUsers = recentUsers.map((u) => ({
      id: `user_${u.id}`,
      type: 'user_signup',
      message: `New user registered: ${u.email}`,
      timestamp: u.createdAt.toISOString(),
      severity: 'success',
    }))

    const activityPubs = recentPublications.map((p) => {
      const when = p.publishedAt ?? p.createdAt
      const platform = p.socialAccount?.platform ?? 'Unknown'
      const account = p.socialAccount?.accountName ?? ''
      if (p.status === PublicationStatus.PUBLISHED) {
        return {
          id: `pub_${p.id}`,
          type: 'post_published',
          message: `Post published to ${platform}${account ? ` (${account})` : ''}`,
          timestamp: when.toISOString(),
          severity: 'success',
        }
      } else if (p.status === PublicationStatus.FAILED) {
        return {
          id: `pub_${p.id}`,
          type: 'post_failed',
          message: `Failed to publish to ${platform}${p.errorMessage ? `: ${p.errorMessage}` : ''}`,
          timestamp: when.toISOString(),
          severity: 'error',
        }
      }
      return {
        id: `pub_${p.id}`,
        type: 'system_alert',
        message: `Publication status: ${p.status}`,
        timestamp: when.toISOString(),
        severity: 'info',
      }
    })

    const recentActivity = [...activityPubs, ...activityUsers]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15)

    // System health heuristic from publication success rate
    const totalPubs = publishedPublicationsCount + failedPublicationsCount
    const successRate = totalPubs > 0 ? publishedPublicationsCount / totalPubs : 1
    const systemHealth = successRate >= 0.95 ? 'excellent' : successRate >= 0.85 ? 'good' : successRate >= 0.7 ? 'warning' : 'critical'

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalPosts,
      scheduledPosts,
      publishedPosts,
      failedPosts,
      publishedPublications: publishedPublicationsCount,
      failedPublications: failedPublicationsCount,
      postsThisMonth,
      newUsersThisMonth,
      usageThisMonth: usageSum._sum.postsUsed ?? 0,
      totalSubscriptions,
      activeSubscriptions,
      trialingSubscriptions,
      canceledSubscriptions,
      platformBreakdown,
      recentActivity,
      systemHealth,
      lastUpdatedAt: now.toISOString(),
    })
  } catch (err: any) {
    console.error('app-owner overview error', err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}

