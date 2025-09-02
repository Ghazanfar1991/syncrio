// Posts API endpoint for dashboard calendar (scheduled and published)
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
          return apiSuccess({ allPosts: [] })
        }

        // Minimal types for posts and grouped entries
        type DashboardPost = {
          id: string
          content: string | null
          status: 'SCHEDULED' | 'PUBLISHED' | string
          scheduledAt: Date | null
          publishedAt: Date | null
          imageUrl: string | null
          images: string | null
          videoUrl: string | null
          videos: string | null
          hashtags: string | null
          platform: any
          publications: Array<{ socialAccount: { platform: string; accountName: string | null } }>
        }

        type DashboardDayEntry = {
          id: string
          content: string
          status: string
          scheduledAt: string | undefined
          publishedAt: string | undefined
          time: string
          platform: string
          accountName: string | null
          imageUrl: string | null
          images: string | null
          videoUrl: string | null
          videos: string | null
          hashtags: string
        }

        const startOfMonth = new Date(year, month - 1, 1)
        const endOfMonth = new Date(year, month, 0, 23, 59, 59)

        // Get scheduled and published posts for the month
        const allPosts: DashboardPost[] = await db.post.findMany({
          where: {
            userId: user.id,
            status: {
              in: ['SCHEDULED', 'PUBLISHED']
            },
            OR: [
              {
                scheduledAt: {
                  gte: startOfMonth,
                  lte: endOfMonth
                }
              },
              {
                publishedAt: {
                  gte: startOfMonth,
                  lte: endOfMonth
                }
              }
            ]
          },
          select: {
            id: true,
            content: true,
            status: true,
            scheduledAt: true,
            publishedAt: true,
            imageUrl: true,
            images: true,
            videoUrl: true,
            videos: true,
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
          orderBy: [
            {
              publishedAt: 'desc'
            },
            {
              scheduledAt: 'asc'
            }
          ]
        })

        // Group posts by date
        const postsByDate: Record<string, DashboardDayEntry[]> = allPosts.reduce(
          (acc: Record<string, DashboardDayEntry[]>, post: DashboardPost) => {
          // Use publishedAt for published posts, scheduledAt for scheduled posts
          let postDate: Date | null = null
          let dateKey = ''
          
          if (post.status === 'PUBLISHED' && post.publishedAt) {
            postDate = new Date(post.publishedAt)
            dateKey = postDate.toLocaleDateString('en-CA') // en-CA format: YYYY-MM-DD
          } else if (post.scheduledAt) {
            postDate = new Date(post.scheduledAt)
            dateKey = postDate.toLocaleDateString('en-CA') // en-CA format: YYYY-MM-DD
          }
          
          if (!dateKey) return acc
          
          if (!acc[dateKey]) {
            acc[dateKey] = []
          }
          
          // Determine the time to display
          let displayTime = ''
          if (post.status === 'PUBLISHED' && post.publishedAt) {
            displayTime = new Date(post.publishedAt).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })
          } else if (post.scheduledAt) {
            displayTime = new Date(post.scheduledAt).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })
          }
          
          const contentText = post.content ?? ''
          acc[dateKey].push({
            id: post.id,
            content: contentText,
            status: post.status,
            scheduledAt: post.scheduledAt?.toISOString(),
            publishedAt: post.publishedAt?.toISOString(),
            time: displayTime,
            platform: post.platform || post.publications[0]?.socialAccount?.platform || 'UNKNOWN',
            accountName: post.publications[0]?.socialAccount?.accountName || 'Unknown Account',
            imageUrl: post.imageUrl || null,
            images: post.images || null,
            videoUrl: post.videoUrl || null,
            videos: post.videos || null,
            hashtags: post.hashtags || ''
          })
          
          return acc
        }, {} as Record<string, DashboardDayEntry[]>)

        return apiSuccess({ allPosts: postsByDate })
      } catch (error) {
        console.error('Posts fetch error:', error)
        return apiSuccess({ allPosts: {} })
      }
    })
  )(req)
}
