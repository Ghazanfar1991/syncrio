import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const nowIso = now.toISOString()

    // 1. Core counts (Supabase head-only queries for counts)
    const [
      { count: totalUsers },
      { count: totalPosts },
      { count: scheduledPosts },
      { count: publishedPosts },
      { count: failedPosts },
      { count: postsThisMonth },
      { count: newUsersThisMonth },
      { count: publishedPublicationsCount },
      { count: failedPublicationsCount },
    ] = await Promise.all([
      (db as any).from('users').select('*', { count: 'exact', head: true }),
      (db as any).from('posts').select('*', { count: 'exact', head: true }),
      (db as any).from('posts').select('*', { count: 'exact', head: true }).eq('status', 'SCHEDULED'),
      (db as any).from('posts').select('*', { count: 'exact', head: true }).eq('status', 'PUBLISHED'),
      (db as any).from('posts').select('*', { count: 'exact', head: true }).eq('status', 'FAILED'),
      (db as any).from('posts').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
      (db as any).from('users').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
      (db as any).from('post_publications').select('*', { count: 'exact', head: true }).eq('status', 'PUBLISHED'),
      (db as any).from('post_publications').select('*', { count: 'exact', head: true }).eq('status', 'FAILED'),
    ])

    // 2. Complex aggregations (Fetch and process in JS as Supabase SDK limit aggregate support)
    // Subscription status breakdown
    const { data: subsData } = await (db as any).from('subscriptions').select('status')
    const subMap: Record<string, number> = {}
    subsData?.forEach((s: any) => {
      subMap[s.status] = (subMap[s.status] || 0) + 1
    })
    const totalSubscriptions = subsData?.length || 0
    const activeSubscriptions = subMap['ACTIVE'] || 0
    const trialingSubscriptions = subMap['TRIALING'] || 0
    const canceledSubscriptions = subMap['CANCELED'] || 0

    // Social accounts per platform
    const { data: accountsData } = await (db as any).from('social_accounts').select('platform').eq('is_active', true)
    const platformAccountsMap: Record<string, number> = {}
    accountsData?.forEach((a: any) => {
      platformAccountsMap[a.platform] = (platformAccountsMap[a.platform] || 0) + 1
    })

    // Usage Sum (UsageTracking)
    const { data: usageData } = await (db as any)
      .from('usage_tracking')
      .select('posts_used')
      .eq('month', now.getMonth() + 1)
      .eq('year', now.getFullYear())
    const usageSumTotal = (usageData || []).reduce((acc: number, item: any) => acc + (item.posts_used || 0), 0)

    // Platform breakdown (Merged metrics)
    const { data: allPostsMeta } = await (db as any).from('posts').select('platform, status')
    const mapPlatforms = new Map<string, { platform: string; posts: number; published: number; failed: number; accounts: number }>()

    // Combine accounts and posts data
    Object.entries(platformAccountsMap).forEach(([platform, count]) => {
      mapPlatforms.set(platform, { platform, posts: 0, published: 0, failed: 0, accounts: count })
    })

    allPostsMeta?.forEach((p: any) => {
      if (!p.platform) return
      const m = mapPlatforms.get(p.platform) ?? { platform: p.platform, posts: 0, published: 0, failed: 0, accounts: 0 }
      m.posts++
      if (p.status === 'PUBLISHED') m.published++
      if (p.status === 'FAILED') m.failed++
      mapPlatforms.set(p.platform, m)
    })

    const platformBreakdown = Array.from(mapPlatforms.values()).sort((a, b) => b.posts - a.posts)

    // 3. Recent Activity (Latest signups + publications)
    const [
      { data: recentUsers },
      { data: recentPublications },
    ] = await Promise.all([
      (db as any).from('users').select('id, email, created_at').order('created_at', { ascending: false }).limit(5),
      (db as any).from('post_publications').select('id, status, published_at, created_at, error_message, social_account:social_accounts(platform, account_name)').order('created_at', { ascending: false }).limit(15),
    ])

    const activityUsers = (recentUsers || []).map((u: any) => ({
      id: `user_${u.id}`,
      type: 'user_signup',
      message: `New user registered: ${u.email}`,
      timestamp: u.created_at,
      severity: 'success',
    }))

    const activityPubs = (recentPublications || []).map((p: any) => {
      const when = p.published_at ?? p.created_at
      const platform = p.social_account?.platform ?? 'Unknown'
      const account = p.social_account?.account_name ?? ''
      if (p.status === 'PUBLISHED') {
        return {
          id: `pub_${p.id}`,
          type: 'post_published',
          message: `Post published to ${platform}${account ? ` (${account})` : ''}`,
          timestamp: when,
          severity: 'success',
        }
      } else if (p.status === 'FAILED') {
        return {
          id: `pub_${p.id}`,
          type: 'post_failed',
          message: `Failed to publish to ${platform}${p.error_message ? `: ${p.error_message}` : ''}`,
          timestamp: when,
          severity: 'error',
        }
      }
      return {
        id: `pub_${p.id}`,
        type: 'system_alert',
        message: `Publication status: ${p.status}`,
        timestamp: when,
        severity: 'info',
      }
    })

    const recentActivity = [...activityPubs, ...activityUsers]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15)

    // System Health heuristic
    const totalPubs = (publishedPublicationsCount || 0) + (failedPublicationsCount || 0)
    const successRate = totalPubs > 0 ? (publishedPublicationsCount || 0) / totalPubs : 1
    const systemHealth = successRate >= 0.95 ? 'excellent' : successRate >= 0.85 ? 'good' : successRate >= 0.7 ? 'warning' : 'critical'

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeUsers: totalUsers || 0, // Using total users as proxy since local Supabase doesn't expose active sessions easily
      totalPosts: totalPosts || 0,
      scheduledPosts: scheduledPosts || 0,
      publishedPosts: publishedPosts || 0,
      failedPosts: failedPosts || 0,
      publishedPublications: publishedPublicationsCount || 0,
      failedPublications: failedPublicationsCount || 0,
      postsThisMonth: postsThisMonth || 0,
      newUsersThisMonth: newUsersThisMonth || 0,
      usageThisMonth: usageSumTotal,
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


