// Twitter OAuth 1.0a setup endpoint for media uploads
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { db } from '@/lib/db'
import { z } from 'zod'

const oauth1SetupSchema = z.object({
  accountId: z.string(),
  accessTokenSecret: z.string().min(1)
})

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const body = await req.json()
        const { accountId, accessTokenSecret } = oauth1SetupSchema.parse(body)
        
        // Verify the account belongs to the user and is a Twitter account
        const account = await db.socialAccount.findFirst({
          where: {
            id: accountId,
            userId: user.id,
            platform: 'TWITTER',
            isActive: true
          }
        })
        
        if (!account) {
          return apiError('Twitter account not found or not active', 404)
        }
        
        // Update the account with OAuth 1.0a access token secret
        await db.socialAccount.update({
          where: { id: accountId },
          data: {
            accessTokenSecret,
            updatedAt: new Date()
          }
        })
        
        return apiSuccess({
          message: 'OAuth 1.0a access token secret updated successfully. You can now post tweets with media.',
          accountId
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return apiError(`Validation error: ${error.issues.map((e: any) => e.message).join(', ')}`)
        }
        
        console.error('Twitter OAuth 1.0a setup error:', error)
        return apiError(
          error instanceof Error ? error.message : 'Failed to update OAuth 1.0a credentials',
          500
        )
      }
    })
  )(req)
}
