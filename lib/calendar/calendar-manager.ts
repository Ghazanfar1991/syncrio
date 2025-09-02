// Calendar Management System for Post Scheduling
import { db } from '@/lib/db'

export interface CalendarPost {
  id: string
  title: string
  content: string
  scheduledAt: Date
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED'
  platforms: string[]
  imageUrl?: string
  publications: Array<{
    id: string
    platform: string
    status: string
    socialAccount: {
      accountName: string
    }
  }>
}

export interface PostPreview {
  id: string
  content: string
  platforms: string[]
  imageUrl?: string
  scheduledAt: Date
  status: string
  publications: Array<{
    platform: string
    status: string
    accountName: string
  }>
}

export interface CalendarViewOptions {
  view: 'month' | 'week' | 'day'
  startDate: Date
  endDate: Date
  platforms?: string[]
  status?: string[]
}

export class CalendarManager {
  /**
   * Get posts for a specific date range
   */
  static async getPostsForDateRange(
    startDate: Date,
    endDate: Date,
    userId: string,
    options?: Partial<CalendarViewOptions>
  ): Promise<CalendarPost[]> {
    try {
      const whereClause: any = {
        userId,
        scheduledAt: {
          gte: startDate,
          lte: endDate
        }
      }

      // Add status filter if specified
      if (options?.status && options.status.length > 0) {
        whereClause.status = { in: options.status }
      }

      const posts = await db.post.findMany({
        where: whereClause,
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

      // Transform to CalendarPost format
      return posts.map((post: any) => ({
        id: post.id,
        title: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
        content: post.content,
        scheduledAt: post.scheduledAt!,
        status: post.status,
        platforms: post.publications.map((pub: any) => pub.socialAccount.platform),
        imageUrl: post.imageUrl || undefined,
        publications: post.publications.map((pub: any) => ({
          id: pub.id,
          platform: pub.socialAccount.platform,
          status: pub.status,
          socialAccount: {
            accountName: pub.socialAccount.accountName
          }
        }))
      }))
    } catch (error) {
      console.error('Error fetching calendar posts:', error)
      throw new Error('Failed to fetch calendar posts')
    }
  }

  /**
   * Get post preview for calendar display
   */
  static async getPostPreview(postId: string): Promise<PostPreview | null> {
    try {
      const post = await db.post.findUnique({
        where: { id: postId },
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
        }
      })

      if (!post) return null

      return {
        id: post.id,
        content: post.content ?? '',
        platforms: post.publications.map((pub: any) => pub.socialAccount.platform),
        imageUrl: post.imageUrl || undefined,  
        scheduledAt: post.scheduledAt!,        
        status: post.status,
        publications: post.publications.map((pub: any) => ({
          platform: pub.socialAccount.platform,
          status: pub.status,
          accountName: pub.socialAccount.accountName
        }))
      }
    } catch (error) {
      console.error('Error fetching post preview:', error)
      throw new Error('Failed to fetch post preview')
    }
  }

  /**
   * Update post schedule
   */
  static async updatePostSchedule(
    postId: string,
    newDate: Date,
    userId: string
  ): Promise<void> {
    try {
      // Verify post ownership
      const post = await db.post.findFirst({
        where: {
          id: postId,
          userId
        }
      })

      if (!post) {
        throw new Error('Post not found or access denied')
      }

      if (post.status === 'PUBLISHED') {
        throw new Error('Cannot reschedule published posts')
      }

      // Update post schedule
      await db.post.update({
        where: { id: postId },
        data: {
          scheduledAt: newDate,
          status: 'SCHEDULED'
        }
      })

      // Update publication statuses
      await db.postPublication.updateMany({
        where: { postId },
        data: { status: 'PENDING' }
      })

    } catch (error) {
      console.error('Error updating post schedule:', error)
      throw new Error('Failed to update post schedule')
    }
  }

  /**
   * Get monthly calendar data
   */
  static async getMonthlyCalendar(
    year: number,
    month: number,
    userId: string
  ): Promise<{
    [date: string]: CalendarPost[]
  }> {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const posts = await this.getPostsForDateRange(startDate, endDate, userId)

    // Group posts by date
    const calendarData: { [date: string]: CalendarPost[] } = {}
    
    posts.forEach(post => {
      const dateKey = post.scheduledAt.toISOString().split('T')[0]
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = []
      }
      calendarData[dateKey].push(post)
    })

    return calendarData
  }

