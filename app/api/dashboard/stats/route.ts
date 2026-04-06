// Dashboard stats API endpoint using Supabase
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess } from '@/lib/api-utils'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const PLATFORMS = ['TWITTER', 'LINKEDIN', 'INSTAGRAM', 'YOUTUBE'] as const
        type Platform = typeof PLATFORMS[number]

        const currentMonth = new Date().getMonth() + 1
        const currentYear = new Date().getFullYear()
        const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString()
        const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString()

        // 1. Get usage data from Supabase
        const { data: usage } = await (db as any)
          .from('usage_tracking')
          .select('posts_used')
          .eq('user_id', user.id)
          .eq('month', currentMonth)
          .eq('year', currentYear)
          .maybeSingle()

        // 2. Get connected accounts count and breakdown
        const { data: socialAccounts, error: accountsError } = await (db as any)
          .from('social_accounts')
          .select('platform, account_name')
          .eq('user_id', user.id)
          .eq('is_active', true)

        if (accountsError) throw accountsError

        const platformBreakdown: Record<Platform, number> = {
          TWITTER: 0,
          LINKEDIN: 0,
          INSTAGRAM: 0,
          YOUTUBE: 0
        }

        socialAccounts?.forEach((account: any) => {
          if ((PLATFORMS as readonly string[]).includes(account.platform)) {
            platformBreakdown[account.platform as Platform]++
          }
        })

        // 3. Get platform-specific stats
        const platformStats: Record<Platform, { accountsConnected: number; postsPublished: number; drafts: number; scheduled: number }> = {
          TWITTER: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
          LINKEDIN: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
          INSTAGRAM: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
          YOUTUBE: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
        }

        // Fetch all posts for this user to calculate stats locally (more efficient than separate queries if n is small)
        const { data: allPosts, error: postsError } = await (db as any)
          .from('posts')
          .select(`
            status,
            publications:post_publications(
              status,
              social_account:social_accounts(platform)
            )
          `)
          .eq('user_id', user.id)

        if (postsError) throw postsError

        allPosts?.forEach((post: any) => {
          const platforms = new Set<Platform>()
          post.publications?.forEach((pub: any) => {
            if (pub.social_account?.platform) {
               platforms.add(pub.social_account.platform as Platform)
            }
          })

          platforms.forEach((platform) => {
            if (platformStats[platform]) {
              if (post.status === 'PUBLISHED' || post.publications?.some((pub: any) => pub.status === 'PUBLISHED')) {
                platformStats[platform].postsPublished++
              } else if (post.status === 'DRAFT') {
                platformStats[platform].drafts++
              } else if (post.status === 'SCHEDULED') {
                platformStats[platform].scheduled++
              }
            }
          })
        })

        // Add account counts to platformStats
        socialAccounts?.forEach((acc: any) => {
          const platform = acc.platform as Platform
          if (platformStats[platform]) {
            platformStats[platform].accountsConnected++
          }
        })

        // 4. Get general post counts
        const { count: totalPosts } = await (db as any)
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        const { count: postsThisMonth } = await (db as any)
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth)

        // 5. Get recent posts
        const { data: recentPostsRaw, error: recentError } = await (db as any)
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
              social_account:social_accounts(platform, account_name)
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (recentError) throw recentError

        const formattedPosts = (recentPostsRaw || []).map((post: any) => {
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
            hashtags: post.hashtags || []
          }
        })

        // 6. Get real engagement data from analytics
        // We join analytics through posts to filter by user_id
        const { data: engagementAnalytics, error: analyticsError } = await (db as any)
          .from('post_analytics')
          .select(`
            likes,
            comments,
            shares,
            clicks,
            impressions,
            posts!inner(user_id)
          `)
          .eq('posts.user_id', user.id)

        if (analyticsError) throw analyticsError

        // Calculate totals
        let totalEngagement = 0
        let totalLikes = 0
        let totalComments = 0
        let totalShares = 0
        let totalClicks = 0

        engagementAnalytics?.forEach((row: any) => {
          const l = row.likes || 0
          const c = row.comments || 0
          const s = row.shares || 0
          const cl = row.clicks || 0
          totalLikes += l
          totalComments += c
          totalShares += s
          totalClicks += cl
          totalEngagement += (l + c + s + cl)
        })

        // Weekly engagement (mock data for now, same as before)
        const currentWeek = [12, 15, 18, 22, 25, 28, 30]
        const previousWeek = [10, 12, 15, 18, 20, 22, 24]

        return apiSuccess({
          totalPosts: totalPosts || 0,
          postsThisMonth: usage?.posts_used || postsThisMonth || 0,
          accountsConnected: socialAccounts?.length || 0,
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
            postsUsed: usage?.posts_used || postsThisMonth || 0,
            month: currentMonth,
            year: currentYear
          }
        })
      } catch (error) {
        console.error('Dashboard stats error:', error)
        // Return default empty stats on error
        return apiSuccess({
          totalPosts: 0,
          postsThisMonth: 0,
          accountsConnected: 0,
          totalEngagement: 0,
          recentPosts: [],
          platformBreakdown: { TWITTER: 0, LINKEDIN: 0, INSTAGRAM: 0, YOUTUBE: 0 },
          platformStats: {
            TWITTER: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
            LINKEDIN: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
            INSTAGRAM: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 },
            YOUTUBE: { accountsConnected: 0, postsPublished: 0, drafts: 0, scheduled: 0 }
          },
          engagementMetrics: {
            likes: 0, comments: 0, shares: 0, clicks: 0,
            currentWeek: [0, 0, 0, 0, 0, 0, 0],
            previousWeek: [0, 0, 0, 0, 0, 0, 0]
          },
          usage: { postsUsed: 0, month: new Date().getMonth() + 1, year: new Date().getFullYear() }
        })
      }
    })
  )(req)
}
