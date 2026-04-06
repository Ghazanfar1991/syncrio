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
        const { data: orphanedDrafts, error: fetchError } = await (db as any)
          .from('posts')
          .select('id, post_publications(id)')
          .eq('user_id', user.id)
          .eq('status', 'DRAFT')

        if (fetchError) throw fetchError

        const trulyOrphaned = orphanedDrafts?.filter((d: any) => !d.post_publications || d.post_publications.length === 0) || []

        console.log(`🧹 Found ${trulyOrphaned.length} orphaned drafts`)

        if (trulyOrphaned.length === 0) {
          return apiSuccess({
            message: 'No orphaned drafts found',
            cleanedCount: 0
          })
        }

        // Delete orphaned drafts
        let cleanedCount = 0
        const ids = trulyOrphaned.map((d: any) => d.id)
        
        const { error: deleteError } = await (db as any)
          .from('posts')
          .delete()
          .in('id', ids)

        if (deleteError) {
          console.error(`❌ Failed to cleanup orphaned drafts:`, deleteError)
        } else {
          cleanedCount = trulyOrphaned.length
          console.log(`✅ Cleaned up orphaned drafts: ${ids.join(', ')}`)
        }

        return apiSuccess({
          message: `Successfully cleaned up ${cleanedCount} orphaned drafts`,
          cleanedCount,
          totalFound: trulyOrphaned.length
        })

      } catch (error) {
        console.error('Failed to cleanup orphaned drafts:', error)
        return apiError('Failed to cleanup orphaned drafts', 500)
      }
    })
  )(req)
}
