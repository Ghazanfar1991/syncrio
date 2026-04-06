import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { bundleSocial, SUPPORTED_PLATFORMS } from '@/lib/bundle-social'

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

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

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    // --- HELPER ---
    async function getOrCreateBundleTeam(userId: string) {
      let { data: team } = await (supabaseAdmin as any)
        .from('teams')
        .select('*')
        .eq('owner_id', userId)
        .single()

      if (!team) {
        const { data: newTeam, error } = await (supabaseAdmin as any)
          .from('teams')
          .insert({ owner_id: userId, name: 'Personal Workspace' })
          .select()
          .single()

        if (error) throw new Error(`Failed to insert local team: ${error.message}`)
        team = newTeam
      }

      if (!team.bundle_social_team_id) {
        const res = await fetch('https://api.bundle.social/api/v1/team', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.BUNDLE_SOCIAL_API_KEY!,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: `Workspace for ${userId}` })
        })

        if (!res.ok) {
          throw new Error(`Failed to provision Bundle.social team: ${await res.text()}`)
        }

        const remoteTeam = await res.json()

        await (supabaseAdmin as any)
          .from('teams')
          .update({ bundle_social_team_id: remoteTeam.id })
          .eq('id', team.id)

        return remoteTeam.id
      }

      return team.bundle_social_team_id
    }

    // ================================
    // ACTION: CREATE PORTAL LINK
    // ================================
    if (action === 'connect') {
      const { platform } = body

      const teamId = await getOrCreateBundleTeam(user.id)

      const appUrl = process.env.NEXT_PUBLIC_APP_URL!

      // 👇 THIS IS CRITICAL
      const redirectUrl = `${appUrl}/integrations?sync=true`

      const res = await fetch(
        'https://api.bundle.social/api/v1/social-account/create-portal-link',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.BUNDLE_SOCIAL_API_KEY!
          },
          body: JSON.stringify({
            teamId,
            redirectUrl,

            // 👇 THIS FIXES "showing all platforms again"
            socialAccountTypes: platform ? [platform] : [
              'INSTAGRAM',
              'FACEBOOK',
              'TWITTER',
              'LINKEDIN'
            ]
          })
        }
      )

      if (!res.ok) {
        const err = await res.text()
        console.error('Bundle error:', err)
        throw new Error('Failed to create portal link')
      }

      const data = await res.json()

      return NextResponse.json({
        success: true,
        url: data.url
      })
    }

    // ================================
    // ACTION: SYNC
    // ================================
    if (action === 'sync') {
      const teamId = await getOrCreateBundleTeam(user.id)
      const bundleTeam = await bundleSocial.team.teamGetTeam(teamId)

      const accounts = (bundleTeam as any).socialAccounts || []

      for (const acc of accounts) {
        await (supabaseAdmin as any).from('social_accounts').upsert({
          user_id: user.id,
          platform: acc.type,
          account_id: acc.platformId,
          account_name: acc.name,
          display_name: acc.name,
          username: acc.username,
          access_token: 'managed_by_bundle',
          is_connected: true,
          is_active: true,
          bundle_social_account_id: acc.id,
          metadata: {
            requires_channel_selection: acc.isRequireSetChannel,
            available_channels: acc.channels || []
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,platform,account_id'
        })
      }

      return NextResponse.json({
        success: true,
        message: `Synced ${accounts.length} accounts`
      })
    }

    // ================================
    // ACTION: SET CHANNEL
    // ================================
    if (action === 'set-channel') {
      const { platform, channelId } = body
      const teamId = await getOrCreateBundleTeam(user.id)

      await (bundleSocial.socialAccount as any).socialAccountSetChannel({
        teamId,
        type: platform,
        channelId
      })

      return NextResponse.json({
        success: true,
        message: 'Channel selected successfully'
      })
    }

    // ================================
    // DEFAULT: MANUAL SAVE
    // ================================
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
      bundle_social_account_id
    } = body

    if (!platform || !account_id || !account_name || !access_token) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('social_accounts')
      .upsert({
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
      }, {
        onConflict: 'user_id,platform,account_id'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      message: 'Account saved successfully'
    })

  } catch (error: any) {
    console.error('POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

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
    console.error('Failed to update:', error)
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 })
  }
}

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

    const { data: existing } = await supabaseAdmin
      .from('social_accounts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 })
    }

    await supabaseAdmin.from('social_accounts').delete().eq('id', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete failed:', error)
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 })
  }
}