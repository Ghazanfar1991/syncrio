import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { db } from '@/lib/db'

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2'

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        // Get LinkedIn social accounts for this user
        const linkedinAccounts = await db.socialAccount.findMany({
          where: {
            userId: user.id,
            platform: 'LINKEDIN',
            isActive: true
          }
        })

        if (linkedinAccounts.length === 0) {
          return apiError('No LinkedIn accounts found', 404)
        }

        const debugInfo = []

        for (const account of linkedinAccounts) {
          const accountDebug: any = {
            accountId: account.accountId,
            accountName: account.accountName,
            hasToken: !!account.accessToken,
            tokenExpiry: account.tokenExpiry,
            isExpired: account.tokenExpiry ? new Date(account.tokenExpiry) < new Date() : 'unknown'
          }

          if (account.accessToken) {
            try {
              // Test 1: Get user profile
              const profileResponse = await fetch(`${LINKEDIN_API_BASE}/people/~`, {
                headers: {
                  'Authorization': `Bearer ${account.accessToken}`,
                  'Content-Type': 'application/json'
                }
              })

              accountDebug.profileTest = {
                status: profileResponse.status,
                ok: profileResponse.ok
              }

              if (profileResponse.ok) {
                const profileData = await profileResponse.json()
                accountDebug.profileData = {
                  id: profileData.id,
                  firstName: profileData.localizedFirstName,
                  lastName: profileData.localizedLastName
                }
              } else {
                accountDebug.profileError = await profileResponse.text()
              }

              // Test 2: Check permissions by trying to access UGC posts endpoint
              const ugcTestResponse = await fetch(`${LINKEDIN_API_BASE}/ugcPosts?q=authors&authors=List(urn:li:person:${account.accountId})&count=1`, {
                headers: {
                  'Authorization': `Bearer ${account.accessToken}`,
                  'Content-Type': 'application/json'
                }
              })

              accountDebug.ugcPermissionTest = {
                status: ugcTestResponse.status,
                ok: ugcTestResponse.ok
              }

              if (!ugcTestResponse.ok) {
                accountDebug.ugcPermissionError = await ugcTestResponse.text()
              }

            } catch (error) {
              accountDebug.testError = error instanceof Error ? error.message : 'Unknown error'
            }
          }

          debugInfo.push(accountDebug)
        }

        return apiSuccess({
          message: 'LinkedIn debug information',
          accounts: debugInfo,
          recommendations: [
            'If profileTest fails: Token is invalid or expired - reconnect LinkedIn account',
            'If ugcPermissionTest fails with 403: App lacks w_member_social permission',
            'If ugcPermissionTest fails with 401: Token lacks required scope',
            'Check LinkedIn Developer Portal for app status and permissions'
          ]
        })

      } catch (error) {
        console.error('LinkedIn debug error:', error)
        return apiError('Failed to debug LinkedIn integration', 500)
      }
    })
  )(req)
}
