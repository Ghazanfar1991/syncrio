import { NextRequest } from 'next/server'

import { apiError, apiSuccess } from '@/lib/api-utils'
import { invalidateAnalyticsCacheForUser } from '@/lib/analytics/bundle-analytics'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { withAuth, withErrorHandling } from '@/lib/middleware'

const BUNDLE_API = 'https://api.bundle.social/api/v1'

type RefreshScope = 'account' | 'posts' | 'all'

function normalizePlatform(platform: string | null | undefined) {
  const normalized = (platform || '').trim().toUpperCase()
  return normalized || null
}

async function bundleFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${BUNDLE_API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.BUNDLE_SOCIAL_API_KEY || '',
      ...(init?.headers || {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    const error = new Error(text || `Bundle request failed with ${response.status}`)
    ;(error as any).status = response.status
    throw error
  }

  return response.json()
}

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (request: NextRequest, user: any) => {
      const body = await request.json().catch(() => ({}))
      const scope = ((body.scope || 'account') as RefreshScope)
      const requestedPlatform = normalizePlatform(body.platform)
      const requestedAccountId = typeof body.accountId === 'string' ? body.accountId : null

      const { data: team } = await (supabaseAdmin as any)
        .from('teams')
        .select('bundle_social_team_id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (!team?.bundle_social_team_id) {
        return apiError('No connected team found', 400)
      }

      const { data: accounts, error } = await (supabaseAdmin as any)
        .from('social_accounts')
        .select('id, account_id, platform, bundle_social_account_id')
        .eq('user_id', user.id)
        .eq('is_connected', true)
        .not('bundle_social_account_id', 'is', null)

      if (error) throw error

      const selectedAccounts = (accounts || []).filter((account: any) => {
        const matchesPlatform = !requestedPlatform || account.platform === requestedPlatform
        const matchesAccount = !requestedAccountId || account.id === requestedAccountId || account.account_id === requestedAccountId
        return matchesPlatform && matchesAccount
      })

      if (selectedAccounts.length === 0) {
        return apiError('No connected accounts matched the refresh request.', 404)
      }

      const uniquePlatforms = [...new Set(selectedAccounts.map((account: any) => String(account.platform || '')))].filter(Boolean)
      const refreshedPlatforms: string[] = []
      let refreshedPosts = 0

      try {
        if (scope === 'account' || scope === 'all') {
          for (const platform of uniquePlatforms) {
            await bundleFetch('/analytics/social-account/force', {
              method: 'POST',
              body: JSON.stringify({
                teamId: team.bundle_social_team_id,
                platformType: platform,
              }),
            })
            refreshedPlatforms.push(platform)
          }
        }

        if (scope === 'posts' || scope === 'all') {
          for (const platform of uniquePlatforms) {
            const importedPostsResponse = await bundleFetch(
              `/post-history-import/posts?teamId=${team.bundle_social_team_id}&socialAccountType=${platform}&limit=10`
            )
            const importedPosts = Array.isArray(importedPostsResponse?.posts) ? importedPostsResponse.posts : []
            const targetBundleIds = new Set(selectedAccounts.filter((account: any) => account.platform === platform).map((account: any) => account.bundle_social_account_id))

            for (const post of importedPosts) {
              if (!targetBundleIds.has(post.socialAccountId)) continue

              await bundleFetch('/analytics/post/force', {
                method: 'POST',
                body: JSON.stringify({
                  importedPostId: post.id,
                  platformType: platform,
                }),
              })
              refreshedPosts += 1
            }
          }
        }
      } catch (error) {
        if ((error as any)?.status === 429) {
          return apiError('Bundle Social refresh rate limit reached. Please wait before refreshing again.', 429)
        }

        throw error
      }

      await invalidateAnalyticsCacheForUser(
        user.id,
        selectedAccounts.map((account: any) => account.bundle_social_account_id).filter(Boolean)
      )

      return apiSuccess({
        scope,
        refreshedPlatforms,
        refreshedPosts,
        refreshCooldownMinutes: 30,
        message:
          scope === 'posts'
            ? `Triggered post analytics refresh for ${refreshedPosts} imported posts.`
            : `Triggered analytics refresh for ${refreshedPlatforms.length} platform${refreshedPlatforms.length === 1 ? '' : 's'}.`,
      })
    })
  )(req)
}
