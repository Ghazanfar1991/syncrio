import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { db } from '@/lib/db'
import { apiSuccess, apiError } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const { searchParams } = new URL(req.url)
      const viewMode = searchParams.get('view') || 'month'
      const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
      const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())
      const date = searchParams.get('date') // For day view
      const startDateParam = searchParams.get('startDate') // For week view
      const endDateParam = searchParams.get('endDate') // For week view

      console.log(`Calendar API called: ${viewMode} view for user ${user.id}`)

      let data: { [date: string]: any[] } = {}

      switch (viewMode) {
        case 'month':
          data = await getMonthlyCalendar(year, month, user.id)
          break
        case 'week':
          if (startDateParam && endDateParam) {
            const weekStartDate = new Date(startDateParam)
            const weekEndDate = new Date(endDateParam)
            weekEndDate.setHours(23, 59, 59, 999)
            data = await getWeeklyCalendar(weekStartDate, user.id, weekEndDate)
          } else {
            const weekStart = new Date(year, month - 1, 1)
            weekStart.setDate(weekStart.getDate() - weekStart.getDay())
            data = await getWeeklyCalendar(weekStart, user.id)
          }
          break
        case 'day':
          if (date) {
            const dayDate = new Date(date)
            const dayPosts = await getDailyCalendar(dayDate, user.id)
            data = { [date]: dayPosts }
          }
          break
        default:
          data = await getMonthlyCalendar(year, month, user.id)
      }

      return apiSuccess(data)
    })
  )(req)
}

async function getMonthlyCalendar(year: number, month: number, userId: string) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  const posts = await getPostsForDateRange(startDate, endDate, userId)
  return groupPostsByDate(posts)
}

async function getWeeklyCalendar(startDate: Date, userId: string, providedEndDate?: Date) {
  const endDate = providedEndDate || (() => {
    const calculatedEndDate = new Date(startDate)
    calculatedEndDate.setDate(startDate.getDate() + 6)
    calculatedEndDate.setHours(23, 59, 59, 999)
    return calculatedEndDate
  })()

  const posts = await getPostsForDateRange(startDate, endDate, userId)
  return groupPostsByDate(posts)
}

async function getDailyCalendar(date: Date, userId: string) {
  const startDate = new Date(date)
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date(date)
  endDate.setHours(23, 59, 59, 999)

  return await getPostsForDateRange(startDate, endDate, userId)
}

async function getPostsForDateRange(startDate: Date, endDate: Date, userId: string) {
  const start = startDate.toISOString()
  const end = endDate.toISOString()

  const { data: posts, error } = await (db as any)
    .from('posts')
    .select(`
      *,
      publications:post_publications(
        *,
        social_account:social_accounts(platform, account_name)
      )
    `)
    .eq('user_id', userId)
    .or(`and(scheduled_at.gte.${start},scheduled_at.lte.${end},status.eq.SCHEDULED),and(published_at.gte.${start},published_at.lte.${end},status.eq.PUBLISHED)`)
    .order('scheduled_at', { ascending: true })

  if (error) {
    console.error('Error fetching calendar posts:', error)
    throw error
  }

  return (posts || []).map((post: any) => {
    const relevantDateStr = post.status === 'PUBLISHED' ? post.published_at : post.scheduled_at
    const relevantDate = relevantDateStr ? new Date(relevantDateStr) : null
    const timeLabel = post.status === 'PUBLISHED' ? 'Published' : 'Scheduled'
    const contentText = post.content ?? ''

    return {
      id: post.id,
      title: contentText.substring(0, 50) + (contentText.length > 50 ? '...' : ''),
      content: contentText,
      scheduledAt: relevantDate,
      publishedAt: post.published_at ? new Date(post.published_at) : null,
      status: post.status,
      platforms: post.publications.map((pub: any) => pub.social_account?.platform).filter(Boolean),
      imageUrl: post.image_url || null,
      videoUrl: post.video_url || null,
      platform: post.publications[0]?.social_account?.platform || 'Unknown',
      accountName: post.publications[0]?.social_account?.account_name || null,
      time: relevantDate?.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }) || timeLabel
    }
  })
}

function groupPostsByDate(posts: any[]) {
  const calendarData: Record<string, any[]> = {}

  posts.forEach(post => {
    if (post.scheduledAt) {
      const dateKey = post.scheduledAt.toISOString().split('T')[0]
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = []
      }
      calendarData[dateKey].push(post)
    }
  })

  return calendarData
}
