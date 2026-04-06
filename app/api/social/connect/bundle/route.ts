// Bundle.social: Create a portal link for the user to connect their social accounts
// This replaces the individual Twitter, LinkedIn, Instagram, etc. OAuth flows
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { bundleSocial } from '@/lib/bundle-social'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const body = await req.json()
      const {
        socialAccountTypes, // e.g. ['TWITTER', 'INSTAGRAM', 'LINKEDIN']
        redirectUrl,
      } = body

      // Ensure the user has a Bundle.social team
      // Each user maps to a Bundle.social team ID stored in their profile
      let teamId = await getUserBundleTeamId(user.id)

      if (!teamId) {
        // Create a team for this user in Bundle.social
        teamId = await createBundleTeamForUser(user.id, user.email)
        if (!teamId) {
          return NextResponse.json(
            { success: false, error: 'Failed to create social connection team' },
            { status: 500 }
          )
        }
      }

      // Create the hosted portal link — user connects accounts there
      const portalLink = await (bundleSocial.socialAccount as any).createPortalLink({
        requestBody: {
          teamId,
          redirectUrl: redirectUrl || `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}/dashboard/integrations`,
          socialAccountTypes: socialAccountTypes || [
            'TWITTER', 'INSTAGRAM', 'LINKEDIN', 'FACEBOOK',
            'YOUTUBE', 'TIKTOK', 'THREADS', 'PINTEREST', 'REDDIT',
          ],
          logoUrl: `${process.env.NEXTAUTH_URL || ''}/applogo.PNG`,
          userName: user.name || user.email,
          language: 'en',
          showModalOnConnectSuccess: true,
        },
      })

      return NextResponse.json({
        success: true,
        data: { portalUrl: (portalLink as any).url || portalLink },
      })
    })
  )(req)
}

async function getUserBundleTeamId(userId: string): Promise<string | null> {
  const { data } = await db
    .from('users')
    .select('bundle_social_team_id')
    .eq('id', userId)
    .single()
  return data?.bundle_social_team_id || null
}

async function createBundleTeamForUser(userId: string, email: string): Promise<string | null> {
  try {
    const team = await (bundleSocial as any).team?.teamCreate?.({
      requestBody: {
        name: `User ${email}`,
      },
    })
    const teamId = (team as any)?.id
    if (teamId) {
      await db.from('users').update({ bundle_social_team_id: teamId }).eq('id', userId)
    }
    return teamId || null
  } catch (error) {
    console.error('Failed to create Bundle.social team:', error)
    return null
  }
}

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const teamId = await getUserBundleTeamId(user.id)
      if (!teamId) {
        return NextResponse.json({ success: true, data: { accounts: [] } })
      }

      // Fetch connected social accounts from Bundle.social
      const accounts = await (bundleSocial.socialAccount as any).socialAccountList?.({
        teamId,
      })

      return NextResponse.json({
        success: true,
        data: { accounts: accounts || [] },
      })
    })
  )(req)
}
