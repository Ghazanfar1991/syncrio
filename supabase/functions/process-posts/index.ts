import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Bundlesocial } from "https://esm.sh/bundlesocial@2.43.0"

console.log("🚀 Edge Function 'process-posts' initialized")

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const bundleApiKey = Deno.env.get('BUNDLE_SOCIAL_API_KEY') || ''
    const bundleTeamId = Deno.env.get('BUNDLE_SOCIAL_TEAM_ID') || ''

    if (!supabaseUrl || !supabaseServiceKey || !bundleApiKey || !bundleTeamId) {
      throw new Error("Missing environment variables")
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const bundleSocial = new Bundlesocial(bundleApiKey)

    const now = new Date().toISOString()

    // 1. Fetch scheduled posts
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        publications:post_publications(
          id,
          status,
          social_accounts(id, platform, account_id, bundle_social_account_id)
        )
      `)
      .eq('status', 'SCHEDULED')
      .lte('scheduled_at', now)

    if (error) {
      console.error('Error fetching scheduled posts:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ message: "No posts to process" }), { status: 200 })
    }

    console.log(`📅 Processing ${posts.length} scheduled posts`)

    for (const post of posts) {
      await publishScheduledPost(post, supabase, bundleSocial, bundleTeamId)
    }

    return new Response(JSON.stringify({ message: "Success", processed: posts.length }), { status: 200 })
  } catch (err) {
    console.error('Edge Function error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})

async function publishScheduledPost(post: any, supabase: any, bundleSocial: any, teamId: string) {
  console.log(`📤 Publishing scheduled post: ${post.id}`)

  try {
    const hashtags = post.hashtags
      ? post.hashtags.split(',').map((h: string) => h.trim()).filter(Boolean).map((h: string) => `#${h}`)
      : []
    const contentWithHashtags = [post.content, hashtags.join(' ')].filter(Boolean).join('\n\n')

    for (const publication of post.publications) {
      const account = publication.social_accounts
      const platform = account.platform.toUpperCase()
      const bundleAccountId = account.bundle_social_account_id

      if (!bundleAccountId) {
        await supabase.from('post_publications').update({
          status: 'FAILED',
          error_message: 'No Bundle.social account linked',
        }).eq('id', publication.id)
        continue
      }

      try {
        let uploadIds: string[] = []
        const mediaUrl = post.video_url || post.image_url

        if (mediaUrl) {
          try {
            const response = await fetch(mediaUrl)
            const blob = await response.blob()
            const upload = await bundleSocial.upload.uploadCreate({
              formData: {
                teamId,
                file: blob as any,
              },
            })
            if ((upload as any).id) uploadIds = [(upload as any).id]
          } catch (uploadError) {
            console.error('Media upload failed:', uploadError)
          }
        }

        const platformData: Record<string, any> = {
          text: contentWithHashtags,
          uploadIds: uploadIds.length > 0 ? uploadIds : undefined,
        }

        // Apply platform-specific formatting
        if (platform === 'YOUTUBE') {
          platformData.type = post.video_url ? 'SHORT' : 'VIDEO'
          platformData.madeForKids = false
        }
        if (platform === 'TIKTOK') {
          platformData.privacy = 'PUBLIC_TO_EVERYONE'
        }

        await bundleSocial.post.postCreate({
          requestBody: {
            teamId,
            socialAccountTypes: [platform],
            data: {
              [platform]: platformData
            }
          }
        })

        // On postCreate success, we update publication status.
        // Bundle.social will also send webhooks upon actual platform publication.
        await supabase.from('post_publications').update({
          status: 'PUBLISHED',
          published_at: new Date().toISOString(),
        }).eq('id', publication.id)

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error(`❌ Platform publication failed (${platform}):`, errorMsg)
        await supabase.from('post_publications').update({
          status: 'FAILED',
          error_message: errorMsg,
        }).eq('id', publication.id)
      }
    }

    // Final Post Status Update (Reflected based on publications)
    const { data: updatedPubs } = await supabase
      .from('post_publications')
      .select('status')
      .eq('post_id', post.id)

    const allFailed = updatedPubs?.every((p: any) => p.status === 'FAILED')
    const anySuccess = updatedPubs?.some((p: any) => p.status === 'PUBLISHED')

    await supabase.from('posts').update({
      status: allFailed ? 'FAILED' : 'PUBLISHED',
      published_at: anySuccess ? new Date().toISOString() : null,
    }).eq('id', post.id)

  } catch (error) {
    console.error(`❌ Global failure for post ${post.id}:`, error)
    await supabase.from('posts').update({ status: 'FAILED' }).eq('id', post.id)
  }
}
