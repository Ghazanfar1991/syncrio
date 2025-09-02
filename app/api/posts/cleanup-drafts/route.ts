import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, validateRequest } from '@/lib/api-utils'
import { db } from '@/lib/db'
import { z } from 'zod'

const cleanupDraftsSchema = z.object({
  content: z.string(),
  platform: z.string(),
  socialAccountId: z.string()
})

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const body = await req.json()
        const { content, platform, socialAccountId } = validateRequest(cleanupDraftsSchema, body)

        console.log('🧹 Cleaning up drafts for content:', { content: content.substring(0, 50), platform, socialAccountId })

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

        // Find draft posts with matching content for this account
        const draftPosts = await db.post.findMany({
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
          },
          include: {
            publications: {
              where: {
                socialAccountId: socialAccountId
              }
            }
          }
        })

        console.log(`🧹 Found ${draftPosts.length} draft posts to cleanup`)

        if (draftPosts.length === 0) {
          return apiSuccess({
            message: 'No draft posts found to cleanup',
            cleanedCount: 0
          })
        }

        // Delete the draft posts and their publications
        let cleanedCount = 0
        for (const post of draftPosts) {
          try {
            // Delete publications first (due to foreign key constraints)
            await db.postPublication.deleteMany({
              where: {
                postId: post.id
              }
            })

            // Delete the post
            await db.post.delete({
              where: {
                id: post.id
              }
            })

            cleanedCount++
            console.log(`✅ Cleaned up draft post: ${post.id}`)
          } catch (error) {
            console.error(`❌ Failed to cleanup draft post ${post.id}:`, error)
          }
        }

        return apiSuccess({
          message: `Successfully cleaned up ${cleanedCount} draft posts`,
          cleanedCount,
          totalFound: draftPosts.length
        })

      } catch (error) {
        console.error('Failed to cleanup drafts:', error)
        return apiError('Failed to cleanup drafts', 500)
      }
    })
  )(req)
}
