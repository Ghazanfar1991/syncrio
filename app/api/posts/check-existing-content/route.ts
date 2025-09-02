import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, validateRequest } from '@/lib/api-utils'
import { db } from '@/lib/db'
import { z } from 'zod'

const checkExistingContentSchema = z.object({
  content: z.string(),
  platform: z.string(),
  socialAccountId: z.string()
})

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const body = await req.json()
        const { content, platform, socialAccountId } = validateRequest(checkExistingContentSchema, body)

        console.log('🔍 Checking for existing content:', { content: content.substring(0, 50), platform, socialAccountId })

        // Verify the social account belongs to the user
        const socialAccount = await db.socialAccount.findFirst({
          where: {
            id: socialAccountId,
            userId: user.id,
            isActive: true
          }
        })

        if (!socialAccount) {
          return apiError('Social account not found or not accessible', 404)
        }

        // Check if content already exists as scheduled or published for this account
        const existingContent = await db.post.findFirst({
          where: {
            userId: user.id,
            status: { in: ['SCHEDULED', 'PUBLISHED'] },
            platform: platform as any,
            content: content,
            publications: {
              some: {
                socialAccountId: socialAccountId
              }
            }
          }
        })

        const exists = !!existingContent

        console.log(`🔍 Existing content check result: ${exists ? 'Found' : 'Not found'}`)

        return apiSuccess({
          exists,
          postId: existingContent?.id || null,
          status: existingContent?.status || null
        })

      } catch (error) {
        console.error('Failed to check existing content:', error)
        return apiError('Failed to check existing content', 500)
      }
    })
  )(req)
}
