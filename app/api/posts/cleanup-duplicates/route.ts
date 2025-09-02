import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        console.log('🧹 Cleaning up duplicate posts for user:', user.id)

        // Find all posts for the user
        const allPosts = await db.post.findMany({
          where: { userId: user.id },
          include: { publications: true },
          orderBy: { createdAt: 'desc' }
        })

        console.log(`📊 Found ${allPosts.length} total posts`)

        // Group posts by content and platform
        const contentGroups = new Map<string, any[]>()
        
        allPosts.forEach(post => {
          const key = `${post.content}-${post.platform}-${post.status}`
          if (!contentGroups.has(key)) {
            contentGroups.set(key, [])
          }
          contentGroups.get(key)!.push(post)
        })

        let totalCleaned = 0
        const cleanedGroups: string[] = []

        // Process each group and remove duplicates
        for (const [key, posts] of contentGroups.entries()) {
          if (posts.length > 1) {
            console.log(`🔍 Found ${posts.length} duplicate posts for key: ${key}`)
            
            // Keep the most recent post, delete the rest
            const sortedPosts = posts.sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            
            const postsToDelete = sortedPosts.slice(1)
            
            for (const postToDelete of postsToDelete) {
              try {
                // Delete publications first
                await db.postPublication.deleteMany({
                  where: { postId: postToDelete.id }
                })
                
                // Delete the post
                await db.post.delete({
                  where: { id: postToDelete.id }
                })
                
                totalCleaned++
                console.log(`✅ Deleted duplicate post: ${postToDelete.id}`)
              } catch (error) {
                console.error(`❌ Failed to delete duplicate post ${postToDelete.id}:`, error)
              }
            }
            
            cleanedGroups.push(key)
          }
        }

        console.log(`🧹 Cleaned up ${totalCleaned} duplicate posts from ${cleanedGroups.length} groups`)

        return apiSuccess({
          message: `Successfully cleaned up ${totalCleaned} duplicate posts`,
          cleanedCount: totalCleaned,
          cleanedGroups: cleanedGroups.length
        })

      } catch (error) {
        console.error('Failed to cleanup duplicate posts:', error)
        return apiError('Failed to cleanup duplicate posts', 500)
      }
    })
  )(req)
}
