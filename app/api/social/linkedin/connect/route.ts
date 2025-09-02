// LinkedIn OAuth initiation endpoint
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { getLinkedInAuthUrl, linkedinConfig } from '@/lib/social/linkedin'

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        // Check if LinkedIn is configured
        if (!linkedinConfig.clientId || !linkedinConfig.clientSecret) {
          return apiError('LinkedIn integration not configured. Please contact administrator.', 503)
        }

        console.log('LinkedIn OAuth initiation for user:', user.id)
        console.log('LinkedIn config:', {
          clientId: linkedinConfig.clientId ? 'Set' : 'Missing',
          redirectUri: linkedinConfig.redirectUri
        })

        // Generate LinkedIn OAuth URL
        const authUrl = getLinkedInAuthUrl(user.id)

        console.log('Generated LinkedIn OAuth URL:', authUrl)

        return apiSuccess({
          authUrl,
          message: 'Redirect to this URL to connect your LinkedIn account'
        })
      } catch (error) {
        console.error('LinkedIn OAuth initiation error:', error)
        return apiError('Failed to initiate LinkedIn OAuth', 500)
      }
    })
  )(req)
}
