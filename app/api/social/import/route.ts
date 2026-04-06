// Import post history from social platforms via Bundle.social
// 3-Step async flow: POST (start) → GET (poll status) → GET /posts (fetch results)
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { supabaseAdmin } from '@/lib/supabase/admin'

const BUNDLE_API = 'https://api.bundle.social/api/v1'
const BUNDLE_KEY = () => process.env.BUNDLE_SOCIAL_API_KEY!
const db = supabaseAdmin as any

async function getBundleTeamId(userId: string): Promise<string | null> {
  const { data } = await db
    .from('teams')
    .select('bundle_social_team_id')
    .eq('owner_id', userId)
    .maybeSingle()
  return (data as any)?.bundle_social_team_id || null
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — start an import job
// Body: { platform: 'INSTAGRAM', count?: 50, withAnalytics?: true }
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const body = await req.json()
      const { platform, count = 50, withAnalytics = true, surface = 'ALL' } = body

      if (!platform) return apiError('platform is required', 400)

      const bundleTeamId = await getBundleTeamId(user.id)
      if (!bundleTeamId) return apiError('No connected team found. Please connect a social account first.', 400)

      // Check if account is connected for this platform
      const { data: account } = await db
        .from('social_accounts')
        .select('id, bundle_social_account_id')
        .eq('user_id', user.id)
        .eq('platform', platform)
        .eq('is_connected', true)
        .maybeSingle()

      if (!account) {
        return apiError(`No connected ${platform} account found. Please connect it first.`, 400)
      }

      // Start Bundle import job
      const bundleRes = await fetch(`${BUNDLE_API}/post-history-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': BUNDLE_KEY(),
        },
        body: JSON.stringify({
          teamId: bundleTeamId,
          socialAccountType: platform,
          count: Math.min(count, 50), // Cap at 50 for safety
          withAnalytics,
          importCarousels: true,
          surface,
        }),
      })

      if (bundleRes.status === 429) {
        return apiError('Import rate limited. Please try again later.', 429)
      }

      if (!bundleRes.ok) {
        const errText = await bundleRes.text()
        console.error('Post import start error:', errText)
        return apiError('Failed to start import job', 500)
      }

      const bundleJob = await bundleRes.json()

      // Save job to Supabase for status tracking
      const { data: jobRow, error: jobError } = await db
        .from('post_import_jobs')
        .insert({
          user_id: user.id,
          team_id: bundleTeamId,
          platform,
          bundle_job_id: bundleJob.id || null,
          status: bundleJob.status || 'PENDING',
          count,
          with_analytics: withAnalytics,
        })
        .select()
        .single()

      if (jobError) {
        console.error('Failed to save import job:', jobError)
      }

      return apiSuccess({
        jobId: jobRow?.id,
        bundleJobId: bundleJob.id,
        status: bundleJob.status || 'PENDING',
        message: `Import started for ${platform}. Poll GET /api/social/import?platform=${platform} to check status.`,
      })
    })
  )(req)
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — poll status + fetch completed posts
// ?platform=INSTAGRAM&fetch=true (fetch=true returns the actual posts)
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const { searchParams } = new URL(req.url)
      const platform = searchParams.get('platform')
      const fetchPosts = searchParams.get('fetch') === 'true'

      const bundleTeamId = await getBundleTeamId(user.id)
      if (!bundleTeamId) return apiError('No connected team found', 400)

      // ── Check job status ───────────────────────────────────────────────────
      const statusRes = await fetch(
        `${BUNDLE_API}/post-history-import?teamId=${bundleTeamId}${platform ? `&socialAccountType=${platform}` : ''}`,
        { headers: { 'x-api-key': BUNDLE_KEY() } }
      )

      if (!statusRes.ok) {
        return apiError('Failed to check import status', 500)
      }

      const statusData = await statusRes.json()
      const jobs = Array.isArray(statusData) ? statusData : [statusData]

      // Update Supabase job records
      for (const job of jobs) {
        await db
          .from('post_import_jobs')
          .update({
            status: job.status,
            rate_limit_reset_at: job.rateLimitResetAt || null,
            completed_at: job.status === 'COMPLETED' ? new Date().toISOString() : null,
          })
          .eq('team_id', bundleTeamId)
          .eq('platform', job.socialAccountType || platform || '')

      }

      // ── Fetch posts if completed and requested ─────────────────────────────
      if (fetchPosts && jobs.some(j => j.status === 'COMPLETED')) {
        const postsRes = await fetch(
          `${BUNDLE_API}/post-history-import/posts?teamId=${bundleTeamId}${platform ? `&socialAccountType=${platform}` : ''}`,
          { headers: { 'x-api-key': BUNDLE_KEY() } }
        )

        if (postsRes.ok) {
          const postsData = await postsRes.json()
          const importedPosts: any[] = postsData.posts || []

          // Upsert imported posts into Supabase posts table
          let savedCount = 0
          for (const iPost of importedPosts) {
            const { error: upsertErr } = await db
              .from('posts')
              .upsert(
                {
                  user_id: user.id,
                  content: iPost.content || iPost.text || iPost.title || '',
                  title: iPost.title || null,
                  platform: platform || 'UNKNOWN',
                  status: 'PUBLISHED',
                  source: 'IMPORTED',
                  bundle_post_id: iPost.id || null,
                  posted_date: iPost.postedDate || iPost.createdAt || null,
                  created_at: iPost.createdAt || new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'bundle_post_id' }
              )

            if (!upsertErr) savedCount++
          }

          return apiSuccess({
            status: 'COMPLETED',
            jobs,
            posts: importedPosts,
            savedToDatabase: savedCount,
          })
        }
      }

      return apiSuccess({ status: jobs[0]?.status || 'UNKNOWN', jobs })
    })
  )(req)
}
