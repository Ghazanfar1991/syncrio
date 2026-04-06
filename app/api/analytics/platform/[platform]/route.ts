// Platform-specific analytics endpoint using Supabase
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

        const validPlatforms = ['TWITTER', 'LINKEDIN', 'INSTAGRAM', 'YOUTUBE']
        if (!validPlatforms.includes(platform.toUpperCase())) {
          return apiError('Invalid platform', 400)
        }

        const platformName = platform.toUpperCase()

        // Determine date range
        let startDate: Date
        let endDate: Date

        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate)
          endDate = new Date(customEndDate)
          endDate.setHours(23, 59, 59, 999)
        } else {
          startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000)
          endDate = new Date()
        }

        // Get user's social account for this platform from Supabase
        const { data: socialAccount, error: accError } = await (db as any)
          .from('social_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('platform', platformName)
          .eq('is_active', true)
          .maybeSingle()

        if (accError) throw accError

        if (!socialAccount) {
          return apiError(`No active ${platformName} account found. Please connect your ${platformName} account first.`, 404)
        }

        // Fetch real posts directly from platform APIs
        let realPosts: any[] = []

        if (platformName === 'INSTAGRAM') {
          try {
            const instagramPosts = await fetchInstagramPosts(user.id, socialAccount.account_id)
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
          } catch (error) {
            console.error('Error fetching Instagram posts:', error)
          }
        } else if (platformName === 'TWITTER') {
          try {
            const twitterPosts = await fetchTwitterPosts(user.id, socialAccount.account_id)
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
          } catch (error) {
            console.error('Error fetching Twitter posts:', error)
          }
        } else if (platformName === 'LINKEDIN') {
          try {
            const linkedinPosts = await fetchLinkedInPosts(user.id, socialAccount.account_id)
            realPosts = linkedinPosts.map(post => ({
              id: post.id,
              content: post.commentary || post.text || 'No content',
              publishedAt: new Date(post.createdAt || post.created_at || new Date()),
              platformPostId: post.id,
              realLikes: post.socialCounts?.numLikes || 0,
              realComments: post.socialCounts?.numComments || 0,
              realShares: post.socialCounts?.numShares || 0
            }))
          } catch (error) {
            console.error('Error fetching LinkedIn posts:', error)
          }
        } else if (platformName === 'YOUTUBE') {
          try {
            const accessToken = await getValidYouTubeToken(user.id, socialAccount.account_id)
            if (accessToken) {
              const analytics = await getYouTubeComprehensiveAnalytics(accessToken)
              if (analytics) {
                realPosts = analytics.recentVideos.map((video: any) => ({
                  id: video.id,
                  content: video.title,
                  publishedAt: new Date(video.publishedAt),
                  platformPostId: video.id,
                  realLikes: video.likes,
                  realComments: video.comments,
                  realViews: video.views,
                  realDislikes: video.dislikes,
                  realEngagementRate: video.views > 0 ? ((video.likes + video.comments) / video.views) * 100 : 0
                }))
              }
            }
          } catch (error) {
            console.error('Error fetching YouTube analytics:', error)
          }
        }

        // Filter posts by date range
        const filteredPosts = realPosts.filter(post => {
          const postDate = new Date(post.publishedAt)
          return postDate >= startDate && postDate <= endDate
        })

        realPosts = filteredPosts

        // Process analytics for each post
        const postsWithAnalytics = await Promise.all(
          realPosts.map(async (post) => {
            let analytics = [{
              impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0, saves: 0, reach: 0, engagementRate: 0
            }]

            if (platformName === 'INSTAGRAM' && post.platformPostId) {
              const realAnalytics = await fetchInstagramAnalytics(user.id, socialAccount.account_id, post.platformPostId)
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
                const likes = post.realLikes || 0
                const comments = post.realComments || 0
                const estImpressions = Math.max((likes + comments) * 10, 100)
                analytics = [{
                  impressions: estImpressions,
                  likes, comments, shares: 0,
                  clicks: Math.floor(likes * 0.1),
                  saves: Math.floor(likes * 0.05),
                  reach: Math.floor(estImpressions * 0.8),
                  engagementRate: estImpressions > 0 ? ((likes + comments) / estImpressions) * 100 : 0
                }]
              }
            } else if (platformName === 'TWITTER') {
              const likes = post.realLikes || 0
              const comments = post.realComments || 0
              const shares = post.realShares || 0
              const impressions = post.realImpressions || Math.max((likes + comments + shares) * 20, 100)
              analytics = [{
                impressions, likes, comments, shares,
                clicks: Math.floor(impressions * 0.02),
                saves: 0, reach: Math.floor(impressions * 0.7),
                engagementRate: impressions > 0 ? ((likes + comments + shares) / impressions) * 100 : 0
              }]
            } else if (platformName === 'LINKEDIN') {
              const likes = post.realLikes || 0
              const comments = post.realComments || 0
              const shares = post.realShares || 0
              const estImpressions = Math.max((likes + comments + shares) * 15, 100)
              analytics = [{
                impressions: estImpressions, likes, comments, shares,
                clicks: Math.floor(estImpressions * 0.03),
                saves: 0, reach: Math.floor(estImpressions * 0.6),
                engagementRate: estImpressions > 0 ? ((likes + comments + shares) / estImpressions) * 100 : 0
              }]
            } else if (platformName === 'YOUTUBE') {
              const views = post.realViews || 0
              const likes = post.realLikes || 0
              const comments = post.realComments || 0
              analytics = [{
                impressions: views,
                likes, comments, shares: 0, clicks: views, saves: 0, reach: views,
                engagementRate: post.realEngagementRate || (views > 0 ? ((likes + comments) / views) * 100 : 0)
              }]
            }

            return { ...post, analytics }
          })
        )

        // Summary calculations
        const totalPosts = postsWithAnalytics.length
        const totalImpressions = postsWithAnalytics.reduce((sum, p) => sum + (p.analytics[0]?.impressions || 0), 0)
        const totalLikes = postsWithAnalytics.reduce((sum, p) => sum + (p.analytics[0]?.likes || 0), 0)
        const totalComments = postsWithAnalytics.reduce((sum, p) => sum + (p.analytics[0]?.comments || 0), 0)
        const totalShares = postsWithAnalytics.reduce((sum, p) => sum + (p.analytics[0]?.shares || 0), 0)
        const totalEngagement = totalLikes + totalComments + totalShares
        const avgEngagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0

        // Chart data grouping
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const chartData = Array.from({ length: daysDiff }, (_, i) => {
          const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
          const dateStr = date.toISOString().split('T')[0]
          const dayPosts = postsWithAnalytics.filter(p => new Date(p.publishedAt).toISOString().split('T')[0] === dateStr)
          return {
            date: dateStr,
            posts: dayPosts.length,
            impressions: dayPosts.reduce((sum, p) => sum + (p.analytics[0]?.impressions || 0), 0),
            engagement: dayPosts.reduce((sum, p) => sum + (p.analytics[0]?.likes || 0) + (p.analytics[0]?.comments || 0) + (p.analytics[0]?.shares || 0), 0)
          }
        })

        return apiSuccess({
          platform: platformName,
          account: {
            id: socialAccount.account_id,
            username: socialAccount.account_name,
            isActive: socialAccount.is_active
          },
          summary: {
            totalPosts, totalImpressions, totalLikes, totalComments, totalShares, totalEngagement,
            avgEngagementRate: Math.round(avgEngagementRate * 100) / 100
          },
          chartData,
          allPosts: postsWithAnalytics.map(post => ({
            id: post.id,
            content: post.content,
            publishedAt: post.publishedAt,
            externalId: post.platformPostId,
            metrics: post.analytics[0]
          }))
        })
      } catch (error) {
        console.error('Platform analytics error:', error)
        return apiError('Failed to fetch platform analytics', 500)
      }
    })
  )(req)
}
