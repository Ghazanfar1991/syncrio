import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, validateRequest } from '@/lib/api-utils'
import { db } from '@/lib/db'
import { z } from 'zod'

const cleanupDuplicateDraftsSchema = z.object({
  postId: z.string(),
  content: z.string(),
  platform: z.string()
})

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const body = await req.json()
        const { postId, content, platform } = validateRequest(cleanupDuplicateDraftsSchema, body)

        console.log('🧹 Cleaning up duplicate drafts for post:', { postId, content: content.substring(0, 50), platform })

        // Get the original post to verify ownership
        const originalPost = await db.post.findFirst({
          where: {
            id: postId,
            userId: user.id
          }
        })

        if (!originalPost) {
          return apiError('Post not found or not accessible', 404)
        }

        // Find draft posts with matching content for the same platform
        const duplicateDrafts = await db.post.findMany({
          where: {
            userId: user.id,
            status: 'DRAFT',
            platform: platform as any,
            content: content,
            id: { not: postId } // Exclude the original post
          },
          include: {
            publications: true
          }
        })

        console.log(`🧹 Found ${duplicateDrafts.length} duplicate draft posts to cleanup`)

        if (duplicateDrafts.length === 0) {
          return apiSuccess({
            message: 'No duplicate draft posts found to cleanup',
            cleanedCount: 0
          })
        }

        // Delete the duplicate draft posts and their publications
        let cleanedCount = 0
        for (const post of duplicateDrafts) {
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
            console.log(`✅ Cleaned up duplicate draft post: ${post.id}`)
          } catch (error) {
            console.error(`❌ Failed to cleanup duplicate draft post ${post.id}:`, error)
          }
        }

        return apiSuccess({
          message: `Successfully cleaned up ${cleanedCount} duplicate draft posts`,
          cleanedCount,
          totalFound: duplicateDrafts.length
        })

      } catch (error) {
        console.error('Failed to cleanup duplicate drafts:', error)
        return apiError('Failed to cleanup duplicate drafts', 500)
      }
    })
  )(req)
}
