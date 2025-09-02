// Facebook OAuth initiation endpoint
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        // Check if Facebook is configured
        const clientId = process.env.FACEBOOK_CLIENT_ID
        const clientSecret = process.env.FACEBOOK_CLIENT_SECRET
        
        if (!clientId || !clientSecret) {
          return apiError('Facebook integration not configured. Please contact administrator.', 503)
        }

        console.log('Facebook OAuth initiation for user:', user.id)
        console.log('Facebook config:', {
          clientId: clientId ? 'Set' : 'Missing',
          redirectUri: `${process.env.NEXTAUTH_URL}/api/social/facebook/callback`
        })

        // Generate Facebook OAuth URL
        const redirectUri = encodeURIComponent(`${process.env.NEXTAUTH_URL}/api/social/facebook/callback`)
        const scope = encodeURIComponent('pages_manage_posts,pages_read_engagement')
        const state = user.id
        
        const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`

        console.log('Generated Facebook OAuth URL:', authUrl)

        return apiSuccess({
          authUrl,
          message: 'Redirect to this URL to connect your Facebook account'
        })
      } catch (error) {
        console.error('Facebook OAuth initiation error:', error)
        return apiError('Failed to initiate Facebook OAuth', 500)
      }
    })
  )(req)
}
