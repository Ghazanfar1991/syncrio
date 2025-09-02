import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, validateRequest } from '@/lib/api-utils'
import { db } from '@/lib/db'
import { z } from 'zod'

const checkExistingDraftSchema = z.object({
  content: z.string(),
  platform: z.string(),
  socialAccountId: z.string()
})

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const body = await req.json()
        const { content, platform, socialAccountId } = validateRequest(checkExistingDraftSchema, body)

        console.log('🔍 Checking for existing draft:', { content: content.substring(0, 50), platform, socialAccountId })

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

        // Check if a draft post already exists with matching content for this account
        const existingDraft = await db.post.findFirst({
          where: {
            userId: user.id,
            status: 'DRAFT',
            platform: platform as any,
            content: content,
            publications: {
              some: {
                socialAccountId: socialAccountId
              }
            }
          }
        })

        const exists = !!existingDraft

        console.log(`🔍 Existing draft check result: ${exists ? 'Found' : 'Not found'}`)

        return apiSuccess({
          exists,
          draftId: existingDraft?.id || null
        })

      } catch (error) {
        console.error('Failed to check existing draft:', error)
        return apiError('Failed to check existing draft', 500)
      }
    })
  )(req)
}
