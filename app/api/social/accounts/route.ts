import { NextRequest, NextResponse } from 'next/server'
import { normalizeBundleAccountState } from '@/lib/bundle-account-state'
import { SUPPORTED_PLATFORMS } from '@/lib/bundle-social'
import { getAuthUser } from '@/lib/middleware'
import { supabaseAdmin } from '@/lib/supabase/admin'

const BUNDLE_API = 'https://api.bundle.social/api/v1'
const BUNDLE_KEY = () => process.env.BUNDLE_SOCIAL_API_KEY!
// Untyped alias — needed until Supabase types are regenerated post-migration
const db = supabaseAdmin as any

function getAppBaseUrl(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      console.warn('NEXT_PUBLIC_APP_URL is not a valid absolute URL. Falling back to request origin.')
    }
  }

  const ngrokUrl = process.env.NGROK_URL?.trim()
  if (ngrokUrl) {
    try {
      return new URL(ngrokUrl).origin
    } catch {
      console.warn('NGROK_URL is not a valid absolute URL. Falling back to request origin.')
    }
  }

  const host = request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

function getBundlePortalBranding(request: NextRequest, userName?: string | null) {
  const appBaseUrl = getAppBaseUrl(request)
  const logoPath = process.env.BUNDLE_SOCIAL_AUTH_LOGO_PATH?.trim() || '/applogo.PNG'
  const logoUrl = /^https?:\/\//i.test(logoPath)
    ? logoPath
    : `${appBaseUrl}${logoPath.startsWith('/') ? '' : '/'}${logoPath}`

  return {
    logoUrl,
    userLogoUrl: logoUrl,
    userName: userName || 'Syncrio',
    socialAccountTypes: SUPPORTED_PLATFORMS.map((platform) => platform.id),
  }
}

async function fetchBundleAccountByType(
  teamId: string,
  platform: string,
  fallbackSocialAccountId?: string | null
) {
  const byTypeUrl = new URL(`${BUNDLE_API}/social-account/by-type`)
  byTypeUrl.searchParams.set('teamId', teamId)
  byTypeUrl.searchParams.set('type', platform)

  const byTypeRes = await fetch(byTypeUrl.toString(), {
    headers: { 'x-api-key': BUNDLE_KEY() },
  })

  if (byTypeRes.ok) {
    return byTypeRes.json()
  }

  if (!fallbackSocialAccountId) return null

  const byIdRes = await fetch(`${BUNDLE_API}/social-account/${fallbackSocialAccountId}`, {
    headers: { 'x-api-key': BUNDLE_KEY() },
  })

  if (byIdRes.ok) {
    return byIdRes.json()
  }

  return null
}

function toBundleChannels(channels: Array<{ id: string; name: string; username?: string | null; avatar_url?: string | null }> | null | undefined) {
  if (!Array.isArray(channels)) return []

  return channels.map((channel) => ({
    id: channel.id,
    name: channel.name,
    username: channel.username ?? null,
    avatarUrl: channel.avatar_url ?? null,
  }))
}

