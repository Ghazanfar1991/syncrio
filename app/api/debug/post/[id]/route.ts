import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const { id: postId } = await params

        // Get the post with all related data
        const post = await db.post.findFirst({
          where: {
            id: postId,
            userId: user.id
          },
          include: {
            publications: {
              include: {
                socialAccount: true
              }
            },
            analytics: true
          }
        })

        if (!post) {
          return apiError('Post not found', 404)
        }

        return apiSuccess({
          post,
          debug: {
            postId: post.id,
            status: post.status,
            publicationsCount: post.publications.length,
            publications: post.publications.map(pub => ({
              id: pub.id,
              status: pub.status,
              platform: pub.socialAccount.platform,
              accountName: pub.socialAccount.accountName,
              accountId: pub.socialAccount.accountId,
              isActive: pub.socialAccount.isActive
            }))
          }
        })
      } catch (error) {
        console.error('Failed to debug post:', error)
        return apiError('Failed to debug post', 500)
      }
    })
  )(req)
}
