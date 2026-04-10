// Posts API — Supabase storage + Bundle.social publishing
import { NextRequest } from 'next/server'
import { withAuth, withEnrichedAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, validateRequest, schemas, parseQueryParams, hashtagsToString, formatPostWithHashtags, buildBundlePlatformData } from '@/lib/api-utils'
import { db, checkUsageLimit } from '@/lib/db'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { validateBundlePlatformPost, type BundlePlatformId } from '@/lib/bundle-platforms'

const BUNDLE_API = 'https://api.bundle.social/api/v1'
const BUNDLE_KEY = () => process.env.BUNDLE_SOCIAL_API_KEY!
// Untyped alias — for tables not yet in Supabase generated types
const anyDb = supabaseAdmin as any

/** Get the Bundle team ID for a user */
async function getBundleTeamId(userId: string): Promise<string | null> {
  const { data } = await anyDb
    .from('teams')
    .select('bundle_social_team_id')
    .eq('owner_id', userId)
    .maybeSingle()
  return (data as any)?.bundle_social_team_id || null
}



// ─────────────────────────────────────────────────────────────────────────────
// GET — list posts
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const { page, limit, status, platform } = parseQueryParams(req.url)
      const includeAnalytics = req.nextUrl.searchParams.get('includeAnalytics') === 'true'
      const from = (page - 1) * limit
      const to = from + limit - 1

      let query = db
        .from('posts')
        .select(`
          id,
          user_id,
          content,
          hashtags,
          image_url,
          images,
          video_url,
          videos,
          platform,
          status,
          scheduled_at,
          published_at,
          title,
          description,
          created_at,
          updated_at,
          publications:post_publications(
            id,
            social_account_id,
            platform,
            status,
            published_at,
            error_message,
            social_account:social_accounts(
              id,
              account_name,
              platform
            )
          )
        `)
        .eq('user_id', user.id)

      if (includeAnalytics) {
        query = db
          .from('posts')
          .select(`
            id,
            user_id,
            content,
            hashtags,
            image_url,
            images,
            video_url,
            videos,
            platform,
            status,
            scheduled_at,
            published_at,
            title,
            description,
            created_at,
            updated_at,
            publications:post_publications(
              id,
              social_account_id,
              platform,
              status,
              published_at,
              error_message,
              social_account:social_accounts(
                id,
                account_name,
                platform
              )
            ),
            analytics:post_analytics(
              id,
              platform,
              impressions,
              likes,
              comments,
              shares
            )
          `)
          .eq('user_id', user.id)
      }

      if (status) query = query.eq('status', status)
      if (platform) query = query.eq('platform', platform)

      const { data: posts, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      return apiSuccess({
        posts: posts?.map(p => formatPostWithHashtags(p)) || [],
        pagination: {
          page,
          limit,
          total: posts?.length || 0,
          pages: posts?.length ? 1 : 0,
        },
      })
    })
  )(req)
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — create and publish/schedule via Bundle.social
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  return withErrorHandling(
    withEnrichedAuth(async (req: NextRequest, user: any) => {
      const body = await req.json()

      try {
        const validatedData = validateRequest(schemas.createPost, body)
        const {
          content,
          hashtags,
          imageUrl,
          images,
          videoUrl,
          videos,
          platform,
          socialAccountIds,
          scheduledAt,
          title,
          description,
          imageUploadIds,
          videoUploadId,
          thumbnailUploadId,
          metadata
        } = validatedData as any

        // ── 1. Usage limit check ─────────────────────────────────────────────
        const canPost = await checkUsageLimit(user.id, user.subscriptionTier || 'STARTER')
        if (!canPost) {
          return apiError('Monthly post limit reached. Please upgrade your subscription.', 403)
        }

        if (!socialAccountIds || socialAccountIds.length === 0) {
          return apiError('At least one social account must be selected', 400)
        }

        // ── 2. Validate social accounts ──────────────────────────────────────
        const { data: socialAccounts, error: accountsError } = await db
          .from('social_accounts')
          .select('id, platform, bundle_social_account_id')
          .in('id', socialAccountIds)
          .eq('user_id', user.id)
          .eq('is_active', true)

        if (accountsError) throw accountsError
        if (!socialAccounts || socialAccounts.length !== socialAccountIds.length) {
          return apiError('One or more selected social accounts are invalid or inactive', 400)
        }

        // ── 3. Determine platforms to publish to ─────────────────────────────
        const platforms = [...new Set(socialAccounts.map((a: any) => a.platform))] as string[]
        const postPlatform = platform || platforms[0] || 'TWITTER'
        for (const platformId of platforms) {
          const validation = validateBundlePlatformPost(platformId as BundlePlatformId, content || '', metadata || {})
          if (validation.errors.length > 0) {
            return apiError(validation.errors.join(' '), 400)
          }
        }

        // ── 4. Collect upload IDs (from client or media fields) ──────────────
        const uploadIds: string[] = []
        if (videoUploadId) uploadIds.push(videoUploadId)
        if (imageUploadIds && imageUploadIds.length > 0) uploadIds.push(...imageUploadIds)
        // Thumbnail is handled per-platform in buildBundlePlatformData if needed

        // ── 5. Save post to Supabase ─────────────────────────────────────────
        const postInsertData: any = {
          user_id: user.id,
          content: content?.trim() || null,
          hashtags: hashtagsToString(hashtags || []),
          image_url: imageUrl || (images?.length > 0 ? images[0] : null),
          video_url: videoUrl || (videos?.length > 0 ? videos[0] : null),
          platform: postPlatform,
          status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
          title: title?.trim() || null,
          description: description?.trim() || null,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          images: images ? JSON.stringify(images) : null,
          videos: videos ? JSON.stringify(videos) : null,
          bundle_social_account_types: platforms,
          metadata: metadata ? JSON.stringify(metadata) : null,
          source: 'CREATED',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        const { data: post, error: postError } = await anyDb
          .from('posts')
          .insert(postInsertData)
          .select()
          .single()

        if (postError) throw postError

        // ── 6. Create publication rows ───────────────────────────────────────
        const publicationsData = socialAccountIds.map((accountId: string) => {
          const account = (socialAccounts as any[]).find((a: any) => a.id === accountId)
          return {
            post_id: post.id,
            social_account_id: accountId,
            platform: account?.platform || postPlatform,
            status: 'PENDING',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        })

        const { error: pubError } = await db.from('post_publications').insert(publicationsData)
        if (pubError) throw pubError

        // ── 7. Publish to Bundle.social ──────────────────────────────────────
        const bundleTeamId = await getBundleTeamId(user.id)
        
        // ── Get the specific Bundle Account IDs for our selected platforms ──
        const bundleAccountIds = (socialAccounts as any[])
          .filter((a: any) => socialAccountIds.includes(a.id) && a.bundle_social_account_id)
          .map((a: any) => a.bundle_social_account_id)

        console.log(`📤 Submitting to Bundle Team: ${bundleTeamId} | Accounts: ${bundleAccountIds.join(', ')}`)

        if (bundleTeamId) {
          try {
            const bundleBody: Record<string, any> = {
              title: title?.trim() || `Post to ${platforms.join(', ')}`,
              status: 'SCHEDULED', // Bundle API only supports DRAFT or SCHEDULED
              postDate: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
              teamId: bundleTeamId,
              socialAccountTypes: platforms,
              socialAccountIds: bundleAccountIds, // Target specific Page/Channel IDs
              data: buildBundlePlatformData(content || '', uploadIds, platforms, metadata || {
                title,
                description,
                thumbnailUploadId
              }),
            }

            const bundleRes = await fetch(`${BUNDLE_API}/post`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': BUNDLE_KEY(),
              },
              body: JSON.stringify(bundleBody),
            })

            if (bundleRes.ok) {
              const bundleData = await bundleRes.json()
              const bundlePostId: string = bundleData.id

              // Store Bundle post ID for webhook matching
              await anyDb
                .from('posts')
                .update({ bundle_post_id: bundlePostId })
                .eq('id', post.id)

              // Update status from DRAFT to QUEUED/SCHEDULED
              await anyDb
                .from('posts')
                .update({ status: scheduledAt ? 'SCHEDULED' : 'QUEUED' })
                .eq('id', post.id)

              console.log(`✅ Post ${post.id} submitted to Bundle as ${bundlePostId}`)
            } else {
              const errText = await bundleRes.text()
              console.error(`⚠️ Bundle post submission failed (${bundleRes.status}):`, errText)
              // Post stays as DRAFT — user can retry
            }
          } catch (bundleErr) {
            console.error('⚠️ Bundle.social post call failed (non-fatal):', bundleErr)
          }
        } else {
          console.warn('⚠️ No Bundle team ID found for user — post saved as DRAFT only')
        }

        // ── 8. Update usage tracking ─────────────────────────────────────────
        const currentMonth = new Date().getMonth() + 1
        const currentYear = new Date().getFullYear()
        const { data: usageEntry } = await anyDb
          .from('usage_tracking')
          .select('id, posts_used')
          .eq('user_id', user.id)
          .eq('month', currentMonth)
          .eq('year', currentYear)
          .maybeSingle()

        if (usageEntry) {
          await anyDb.from('usage_tracking').update({ posts_used: ((usageEntry as any).posts_used || 0) + 1 }).eq('id', (usageEntry as any).id)
        } else {
          await anyDb.from('usage_tracking').insert({ user_id: user.id, month: currentMonth, year: currentYear, posts_used: 1 })
        }

        // ── 9. Return complete post ──────────────────────────────────────────
        const { data: completePost, error: fetchError } = await anyDb
          .from('posts')
          .select(`*, publications:post_publications(*, social_account:social_accounts(*)), analytics:post_analytics(*)`)
          .eq('id', (post as any).id)
          .single()

        if (fetchError) throw fetchError

        return apiSuccess({ post: formatPostWithHashtags(completePost) }, 201)
      } catch (error) {
        console.error('POST /api/posts error:', error)
        return apiError(error instanceof Error ? error.message : 'Invalid request')
      }
    })
  )(req)
}
