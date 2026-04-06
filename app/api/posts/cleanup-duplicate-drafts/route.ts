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
        const { data: originalPost, error: originalError } = await db
          .from('posts')
          .select('id')
          .eq('id', postId)
          .eq('user_id', user.id)
          .single()

        if (originalError || !originalPost) {
          return apiError('Post not found or not accessible', 404)
        }

        // Find draft posts with matching content for the same platform
        const { data: duplicateDraftsRes, error: duplicatesError } = await db
          .from('posts')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'DRAFT')
          .eq('platform', platform)
          .eq('content', content)
          .neq('id', postId) // Exclude the original post

        const duplicateDrafts = (duplicateDraftsRes || []) as any[]

        if (duplicatesError) {
          console.error('❌ Failed to fetch duplicate drafts:', duplicatesError)
          return apiError('Failed to fetch duplicate drafts', 500)
        }

        console.log(`🧹 Found ${duplicateDrafts?.length || 0} duplicate draft posts to cleanup`)

        if (!duplicateDrafts || duplicateDrafts.length === 0) {
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
            const { error: pubDeleteError } = await db
              .from('post_publications')
              .delete()
              .eq('post_id', post.id)
            
            if (pubDeleteError) throw pubDeleteError

            // Delete the post
            const { error: postDeleteError } = await db
              .from('posts')
              .delete()
              .eq('id', post.id)
            
            if (postDeleteError) throw postDeleteError

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
