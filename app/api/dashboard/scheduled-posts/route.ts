// Scheduled posts API endpoint for calendar
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess } from '@/lib/api-utils'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const { searchParams } = new URL(req.url)
        const month = parseInt(searchParams.get('month') || '0')
        const year = parseInt(searchParams.get('year') || '0')

        if (!month || !year) {
          return apiSuccess({ scheduledPosts: [] })
        }

        const startOfMonth = new Date(year, month - 1, 1)
        const endOfMonth = new Date(year, month, 0, 23, 59, 59)

        // Get scheduled and published posts for the month
        const allPosts = await db.post.findMany({
          where: {
            userId: user.id,
            status: {
              in: ['SCHEDULED', 'PUBLISHED']
            },
            scheduledAt: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          },
          select: {
            id: true,
            content: true,
            scheduledAt: true,
            status: true,
            imageUrl: true,
            images: true,
            hashtags: true,
            platform: true,
            publications: {
              select: {
                socialAccount: {
                  select: {
                    platform: true,
                    accountName: true
                  }
                }
              }
            }
          },
          orderBy: {
            scheduledAt: 'asc'
          }
        })

        // Group posts by date
        const postsByDate = allPosts.reduce((acc: Record<string, any[]>, post: any) => {
          // Use local date instead of UTC to avoid timezone shift issues
          const scheduledDate = post.scheduledAt ? new Date(post.scheduledAt) : null
          const date = scheduledDate ? scheduledDate.toLocaleDateString('en-CA') : '' // en-CA format: YYYY-MM-DD
          
          if (!acc[date]) {
            acc[date] = []
          }
          
          acc[date].push({
            id: post.id,
            content: post.content,
            status: post.status,
            scheduledAt: post.scheduledAt?.toISOString(),
            time: scheduledDate?.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }) || '',
            platform: post.platform || post.publications[0]?.socialAccount?.platform || 'UNKNOWN',
            accountName: post.publications[0]?.socialAccount?.accountName || 'Unknown Account',
            imageUrl: post.imageUrl || null,
            images: post.images || null,
            hashtags: post.hashtags || ''
          })
          
          return acc
        }, {} as Record<string, any[]>)

        return apiSuccess({ allPosts: postsByDate })
      } catch (error) {
        console.error('Scheduled posts fetch error:', error)
        return apiSuccess({ scheduledPosts: {} })
      }
    })
  )(req)
}
