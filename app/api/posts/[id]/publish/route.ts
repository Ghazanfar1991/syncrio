import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, hashtagsFromString } from '@/lib/api-utils'
import { db } from '@/lib/db'

const BUNDLE_API = 'https://api.bundle.social/api/v1'
const BUNDLE_KEY = () => process.env.BUNDLE_SOCIAL_API_KEY!

/** Build per-platform post data for Bundle.social postCreate */
function buildBundlePlatformData(
  content: string,
  uploadIds: string[],
  platforms: string[]
): Record<string, any> {
  const data: Record<string, any> = {}

  for (const platform of platforms) {
    switch (platform) {
      case 'TIKTOK':
        data.TIKTOK = { text: content, uploadIds, privacy: 'PUBLIC_TO_EVERYONE' }
        break
      case 'YOUTUBE':
        data.YOUTUBE = { text: content, uploadIds, type: 'VIDEO', madeForKids: false }
        break
      case 'REDDIT':
        data.REDDIT = { text: content, title: content.substring(0, 300) }
        break
      default:
        data[platform] = { text: content, uploadIds }
    }
  }

  return data
}

/** Get the Bundle team ID for a user */
async function getBundleTeamId(userId: string): Promise<string | null> {
  const { data } = await (db as any)
    .from('teams')
    .select('bundle_social_team_id')
    .eq('owner_id', userId)
    .maybeSingle()
  return (data as any)?.bundle_social_team_id || null
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const { id: postId } = await params
        console.log('🚀 PUBLISH ENDPOINT: Publishing post', postId, 'for user', user.id)

        // 1. Get the post and publications from Supabase
        const { data: post, error: postError } = await (db as any)
          .from('posts')
          .select('*, publications:post_publications(*, social_account:social_accounts(*))')
          .eq('id', postId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (postError || !post) {
          console.error('❌ Post not found or error:', postError)
          return apiError('Post not found', 404)
        }

        if (post.status === 'PUBLISHED') {
          return apiError('Post is already published', 400)
        }

        // 2. Prepare content
        const hashtags = hashtagsFromString(post.hashtags || '')
        const contentWithHashtags = `${post.content || ''}\n\n${hashtags.join(' ')}`

        // 3. Determine active social accounts and platforms
        const activePubs = (post.publications || []).filter(
          (pub: any) => pub.social_account && pub.social_account.is_active
        )

        if (activePubs.length === 0) {
          return apiError('No active social accounts selected for this post', 400)
        }

        const platforms = [...new Set(activePubs.map((p: any) => p.social_account.platform))] as string[]
        console.log('🚀 PUBLISH ENDPOINT: Platforms to publish:', platforms)

        // 4. Resolve Bundle Social credentials
        const teamId = await getBundleTeamId(user.id)
        if (!teamId) {
          return apiError('Please connect your social accounts via the integration portal first.', 400)
        }

        // 5. Build media data (collect upload IDs if available)
        const uploadIds: string[] = []
        if (post.bundle_upload_ids) {
          try {
            const parsed = JSON.parse(post.bundle_upload_ids)
            if (Array.isArray(parsed)) uploadIds.push(...parsed)
          } catch (e) {}
        }

        // 6. Call Bundle Social API to Publish
        const bundleBody = {
          teamId,
          socialAccountTypes: platforms,
          data: buildBundlePlatformData(contentWithHashtags, uploadIds, platforms),
        }

        console.log('🚀 PUBLISH ENDPOINT: Calling Bundle Social API...')
        const bundleRes = await fetch(`${BUNDLE_API}/post`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': BUNDLE_KEY(),
          },
          body: JSON.stringify(bundleBody),
        })

        if (!bundleRes.ok) {
          const errText = await bundleRes.text()
          console.error(`❌ Bundle post submission failed (${bundleRes.status}):`, errText)
          return apiError('Failed to publish to social media via Bundle Social', 502)
        }

        const bundleData = await bundleRes.json()
        const bundlePostId = bundleData.id
        console.log('✅ PUBLISH ENDPOINT: Success! Bundle Post ID:', bundlePostId)

        // 7. Update database status
        const now = new Date().toISOString()
        
        await (db as any)
          .from('posts')
          .update({
            status: 'PUBLISHED',
            bundle_post_id: bundlePostId,
            published_at: now,
            updated_at: now
          })
          .eq('id', postId)

        await (db as any)
          .from('post_publications')
          .update({
            status: 'PUBLISHED',
            published_at: now,
            updated_at: now
          })
          .eq('post_id', postId)

        return apiSuccess({
          message: 'Post published successfully to all selected platforms',
          bundlePostId,
          platforms
        })

      } catch (error) {
        console.error('❌ PUBLISH ENDPOINT: Failed to publish post:', error)
        return apiError('Failed to publish post', 500)
      }
    })
  )(req)
}
