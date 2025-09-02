import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { postToLinkedIn } from '@/lib/social/linkedin'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const body = await req.json()
        const { content, imageUrl } = body

        if (!content) {
          return apiError('Content is required', 400)
        }

        console.log('🧪 Testing LinkedIn posting...')
        console.log('📝 Content:', content.substring(0, 100))
        console.log('🖼️ Image URL:', imageUrl)

        // Get user's LinkedIn account
        const linkedinAccount = await db.socialAccount.findFirst({
          where: {
            userId: user.id,
            platform: 'LINKEDIN',
            isActive: true
          }
        })

        if (!linkedinAccount) {
          return apiError('No active LinkedIn account found. Please connect your LinkedIn account first.', 404)
        }

        if (!linkedinAccount.accessToken) {
          return apiError('LinkedIn account has no valid access token. Please reconnect your account.', 400)
        }

        console.log('🔗 LinkedIn account found:', linkedinAccount.accountName)

        // Test the posting
        const result = await postToLinkedIn(
          linkedinAccount.accessToken,
          content,
          linkedinAccount.accountId,
          imageUrl
        )

        console.log('✅ LinkedIn posting test successful:', result)

        return apiSuccess({
          message: 'LinkedIn posting test successful',
          postId: result.id,
          postUrl: result.url,
          accountName: linkedinAccount.accountName
        })

      } catch (error) {
        console.error('❌ LinkedIn posting test failed:', error)
        return apiError(`LinkedIn posting test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500)
      }
    })
  )(req)
}
