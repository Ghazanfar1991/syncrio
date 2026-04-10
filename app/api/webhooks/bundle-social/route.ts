import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { normalizeBundleAccountState } from '@/lib/bundle-account-state'
import { supabaseAdmin as db } from '@/lib/supabase/admin'

/**
 * Bundle.social Webhook Handler
 *
 * Events handled:
 *  post.published           → mark post/publication PUBLISHED in Supabase
 *  post.failed              → mark post/publication FAILED
 *  comment.published        → record comment publication
 *  social-account.created   → upsert social account into Supabase
 *  social-account.updated   → update account; handle remote disconnect detection
 *  social-account.deleted   → mark account disconnected
 *  team.created             → log
 *  team.updated             → log / handle socialAccounts list changes
 *  team.deleted             → mark all accounts disconnected
 *
 * IMPORTANT: Bundle sends { type, data } — NOT { event, data }
 */
export async function POST(req: NextRequest) {
  let body: string
  try {
    body = await req.text()
  } catch {
    return NextResponse.json({ error: 'Failed to read body' }, { status: 400 })
  }

  // ── 1. Signature verification ─────────────────────────────────────────────
  const webhookSecret = process.env.BUNDLE_SOCIAL_WEBHOOK_SECRET
  const signature = req.headers.get('x-signature')

  if (webhookSecret && signature) {
    const hmac = crypto.createHmac('sha256', webhookSecret)
    const digest = hmac.update(body).digest('hex')
    if (digest !== signature) {
      console.error('❌ Bundle.social Webhook: Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  // ── 2. Parse payload ──────────────────────────────────────────────────────
  let payload: { type: string; data: any }
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Bundle sends `type`, not `event`
  const { type, data } = payload

  console.log(`📩 Bundle.social Webhook: ${type}`, { id: data?.id })

  // ── 3. Dispatch ────────────────────────────────────────────────────────────
  try {
    switch (type) {
      case 'post.published':
        await handlePostPublished(data)
        break
      case 'post.failed':
        await handlePostFailed(data)
        break
      case 'comment.published':
        await handleCommentPublished(data)
        break
      case 'social-account.created':
        await handleAccountCreated(data)
        break
      case 'social-account.updated':
        await handleAccountUpdated(data)
        break
      case 'social-account.deleted':
        await handleAccountDeleted(data)
        break
      case 'team.created':
        console.log('ℹ️ team.created:', data?.id)
        break
      case 'team.updated':
        await handleTeamUpdated(data)
        break
      case 'team.deleted':
        await handleTeamDeleted(data)
        break
      default:
        console.log(`ℹ️ Unhandled webhook event: ${type}`)
    }
  } catch (err) {
    console.error(`💥 Webhook handler error for ${type}:`, err)
    // Still return 200 so Bundle doesn't retry endlessly
  }

  return NextResponse.json({ success: true })
}

// ─────────────────────────────────────────────────────────────────────────────
// post.published
// ─────────────────────────────────────────────────────────────────────────────
async function handlePostPublished(data: any) {
  const bundlePostId: string = data.id
  const postedDate: string | null = data.postedDate || data.updatedAt || null

  // Find the Syncrio post by bundle_post_id
  const { data: post } = await (db as any)
    .from('posts')
    .select('id')
    .eq('bundle_post_id', bundlePostId)
    .maybeSingle()

  if (!post) {
    console.warn(`post.published: no Syncrio post found for bundle_post_id=${bundlePostId}`)
    return
  }

  // Update post status
  await (db as any)
    .from('posts')
    .update({
      status: 'PUBLISHED',
      posted_date: postedDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', post.id)

  // Update all related publications
  await (db as any)
    .from('post_publications')
    .update({
      status: 'PUBLISHED',
      published_at: postedDate || new Date().toISOString(),
    })
    .eq('post_id', post.id)

  console.log(`✅ post.published: Syncrio post ${post.id} marked PUBLISHED`)
}

// ─────────────────────────────────────────────────────────────────────────────
// post.failed
// ─────────────────────────────────────────────────────────────────────────────
async function handlePostFailed(data: any) {
  const bundlePostId: string = data.id
  const errorMessage: string = data.error || data.message || 'Unknown publishing error'

  const { data: post } = await (db as any)
    .from('posts')
    .select('id')
    .eq('bundle_post_id', bundlePostId)
    .maybeSingle()

  if (!post) {
    console.warn(`post.failed: no Syncrio post found for bundle_post_id=${bundlePostId}`)
    return
  }

  await (db as any)
    .from('posts')
    .update({
      status: 'FAILED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', post.id)

  await (db as any)
    .from('post_publications')
    .update({
      status: 'FAILED',
      error_message: errorMessage,
    })
    .eq('post_id', post.id)

  console.log(`❌ post.failed: Syncrio post ${post.id} marked FAILED`)
}

// ─────────────────────────────────────────────────────────────────────────────
// comment.published
// ─────────────────────────────────────────────────────────────────────────────
async function handleCommentPublished(data: any) {
  // Find parent post
  const { data: post } = await (db as any)
    .from('posts')
    .select('id')
    .eq('bundle_post_id', data.postId)
    .maybeSingle()

  if (!post) return

  console.log(`💬 comment.published for post ${post.id}`)
  // Future: record comment in a comments table, notify user, etc.
}

// ─────────────────────────────────────────────────────────────────────────────
// social-account.created
// ─────────────────────────────────────────────────────────────────────────────
async function handleAccountCreated(data: any) {
  // Resolve which Syncrio user this team belongs to
  const userId = await getUserByBundleTeamId(data.teamId)
  if (!userId) {
    console.warn(`social-account.created: no Syncrio user found for teamId=${data.teamId}`)
    return
  }

  const payload = {
    user_id: userId,
    platform: data.type,
    ...normalizeBundleAccountState(data),
    access_token: 'managed_by_bundle',
    is_connected: true,
    is_active: true,
    needs_reauth: false,
    bundle_social_account_id: data.id,
    updated_at: data.createdAt || new Date().toISOString(),
  }

  const { data: existing } = await (db as any)
    .from('social_accounts')
    .select('id')
    .eq('bundle_social_account_id', data.id)
    .maybeSingle()

  if (existing) {
    await (db as any).from('social_accounts').update(payload).eq('id', existing.id)
  } else {
    await (db as any).from('social_accounts').insert(payload)
  }

  console.log(`✅ social-account.created: upserted ${data.type} account for user ${userId}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// social-account.updated
// ─────────────────────────────────────────────────────────────────────────────
async function handleAccountUpdated(data: any) {
  const bundleAccountId: string = data.id
  const socialAction = data.socialAction

  // Check for remote disconnection detection
  const isDisconnectWarning =
    socialAction?.type === 'disconnect-check' &&
    socialAction?.details?.status === 'error'

  const isScheduledForDeletion = socialAction?.details?.scheduledForDeletion === true
  const deleteOn: string | null = socialAction?.details?.deleteOn || null

  const statusCode: string = socialAction?.details?.code || ''

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
    ...normalizeBundleAccountState(data),
  }

  if (isDisconnectWarning) {
    if (statusCode === 'REMOTE_DISCONNECT_REAUTH_REQUIRED' || statusCode === 'REMOTE_DISCONNECT_UNAUTHORIZED_WARNING') {
      updates.needs_reauth = true
    }
    if (isScheduledForDeletion) {
      updates.needs_reauth = true
      updates.disconnect_scheduled_at = deleteOn
    }
    console.warn(`⚠️ social-account.updated [${statusCode}] for account ${bundleAccountId}`)
  }

  await (db as any)
    .from('social_accounts')
    .update(updates)
    .eq('bundle_social_account_id', bundleAccountId)

  console.log(`🔄 social-account.updated: account ${bundleAccountId} updated`)
}

// ─────────────────────────────────────────────────────────────────────────────
// social-account.deleted
// ─────────────────────────────────────────────────────────────────────────────
async function handleAccountDeleted(data: any) {
  const bundleAccountId: string = data.id

  // Mark disconnected (soft-delete — preserve history)
  await (db as any)
    .from('social_accounts')
    .update({
      is_connected: false,
      is_active: false,
      needs_reauth: false,
      disconnect_scheduled_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('bundle_social_account_id', bundleAccountId)

  console.log(`🗑️ social-account.deleted: account ${bundleAccountId} marked disconnected`)
}

// ─────────────────────────────────────────────────────────────────────────────
// team.updated
// ─────────────────────────────────────────────────────────────────────────────
async function handleTeamUpdated(data: any) {
  const bundleTeamId: string = data.id

  // Re-sync the social accounts list from the team payload
  const accounts: any[] = data.socialAccounts || []
  const userId = await getUserByBundleTeamId(bundleTeamId)

  if (!userId || accounts.length === 0) return

  for (const acc of accounts) {
    const payload = {
      user_id: userId,
      platform: acc.type,
      ...normalizeBundleAccountState(acc),
      access_token: 'managed_by_bundle',
      is_connected: true,
      is_active: true,
      bundle_social_account_id: acc.id,
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await (db as any)
      .from('social_accounts')
      .select('id')
      .eq('bundle_social_account_id', acc.id)
      .maybeSingle()

    if (existing) {
      await (db as any).from('social_accounts').update(payload).eq('id', existing.id)
    } else {
      await (db as any).from('social_accounts').insert(payload)
    }
  }

  console.log(`🔄 team.updated: synced ${accounts.length} accounts for team ${bundleTeamId}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// team.deleted
// ─────────────────────────────────────────────────────────────────────────────
async function handleTeamDeleted(data: any) {
  const bundleTeamId: string = data.id

  // Find all accounts for this team and mark disconnected
  const userId = await getUserByBundleTeamId(bundleTeamId)
  if (!userId) return

  await (db as any)
    .from('social_accounts')
    .update({
      is_connected: false,
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  console.log(`🗑️ team.deleted: all accounts for team ${bundleTeamId} marked disconnected`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: look up Syncrio user ID from a Bundle team ID
// ─────────────────────────────────────────────────────────────────────────────
async function getUserByBundleTeamId(bundleTeamId: string): Promise<string | null> {
  const { data } = await (db as any)
    .from('teams')
    .select('owner_id')
    .eq('bundle_social_team_id', bundleTeamId)
    .maybeSingle()

  return data?.owner_id || null
}
