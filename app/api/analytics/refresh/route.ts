// Force-refresh analytics from Bundle.social
// Rate limit: numTeams × 5 calls per day (Bundle enforced)
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { supabaseAdmin } from '@/lib/supabase/admin'

const BUNDLE_API = 'https://api.bundle.social/api/v1'
const BUNDLE_KEY = () => process.env.BUNDLE_SOCIAL_API_KEY!

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      // Get user's Bundle team
      const { data: team } = await (supabaseAdmin as any)
        .from('teams')
        .select('bundle_social_team_id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (!team?.bundle_social_team_id) {
        return apiError('No connected team found', 400)
      }

      const bundleTeamId = team.bundle_social_team_id

      // Call Bundle force-refresh
      const bundleRes = await fetch(`${BUNDLE_API}/analytics/force-refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': BUNDLE_KEY(),
        },
        body: JSON.stringify({ teamId: bundleTeamId }),
      })

      if (bundleRes.status === 429) {
        return apiError('Analytics refresh rate limit reached. You can refresh up to 5 times per team per day.', 429)
      }

      if (!bundleRes.ok) {
        const errText = await bundleRes.text()
        console.error('Analytics force-refresh error:', errText)
        return apiError('Failed to refresh analytics', 500)
      }

      // Invalidate cache so next GET will re-fetch
      await (supabaseAdmin as any)
        .from('analytics_cache')
        .delete()
        .eq('user_id', user.id)

      return apiSuccess({ message: 'Analytics refresh triggered. Data will update shortly.' })
    })
  )(req)
}
