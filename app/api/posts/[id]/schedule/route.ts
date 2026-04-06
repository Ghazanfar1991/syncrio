import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, validateRequest } from '@/lib/api-utils'
import { db } from '@/lib/db'
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
        // Using Supabase client (db is supabaseAdmin)
        const { data: post, error: fetchError } = await (db as any)
          .from('posts')
          .select('*, publications:post_publications(*)')
          .eq('id', postId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (fetchError) {
          console.error('Error fetching post:', fetchError)
          throw fetchError
        }

        if (!post) {
          return apiError('Post not found', 404)
        }

        if (post.status === 'PUBLISHED') {
          return apiError('Cannot schedule an already published post', 400)
        }

        // Update post with scheduled time and status
        // Note: In the new system, we just update the DB. 
        // A background process (edge function or cron) should handle the actual publishing.
        const { data: updatedPost, error: updateError } = await (db as any)
          .from('posts')
          .update({
            scheduled_at: new Date(scheduledAt).toISOString(),
            status: 'SCHEDULED',
            updated_at: new Date().toISOString()
          })
          .eq('id', postId)
          .select('*, publications:post_publications(*, social_account:social_accounts(*))')
          .single()

        // ── 3. Update on Bundle.social (best-effort) ─────────────────────────
        if (post.bundle_post_id) {
          try {
            const BUNDLE_API = 'https://api.bundle.social/api/v1'
            const BUNDLE_KEY = process.env.BUNDLE_SOCIAL_API_KEY!
            const teamId = await (db as any)
              .from('teams')
              .select('bundle_social_team_id')
              .eq('owner_id', user.id)
              .maybeSingle()
              .then((r: any) => r.data?.bundle_social_team_id)

            if (teamId) {
              const bundleRes = await fetch(`${BUNDLE_API}/post/${post.bundle_post_id}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': BUNDLE_KEY,
                },
                body: JSON.stringify({
                  teamId,
                  status: 'SCHEDULED',
                  postDate: new Date(scheduledAt).toISOString(),
                }),
              })

              if (!bundleRes.ok) {
                console.warn(`Bundle schedule update failed (${bundleRes.status}):`, await bundleRes.text())
              }
            }
          } catch (bundleErr) {
            console.warn('Bundle schedule update failed (non-fatal):', bundleErr)
          }
        }

        // ── 4. Return success ────────────────────────────────────────────────
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

