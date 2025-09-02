// Dashboard stats API endpoint
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess } from '@/lib/api-utils'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
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
        const socialAccounts = await db.socialAccount.findMany({
          where: {
            userId: user.id,
            isActive: true
          },
          select: {
            platform: true,
            accountName: true
          }
        })

        const platformBreakdown = {
          TWITTER: 0,
          LINKEDIN: 0,
          INSTAGRAM: 0,
          YOUTUBE: 0
        }

        socialAccounts.forEach(account => {
          platformBreakdown[account.platform as keyof typeof platformBreakdown]++
        })

        // Get platform-specific stats
        const platformStats: Record<string, any> = {}
        
        for (const platform of ['TWITTER', 'LINKEDIN', 'INSTAGRAM', 'YOUTUBE']) {
          const platformAccounts = socialAccounts.filter(acc => acc.platform === platform)
          
          // Get posts for this platform
          const platformPosts = await db.post.findMany({
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

          const publishedPosts = platformPosts.filter(post => 
            post.status === 'PUBLISHED' || 
            post.publications.some(pub => pub.status === 'PUBLISHED')
          ).length

          const draftPosts = platformPosts.filter(post => post.status === 'DRAFT').length
          const scheduledPosts = platformPosts.filter(post => post.status === 'SCHEDULED').length

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
        const recentPosts = await db.post.findMany({
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
        const formattedPosts = recentPosts.map(post => {
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
        const engagementAnalytics = await db.postAnalytics.findMany({
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
        const totalEngagement = engagementAnalytics.reduce((sum, analytics) => 
          sum + analytics.likes + analytics.comments + analytics.shares + (analytics.clicks || 0), 0
        )

        // Calculate engagement metrics
        const totalLikes = engagementAnalytics.reduce((sum, analytics) => sum + analytics.likes, 0)
        const totalComments = engagementAnalytics.reduce((sum, analytics) => sum + analytics.comments, 0)
        const totalShares = engagementAnalytics.reduce((sum, analytics) => sum + analytics.shares, 0)
        const totalClicks = engagementAnalytics.reduce((sum, analytics) => sum + (analytics.clicks || 0), 0)

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
