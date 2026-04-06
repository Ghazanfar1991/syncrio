// Posts API endpoint for dashboard calendar (scheduled and published) using Supabase
import { NextRequest, NextResponse } from 'next/server'
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
          return apiSuccess({ allPosts: {} })
        }

        const startOfMonth = new Date(year, month - 1, 1).toISOString()
        const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString()

        // Get scheduled and published posts for the month from Supabase
        const { data: allPosts, error } = await (db as any)
          .from('posts')
          .select(`
            id,
            content,
            status,
            scheduled_at,
            published_at,
            image_url,
            images,
            video_url,
            videos,
            hashtags,
            publications:post_publications(
              social_account:social_accounts(
                platform,
                account_name
              )
            )
          `)
          .eq('user_id', user.id)
          .in('status', ['SCHEDULED', 'PUBLISHED'])
          .or(`and(scheduled_at.gte.${startOfMonth},scheduled_at.lte.${endOfMonth}),and(published_at.gte.${startOfMonth},published_at.lte.${endOfMonth})`)
          .order('published_at', { ascending: false })
          .order('scheduled_at', { ascending: true })

        if (error) throw error

        // Group posts by date
        const postsByDate: Record<string, any[]> = (allPosts || []).reduce(
          (acc: Record<string, any[]>, post: any) => {
          // Use published_at for published posts, scheduled_at for scheduled posts
          let postDateStr = post.status === 'PUBLISHED' ? post.published_at : post.scheduled_at
          
          if (!postDateStr) return acc
          
          const postDate = new Date(postDateStr)
          const dateKey = postDate.toLocaleDateString('en-CA') // YYYY-MM-DD
          
          if (!acc[dateKey]) {
            acc[dateKey] = []
          }
          
          // Determine the time to display
          const displayTime = postDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })
          
          const firstPub = post.publications?.[0]?.social_account
          
          acc[dateKey].push({
            id: post.id,
            content: post.content || '',
            status: post.status,
            scheduledAt: post.scheduled_at,
            publishedAt: post.published_at,
            time: displayTime,
            platform: firstPub?.platform || 'UNKNOWN',
            accountName: firstPub?.account_name || 'Unknown Account',
            imageUrl: post.image_url || null,
            images: post.images || null,
            videoUrl: post.video_url || null,
            videos: post.videos || null,
            hashtags: post.hashtags || ''
          })
          
          return acc
        }, {} as Record<string, any[]>)

        return apiSuccess({ allPosts: postsByDate })
      } catch (error) {
        console.error('Dashboard posts fetch error:', error)
        return apiSuccess({ allPosts: {} })
      }
    })
  )(req)
}
