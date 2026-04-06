// Analytics overview — fetches from Bundle.social for all connected accounts
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { supabaseAdmin } from '@/lib/supabase/admin'

const BUNDLE_API = 'https://api.bundle.social/api/v1'
const BUNDLE_KEY = () => process.env.BUNDLE_SOCIAL_API_KEY!

// Cache TTL — 1 hour before re-fetching from Bundle
const CACHE_TTL_MS = 60 * 60 * 1000

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const { searchParams } = new URL(req.url)
      const force = searchParams.get('force') === 'true'
      const period = searchParams.get('period') || 'rolling'

      // 1. Get user's Bundle team
      const { data: teamRow } = await (supabaseAdmin as any)
        .from('teams')
        .select('bundle_social_team_id')
        .eq('owner_id', user.id)
        .maybeSingle()

      const bundleTeamId: string | null = teamRow?.bundle_social_team_id || null

      if (!bundleTeamId) {
        return apiSuccess({ accounts: [], message: 'No team connected yet' })
      }

      // 2. Get connected social accounts
      const { data: accounts } = await (supabaseAdmin as any)
        .from('social_accounts')
        .select('id, platform, bundle_social_account_id, display_name, username, avatar_url')
        .eq('user_id', user.id)
        .eq('is_connected', true)
        .not('bundle_social_account_id', 'is', null)

      if (!accounts || accounts.length === 0) {
        return apiSuccess({ accounts: [], message: 'No connected accounts' })
      }

      const results: any[] = []

      for (const account of accounts as any[]) {
        if (!account.bundle_social_account_id) continue

        // 3. Check cache (unless force=true)
        if (!force) {
          const { data: cached } = await (supabaseAdmin as any)
            .from('analytics_cache')
            .select('data, fetched_at')
            .eq('bundle_social_account_id', account.bundle_social_account_id)
            .eq('period', period)
            .maybeSingle()

          if (cached) {
            const age = Date.now() - new Date(cached.fetched_at).getTime()
            if (age < CACHE_TTL_MS) {
              results.push({
                accountId: account.id,
                platform: account.platform,
                displayName: account.display_name,
                username: account.username,
                avatarUrl: account.avatar_url,
                analytics: cached.data,
                cached: true,
                fetchedAt: cached.fetched_at,
                notSupported: account.platform === 'TWITTER',
                message: account.platform === 'TWITTER' ? 'Analytics not supported for this platform' : undefined
              })
              continue
            }
          }
        }

        // 4. Fetch fresh from Bundle.social
        try {
          const platform = (account.platform || '').toUpperCase()
          
          // Twitter analytics are not supported by the current Bundle Social API
          if (platform === 'TWITTER' || platform === 'X') {
            results.push({
              accountId: account.id,
              platform: account.platform,
              displayName: account.display_name,
              username: account.username,
              avatarUrl: account.avatar_url,
              analytics: null,
              message: 'Analytics not supported for this platform',
              notSupported: true,
            })
            continue
          }

          // The correct endpoint for social account analytics is /analytics/social-account/raw
          // It requires teamId and platformType. socialAccountId is optional but recommended for filtering.
          const url = `${BUNDLE_API}/analytics/social-account/raw?teamId=${bundleTeamId}&platformType=${account.platform}${force ? '&force=true' : ''}`
          
          const bundleRes = await fetch(url, {
            headers: { 'x-api-key': BUNDLE_KEY() },
          })

          if (!bundleRes.ok) {
            const errorText = await bundleRes.text()
            console.warn(`Analytics fetch failed for ${account.platform} (${bundleRes.status}):`, errorText)
            results.push({
              accountId: account.id,
              platform: account.platform,
              displayName: account.display_name,
              username: account.username,
              avatarUrl: account.avatar_url,
              analytics: null,
              error: `HTTP ${bundleRes.status}: ${errorText}`,
            })
            continue
          }

          const analyticsData = await bundleRes.json()

          // 5. Cache the result
          await (supabaseAdmin as any)
            .from('analytics_cache')
            .upsert(
              {
                user_id: user.id,
                bundle_social_account_id: account.bundle_social_account_id,
                platform: account.platform,
                period,
                data: analyticsData,
                fetched_at: new Date().toISOString(),
              },
              { onConflict: 'bundle_social_account_id,period' }
            )

          results.push({
            accountId: account.id,
            platform: account.platform,
            displayName: account.display_name,
            username: account.username,
            avatarUrl: account.avatar_url,
            analytics: analyticsData,
            cached: false,
            fetchedAt: new Date().toISOString(),
          })
        } catch (err) {
          console.error(`Analytics error for ${account.platform}:`, err)
          results.push({
            accountId: account.id,
            platform: account.platform,
            displayName: account.display_name,
            username: account.username,
            avatarUrl: account.avatar_url,
            analytics: null,
            error: 'Failed to fetch analytics',
          })
        }
      }

      // 6. Aggregate results for the frontend structure
      const overview = {
        totalPosts: 0,
        totalImpressions: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        engagementRate: '0.00',
        period: parseInt(period as string) || 30,
      }

      const platformPerformance: any[] = []
      const allTopPosts: any[] = []
      const dailyMap = new Map<string, any>()

      results.forEach((res) => {
        if (res.analytics) {
          // Extract metrics from Bundle's structure (handle raw vs standard)
          const metrics = res.analytics.lifetimeMetrics || res.analytics.socialAccount?.channels?.[0]?.lifetimeMetrics
          if (metrics) {
            overview.totalPosts += metrics.totalPosts || 0
            overview.totalImpressions += metrics.totalViews || metrics.totalImpressions || 0
            overview.totalLikes += metrics.totalLikes || 0
            overview.totalComments += metrics.totalComments || 0
          }

          platformPerformance.push({
            platform: res.platform,
            posts: metrics?.totalPosts || 0,
            username: res.username,
            avgEngagement: '0.00',
            totalReach: metrics?.totalViews || metrics?.totalImpressions || 0,
            isConnected: true,
            notSupported: res.notSupported,
            message: res.message
          })

          // Extract posts if available
          if (res.analytics.posts && Array.isArray(res.analytics.posts)) {
            allTopPosts.push(...res.analytics.posts.map((p: any) => ({
              ...p,
              platforms: [res.platform]
            })))
          }
        } else {
          // Placeholder for missing/unsupported accounts
          platformPerformance.push({
            platform: res.platform,
            posts: 0,
            username: res.username,
            avgEngagement: '0.00',
            totalReach: 0,
            isConnected: true,
            notSupported: res.notSupported,
            message: res.message
          })
        }
      })

      // Simple engagement rate calculation
      if (overview.totalImpressions > 0) {
        const totalEng = overview.totalLikes + overview.totalComments + overview.totalShares
        overview.engagementRate = ((totalEng / overview.totalImpressions) * 100).toFixed(2)
      }

      // Sort and limit top posts
      const topPosts = allTopPosts
        .sort((a, b) => (b.metrics?.impressions || 0) - (a.metrics?.impressions || 0))
        .slice(0, 10)

      return apiSuccess({
        overview,
        platformPerformance,
        topPosts,
        dailyAnalytics: [], // TODO: Implement daily grouping if needed
        postsByPlatform: platformPerformance.map(p => ({ platform: p.platform, count: p.posts }))
      })
    })
  )(req)
}
