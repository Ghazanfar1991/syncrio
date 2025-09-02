import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const viewMode = searchParams.get('view') || 'month'
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())
    const date = searchParams.get('date') // For day view
    const startDate = searchParams.get('startDate') // For week view
    const endDate = searchParams.get('endDate') // For week view

    console.log(`Calendar API called: ${viewMode} view for user ${session.user.id}`)

    let data: { [date: string]: any[] } = {}

    switch (viewMode) {
      case 'month':
        data = await getMonthlyCalendar(year, month, session.user.id)
        break
      case 'week':
        if (startDate && endDate) {
          // Use provided date range from frontend
          const weekStartDate = new Date(startDate)
          const weekEndDate = new Date(endDate)
          weekEndDate.setHours(23, 59, 59, 999) // End of day
          data = await getWeeklyCalendar(weekStartDate, session.user.id, weekEndDate)
        } else {
          // Fallback to default week calculation
          const weekStart = new Date(year, month - 1, 1)
          weekStart.setDate(weekStart.getDate() - weekStart.getDay())
          data = await getWeeklyCalendar(weekStart, session.user.id)
        }
        break
      case 'day':
        if (date) {
          const dayDate = new Date(date)
          const dayPosts = await getDailyCalendar(dayDate, session.user.id)
          data = { [date]: dayPosts }
        }
        break
      default:
        data = await getMonthlyCalendar(year, month, session.user.id)
    }

    console.log(`Returning calendar data with ${Object.keys(data).length} dates and ${Object.values(data).flat().length} total posts`)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Calendar API error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      error
    })
    return NextResponse.json({
      error: 'Failed to fetch calendar data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
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

  console.log(`Daily calendar for: ${date.toDateString()}`)

  return await getPostsForDateRange(startDate, endDate, userId)
}

// Minimal shapes for this handler
type CalendarPost = {
  id: string
  content: string
  status: string
  publishedAt: Date | null
  scheduledAt: Date | null
  imageUrl: string | null
  videoUrl: string | null
  publications: Array<{ socialAccount: { platform: string; accountName: string | null } }>
}

type CalendarEvent = {
  id: string
  title: string
  content: string
  scheduledAt: Date | null
  publishedAt: Date | null
  status: string
  platforms: string[]
  imageUrl: string | null
  videoUrl: string | null
  platform: string
  accountName: string | null
  time: string
}

async function getPostsForDateRange(startDate: Date, endDate: Date, userId: string) {
  console.log(`Fetching posts for date range: ${startDate.toISOString()} to ${endDate.toISOString()}`)
  console.log(`User ID: ${userId}`)

  const posts: CalendarPost[] = await db.post.findMany({
    where: {
      userId,
      OR: [
        // Scheduled posts
        {
          scheduledAt: {
            gte: startDate,
            lte: endDate
          },
          status: 'SCHEDULED'
        },
        // Published posts (show on their published date)
        {
          publishedAt: {
            gte: startDate,
            lte: endDate
          },
          status: 'PUBLISHED'
        }
      ]
    },
    include: {
      publications: {
        include: {
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

  console.log(`Found ${posts.length} posts for date range`)

  return posts.map((post: CalendarPost): CalendarEvent => {
    // Determine the relevant date and time based on post status
    const relevantDate = post.status === 'PUBLISHED' ? post.publishedAt : post.scheduledAt
    const timeLabel = post.status === 'PUBLISHED' ? 'Published' : 'Scheduled'

    return {
      id: post.id,
      title: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
      content: post.content,
      scheduledAt: relevantDate, // This will be used for grouping by date
      publishedAt: post.publishedAt, // Keep original publishedAt for reference
      status: post.status,
      platforms: post.publications.map(pub => pub.socialAccount.platform),
      imageUrl: post.imageUrl || null,
      videoUrl: post.videoUrl || null, // Add video support
      platform: post.publications[0]?.socialAccount.platform || 'Unknown',
      accountName: post.publications[0]?.socialAccount.accountName || null,
      time: relevantDate?.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }) || timeLabel
    }
  })
}

function groupPostsByDate(posts: CalendarEvent[]) {
  const calendarData: Record<string, CalendarEvent[]> = {}

  posts.forEach(post => {
    // The scheduledAt field in the mapped post already contains the relevant date
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
