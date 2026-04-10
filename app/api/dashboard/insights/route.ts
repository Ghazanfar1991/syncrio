import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess } from '@/lib/api-utils'
import { db } from '@/lib/db'

interface AnalyticsRow {
  likes?: number | null
  comments?: number | null
  shares?: number | null
  clicks?: number | null
  posts?: {
    created_at?: string | null
    published_at?: string | null
  } | null
}

function startOfDay(date: Date) {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

function buildWeeklySeries(rows: AnalyticsRow[]) {
  const today = startOfDay(new Date())
  const currentWeek = Array.from({ length: 7 }, () => 0)
  const previousWeek = Array.from({ length: 7 }, () => 0)
  const currentWeekStart = new Date(today)
  currentWeekStart.setDate(today.getDate() - 6)
  const previousWeekStart = new Date(today)
  previousWeekStart.setDate(today.getDate() - 13)

  rows.forEach((row) => {
    const eventDateValue = row.posts?.published_at || row.posts?.created_at

    if (!eventDateValue) {
      return
    }

    const eventDate = startOfDay(new Date(eventDateValue))
    const engagementValue =
      (row.likes || 0) + (row.comments || 0) + (row.shares || 0) + (row.clicks || 0)

    const currentWeekOffset = Math.floor(
      (eventDate.getTime() - currentWeekStart.getTime()) / (24 * 60 * 60 * 1000)
    )
    if (currentWeekOffset >= 0 && currentWeekOffset < 7) {
      currentWeek[currentWeekOffset] += engagementValue
      return
    }

    const previousWeekOffset = Math.floor(
      (eventDate.getTime() - previousWeekStart.getTime()) / (24 * 60 * 60 * 1000)
    )
    if (previousWeekOffset >= 0 && previousWeekOffset < 7) {
      previousWeek[previousWeekOffset] += engagementValue
    }
  })

  return { currentWeek, previousWeek }
}

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (_req: NextRequest, user: any) => {
      try {
        const PLATFORMS = ['TWITTER', 'LINKEDIN', 'INSTAGRAM', 'YOUTUBE'] as const
        type Platform = typeof PLATFORMS[number]

        const platformBreakdown: Record<Platform, number> = {
          TWITTER: 0,
          LINKEDIN: 0,
          INSTAGRAM: 0,
          YOUTUBE: 0,
        }

        const platformStats: Record<
          Platform,
          { accountsConnected: number; postsPublished: number; drafts: number; scheduled: number }
        > = {
          TWITTER: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
          LINKEDIN: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
          INSTAGRAM: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
          YOUTUBE: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
        }

        const today = new Date()
        const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()

        const [socialAccountsResult, allPostsResult, recentPostsResult, engagementAnalyticsResult] =
          await Promise.all([
            (db as any)
              .from('social_accounts')
              .select('platform, account_name')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .eq('is_connected', true),
            (db as any)
              .from('posts')
              .select('status, platform')
              .eq('user_id', user.id),
            (db as any)
              .from('posts')
              .select(`
                id,
                content,
                status,
                created_at,
                image_url,
                images,
                video_url,
                videos,
                hashtags,
                publications:post_publications(
                  id,
                  social_account:social_accounts(platform, account_name)
                )
              `)
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(5),
            (db as any)
              .from('post_analytics')
              .select(`
                likes,
                comments,
                shares,
                clicks,
                posts!inner(user_id, created_at, published_at)
              `)
              .eq('posts.user_id', user.id)
              .gte('posts.created_at', fourteenDaysAgo),
          ])

        const socialAccounts = socialAccountsResult.data
        const allPosts = allPostsResult.data
        const recentPostsRaw = recentPostsResult.data
        const engagementAnalytics = engagementAnalyticsResult.data

        if (socialAccountsResult.error) throw socialAccountsResult.error
        if (allPostsResult.error) throw allPostsResult.error
        if (recentPostsResult.error) throw recentPostsResult.error
        if (engagementAnalyticsResult.error) throw engagementAnalyticsResult.error

        socialAccounts?.forEach((account: any) => {
          if ((PLATFORMS as readonly string[]).includes(account.platform)) {
            platformBreakdown[account.platform as Platform]++
          }
        })

        allPosts?.forEach((post: any) => {
          const platform = post.platform as Platform

          if (!platformStats[platform]) return

          if (post.status === 'PUBLISHED') {
            platformStats[platform].postsPublished++
          } else if (post.status === 'DRAFT') {
            platformStats[platform].drafts++
          } else if (post.status === 'SCHEDULED' || post.status === 'QUEUED') {
            platformStats[platform].scheduled++
          }
        })

        socialAccounts?.forEach((account: any) => {
          const platform = account.platform as Platform

          if (platformStats[platform]) {
            platformStats[platform].accountsConnected++
          }
        })

        const recentPosts = (recentPostsRaw || []).map((post: any) => {
          const primaryPublication = post.publications?.[0]

          return {
            id: post.id,
            content: post.content,
            status: post.status,
            createdAt: post.created_at,
            platform: primaryPublication?.social_account?.platform || null,
            accountName: primaryPublication?.social_account?.account_name || null,
            imageUrl: post.image_url || null,
            images: post.images || null,
            videoUrl: post.video_url || null,
            videos: post.videos || null,
            hashtags: post.hashtags || [],
          }
        })

        let totalEngagement = 0
        let totalLikes = 0
        let totalComments = 0
        let totalShares = 0
        let totalClicks = 0

        engagementAnalytics?.forEach((row: any) => {
          const likes = row.likes || 0
          const comments = row.comments || 0
          const shares = row.shares || 0
          const clicks = row.clicks || 0

          totalLikes += likes
          totalComments += comments
          totalShares += shares
          totalClicks += clicks
          totalEngagement += likes + comments + shares + clicks
        })

        const weeklySeries = buildWeeklySeries((engagementAnalytics || []) as AnalyticsRow[])

        return apiSuccess({
          totalEngagement,
          recentPosts,
          platformBreakdown,
          platformStats,
          engagementMetrics: {
            likes: totalLikes,
            comments: totalComments,
            shares: totalShares,
            clicks: totalClicks,
            currentWeek: weeklySeries.currentWeek,
            previousWeek: weeklySeries.previousWeek,
          },
        })
      } catch (error) {
        console.error('Dashboard insights error:', error)

        return apiSuccess({
          totalEngagement: 0,
          recentPosts: [],
          platformBreakdown: { TWITTER: 0, LINKEDIN: 0, INSTAGRAM: 0, YOUTUBE: 0 },
          platformStats: {
            TWITTER: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
            LINKEDIN: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
            INSTAGRAM: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
            YOUTUBE: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
          },
          engagementMetrics: {
            likes: 0,
            comments: 0,
            shares: 0,
            clicks: 0,
            currentWeek: [0, 0, 0, 0, 0, 0, 0],
            previousWeek: [0, 0, 0, 0, 0, 0, 0],
          },
        })
      }
    })
  )(req)
}
