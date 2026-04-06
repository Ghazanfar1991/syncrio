import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin as db } from '@/lib/supabase/admin'

/**
 * Bundle.social Webhook Handler
 * 
 * Events handled:
 * - post.published: Update Supabase post/publication status to PUBLISHED
 * - post.failed: Update Supabase post/publication status to FAILED
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-signature')
    const webhookSecret = process.env.BUNDLE_SOCIAL_WEBHOOK_SECRET

    // 1. Verify Signature
    if (webhookSecret && signature) {
      const hmac = crypto.createHmac('sha256', webhookSecret)
      const digest = hmac.update(body).digest('hex')
      
      if (digest !== signature) {
        console.error('❌ Bundle.social Webhook: Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(body)
    const { event, data } = payload

    console.log(`📩 Bundle.social Webhook received: ${event}`, { postId: data.id })

    // 2. Handle Events
    switch (event) {
      case 'post.published':
        await handlePostPublished(data)
        break
      case 'post.failed':
        await handlePostFailed(data)
        break
      default:
        console.log(`ℹ️ Unhandled webhook event: ${event}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('💥 Webhook Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handlePostPublished(data: any) {
  const bundlePostId = data.id
  
  // Update publication status
  // Note: We match by platformPostId or metadata if we stored the Bundle ID during creation
  // In the current architecture, we match by the successful response from postCreate.
  // For robustness, we search for the publication tied to this Bundle ID.
  
  const { data: publications, error } = await db
    .from('post_publications')
    .update({
      status: 'PUBLISHED',
      published_at: new Date().toISOString(),
      platform_post_id: data.platformId // The ID returned from the social network
    })
    .eq('metadata->>bundle_post_id', bundlePostId)
    .select('post_id')

  if (error) {
    console.error('Error updating publication status:', error)
    return
  }

  // Check if all publications for this post are done
  if (publications && publications.length > 0) {
    const postId = publications[0].post_id
    await db.from('posts').update({
      status: 'PUBLISHED',
      published_at: new Date().toISOString()
    }).eq('id', postId)
  }
}

async function handlePostFailed(data: any) {
  const bundlePostId = data.id
  const errorMessage = data.error || 'Unknown publishing error'

  const { data: publications, error } = await db
    .from('post_publications')
    .update({
      status: 'FAILED',
      error_message: errorMessage
    })
    .eq('metadata->>bundle_post_id', bundlePostId)
    .select('post_id')

  if (error) {
    console.error('Error updating failed publication status:', error)
    return
  }

  if (publications && publications.length > 0) {
    const postId = publications[0].post_id
    await db.from('posts').update({
      status: 'FAILED',
      error_message: 'One or more platforms failed to publish'
    }).eq('id', postId)
  }
}
