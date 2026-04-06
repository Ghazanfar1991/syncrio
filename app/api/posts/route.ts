// Posts API endpoint for content management using Supabase
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, validateRequest, schemas, parseQueryParams, hashtagsToString, formatPostWithHashtags } from '@/lib/api-utils'
import { db, checkUsageLimit } from '@/lib/db'

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const { page, limit, status, platform } = parseQueryParams(req.url)
      const from = (page - 1) * limit
      const to = from + limit - 1

      let query = db
        .from('posts')
        .select(`
          *,
          publications:post_publications(
            *,
            social_account:social_accounts(*)
          ),
          analytics:post_analytics(*)
        `, { count: 'exact' })
        .eq('user_id', user.id)

      if (status) query = query.eq('status', status)
      if (platform) query = query.eq('platform', platform)

      const { data: posts, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      const total = count || 0

      return apiSuccess({
        posts: posts?.map(p => formatPostWithHashtags(p)) || [],
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      })
    })
  )(req)
}

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
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
          description 
        } = validatedData

        // Check usage limits
        const canPost = await checkUsageLimit(user.id, user.subscriptionTier || 'STARTER')
        if (!canPost) {
          return apiError('Monthly post limit reached. Please upgrade your subscription.', 403)
        }

        if (!socialAccountIds || socialAccountIds.length === 0) {
          return apiError('At least one social account must be selected', 400)
        }

        // Validate social accounts belong to user and are active
        const { data: socialAccounts, error: accountsError } = await db
          .from('social_accounts')
          .select('id, platform')
          .in('id', socialAccountIds)
          .eq('user_id', user.id)
          .eq('is_active', true)

        if (accountsError) throw accountsError

        if (!socialAccounts || socialAccounts.length !== socialAccountIds.length) {
          return apiError('One or more selected social accounts are invalid or inactive', 400)
        }

        // Determine platform
        const postPlatform = platform || socialAccounts[0]?.platform || 'TWITTER'
        
        // Prepare post data
        const postInsertData: any = {
          user_id: user.id,
          content: content && content.trim() ? content : null,
          hashtags: hashtagsToString(hashtags || []),
          image_url: imageUrl || (images && images.length > 0 ? images[0] : null),
          video_url: videoUrl || (videos && videos.length > 0 ? videos[0] : null),
          platform: postPlatform,
          status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
          title: title?.trim() || null,
          description: description?.trim() || null,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          images: images ? JSON.stringify(images) : null,
          videos: videos ? JSON.stringify(videos) : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Insert post
        const { data: post, error: postError } = await db
          .from('posts')
          .insert(postInsertData)
          .select()
          .single()

        if (postError) throw postError

        // Create publications
        const publicationsData = socialAccountIds.map((accountId: string) => ({
          post_id: post.id,
          social_account_id: accountId,
          status: 'PENDING',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))

        const { error: pubError } = await db
          .from('post_publications')
          .insert(publicationsData)

        if (pubError) throw pubError

        // Update usage tracking
        const currentMonth = new Date().getMonth() + 1
        const currentYear = new Date().getFullYear()

        // Upsert usage tracking in Supabase
        const { data: usageEntry } = await db
          .from('usage_tracking')
          .select('id, posts_used')
          .eq('user_id', user.id)
          .eq('month', currentMonth)
          .eq('year', currentYear)
          .maybeSingle()

        if (usageEntry) {
          await db
            .from('usage_tracking')
            .update({ posts_used: (usageEntry.posts_used || 0) + 1 })
            .eq('id', usageEntry.id)
        } else {
          await db
            .from('usage_tracking')
            .insert({
              user_id: user.id,
              month: currentMonth,
              year: currentYear,
              posts_used: 1
            })
        }

        // Fetch complete post with publications
        const { data: completePost, error: fetchError } = await db
          .from('posts')
          .select(`
            *,
            publications:post_publications(
              *,
              social_account:social_accounts(*)
            ),
            analytics:post_analytics(*)
          `)
          .eq('id', post.id)
          .single()

        if (fetchError) throw fetchError

        return apiSuccess({ post: formatPostWithHashtags(completePost) }, 201)
      } catch (error) {
        console.error('POST /api/posts - Error:', error)
        return apiError(error instanceof Error ? error.message : 'Invalid request')
      }
    })
  )(req)
}
