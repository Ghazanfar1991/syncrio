// YouTube Analytics API endpoint
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { db } from '@/lib/db'
import { getValidYouTubeToken, getYouTubeComprehensiveAnalytics } from '@/lib/social/youtube'

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const { searchParams } = new URL(req.url)
        const period = parseInt(searchParams.get('period') || '30')
        const customStartDate = searchParams.get('startDate')
        const customEndDate = searchParams.get('endDate')
        const includeVideos = searchParams.get('includeVideos') === 'true'

        // Determine date range
        let startDate: string
        let endDate: string

        if (customStartDate && customEndDate) {
          // Custom date range
          startDate = customStartDate
          endDate = customEndDate
          console.log(`Fetching YouTube analytics for custom date range: ${customStartDate} to ${customEndDate}`)
        } else {
          // Period-based date range
          const end = new Date()
          const start = new Date(Date.now() - period * 24 * 60 * 60 * 1000)
          startDate = start.toISOString().split('T')[0]
          endDate = end.toISOString().split('T')[0]
          console.log(`Fetching YouTube analytics for period: ${period} days`)
        }

        // Get user's YouTube account
        const socialAccount = await db.socialAccount.findFirst({
          where: {
            userId: user.id,
            platform: 'YOUTUBE',
            isActive: true
          }
        })

        if (!socialAccount) {
          return apiError('No active YouTube account found. Please connect your YouTube account first.', 404)
        }

        console.log(`Fetching YouTube analytics for account: ${socialAccount.accountName}`)

        // Get valid access token
        const accessToken = await getValidYouTubeToken(user.id, socialAccount.accountId)
        if (!accessToken) {
          return apiError('YouTube access token expired or invalid. Please reconnect your YouTube account.', 401)
        }

        // Get comprehensive YouTube analytics
        const analytics = await getYouTubeComprehensiveAnalytics(accessToken, startDate, endDate)

        if (!analytics) {
          return apiError('Failed to fetch YouTube analytics', 500)
        }

        // Calculate summary metrics
        const summary = {
          totalViews: analytics.monthlyAnalytics?.views || 0,
          totalWatchTime: analytics.monthlyAnalytics?.watchTime || 0,
          totalLikes: analytics.monthlyAnalytics?.likes || 0,
          totalDislikes: analytics.monthlyAnalytics?.dislikes || 0,
          totalSubscribers: analytics.channelStats.subscriberCount,
          averageViewDuration: Math.round(analytics.monthlyAnalytics?.avgViewDuration || 0),
          subscriberGrowth: analytics.monthlyAnalytics?.netSubscribers || 0,
          totalVideos: analytics.channelStats.videoCount,
          averageEngagementRate: analytics.monthlyAnalytics?.engagementRate || 0,
          totalImpressions: analytics.monthlyAnalytics?.impressions || 0,
          clickThroughRate: analytics.monthlyAnalytics?.ctr || 0,
          estimatedRevenue: analytics.monthlyAnalytics?.revenue || 0
        }

        // Generate chart data for daily metrics
        const chartData = analytics.dailyTrends.map((day: any) => ({
          date: day.date,
          views: day.views,
          watchTime: day.watchTime,
          likes: day.likes,
          dislikes: day.dislikes,
          subscribers: day.subscribers,
          engagement: day.engagement,
          impressions: day.impressions,
          ctr: day.ctr
        }))

        // Get top performing videos
        const topVideos = analytics.recentVideos
          .sort((a: any, b: any) => b.views - a.views)
          .slice(0, 10)
          .map((video: any) => ({
            id: video.id,
            title: video.title,
            publishedAt: video.publishedAt,
            thumbnail: video.thumbnail,
            metrics: {
              views: video.views,
              likes: video.likes,
              dislikes: video.dislikes,
              comments: video.comments,
              duration: video.duration,
              engagementRate: video.views > 0 ? ((video.likes + video.comments) / video.views) * 100 : 0
            }
          }))

        // Calculate performance insights
        const insights = {
          bestPerformingVideo: topVideos[0] || null,
          averageViewsPerVideo: analytics.recentVideos.length > 0 
            ? Math.round(analytics.recentVideos.reduce((sum: number, video: any) => sum + video.views, 0) / analytics.recentVideos.length)
            : 0,
          totalEngagement: analytics.recentVideos.reduce((sum: number, video: any) => 
            sum + video.likes + video.comments, 0
          ),
          subscriberGrowthRate: analytics.monthlyAnalytics?.netSubscribers && analytics.channelStats.subscriberCount > 0
            ? Math.round((analytics.monthlyAnalytics.netSubscribers / analytics.channelStats.subscriberCount) * 100 * 100) / 100
            : 0,
          averageWatchTime: Math.round(analytics.monthlyAnalytics?.avgViewDuration || 0),
          clickThroughRate: analytics.monthlyAnalytics?.ctr || 0
        }

        // Prepare demographics data
        const demographics = analytics.demographics.map((demo: any) => ({
          ageGroup: demo.ageGroup,
          gender: demo.gender,
          viewerPercentage: demo.viewerPercentage
        }))

        // Prepare traffic sources data
        const trafficSources = analytics.trafficSources.map((source: any) => ({
          source: source.source,
          views: source.views,
          percentage: analytics.monthlyAnalytics?.views ? (source.views / analytics.monthlyAnalytics.views) * 100 : 0
        }))

        // Prepare device types data
        const deviceTypes = analytics.deviceTypes.map((device: any) => ({
          device: device.device,
          views: device.views,
          percentage: analytics.monthlyAnalytics?.views ? (device.views / analytics.monthlyAnalytics.views) * 100 : 0
        }))

        return apiSuccess({
          platform: 'YOUTUBE',
          account: {
            id: socialAccount.accountId,
            name: socialAccount.accountName,
            isActive: socialAccount.isActive,
            channelInfo: {
              id: socialAccount.accountId,
              title: analytics.channelStats.channelName,
              description: analytics.channelStats.channelDescription,
              subscriberCount: analytics.channelStats.subscriberCount.toString(),
              videoCount: analytics.channelStats.videoCount.toString(),
              viewCount: analytics.channelStats.viewCount.toString(),
              thumbnails: null // YouTube doesn't provide channel thumbnails in this API
            }
          },
          summary,
          chartData,
          topVideos,
          insights,
          demographics,
          trafficSources,
          deviceTypes,
          videosCount: analytics.recentVideos.length,
          dateRange: {
            start: startDate,
            end: endDate,
            period
          },
          // Include the raw analytics data for advanced use cases
          rawAnalytics: includeVideos ? analytics : undefined
        })

      } catch (error) {
        console.error('YouTube analytics error:', error)
        return apiError('Failed to fetch YouTube analytics', 500)
      }
    })
  )(req)
}

