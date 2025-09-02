// Dashboard stats API endpoint
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess } from '@/lib/api-utils'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        // Local helper types
        const PLATFORMS = ['TWITTER', 'LINKEDIN', 'INSTAGRAM', 'YOUTUBE'] as const
        type Platform = typeof PLATFORMS[number]
        type SocialAccountLite = { platform: string; accountName: string | null }
        type PlatformPost = { status: string; publications: Array<{ status: string }> }
        type RecentPost = {
          id: string
          content: string | null
          status: string
          createdAt: Date
          platform: string | null
          imageUrl: string | null
          images: string | null
          videoUrl: string | null
          videos: string | null
          hashtags: string | null | string[]
          publications: Array<{ socialAccount: { platform: string; accountName: string | null } }>
        }
        type EngagementRow = {
          likes: number
          comments: number
          shares: number
          clicks: number | null
          impressions: number
          createdAt: Date
        }

        const currentMonth = new Date().getMonth() + 1
        const currentYear = new Date().getFullYear()
        const startOfMonth = new Date(currentYear, currentMonth - 1, 1)
        const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59)

        // Get usage data
        const usage = await db.usageTracking.findUnique({
          where: {
            userId_month_year: {
              userId: user.id,
              month: currentMonth,
              year: currentYear
            }
          }
        })

        // Get connected accounts count and breakdown
        const socialAccounts: SocialAccountLite[] = await db.socialAccount.findMany({
          where: {
            userId: user.id,
            isActive: true
          },
          select: {
            platform: true,
            accountName: true
          }
        })

        const platformBreakdown: Record<Platform, number> = {
          TWITTER: 0,
          LINKEDIN: 0,
          INSTAGRAM: 0,
          YOUTUBE: 0
        }

        socialAccounts.forEach((account: SocialAccountLite) => {
          if ((PLATFORMS as readonly string[]).includes(account.platform)) {
            platformBreakdown[account.platform as Platform]++
          }
        })

        // Get platform-specific stats
        const platformStats: Record<Platform, { accountsConnected: number; postsPublished: number; drafts: number; scheduled: number }> = {
          TWITTER: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
          LINKEDIN: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
          INSTAGRAM: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
          YOUTUBE: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
        }
        
        for (const platform of PLATFORMS) {
          const platformAccounts = socialAccounts.filter((acc: SocialAccountLite) => acc.platform === platform)
          
          // Get posts for this platform
          const platformPosts: PlatformPost[] = await db.post.findMany({
            where: {
              userId: user.id,
              platform: platform as any
            },
            select: {
              status: true,
              publications: {
                select: {
                  status: true
                }
              }
            }
          })

          const publishedPosts = platformPosts.filter((post: PlatformPost) => 
            post.status === 'PUBLISHED' || 
            post.publications.some((pub: { status: string }) => pub.status === 'PUBLISHED')
          ).length

          const draftPosts = platformPosts.filter((post: PlatformPost) => post.status === 'DRAFT').length
          const scheduledPosts = platformPosts.filter((post: PlatformPost) => post.status === 'SCHEDULED').length

          platformStats[platform] = {
            accountsConnected: platformAccounts.length,
            postsPublished: publishedPosts,
            drafts: draftPosts,
            scheduled: scheduledPosts
          }
        }

        // Get posts data
        const totalPosts = await db.post.count({
          where: { userId: user.id }
        })

        const postsThisMonth = await db.post.count({
          where: {
            userId: user.id,
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          }
        })

        // Get recent posts
        const recentPosts: RecentPost[] = await db.post.findMany({
          where: { userId: user.id },
          select: {
            id: true,
            content: true,
            status: true,
            createdAt: true,
            platform: true,
            imageUrl: true,
            images: true,
            videoUrl: true,
            videos: true,
            hashtags: true,
            publications: {
              select: {
                socialAccount: {
                  select: {
                    platform: true,
                    accountName: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        })

        // Format recent posts
        const formattedPosts = recentPosts.map((post: RecentPost) => {
          const primaryPublication = post.publications[0]
          return {
            id: post.id,
            content: post.content,
            status: post.status,
            createdAt: post.createdAt.toISOString(),
            platform: post.platform || primaryPublication?.socialAccount?.platform || null,
            accountName: primaryPublication?.socialAccount?.accountName || null,
            imageUrl: post.imageUrl || null,
            images: post.images || null,
            videoUrl: post.videoUrl || null,
            videos: post.videos || null,
            hashtags: post.hashtags || []
          }
        })

        // Get real engagement data from analytics
        const engagementAnalytics: EngagementRow[] = await db.postAnalytics.findMany({
          where: {
            post: {
              userId: user.id
            }
          },
          select: {
            likes: true,
            comments: true,
            shares: true,
            clicks: true,
            impressions: true,
            createdAt: true
          }
        })

        // Calculate total engagement
        const totalEngagement = engagementAnalytics.reduce(
          (sum: number, analytics: EngagementRow) =>
            sum + analytics.likes + analytics.comments + analytics.shares + (analytics.clicks ?? 0),
          0
        )

        // Calculate engagement metrics
        const totalLikes = engagementAnalytics.reduce(
          (sum: number, analytics: EngagementRow) => sum + analytics.likes,
          0
        )
        const totalComments = engagementAnalytics.reduce(
          (sum: number, analytics: EngagementRow) => sum + analytics.comments,
          0
        )
        const totalShares = engagementAnalytics.reduce(
          (sum: number, analytics: EngagementRow) => sum + analytics.shares,
          0
        )
        const totalClicks = engagementAnalytics.reduce(
          (sum: number, analytics: EngagementRow) => sum + (analytics.clicks ?? 0),
          0
        )

        // Generate weekly engagement data (in a real app, this would come from analytics API)
        const currentWeek = [12, 15, 18, 22, 25, 28, 30]
        const previousWeek = [10, 12, 15, 18, 20, 22, 24]

        return apiSuccess({
          totalPosts,
          postsThisMonth: usage?.postsUsed || postsThisMonth,
          accountsConnected: socialAccounts.length,
          totalEngagement,
          recentPosts: formattedPosts,
          platformBreakdown,
          platformStats,
          engagementMetrics: {
            likes: totalLikes,
            comments: totalComments,
            shares: totalShares,
            clicks: totalClicks,
            currentWeek,
            previousWeek
          },
          usage: {
            postsUsed: usage?.postsUsed || postsThisMonth,
            month: currentMonth,
            year: currentYear
          }
        })
      } catch (error) {
        console.error('Dashboard stats error:', error)
        return apiSuccess({
          totalPosts: 0,
          postsThisMonth: 0,
          accountsConnected: 0,
          totalEngagement: 0,
          recentPosts: [],
          platformBreakdown: {
            TWITTER: 0,
            LINKEDIN: 0,
            INSTAGRAM: 0,
            YOUTUBE: 0
          },
          platformStats: {
            TWITTER: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
            LINKEDIN: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
            INSTAGRAM: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
            YOUTUBE: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 }
          },
          engagementMetrics: {
            likes: 0,
            comments: 0,
            shares: 0,
            clicks: 0,
            currentWeek: [0, 0, 0, 0, 0, 0, 0],
            previousWeek: [0, 0, 0, 0, 0, 0, 0]
          },
          usage: {
            postsUsed: 0,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear()
          }
        })
      }
    })
  )(req)
}
