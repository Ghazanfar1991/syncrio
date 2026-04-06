import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { bundleSocial } from '@/lib/bundle-social'

const BUNDLE_API = 'https://api.bundle.social/api/v1'
const BUNDLE_KEY = () => process.env.BUNDLE_SOCIAL_API_KEY!
// Untyped alias — needed until Supabase types are regenerated post-migration
const db = supabaseAdmin as any

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
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

    // ── ACTION: CONNECT (generate hosted portal link or direct oauth check)
    if (action === 'connect') {
      const { platform } = body
      const teamId = await getOrCreateBundleTeam(user.id)
      const host = request.headers.get('host')
      const proto = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
      const redirectUrl = `${proto}://${host}/integrations?sync=true`

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
          try { parsedErr = JSON.parse(errText) } catch (e) {}
          
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
      if (userData?.name) portalBody.userName = userData.name

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
        // Log raw account for debugging
        console.log(`🔄 Syncing account [${acc.type}]:`, JSON.stringify({
          id: acc.id,
          displayName: acc.displayName,
          isRequireSetChannel: acc.isRequireSetChannel,
          channelId: acc.channelId,
          channelsCount: acc.channels?.length
        }))

        // Robustly determine if channel selection is required
        const PLATFORMS_REQUIRING_CHANNEL = ['FACEBOOK', 'INSTAGRAM', 'YOUTUBE', 'LINKEDIN', 'GOOGLE_BUSINESS']
        const isPickNeeded = acc.isRequireSetChannel || (PLATFORMS_REQUIRING_CHANNEL.includes(acc.type) && !acc.channelId)
        
        // Use a more descriptive name if none is provided
        const namePlaceholder = `${acc.type} Account`
        let displayName = acc.displayName || acc.name
        
        // If we have a channelId but No displayName, find it in the channels list
        if (!displayName && acc.channelId && acc.channels) {
          const matched = acc.channels.find((c: any) => c.id === acc.channelId)
          if (matched) displayName = matched.name
        }

        const displayNamePlaceholder = isPickNeeded ? `Configure ${acc.type}` : `${acc.type} Account`
        
        const payload = {
          user_id: user.id,
          platform: acc.type,
          account_id: acc.platformId || acc.externalId || acc.id,
          account_name: acc.displayName || acc.username || acc.name || displayName || namePlaceholder,
          display_name: displayName || displayNamePlaceholder,
          username: acc.username || null,
          avatar_url: acc.avatarUrl || null,
          access_token: 'managed_by_bundle',
          is_connected: true,
          is_active: true,
          needs_reauth: false,
          bundle_social_account_id: acc.id,
          metadata: {
            requires_channel_selection: isPickNeeded,
            available_channels: acc.channels || [],
            channel_id: acc.channelId || null
          },
          updated_at: new Date().toISOString(),
        }
        
        // Manual lookup to avoid PostgreSQL UNIQUE constraint ON CONFLICT errors
        const { data: existing } = await (db as any)
          .from('social_accounts')
          .select('id')
          .eq('bundle_social_account_id', acc.id)
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
        const errText = await res.text()
        let parsedErr: any = {}
        try { parsedErr = JSON.parse(errText) } catch (e) {}

        // Handle specific "already connected" case (e.g. from failed previous attempt)
        if (res.status === 400 && parsedErr.message?.toLowerCase().includes('already')) {
          console.warn('⚠️ set-channel warning: Platform already connected. Synching anyway...')
        } else {
          throw new Error(`set-channel failed: ${errText}`)
        }
      }

      // ── SYNC UPDATED DATA FROM BUNDLE ──────────────────────────────────────
      // After setting a channel, the account name/avatar usually change to match the channel
      if (socialAccountId) {
        const accRes = await fetch(`${BUNDLE_API}/social-account/${socialAccountId}`, {
          headers: { 'x-api-key': BUNDLE_KEY() },
        })
        
        if (accRes.ok) {
          const acc = await accRes.json()
          
          const PLATFORMS_REQUIRING_CHANNEL = ['FACEBOOK', 'INSTAGRAM', 'YOUTUBE', 'LINKEDIN', 'GOOGLE_BUSINESS']
          const isPickNeeded = acc.isRequireSetChannel || (PLATFORMS_REQUIRING_CHANNEL.includes(platform) && !acc.channelId)
          
          const namePlaceholder = `${platform} Account`
          let displayName = acc.displayName || acc.name

          // Extract specifically selected channel name if top-level is still placeholders
          if ((!displayName || displayName.includes('Configure')) && acc.channelId && acc.channels) {
            const matched = acc.channels.find((c: any) => c.id === acc.channelId)
            if (matched) displayName = matched.name
          }

          const displayNamePlaceholder = isPickNeeded ? `Configure ${platform}` : `${platform} Account`

          await db
            .from('social_accounts')
            .update({
              account_name: acc.displayName || acc.username || acc.name || displayName || namePlaceholder,
              display_name: displayName || displayNamePlaceholder,
              username: acc.username || null,
              avatar_url: acc.avatarUrl || null,
              metadata: {
                requires_channel_selection: isPickNeeded,
                available_channels: acc.channels || [],
                channel_id: acc.channelId || null
              },
              updated_at: new Date().toISOString()
            })
            .eq('bundle_social_account_id', socialAccountId)
            .eq('user_id', user.id)
        }
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

      // ── SYNC UPDATED DATA FROM BUNDLE ──────────────────────────────────────
      const { socialAccountId: sId } = body
      if (sId) {
        const accRes = await fetch(`${BUNDLE_API}/social-account/${sId}`, {
          headers: { 'x-api-key': BUNDLE_KEY() },
        })
        
        if (accRes.ok) {
          const acc = await accRes.json()
          await db
            .from('social_accounts')
            .update({
              metadata: {
                requires_channel_selection: acc.isRequireSetChannel || false,
                available_channels: acc.channels || [],
              },
              updated_at: new Date().toISOString()
            })
            .eq('bundle_social_account_id', sId)
            .eq('user_id', user.id)
        }
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

    // Fetch the account (verify ownership + get Bundle ID)
    const { data: existing } = await db
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
    await db.from('social_accounts').delete().eq('id', id)

    return NextResponse.json({ success: true, message: 'Account disconnected' })
  } catch (error) {
    console.error('DELETE /api/social/accounts error:', error)
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 })
  }
}