  /**
   * Get weekly calendar data
   */
  static async getWeeklyCalendar(
    startDate: Date,
    userId: string
  ): Promise<{
    [date: string]: CalendarPost[]
  }> {
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)
    endDate.setHours(23, 59, 59)

    const posts = await this.getPostsForDateRange(startDate, endDate, userId)

    // Group posts by date
    const calendarData: { [date: string]: CalendarPost[] } = {}
    
    posts.forEach(post => {
      const dateKey = post.scheduledAt.toISOString().split('T')[0]
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = []
      }
      calendarData[dateKey].push(post)
    })

    return calendarData
  }

  /**
   * Get daily calendar data
   */
  static async getDailyCalendar(
    date: Date,
    userId: string
  ): Promise<CalendarPost[]> {
    const startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = new Date(date)
    endDate.setHours(23, 59, 59, 999)

    return await this.getPostsForDateRange(startDate, endDate, userId)
  }

  /**
   * Get calendar statistics
   */
  static async getCalendarStats(
    startDate: Date,
    endDate: Date,
    userId: string
  ): Promise<{
    totalPosts: number
    scheduledPosts: number
    publishedPosts: number
    failedPosts: number
    postsByPlatform: Record<string, number>
    postsByStatus: Record<string, number>
  }> {
    try {
      const posts = await db.post.findMany({
        where: {
          userId,
          scheduledAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          publications: {
            include: {
              socialAccount: {
                select: {
                  platform: true
                }
              }
            }
          }
        }
      })

      const stats = {
        totalPosts: posts.length,
        scheduledPosts: posts.filter((p: any) => p.status === 'SCHEDULED').length,
        publishedPosts: posts.filter((p: any) => p.status === 'PUBLISHED').length,
        failedPosts: posts.filter((p: any) => p.status === 'FAILED').length,
        postsByPlatform: {} as Record<string, number>,
        postsByStatus: {} as Record<string, number>
      }

      // Count posts by platform
      posts.forEach((post: any) => {
        post.publications.forEach((pub: any) => {
          const platform = pub.socialAccount.platform
          stats.postsByPlatform[platform] = (stats.postsByPlatform[platform] || 0) + 1
        })
      })

      // Count posts by status
      posts.forEach((post: any) => {
        stats.postsByStatus[post.status] = (stats.postsByStatus[post.status] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('Error fetching calendar stats:', error)
      throw new Error('Failed to fetch calendar statistics')
    }
  }

  /**
   * Get upcoming posts for the next few days
   */
  static async getUpcomingPosts(
    userId: string,
    days: number = 7
  ): Promise<CalendarPost[]> {
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(startDate.getDate() + days)

    return await this.getPostsForDateRange(startDate, endDate, userId, {
      status: ['SCHEDULED']
    })
  }

  /**
   * Get overdue posts (scheduled but not published)
   */
  static async getOverduePosts(userId: string): Promise<CalendarPost[]> {
    try {
      const posts = await db.post.findMany({
        where: {
          userId,
          status: 'SCHEDULED',
          scheduledAt: {
            lt: new Date()
          }
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

      return posts.map((post: any) => ({
        id: post.id,
        title: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
        content: post.content,
        scheduledAt: post.scheduledAt!,
        status: post.status,
        platforms: post.publications.map((pub: any) => pub.socialAccount.platform),
        imageUrl: post.imageUrl || undefined,
        publications: post.publications.map((pub: any) => ({
          id: pub.id,
          platform: pub.socialAccount.platform,
          status: pub.status,
          socialAccount: {
            accountName: pub.socialAccount.accountName
          }
        }))
      }))
    } catch (error) {
      console.error('Error fetching overdue posts:', error)
      throw new Error('Failed to fetch overdue posts')
    }
  }
}
