// Analytics refresh endpoint
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { fetchAllUserAnalytics } from '@/lib/analytics/social-analytics'

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        console.log(`🔄 Refreshing analytics for user ${user.id}`)
        
        const analytics = await fetchAllUserAnalytics(user.id)
        
        return apiSuccess({
          message: 'Analytics refreshed successfully',
          analyticsCount: analytics.length,
          analytics: analytics.slice(0, 10) // Return first 10 for preview
        })
      } catch (error) {
        console.error('Analytics refresh error:', error)
        return apiError('Failed to refresh analytics', 500)
      }
    })
  )(req)
}
