// Individual post API — GET, PUT (update), DELETE — wired to Bundle.social
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, buildBundlePlatformData } from '@/lib/api-utils'
import { db } from '@/lib/db'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

const BUNDLE_API = 'https://api.bundle.social/api/v1'
const BUNDLE_KEY = () => process.env.BUNDLE_SOCIAL_API_KEY!
const anyDb = supabaseAdmin as any

async function getBundleTeamId(userId: string): Promise<string | null> {
  const { data } = await anyDb
    .from('teams')
    .select('bundle_social_team_id')
    .eq('owner_id', userId)
    .maybeSingle()
  return (data as any)?.bundle_social_team_id || null
}

const updatePostSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  hashtags: z.array(z.string()).optional(),
  imageUrl: z.string().optional().or(z.literal('')),
  images: z.array(z.string()).optional(),
  videoUrl: z.string().optional().or(z.literal('')),
  videos: z.array(z.string()).optional(),
  imageUploadIds: z.array(z.string()).optional(),
  videoUploadId: z.string().optional(),
  thumbnailUploadId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  scheduledAt: z.string().optional(),
  status: z.enum(['DRAFT', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'QUEUED']).optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const { data: post, error } = await db
        .from('posts')
        .select(`
          *,
          publications:post_publications(
            *,
            social_account:social_accounts(*)
          ),
          analytics:post_analytics(*)
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error || !post) return apiError('Post not found', 404)

      return apiSuccess({ post })
    })
  )(req)
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT — update post in Supabase + patch on Bundle.social
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const body = await req.json()
        const parsed = updatePostSchema.parse(body)
        const { 
          content, 
          hashtags, 
          imageUrl, 
          images, 
          videoUrl, 
          videos, 
          imageUploadIds,
          videoUploadId,
          thumbnailUploadId,
          title, 
          description,
          scheduledAt, 
          status 
        } = parsed as any

        // Verify ownership
        const { data: existingPost } = await anyDb
          .from('posts')
          .select('id, user_id, bundle_post_id, status, platform')
          .eq('id', id)
          .single()

        if (!existingPost) return apiError('Post not found', 404)
        if (existingPost.user_id !== user.id) return apiError('Unauthorized', 403)

        // Only DRAFT and SCHEDULED posts can be updated
        const editableStatuses = ['DRAFT', 'SCHEDULED', 'FAILED', 'QUEUED']
        if (!editableStatuses.includes(existingPost.status)) {
           // Allow updating if the TARGET status is 'PUBLISHED' or similar despite DB.
           // However, if it's already published, don't re-publish.
           if (existingPost.status === 'PUBLISHED') {
             return apiError(`Cannot edit an already published post`, 400)
           }
        }

        // ── 1. Update on Bundle.social (best-effort) ─────────────────────────
        if (existingPost.bundle_post_id) {
          try {
            const patchBody: Record<string, any> = {}
            const uploadIds: string[] = []
            if (videoUploadId) uploadIds.push(videoUploadId)
            if (imageUploadIds && imageUploadIds.length > 0) uploadIds.push(...imageUploadIds)

            // Construct data payload using helper
            patchBody.data = buildBundlePlatformData(
              content || '', 
              uploadIds, 
              [existingPost.platform], 
              { title, description, thumbnailUploadId }
            )

            const bundleTeamId = await getBundleTeamId(user.id)
            if (bundleTeamId) {
              patchBody.teamId = bundleTeamId

              // Map status/postDate logic
              if (status === 'PUBLISHED' || status === 'APPROVED') {
                patchBody.status = 'SCHEDULED'
                patchBody.postDate = new Date().toISOString()
              } else if (status === 'DRAFT') {
                patchBody.status = 'DRAFT'
              } else if (scheduledAt) {
                patchBody.status = 'SCHEDULED'
                patchBody.postDate = new Date(scheduledAt).toISOString()
              } else if (existingPost.status === 'SCHEDULED' && status === 'SCHEDULED') {
                patchBody.status = 'SCHEDULED'
                if (scheduledAt) patchBody.postDate = new Date(scheduledAt).toISOString()
              }

              const bundleRes = await fetch(`${BUNDLE_API}/post/${existingPost.bundle_post_id}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': BUNDLE_KEY(),
                },
                body: JSON.stringify(patchBody),
              })

              if (!bundleRes.ok) {
                console.warn(`Bundle PATCH post warning (${bundleRes.status}):`, await bundleRes.text())
              }
            }
          } catch (bundleErr) {
            console.warn('Bundle patch failed (non-fatal):', bundleErr)
          }
        }

        // ── 2. Update in Supabase ────────────────────────────────────────────
        const updateData: Record<string, any> = {
          content,
          hashtags: hashtags ? hashtags.join(',') : '',
          image_url: imageUrl || ((images?.length ?? 0) > 0 ? images![0] : null),
          images: (images?.length ?? 0) > 0 ? JSON.stringify(images) : null,
          video_url: videoUrl || ((videos?.length ?? 0) > 0 ? videos![0] : null),
          videos: (videos?.length ?? 0) > 0 ? JSON.stringify(videos) : null,
          updated_at: new Date().toISOString(),
        }

        if (title !== undefined) updateData.title = title
        
        // Use exact status supplied or fallback to computing from scheduledAt
        if (status) {
           updateData.status = (status === 'APPROVED' || status === 'PUBLISHED') ? 'QUEUED' : status;
           if (scheduledAt !== undefined) {
             updateData.scheduled_at = scheduledAt ? new Date(scheduledAt).toISOString() : null
           }
        } else if (scheduledAt !== undefined) {
          updateData.scheduled_at = scheduledAt ? new Date(scheduledAt).toISOString() : null
          updateData.status = scheduledAt ? 'SCHEDULED' : 'DRAFT'
        }

        const { data: updatedPost, error: updateError } = await anyDb
          .from('posts')
          .update(updateData)
          .eq('id', id)
          .select(`*, publications:post_publications(*, social_account:social_accounts(*)), analytics:post_analytics(*)`)
          .single()

        if (updateError) throw updateError

        return apiSuccess({ post: updatedPost })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return apiError('Validation error: ' + error.errors.map(e => e.message).join(', '), 400)
        }
        return apiError(error instanceof Error ? error.message : 'Failed to update post')
      }
    })
  )(req)
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — remove post from Bundle.social + Supabase
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const { data: existingPost } = await anyDb
          .from('posts')
          .select('id, user_id, bundle_post_id, status')
          .eq('id', id)
          .single()

        if (!existingPost) return apiError('Post not found', 404)
        if (existingPost.user_id !== user.id) return apiError('Unauthorized', 403)

        // ── 1. Delete from Bundle.social ─────────────────────────────────────
        if (existingPost.bundle_post_id) {
          try {
            const bundleRes = await fetch(`${BUNDLE_API}/post/${existingPost.bundle_post_id}`, {
              method: 'DELETE',
              headers: { 'x-api-key': BUNDLE_KEY() },
            })

            if (!bundleRes.ok && bundleRes.status !== 404) {
              console.warn(`Bundle DELETE post warning (${bundleRes.status}):`, await bundleRes.text())
            }
          } catch (bundleErr) {
            console.warn('Bundle post delete failed (non-fatal):', bundleErr)
          }
        }

        // ── 2. Delete from Supabase ──────────────────────────────────────────
        const { error: deleteError } = await anyDb
          .from('posts')
          .delete()
          .eq('id', id)

        if (deleteError) throw deleteError

        return apiSuccess({ message: 'Post deleted successfully' })
      } catch (error) {
        return apiError(error instanceof Error ? error.message : 'Failed to delete post')
      }
    })
  )(req)
}