async function refreshBundleChannels(teamId: string, platform: string) {
  const res = await fetch(`${BUNDLE_API}/social-account/refresh-channels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': BUNDLE_KEY(),
    },
    body: JSON.stringify({ teamId, type: platform }),
  })

  if (!res.ok) {
    return null
  }

  try {
    return await res.json()
  } catch {
    return null
  }
}

async function upsertNormalizedSocialAccount(userId: string, platform: string, remoteAccount: any) {
  const normalized = normalizeBundleAccountState(remoteAccount, platform)

  const payload = {
    user_id: userId,
    platform,
    account_id: normalized.account_id,
    account_name: normalized.account_name,
    display_name: normalized.display_name,
    username: normalized.username,
    avatar_url: normalized.avatar_url,
    access_token: 'managed_by_bundle',
    is_connected: true,
    is_active: true,
    needs_reauth: false,
    bundle_social_account_id: remoteAccount.id,
    metadata: normalized.metadata,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await (db as any)
    .from('social_accounts')
    .select('id')
    .eq('bundle_social_account_id', remoteAccount.id)
    .maybeSingle()

  if (existing) {
    const { error: updateError } = await (db as any)
      .from('social_accounts')
      .update(payload)
      .eq('id', existing.id)
    if (updateError) throw updateError
  } else {
    const { error: insertError } = await (db as any)
      .from('social_accounts')
      .insert(payload)
    if (insertError) throw insertError
  }

  return normalized
}

/** Get or lazily create a Bundle.social team for this user.
 *  Safe against unmigrated schema — falls back to BUNDLE_SOCIAL_TEAM_ID env var. */
async function getOrCreateBundleTeam(userId: string): Promise<string> {
  // ── 1. Try DB lookup first (may fail if migration not yet run) ────────────
  try {
    const { data: team, error } = await db
      .from('teams')
      .select('id, bundle_social_team_id')
      .eq('owner_id', userId)
      .maybeSingle()

    if (!error && team?.bundle_social_team_id) {
      return team.bundle_social_team_id as string
    }
  } catch (dbErr) {
    // Column or table not yet migrated — fall through to env var / create new
    console.warn('getOrCreateBundleTeam: DB lookup failed (migration pending?):', dbErr)
  }

  // ── 2. Use env var team as fallback if present ─────────────────────────────
  const envTeamId = process.env.BUNDLE_SOCIAL_TEAM_ID
  if (envTeamId) {
    // Silently attempt to persist this for next time
    try {
      const { data: existingTeam } = await db
        .from('teams')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle()

      if (existingTeam?.id) {
        await db
          .from('teams')
          .update({ bundle_social_team_id: envTeamId })
          .eq('id', existingTeam.id)
      }
    } catch { /* ignore — migration not run yet */ }
    return envTeamId
  }

  // ── 3. Provision a new Bundle team ────────────────────────────────────────
  let label = userId
  try {
    const { data: userData } = await db
      .from('users')
      .select('name, email')
      .eq('id', userId)
      .maybeSingle()
    label = (userData as any)?.name || (userData as any)?.email || userId
  } catch { /* ignore */ }

  const res = await fetch(`${BUNDLE_API}/team`, {
    method: 'POST',
    headers: { 'x-api-key': BUNDLE_KEY(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `Syncrio — ${label}` }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to provision Bundle.social team: ${text}`)
  }

  const remoteTeam = await res.json()
  const bundleTeamId: string = remoteTeam.id

  // Persist to DB (best-effort)
  try {
    const { data: existingTeam } = await db
      .from('teams')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle()

    if (existingTeam?.id) {
      await db.from('teams').update({ bundle_social_team_id: bundleTeamId }).eq('id', (existingTeam as any).id)
    } else {
      await db.from('teams').insert({ owner_id: userId, name: `${label}'s Workspace`, bundle_social_team_id: bundleTeamId })
    }
  } catch (persistErr) {
    console.warn('getOrCreateBundleTeam: failed to persist team ID (migration pending?):', persistErr)
  }

  return bundleTeamId
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — list connected social accounts for the current user
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data: accounts, error } = await supabaseAdmin
      .from('social_accounts')
      .select(`
        id,
        platform,
        account_id,
        account_name,
        display_name,
        username,
        avatar_url,
        is_active,
        is_connected,
        needs_reauth,
        disconnect_scheduled_at,
        account_type,
        permissions,
        bundle_social_account_id,
        metadata,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .order('platform', { ascending: true })
      .order('updated_at', { ascending: false })

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

    // ── ACTION: CONNECT (generate hosted portal link or direct oauth check)
    if (action === 'connect') {
      const { platform } = body
      const teamId = await getOrCreateBundleTeam(user.id)
      const redirectUrl = `${getAppBaseUrl(request)}/integrations?connectedPlatform=${encodeURIComponent(platform || '')}`

      // 1. Direct Platform Connection (Vastly superior UX, bypasses portal)
      if (platform) {
        const { withBusinessScope } = body
        const connectBody: Record<string, unknown> = {
          type: platform,
          teamId,
          redirectUrl,
        }

        // Direct Instagram OAuth (no FB Page required)
        if (platform === 'INSTAGRAM') {
          connectBody.instagramConnectionMethod = 'INSTAGRAM'
        }

        // Broaden Meta permissions if requested
        if (withBusinessScope) {
          connectBody.withBusinessScope = true
        }

        const res = await fetch(`${BUNDLE_API}/social-account/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': BUNDLE_KEY(),
          },
          body: JSON.stringify(connectBody),
        })

        if (!res.ok) {
          const errText = await res.text()
          console.error(`Bundle connect error for ${platform}:`, errText)
          
          let parsedErr: any = {}
          try { parsedErr = JSON.parse(errText) } catch {}
          
          // Detect "already connected" scenario
          if (res.status === 400 && parsedErr.message?.toLowerCase().includes('already')) {
            return NextResponse.json({ 
              success: false, 
              error: 'already_connected', 
              message: parsedErr.message 
            }, { status: 400 })
          }

          return NextResponse.json({ 
            success: false, 
            error: parsedErr.message || `Failed to initiate ${platform} connection` 
          }, { status: 400 })
        }

        const data = await res.json()
        return NextResponse.json({ success: true, url: data.url })
      }

      // 2. Fallback: Generic Hosted Portal (if user clicks "Connect Anything")
      const portalBody: Record<string, unknown> = {
        teamId,
        redirectUrl,
      }

      const { data: userData } = await db.from('users').select('name').eq('id', user.id).maybeSingle()
      Object.assign(portalBody, getBundlePortalBranding(request, userData?.name || null))

      const res = await fetch(`${BUNDLE_API}/social-account/create-portal-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': BUNDLE_KEY() },
        body: JSON.stringify(portalBody),
      })

      if (!res.ok) {
        const errText = await res.text()
        return NextResponse.json({ success: false, error: `Portal link failed: ${errText}` }, { status: 400 })
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
        const enrichedAccount = await fetchBundleAccountByType(teamId, acc.type, acc.id) || acc

        // Log raw account for debugging
        console.log(`🔄 Syncing account [${acc.type}]:`, JSON.stringify({
          id: enrichedAccount.id || acc.id,
          displayName: enrichedAccount.displayName || acc.displayName,
          isRequireSetChannel: enrichedAccount.isRequireSetChannel,
          channelId: enrichedAccount.channelId,
          channelsCount: enrichedAccount.channels?.length
        }))

        const normalized = normalizeBundleAccountState(enrichedAccount, acc.type)
        
        const payload = {
          user_id: user.id,
          platform: acc.type,
          account_id: normalized.account_id,
          account_name: normalized.account_name,
          display_name: normalized.display_name,
          username: normalized.username,
          avatar_url: normalized.avatar_url,
          access_token: 'managed_by_bundle',
          is_connected: true,
          is_active: true,
          needs_reauth: false,
          bundle_social_account_id: enrichedAccount.id || acc.id,
          metadata: normalized.metadata,
          updated_at: new Date().toISOString(),
        }
        
        // Manual lookup to avoid PostgreSQL UNIQUE constraint ON CONFLICT errors
        const { data: existing } = await (db as any)
          .from('social_accounts')
          .select('id')
          .eq('bundle_social_account_id', enrichedAccount.id || acc.id)
          .maybeSingle()

        if (existing) {
          const { error: updateError } = await (db as any).from('social_accounts').update(payload).eq('id', existing.id)
          if (updateError) {
            console.error('Update error:', updateError)
            throw updateError
          }
        } else {
          const { error: insertError } = await (db as any).from('social_accounts').insert(payload)
          if (insertError) {
            console.error('Insert error:', insertError)
            throw insertError
          }
        }
        
        synced++
      }

      // Also mark any accounts NOT returned by Bundle as disconnected
      const activeBundleIds = accounts.map((a: any) => a.id).filter(Boolean)
      if (activeBundleIds.length > 0) {
        const { data: userAccounts } = await (db as any)
          .from('social_accounts')
          .select('id, bundle_social_account_id')
          .eq('user_id', user.id)
          
        if (userAccounts) {
          const accountsToDisconnect = userAccounts.filter((a: any) => 
            a.bundle_social_account_id && !activeBundleIds.includes(a.bundle_social_account_id)
          )
          
          if (accountsToDisconnect.length > 0) {
            console.log(`🧹 Deactivating ${accountsToDisconnect.length} stale Bundle accounts:`, accountsToDisconnect.map((a: any) => a.id))
            for (const ac of accountsToDisconnect) {
              await (db as any)
                .from('social_accounts')
                .update({ is_connected: false, is_active: false })
                .eq('id', ac.id)
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Refreshed ${synced} account${synced === 1 ? '' : 's'}`,
        count: synced,
      })
    }

    // ── ACTION: SET CHANNEL (select FB Page / YT channel / LinkedIn page etc.) ─
    if (action === 'finalize-connect') {
      const { platform } = body
      if (!platform) {
        return NextResponse.json({ success: false, error: 'Platform is required' }, { status: 400 })
      }

      const teamId = await getOrCreateBundleTeam(user.id)
      await refreshBundleChannels(teamId, platform)

      const remoteAccount = await fetchBundleAccountByType(teamId, platform)
      if (!remoteAccount?.id) {
        return NextResponse.json(
          { success: false, error: 'We could not finish connecting this account yet. Please try again.' },
          { status: 404 }
        )
      }

      const normalized = await upsertNormalizedSocialAccount(user.id, platform, remoteAccount)

      return NextResponse.json({
        success: true,
        message: 'Connection completed',
        data: normalized,
      })
    }

    if (action === 'refresh-channels') {
      const { platform, socialAccountId } = body
      if (!platform) {
        return NextResponse.json({ success: false, error: 'Platform is required' }, { status: 400 })
      }

      const teamId = await getOrCreateBundleTeam(user.id)
      const refreshedAccount = await refreshBundleChannels(teamId, platform)
      const remoteAccount =
        refreshedAccount ||
        await fetchBundleAccountByType(teamId, platform, socialAccountId)

      if (!remoteAccount?.id) {
        return NextResponse.json(
          { success: false, error: 'Could not load available channels right now.' },
          { status: 404 }
        )
      }

      const normalized = await upsertNormalizedSocialAccount(user.id, platform, remoteAccount)

      return NextResponse.json({
        success: true,
        message: 'Channel options updated',
        data: normalized,
      })
    }

    if (action === 'set-channel') {
      const { platform, channelId, socialAccountId } = body
      const teamId = await getOrCreateBundleTeam(user.id)
      let setChannelPayload: any = null

      const res = await fetch(`${BUNDLE_API}/social-account/set-channel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': BUNDLE_KEY(),
        },
        body: JSON.stringify({ teamId, type: platform, channelId }),
      })

      if (!res.ok) {
        const errText = await res.text()
        let parsedErr: any = {}
        try { parsedErr = JSON.parse(errText) } catch {}

        // Handle specific "already connected" case (e.g. from failed previous attempt)
        if (res.status === 400 && parsedErr.message?.toLowerCase().includes('already')) {
          console.warn('⚠️ set-channel warning: Platform already connected. Synching anyway...')
        } else {
          throw new Error(`set-channel failed: ${errText}`)
        }
      } else {
        try {
          setChannelPayload = await res.json()
        } catch {
          setChannelPayload = null
        }
      }

      await refreshBundleChannels(teamId, platform)

      // ── SYNC UPDATED DATA FROM BUNDLE ──────────────────────────────────────
      const { data: existingAccount } = await db
        .from('social_accounts')
        .select('id, display_name, username, avatar_url, metadata')
        .eq('bundle_social_account_id', socialAccountId)
        .eq('user_id', user.id)
        .maybeSingle()

      const remoteAccount =
        setChannelPayload ||
        await fetchBundleAccountByType(teamId, platform, socialAccountId)

      const fallbackAccount = {
        type: platform,
        id: socialAccountId,
        displayName: existingAccount?.display_name || null,
        username: existingAccount?.username || null,
        avatarUrl: existingAccount?.avatar_url || null,
        channelId,
        channels: toBundleChannels(existingAccount?.metadata?.available_channels),
      }

      const normalized = normalizeBundleAccountState(
        remoteAccount || fallbackAccount,
        platform,
        channelId
      )

      if (socialAccountId) {
        await db
          .from('social_accounts')
          .update({
            account_id: normalized.account_id,
            account_name: normalized.account_name,
            display_name: normalized.display_name,
            username: normalized.username,
            avatar_url: normalized.avatar_url,
            metadata: normalized.metadata,
            updated_at: new Date().toISOString()
          })
          .eq('bundle_social_account_id', socialAccountId)
          .eq('user_id', user.id)
      }

      return NextResponse.json({ success: true, message: 'Channel selected successfully', data: normalized })
    }

    // ── ACTION: UNSET CHANNEL ────────────────────────────────────────────────
    if (action === 'unset-channel') {
      const { platform } = body
      const teamId = await getOrCreateBundleTeam(user.id)
      let unsetChannelPayload: any = null

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
      } else {
        try {
          unsetChannelPayload = await res.json()
        } catch {
          unsetChannelPayload = null
        }
      }

      await refreshBundleChannels(teamId, platform)

      // ── SYNC UPDATED DATA FROM BUNDLE ──────────────────────────────────────
      const { socialAccountId: sId } = body
      const { data: existingAccount } = await db
        .from('social_accounts')
        .select('id, display_name, username, avatar_url, metadata')
        .eq('bundle_social_account_id', sId)
        .eq('user_id', user.id)
        .maybeSingle()

      const remoteAccount =
        unsetChannelPayload ||
        await fetchBundleAccountByType(teamId, platform, sId)

      const fallbackAccount = {
        type: platform,
        id: sId,
        displayName: existingAccount?.display_name || null,
        username: existingAccount?.username || null,
        avatarUrl: existingAccount?.avatar_url || null,
        channelId: null,
        channels: toBundleChannels(existingAccount?.metadata?.available_channels),
      }

      const normalized = normalizeBundleAccountState(
        remoteAccount || fallbackAccount,
        platform,
        null
      )

      if (sId) {
        await db
          .from('social_accounts')
          .update({
            account_id: normalized.account_id,
            account_name: normalized.account_name,
            display_name: normalized.display_name,
            username: normalized.username,
            avatar_url: normalized.avatar_url,
            metadata: normalized.metadata,
            updated_at: new Date().toISOString()
          })
          .eq('bundle_social_account_id', sId)
          .eq('user_id', user.id)
      }

      return NextResponse.json({ success: true, message: 'Channel unset successfully', data: normalized })
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

    const { data, error } = await db
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

    const { data, error } = await db
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

    // Fetch the account (verify ownership + get Bundle disconnect inputs)
    const { data: existing } = await db
      .from('social_accounts')
      .select('id, platform, bundle_social_account_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 })
    }

    // 1. Delete from Bundle.social first. Only continue locally if the remote
    // disconnect explicitly succeeds.
    if (existing.bundle_social_account_id) {
      const teamId = await getOrCreateBundleTeam(user.id)
      try {
        const res = await fetch(
          `${BUNDLE_API}/social-account/disconnect`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': BUNDLE_KEY(),
            },
            body: JSON.stringify({
              type: existing.platform,
              teamId,
            }),
          }
        )
        if (!res.ok) {
          const errText = await res.text()
          console.warn(`Bundle DELETE social-account failed (${res.status}):`, errText)
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to disconnect the account. The account was not removed locally.',
              details: errText,
            },
            { status: 502 }
          )
        }
      } catch (bundleErr) {
        console.warn('Bundle.social DELETE failed:', bundleErr)
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to disconnect the account. The account was not removed locally.',
          },
          { status: 502 }
        )
      }
    }

    // 2. Remove from Supabase
    await db.from('social_accounts').delete().eq('id', id)

    return NextResponse.json({ success: true, message: 'Account disconnected' })
  } catch (error) {
    console.error('DELETE /api/social/accounts error:', error)
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 })
  }
}
