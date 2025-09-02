// Instagram OAuth initiation endpoint
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { getInstagramAuthUrl } from '@/lib/social/instagram'

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        // Generate Instagram OAuth URL
        const authUrl = getInstagramAuthUrl(user.id)
        
        return apiSuccess({ 
          authUrl,
          message: 'Redirect to this URL to connect your Instagram account'
        })
      } catch (error) {
        console.error('Instagram OAuth initiation error:', error)
        return apiError('Failed to initiate Instagram OAuth', 500)
      }
    })
  )(req)
}
