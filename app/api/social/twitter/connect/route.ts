// Twitter OAuth initiation endpoint
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { getTwitterAuthUrl, twitterConfig } from '@/lib/social/twitter-oauth-config'

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        // Check if Twitter is configured
        if (!twitterConfig.clientId || !twitterConfig.clientSecret) {
          return apiError('Twitter integration not configured. Please contact administrator.', 503)
        }

        // Generate Twitter OAuth URL
        const authUrl = getTwitterAuthUrl(user.id)

        return apiSuccess({
          authUrl,
          message: 'Redirect to this URL to connect your Twitter account'
        })
      } catch (error) {
        console.error('Twitter OAuth initiation error:', error)
        return apiError('Failed to initiate Twitter OAuth', 500)
      }
    })
  )(req)
}
