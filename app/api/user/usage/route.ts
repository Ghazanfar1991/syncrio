// User usage tracking API endpoint
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess } from '@/lib/api-utils'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()

      // Get current month's usage
      const usage = await db.usageTracking.findUnique({
        where: {
          userId_month_year: {
            userId: user.id,
            month: currentMonth,
            year: currentYear
          }
        }
      })

      // Get connected accounts count
      const accountsConnected = await db.socialAccount.count({
        where: {
          userId: user.id,
          isActive: true
        }
      })

      // Get total posts count
      const totalPosts = await db.post.count({
        where: { userId: user.id }
      })

      // Get posts this month
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1)
      const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59)

      const postsThisMonth = await db.post.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      })

      return apiSuccess({
        postsUsed: usage?.postsUsed || postsThisMonth,
        accountsConnected,
        totalPosts,
        currentMonth,
        currentYear
      })
    })
  )(req)
}
