import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { bundleSocial, SUPPORTED_PLATFORMS } from '@/lib/bundle-social'

const BUNDLE_API = 'https://api.bundle.social/api/v1'
const BUNDLE_KEY = () => process.env.BUNDLE_SOCIAL_API_KEY!

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

/** Get or lazily create a Bundle.social team for this user */
async function getOrCreateBundleTeam(userId: string): Promise<string> {
  // 1. Try to find existing team row
  const { data: team } = await supabaseAdmin
    .from('teams')
    .select('id, bundle_social_team_id')
    .eq('owner_id', userId)
    .maybeSingle()

  if (team?.bundle_social_team_id) {
    return team.bundle_social_team_id
  }

  // 2. Fetch user info for a nice team name
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('name, email')
    .eq('id', userId)
    .maybeSingle()

  const label = userData?.name || userData?.email || userId

  // 3. Create Bundle.social team
  const res = await fetch(`${BUNDLE_API}/team`, {
    method: 'POST',
    headers: {
      'x-api-key': BUNDLE_KEY(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: `Syncrio — ${label}` }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to provision Bundle.social team: ${text}`)
  }

  const remoteTeam = await res.json()
  const bundleTeamId: string = remoteTeam.id

  // 4. Upsert team row in Supabase
  if (team?.id) {
    await supabaseAdmin
      .from('teams')
      .update({ bundle_social_team_id: bundleTeamId })
      .eq('id', team.id)
  } else {
    await supabaseAdmin
      .from('teams')
      .insert({
        owner_id: userId,
        name: `${label}'s Workspace`,
        bundle_social_team_id: bundleTeamId,
      })
  }

  return bundleTeamId
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — list connected social accounts for the current user
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data: accounts, error } = await supabaseAdmin
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('platform', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: accounts || [] })
  } catch (error) {
    console.error('Failed to fetch social accounts:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch social accounts' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — connect | sync | set-channel | manual save
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    // ── ACTION: CONNECT (generate hosted portal link) ───────────────────────
    if (action === 'connect') {
      const { platform } = body

      const teamId = await getOrCreateBundleTeam(user.id)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL!

      // Fetch user profile for personalised portal branding
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      // Platforms to show on the hosted portal — one specific platform when clicked directly
      const socialAccountTypes = platform
        ? [platform]
        : SUPPORTED_PLATFORMS.map(p => p.id)

      const portalBody: Record<string, unknown> = {
        teamId,
        redirectUrl: `${appUrl}/integrations?sync=true`,
        socialAccountTypes,
        language: 'en',
        // Branding
        logoUrl: `${appUrl}/logo.png`,
        ...(userData?.name && { userName: userData.name }),
        ...(userData?.avatar_url && { userLogoUrl: userData.avatar_url }),
        hideGoBackButton: false,
        goBackButtonText: 'Back to Syncrio',
        showModalOnConnectSuccess: false,
      }

      // Direct Instagram OAuth (no FB Page required) when specifically connecting Instagram
      if (platform === 'INSTAGRAM') {
        portalBody.instagramConnectionMethod = 'INSTAGRAM'
      }

      const res = await fetch(`${BUNDLE_API}/social-account/create-portal-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': BUNDLE_KEY(),
        },
        body: JSON.stringify(portalBody),
      })

      if (!res.ok) {
        const err = await res.text()
        console.error('Bundle portal link error:', err)
        throw new Error('Failed to create portal link')
      }

      const data = await res.json()
      return NextResponse.json({ success: true, url: data.url })
    }

    // ── ACTION: SYNC (pull accounts from Bundle → Supabase) ─────────────────
    if (action === 'sync') {
      const teamId = await getOrCreateBundleTeam(user.id)

      const res = await fetch(`${BUNDLE_API}/team/${teamId}`, {
        headers: { 'x-api-key': BUNDLE_KEY() },
      })

      if (!res.ok) throw new Error(`Bundle team fetch failed: ${await res.text()}`)

      const bundleTeam = await res.json()
      const accounts: any[] = bundleTeam.socialAccounts || []

      let synced = 0
      for (const acc of accounts) {
        await supabaseAdmin
          .from('social_accounts')
          .upsert(
            {
              user_id: user.id,
              platform: acc.type,
              account_id: acc.platformId || acc.externalId || acc.id,
              account_name: acc.displayName || acc.username || acc.name,
              display_name: acc.displayName || acc.name,
              username: acc.username,
              avatar_url: acc.avatarUrl || null,
              access_token: 'managed_by_bundle',
              is_connected: true,
              is_active: true,
              needs_reauth: false,
              bundle_social_account_id: acc.id,
              metadata: {
                requires_channel_selection: acc.isRequireSetChannel || false,
                available_channels: acc.channels || [],
              },
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'bundle_social_account_id' }
          )
        synced++
      }

      // Also mark any accounts NOT returned by Bundle as disconnected
      const activeBundleIds = accounts.map((a: any) => a.id).filter(Boolean)
      if (activeBundleIds.length > 0) {
        await supabaseAdmin
          .from('social_accounts')
          .update({ is_connected: false, is_active: false })
          .eq('user_id', user.id)
          .not('bundle_social_account_id', 'in', `(${activeBundleIds.map((id: string) => `'${id}'`).join(',')})`)
      }

      return NextResponse.json({
        success: true,
        message: `Synced ${synced} accounts`,
        count: synced,
      })
    }

    // ── ACTION: SET CHANNEL (select FB Page / YT channel / LinkedIn page etc.) ─
    if (action === 'set-channel') {
      const { platform, channelId, socialAccountId } = body
      const teamId = await getOrCreateBundleTeam(user.id)

      const res = await fetch(`${BUNDLE_API}/social-account/set-channel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': BUNDLE_KEY(),
        },
        body: JSON.stringify({ teamId, type: platform, channelId }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`set-channel failed: ${err}`)
      }

      // Refresh this account's data from Bundle
      if (socialAccountId) {
        await supabaseAdmin
          .from('social_accounts')
          .update({ updated_at: new Date().toISOString() })
          .eq('bundle_social_account_id', socialAccountId)
          .eq('user_id', user.id)
      }

      return NextResponse.json({ success: true, message: 'Channel selected successfully' })
    }

    // ── ACTION: UNSET CHANNEL ────────────────────────────────────────────────
    if (action === 'unset-channel') {
      const { platform } = body
      const teamId = await getOrCreateBundleTeam(user.id)

      const res = await fetch(`${BUNDLE_API}/social-account/unset-channel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': BUNDLE_KEY(),
        },
        body: JSON.stringify({ teamId, type: platform }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`unset-channel failed: ${err}`)
      }

      return NextResponse.json({ success: true, message: 'Channel unset successfully' })
    }

    // ── DEFAULT: MANUAL SAVE ─────────────────────────────────────────────────
    const {
      platform,
      account_id,
      account_name,
      display_name,
      username,
      access_token,
      refresh_token,
      expires_at,
      account_type,
      permissions,
      bundle_social_account_id,
    } = body

    if (!platform || !account_id || !account_name || !access_token) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('social_accounts')
      .upsert(
        {
          user_id: user.id,
          platform,
          account_id,
          account_name,
          display_name,
          username,
          access_token,
          refresh_token,
          expires_at: expires_at ? new Date(expires_at).toISOString() : null,
          account_type: account_type || 'PERSONAL',
          permissions: permissions || [],
          is_connected: true,
          is_active: true,
          bundle_social_account_id: bundle_social_account_id || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform,account_id' }
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      message: 'Account saved successfully',
    })
  } catch (error: any) {
    console.error('POST /api/social/accounts error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT — update local account metadata (e.g. lastSync, isActive)
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Account ID required' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from('social_accounts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin
      .from('social_accounts')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('PUT /api/social/accounts error:', error)
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — disconnect account from both Bundle.social AND Supabase
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Account ID required' }, { status: 400 })
    }

    // Fetch the account (verify ownership + get Bundle ID)
    const { data: existing } = await supabaseAdmin
      .from('social_accounts')
      .select('id, bundle_social_account_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 })
    }

    // 1. Delete from Bundle.social first (best-effort — don't fail if already gone)
    if (existing.bundle_social_account_id) {
      try {
        const res = await fetch(
          `${BUNDLE_API}/social-account/${existing.bundle_social_account_id}`,
          {
            method: 'DELETE',
            headers: { 'x-api-key': BUNDLE_KEY() },
          }
        )
        if (!res.ok && res.status !== 404) {
          const errText = await res.text()
          console.warn(`Bundle DELETE social-account warning (${res.status}):`, errText)
        }
      } catch (bundleErr) {
        // Non-fatal: still remove from Supabase
        console.warn('Bundle.social DELETE failed (non-fatal):', bundleErr)
      }
    }

    // 2. Remove from Supabase
    await supabaseAdmin.from('social_accounts').delete().eq('id', id)

    return NextResponse.json({ success: true, message: 'Account disconnected' })
  } catch (error) {
    console.error('DELETE /api/social/accounts error:', error)
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 })
  }
}