// Analytics overview endpoint using Bundle.social unified engine
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { bundleSocial } from '@/lib/bundle-social'

export async function GET(req: NextRequest) {
  try {
    // 1. Auth check
    const { data: { user } } = await (await import('@/lib/supabase/server')).createClient().auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || '30'
    
    // 2. Get user's team and connected accounts
    const { data: team } = await (supabaseAdmin
      .from('teams')
      .select('bundle_social_team_id')
      .eq('owner_id', user.id)
      .single() as any)

    const teamId = team?.bundle_social_team_id || process.env.BUNDLE_SOCIAL_TEAM_ID!

    const { data: accounts } = await (supabaseAdmin
      .from('social_accounts')
      .select('id, platform, account_name, bundle_social_account_id')
      .eq('user_id', user.id)
      .eq('is_active', true) as any)

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          overview: { totalPosts: 0, totalImpressions: 0, totalLikes: 0, totalComments: 0, totalShares: 0, engagementRate: '0.00', period: parseInt(period) },
          postsByPlatform: [],
          topPosts: [],
          dailyAnalytics: [],
          platformPerformance: []
        }
      })
    }

    // 3. Fetch analytics for each account from Bundle.social
    const analyticsPromises = accounts.map(async (acc: any) => {
      if (!acc.bundle_social_account_id) return null
      try {
        return await (bundleSocial.analytics as any).analyticsGetSocialAccountAnalytics({
          teamId,
          id: acc.bundle_social_account_id
        })
      } catch (e) {
        console.error(`Failed to fetch analytics for ${acc.platform}:`, e)
        return null
      }
    })

    const rawAnalytics = await Promise.all(analyticsPromises)
    
    // 4. Aggregate Metrics
    const overview = {
      totalPosts: 0,
      totalImpressions: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
    }

    const platformPerformance = accounts.map((acc: any, index: number) => {
      const stats = (rawAnalytics[index] as any) || {}
      overview.totalImpressions += stats.impressions || 0
      overview.totalLikes += stats.likes || 0
      overview.totalComments += stats.comments || 0
      overview.totalShares += stats.shares || 0
      
      const totalEng = (stats.likes || 0) + (stats.comments || 0) + (stats.shares || 0)
      const engagementRate = stats.impressions > 0 ? ((totalEng / stats.impressions) * 100).toFixed(2) : '0.00'

      return {
        platform: acc.platform,
        username: acc.account_name,
        totalReach: stats.impressions || 0,
        avgEngagement: engagementRate,
        isConnected: true
      }
    })

    const totalEngagement = overview.totalLikes + overview.totalComments + overview.totalShares
    const engagementRate = overview.totalImpressions > 0 ? ((totalEngagement / overview.totalImpressions) * 100).toFixed(2) : '0.00'

    // 5. Fetch recent posts from DB to get the count
    const { count: totalPosts } = await (supabaseAdmin
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'PUBLISHED') as any)

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          ...overview,
          totalPosts: totalPosts || 0,
          engagementRate,
          period: parseInt(period)
        },
        postsByPlatform: accounts.map((acc: any) => ({ platform: acc.platform, count: 0 })), 
        topPosts: [],
        dailyAnalytics: [], 
        platformPerformance
      }
    })
  } catch (error) {
    console.error('Analytics overview error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch analytics overview' }, { status: 500 })
  }
}
