// Dashboard stats API endpoint using Supabase
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
        const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString()
        const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString()

        const [usageResult, socialAccountsResult, totalPostsResult, postsThisMonthResult] = await Promise.all([
          (db as any)
            .from('usage_tracking')
            .select('posts_used')
            .eq('user_id', user.id)
            .eq('month', currentMonth)
            .eq('year', currentYear)
            .maybeSingle(),
          (db as any)
            .from('social_accounts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_active', true)
            .eq('is_connected', true),
          (db as any)
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          (db as any)
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', startOfMonth)
            .lte('created_at', endOfMonth)
        ])

        const usage = usageResult.data
        if (socialAccountsResult.error) throw socialAccountsResult.error
        if (totalPostsResult.error) throw totalPostsResult.error
        if (postsThisMonthResult.error) throw postsThisMonthResult.error
        const postsThisMonth = postsThisMonthResult.count || 0

        return apiSuccess({
          totalPosts: totalPostsResult.count || 0,
          postsThisMonth,
          accountsConnected: socialAccountsResult.count || 0,
          usage: {
            postsUsed: usage?.posts_used ?? postsThisMonth,
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
          usage: { postsUsed: 0, month: new Date().getMonth() + 1, year: new Date().getFullYear() }
        })
      }
    })
  )(req)
}
