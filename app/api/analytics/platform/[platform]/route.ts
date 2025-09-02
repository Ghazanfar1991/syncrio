// Platform-specific analytics endpoint
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { db } from '@/lib/db'
import {
  fetchTwitterAnalytics,
  fetchLinkedInAnalytics,
  fetchInstagramAnalytics,
  fetchYouTubeAnalytics
} from '@/lib/analytics/social-analytics'
import { fetchInstagramPosts, getInstagramAccountInfo } from '@/lib/analytics/instagram-posts'
import { fetchTwitterPosts, getTwitterAccountInfo } from '@/lib/analytics/twitter-posts'
import { fetchLinkedInPosts, getLinkedInAccountInfo } from '@/lib/analytics/linkedin-posts'
import { fetchYouTubeVideos, getYouTubeChannelInfo } from '@/lib/analytics/youtube-posts'
import { getValidYouTubeToken, getYouTubeComprehensiveAnalytics } from '@/lib/social/youtube'

export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const { platform } = await params
        const { searchParams } = new URL(req.url)
        const period = parseInt(searchParams.get('period') || '30')
        const customStartDate = searchParams.get('startDate')
        const customEndDate = searchParams.get('endDate')

        // Validate platform
        const validPlatforms = ['TWITTER', 'LINKEDIN', 'INSTAGRAM', 'YOUTUBE']
        if (!validPlatforms.includes(platform.toUpperCase())) {
          return apiError('Invalid platform', 400)
        }

        const platformName = platform.toUpperCase()

        // Determine date range
        let startDate: Date
        let endDate: Date

        if (customStartDate && customEndDate) {
          // Custom date range
          startDate = new Date(customStartDate)
          endDate = new Date(customEndDate)
          // Set end date to end of day
          endDate.setHours(23, 59, 59, 999)
          console.log(`Fetching ${platformName} analytics for custom date range: ${customStartDate} to ${customEndDate}`)
        } else {
          // Period-based date range
          startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000)
          endDate = new Date()
          console.log(`Fetching ${platformName} analytics for period: ${period} days`)
        }

        // Get user's social account for this platform
        const socialAccount = await db.socialAccount.findFirst({
          where: {
            userId: user.id,
            platform: platformName as any,
            isActive: true
          }
        })

        console.log(`Checking ${platformName} account for user ${user.id}:`, socialAccount)

        if (!socialAccount) {
          return apiError(`No active ${platformName} account found. Please connect your ${platformName} account first.`, 404)
        }

        // Fetch real posts directly from platform APIs (no database dependency)
        let realPosts: any[] = []

        console.log(`Fetching real ${platformName} posts for account:`, socialAccount.accountName)

        if (platformName === 'INSTAGRAM') {
          console.log('Fetching real Instagram posts...')
          try {
            const instagramPosts = await fetchInstagramPosts(user.id, socialAccount.accountId)
            realPosts = instagramPosts.map(post => ({
              id: post.id,
              content: post.caption || 'No caption',
              publishedAt: new Date(post.timestamp),
              platformPostId: post.id,
              mediaType: post.media_type,
              mediaUrl: post.media_url,
              permalink: post.permalink,
              realLikes: post.like_count || 0,
              realComments: post.comments_count || 0
            }))
            console.log(`Found ${realPosts.length} real Instagram posts`)
          } catch (error) {
            console.error('Error fetching Instagram posts:', error)
            realPosts = []
          }
        } else if (platformName === 'TWITTER') {
          console.log('Fetching real Twitter posts...')
          try {
            const twitterPosts = await fetchTwitterPosts(user.id, socialAccount.accountId)
            realPosts = twitterPosts.map(post => ({
              id: post.id,
              content: post.text || 'No content',
              publishedAt: new Date(post.created_at),
              platformPostId: post.id,
              realLikes: post.public_metrics?.like_count || 0,
              realComments: post.public_metrics?.reply_count || 0,
              realShares: post.public_metrics?.retweet_count || 0,
              realImpressions: post.public_metrics?.impression_count || 0
            }))
            console.log(`Found ${realPosts.length} real Twitter posts`)
          } catch (error) {
            console.error('Error fetching Twitter posts:', error)
            realPosts = []
          }
        } else if (platformName === 'LINKEDIN') {
          console.log('Fetching real LinkedIn posts...')
          try {
            const linkedinPosts = await fetchLinkedInPosts(user.id, socialAccount.accountId)
            realPosts = linkedinPosts.map(post => ({
              id: post.id,
              content: post.commentary || post.text || 'No content',
              publishedAt: new Date(post.createdAt || post.created_at || new Date()),
              platformPostId: post.id,
              realLikes: post.socialCounts?.numLikes || 0,
              realComments: post.socialCounts?.numComments || 0,
              realShares: post.socialCounts?.numShares || 0
            }))
            console.log(`Found ${realPosts.length} real LinkedIn posts`)
          } catch (error) {
            console.error('Error fetching LinkedIn posts:', error)
            realPosts = []
          }
        } else if (platformName === 'YOUTUBE') {
          console.log('Fetching real YouTube videos...')
          try {
            // Use the new comprehensive YouTube analytics
            const accessToken = await getValidYouTubeToken(user.id, socialAccount.accountId)
            if (accessToken) {
              const analytics = await getYouTubeComprehensiveAnalytics(accessToken)
              if (analytics) {
                // Transform YouTube analytics data to match expected format
                realPosts = analytics.recentVideos.map((video: any) => ({
                  id: video.id,
                  content: video.title,
                  publishedAt: new Date(video.publishedAt),
                  platformPostId: video.id,
                  realLikes: video.likes,
                  realComments: video.comments,
                  realViews: video.views,
                  realDislikes: video.dislikes,
                  realWatchTime: Math.floor(video.views * 3), // Estimate 3 min average watch time
                  realAverageViewDuration: 180, // 3 minutes in seconds
                  realEngagementRate: video.views > 0 ? ((video.likes + video.comments) / video.views) * 100 : 0
                }))
              }
            }
            
            if (realPosts.length === 0) {
              // Fallback to basic video fetch if comprehensive analytics fails
              const youtubeVideos = await fetchYouTubeVideos(user.id, socialAccount.accountId)
              realPosts = youtubeVideos.map((video: any) => ({
                id: video.id,
                content: video.snippet?.title || 'No title',
                publishedAt: video.snippet?.publishedAt ? new Date(video.snippet.publishedAt) : new Date(),
                platformPostId: video.id,
                realLikes: video.analytics?.likes || (video.statistics?.likeCount ? parseInt(video.statistics.likeCount) : 0),
                realComments: video.analytics?.comments || (video.statistics?.commentCount ? parseInt(video.statistics.commentCount) : 0),
                realViews: video.analytics?.views || (video.statistics?.viewCount ? parseInt(video.statistics.viewCount) : 0),
                realDislikes: video.analytics?.dislikes || 0,
                realWatchTime: video.analytics?.watchTime || 0,
                realAverageViewDuration: video.analytics?.averageViewDuration || 0,
                realEngagementRate: video.analytics?.engagementRate || 0
              }))
            }
          } catch (error) {
            console.error('Error fetching YouTube analytics:', error)
            // Continue with empty posts if YouTube analytics fail
            realPosts = []
          }
        }

        // Filter posts by date range
        const filteredPosts = realPosts.filter(post => {
          const postDate = new Date(post.publishedAt)
          return postDate >= startDate && postDate <= endDate
        })

        console.log(`Found ${realPosts.length} total posts, ${filteredPosts.length} posts within date range`)

        if (filteredPosts.length === 0) {
          console.log(`No posts found for ${platformName} within the specified date range. This could be because:`)
          console.log(`1. No posts exist on the platform within this date range`)
          console.log(`2. API permissions are insufficient`)
          console.log(`3. Access token has expired`)
          console.log(`4. Platform API is not responding`)
        }

        // Use filtered posts for analytics
        realPosts = filteredPosts

        // Generate analytics data using real engagement metrics
        const postsWithAnalytics = await Promise.all(
          realPosts.map(async (post) => {
            let analytics

            if (platformName === 'INSTAGRAM' && post.platformPostId) {
              // Try to fetch real Instagram analytics
              const realAnalytics = await fetchInstagramAnalytics(user.id, socialAccount.accountId, post.platformPostId)

              if (realAnalytics) {
                analytics = [{
                  impressions: realAnalytics.impressions,
                  likes: realAnalytics.likes,
                  comments: realAnalytics.comments,
                  shares: realAnalytics.shares,
                  clicks: realAnalytics.clicks || 0,
                  saves: realAnalytics.saves || 0,
                  reach: realAnalytics.reach || realAnalytics.impressions,
                  engagementRate: realAnalytics.engagementRate
                }]
              } else {
                // Use real engagement data from post
                const likes = post.realLikes || 0
                const comments = post.realComments || 0
                const estimatedImpressions = Math.max((likes + comments) * 10, 100)

                analytics = [{
                  impressions: estimatedImpressions,
                  likes,
                  comments,
                  shares: 0, // Instagram doesn't provide share count
                  clicks: Math.floor(likes * 0.1), // Estimate clicks based on likes
                  saves: Math.floor(likes * 0.05), // Estimate saves based on likes
                  reach: Math.floor(estimatedImpressions * 0.8),
                  engagementRate: estimatedImpressions > 0 ? ((likes + comments) / estimatedImpressions) * 100 : 0
                }]
              }
            } else if (platformName === 'TWITTER') {
              // Use real Twitter engagement data
              const likes = post.realLikes || 0
              const comments = post.realComments || 0
              const shares = post.realShares || 0
              const impressions = post.realImpressions || Math.max((likes + comments + shares) * 20, 100)

              analytics = [{
                impressions,
                likes,
                comments,
                shares,
                clicks: Math.floor(impressions * 0.02), // Estimate 2% click rate
                saves: 0, // Twitter doesn't have saves
                reach: Math.floor(impressions * 0.7),
                engagementRate: impressions > 0 ? ((likes + comments + shares) / impressions) * 100 : 0
              }]
            } else if (platformName === 'LINKEDIN') {
              // Use real LinkedIn engagement data
              const likes = post.realLikes || 0
              const comments = post.realComments || 0
              const shares = post.realShares || 0
              const estimatedImpressions = Math.max((likes + comments + shares) * 15, 100)

              analytics = [{
                impressions: estimatedImpressions,
                likes,
                comments,
                shares,
                clicks: Math.floor(estimatedImpressions * 0.03), // Estimate 3% click rate for LinkedIn
                saves: 0, // LinkedIn doesn't have saves
                reach: Math.floor(estimatedImpressions * 0.6),
                engagementRate: estimatedImpressions > 0 ? ((likes + comments + shares) / estimatedImpressions) * 100 : 0
              }]
            } else if (platformName === 'YOUTUBE') {
              // Use real YouTube engagement data with enhanced metrics
              const likes = post.realLikes || 0
              const comments = post.realComments || 0
              const views = post.realViews || 0
              const dislikes = post.realDislikes || 0
              const watchTime = post.realWatchTime || 0
              const averageViewDuration = post.realAverageViewDuration || 0
              const engagementRate = post.realEngagementRate || 0

              analytics = [{
                impressions: views, // For YouTube, views are like impressions
                likes,
                dislikes,
                comments,
                shares: 0, // YouTube doesn't provide share count via API
                clicks: views, // Views are essentially clicks for YouTube
                saves: 0, // YouTube doesn't have saves
                reach: views,
                watchTime,
                averageViewDuration,
                engagementRate: engagementRate > 0 ? engagementRate : (views > 0 ? ((likes + comments) / views) * 100 : 0)
              }]
            } else {
              // Fallback for unknown platforms
              analytics = [{
                impressions: 0,
                likes: 0,
                comments: 0,
                shares: 0,
                clicks: 0,
                saves: 0,
                reach: 0,
                engagementRate: 0
              }]
            }

            return {
              ...post,
              analytics
            }
          })
        )

        // Calculate platform summary
        const totalPosts = postsWithAnalytics.length
        const totalImpressions = postsWithAnalytics.reduce((sum, post) =>
          sum + (post.analytics[0]?.impressions || 0), 0
        )
        const totalLikes = postsWithAnalytics.reduce((sum, post) =>
          sum + (post.analytics[0]?.likes || 0), 0
        )
        const totalComments = postsWithAnalytics.reduce((sum, post) =>
          sum + (post.analytics[0]?.comments || 0), 0
        )
        const totalShares = postsWithAnalytics.reduce((sum, post) =>
          sum + (post.analytics[0]?.shares || 0), 0
        )
        const totalEngagement = totalLikes + totalComments + totalShares
        const avgEngagementRate = totalImpressions > 0 ?
          (totalEngagement / totalImpressions) * 100 : 0

        // Generate daily analytics based on real posts
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const chartData = Array.from({ length: daysDiff }, (_, i) => {
          const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
          const dateStr = date.toISOString().split('T')[0]

          // Find posts published on this date
          const postsOnDate = postsWithAnalytics.filter(post => {
            const postDate = new Date(post.publishedAt).toISOString().split('T')[0]
            return postDate === dateStr
          })

          // Calculate metrics for this date
          const dayImpressions = postsOnDate.reduce((sum, post) =>
            sum + (post.analytics[0]?.impressions || 0), 0
          )
          const dayEngagement = postsOnDate.reduce((sum, post) =>
            sum + (post.analytics[0]?.likes || 0) + (post.analytics[0]?.comments || 0) + (post.analytics[0]?.shares || 0), 0
          )

          return {
            date: dateStr,
            impressions: dayImpressions,
            engagement: dayEngagement,
            posts: postsOnDate.length
          }
        })

        // Get top performing posts
        const topPosts = postsWithAnalytics
          .sort((a, b) => (b.analytics[0]?.engagementRate || 0) - (a.analytics[0]?.engagementRate || 0))
          .slice(0, 5)
          .map(post => ({
            id: post.id,
            content: post.content.substring(0, 100) + '...',
            publishedAt: post.publishedAt,
            externalId: post.platformPostId,
            metrics: post.analytics[0] || {
              impressions: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              engagementRate: 0
            }
          }))

        return apiSuccess({
          platform: platformName,
          account: {
            id: socialAccount.accountId,
            username: socialAccount.username,
            isActive: socialAccount.isActive
          },
          summary: {
            totalPosts,
            totalImpressions,
            totalLikes,
            totalComments,
            totalShares,
            totalEngagement,
            avgEngagementRate: Math.round(avgEngagementRate * 100) / 100
          },
          chartData,
          topPosts,
          allPosts: postsWithAnalytics.map(post => ({
            id: post.id,
            content: post.content,
            publishedAt: post.publishedAt,
            externalId: post.platformPostId,
            metrics: post.analytics[0] || {
              impressions: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              engagementRate: 0
            }
          }))
        })

      } catch (error) {
        const { platform } = await params
        console.error(`${platform} analytics error:`, error)
        return apiError(`Failed to fetch ${platform} analytics`, 500)
      }
    })
  )(req)
}
