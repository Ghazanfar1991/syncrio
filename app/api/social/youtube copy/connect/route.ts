// YouTube OAuth initiation endpoint
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { generateYouTubeOAuthURL, youtubeConfig } from '@/lib/social/youtube'

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        // Check if YouTube is configured
        if (!youtubeConfig.clientId || !youtubeConfig.clientSecret) {
          return apiError('YouTube integration not configured. Please contact administrator.', 503)
        }

        // Generate YouTube OAuth URL
        const authUrl = generateYouTubeOAuthURL(user.id)
        
        return apiSuccess({ 
          authUrl,
          message: 'Redirect to this URL to connect your YouTube channel'
        })
      } catch (error) {
        console.error('YouTube OAuth initiation error:', error)
        return apiError('Failed to initiate YouTube OAuth', 500)
      }
    })
  )(req)
}
