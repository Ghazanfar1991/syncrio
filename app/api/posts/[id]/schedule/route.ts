import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, validateRequest } from '@/lib/api-utils'
import { db } from '@/lib/db'
import { schedulePost } from '@/lib/scheduler'
import { z } from 'zod'

const scheduleSchema = z.object({
  scheduledAt: z.string().refine((date) => {
    const scheduledDate = new Date(date)
    return scheduledDate > new Date()
  }, 'Scheduled time must be in the future')
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const { id: postId } = await params
        const body = await req.json()
        const { scheduledAt } = validateRequest(scheduleSchema, body)

        // Get the post and verify ownership
        const post = await db.post.findFirst({
          where: {
            id: postId,
            userId: user.id
          },
          include: {
            publications: true
          }
        })

        if (!post) {
          return apiError('Post not found', 404)
        }

        if (post.status === 'PUBLISHED') {
          return apiError('Cannot schedule an already published post', 400)
        }

        // Use the new scheduler function
        const scheduled = await schedulePost(postId, new Date(scheduledAt))
        
        if (!scheduled) {
          return apiError('Failed to schedule post', 500)
        }

        // Fetch the updated post
        const updatedPost = await db.post.findUnique({
          where: { id: postId },
          include: {
            publications: {
              include: {
                socialAccount: true
              }
            },
            analytics: true
          }
        })

        return apiSuccess({
          post: updatedPost,
          message: `Post scheduled successfully for ${new Date(scheduledAt).toLocaleString()}`
        })
      } catch (error) {
        console.error('Failed to schedule post:', error)
        return apiError('Failed to schedule post', 500)
      }
    })
  )(req)
}
