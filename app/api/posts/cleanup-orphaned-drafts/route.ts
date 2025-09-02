import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        console.log('🧹 Cleaning up orphaned drafts for user:', user.id)

        // Find drafts that have no publications (orphaned)
        const orphanedDrafts = await db.post.findMany({
          where: {
            userId: user.id,
            status: 'DRAFT',
            publications: {
              none: {} // No publications
            }
          }
        })

        console.log(`🧹 Found ${orphanedDrafts.length} orphaned drafts`)

        if (orphanedDrafts.length === 0) {
          return apiSuccess({
            message: 'No orphaned drafts found',
            cleanedCount: 0
          })
        }

        // Delete orphaned drafts
        let cleanedCount = 0
        for (const draft of orphanedDrafts) {
          try {
            await db.post.delete({
              where: { id: draft.id }
            })
            cleanedCount++
            console.log(`✅ Cleaned up orphaned draft: ${draft.id}`)
          } catch (error) {
            console.error(`❌ Failed to cleanup orphaned draft ${draft.id}:`, error)
          }
        }

        return apiSuccess({
          message: `Successfully cleaned up ${cleanedCount} orphaned drafts`,
          cleanedCount,
          totalFound: orphanedDrafts.length
        })

      } catch (error) {
        console.error('Failed to cleanup orphaned drafts:', error)
        return apiError('Failed to cleanup orphaned drafts', 500)
      }
    })
  )(req)
}
