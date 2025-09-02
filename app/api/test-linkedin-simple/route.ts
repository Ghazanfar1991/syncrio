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
        const { content } = body

        if (!content) {
          return apiError('Content is required', 400)
        }

        console.log('🧪 Testing LinkedIn simple posting (no images)...')
        console.log('📝 Content:', content.substring(0, 100))

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

        // Test the posting without images
        const result = await postToLinkedIn(
          linkedinAccount.accessToken,
          content,
          linkedinAccount.accountId
          // No imageUrl parameter
        )

        console.log('✅ LinkedIn simple posting test successful:', result)

        return apiSuccess({
          message: 'LinkedIn simple posting test successful',
          postId: result.id,
          accountName: linkedinAccount.accountName
        })

      } catch (error) {
        console.error('❌ LinkedIn simple posting test failed:', error)
        return apiError(`LinkedIn simple posting test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500)
      }
    })
  )(req)
}
