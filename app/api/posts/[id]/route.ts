// Individual post API endpoint
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { db } from '@/lib/db'
import { z } from 'zod'

const updatePostSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  hashtags: z.array(z.string()).optional(),
  imageUrl: z.string().optional().or(z.literal('')), // Accept any string (including base64)
  images: z.array(z.string()).optional(), // Accept any string (including base64)
  videoUrl: z.string().optional().or(z.literal('')), // Accept any string (including base64)
  videos: z.array(z.string()).optional(), // Accept any string (including base64)
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      // use resolved id from outer scope
      const post = await db.post.findFirst({
        where: {
          id,
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

      return apiSuccess({ post })
    })
  )(req)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const body = await req.json()
        console.log('PUT /api/posts/[id] - Received body:', body)
        
        const { content, hashtags, imageUrl, images, videoUrl, videos } = updatePostSchema.parse(body)
        console.log('PUT /api/posts/[id] - Parsed data:', { content, hashtags, imageUrl, images, videoUrl, videos })

        // Check if post exists and belongs to user
        console.log('PUT /api/posts/[id] - Looking for post with ID:', id)
        
        const existingPost = await db.post.findUnique({
          where: { id },
          include: { publications: true }
        })

        console.log('PUT /api/posts/[id] - Existing post found:', {
          id: existingPost?.id,
          userId: existingPost?.userId,
          currentUserId: user.id,
          content: existingPost?.content,
          hashtags: existingPost?.hashtags,
          imageUrl: existingPost?.imageUrl,
          images: existingPost?.images
        })

        if (!existingPost) {
          console.log('PUT /api/posts/[id] - Post not found')
          return apiError('Post not found', 404)
        }

        if (existingPost.userId !== user.id) {
          console.log('PUT /api/posts/[id] - Unauthorized access attempt')
          return apiError('Unauthorized', 403)
        }

        // Update the post
        const updateData = {
          content,
          hashtags: hashtags ? hashtags.join(',') : '',
          imageUrl: imageUrl || (images && images.length > 0 ? images[0] : null), // Use provided imageUrl or first image from images array
          images: images && images.length > 0 ? JSON.stringify(images) : null,
          videoUrl: videoUrl || (videos && videos.length > 0 ? videos[0] : null), // Use provided videoUrl or first video from videos array
          videos: videos && videos.length > 0 ? JSON.stringify(videos) : null,
          updatedAt: new Date()
        }
        console.log('PUT /api/posts/[id] - Update data:', updateData)
        
        try {
          console.log('PUT /api/posts/[id] - Attempting database update with data:', updateData)
          
          const updatedPost = await db.post.update({
            where: { id },
            data: updateData,
            include: {
              publications: {
                include: {
                  socialAccount: true
                }
              },
              analytics: true
            }
          })
          
          console.log('PUT /api/posts/[id] - Post updated successfully:', {
            id: updatedPost.id,
            content: updatedPost.content,
            hashtags: updatedPost.hashtags,
            imageUrl: updatedPost.imageUrl,
            images: updatedPost.images,
            updatedAt: updatedPost.updatedAt
          })
          
          return apiSuccess({ post: updatedPost })
        } catch (dbError) {
          console.error('PUT /api/posts/[id] - Database update failed:', dbError)
          return apiError('Database update failed: ' + (dbError instanceof Error ? dbError.message : 'Unknown error'))
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessages = error.errors?.map(e => e.message) || ['Unknown validation error']
          return apiError('Validation error: ' + errorMessages.join(', '), 400)
        }
        return apiError(error instanceof Error ? error.message : 'Failed to update post')
      }
    })
  )(req)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        // Check if post exists and belongs to user
        const existingPost = await db.post.findUnique({
          where: { id }
        })

        if (!existingPost) {
          return apiError('Post not found', 404)
        }

        if (existingPost.userId !== user.id) {
          return apiError('Unauthorized', 403)
        }

        // Delete the post and all related data
        await db.post.delete({
          where: { id }
        })

        return apiSuccess({ message: 'Post deleted successfully' })
      } catch (error) {
        return apiError(error instanceof Error ? error.message : 'Failed to delete post')
      }
    })
  )(req)
}
