// Debug endpoint to check social accounts
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        // Get all social accounts for the user
        const socialAccounts = await db.socialAccount.findMany({
          where: {
            userId: user.id
          },
          select: {
            id: true,
            platform: true,
            accountId: true,
            accountName: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            expiresAt: true
          }
        })

        // Get total counts
        const totalAccounts = socialAccounts.length
        const activeAccounts = socialAccounts.filter(acc => acc.isActive).length
        const expiredAccounts = socialAccounts.filter(acc => 
          acc.expiresAt && acc.expiresAt < new Date()
        ).length

        return apiSuccess({
          userId: user.id,
          totalAccounts,
          activeAccounts,
          expiredAccounts,
          accounts: socialAccounts,
          platformBreakdown: {
            TWITTER: socialAccounts.filter(acc => acc.platform === 'TWITTER').length,
            LINKEDIN: socialAccounts.filter(acc => acc.platform === 'LINKEDIN').length,
            INSTAGRAM: socialAccounts.filter(acc => acc.platform === 'INSTAGRAM').length,
            YOUTUBE: socialAccounts.filter(acc => acc.platform === 'YOUTUBE').length
          }
        })
      } catch (error) {
        console.error('Debug social accounts error:', error)
        return apiError('Failed to fetch social accounts debug info', 500)
      }
    })
  )(req)
}
