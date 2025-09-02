// Analytics overview endpoint
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
        const period = searchParams.get('period') || '30' // days
        const periodDays = parseInt(period) // Convert to number for calculations
        const customStartDate = searchParams.get('startDate')
        const customEndDate = searchParams.get('endDate')

        // Determine date range
        let startDate: Date
        let endDate: Date

        if (customStartDate && customEndDate) {
          // Custom date range
          startDate = new Date(customStartDate)
          endDate = new Date(customEndDate)
          // Set end date to end of day
          endDate.setHours(23, 59, 59, 999)
          console.log(`Using custom date range: ${customStartDate} to ${customEndDate}`)
        } else {
          // Period-based date range
          startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
          endDate = new Date()
          console.log(`Using period-based range: ${periodDays} days`)
        }

        // Get user's connected social accounts
        const connectedAccounts = await db.socialAccount.findMany({
          where: {
            userId: user.id,
            isActive: true
          },
          select: {
            platform: true,
            accountName: true,
            accountId: true
          }
        })

        // Get platform filter from query params
        const platformFilter = searchParams.get('platform')
        const accountIdFilter = searchParams.get('accountId')
        
        console.log('🔍 Platform filter:', platformFilter, 'Account filter:', accountIdFilter)
        
        // Fetch YouTube analytics ONLY if YouTube platform is selected or if no platform filter
        let youtubeAnalytics: any = null
        let youtubeTopPosts: Array<{
          id: string
          content: string
          publishedAt: Date | null
          platforms: any[]
          metrics: any
          thumbnail?: string
          duration?: string
          description?: string
        }> = []
        let youtubeDailyAnalytics: Array<{
          date: string
          posts: number
          impressions: number
          engagement: number
        }> = []
        let youtubePlatformPerformance: Array<{
          platform: any
          posts: number
          username: string
          avgEngagement: string
          totalReach: number
          isConnected: boolean
        }> = []
        
        const youtubeAccount = connectedAccounts.find(acc => acc.platform === 'YOUTUBE')
        
        // Only fetch YouTube data if:
        // 1. No platform filter (show all platforms), OR
        // 2. YouTube platform is specifically selected
        const shouldFetchYouTube = !platformFilter || platformFilter === 'YOUTUBE'
        
        if (youtubeAccount && shouldFetchYouTube) {
          try {
            console.log('Fetching YouTube analytics for overview...')
            const accessToken = await getValidYouTubeToken(user.id, youtubeAccount.accountId)
            if (accessToken) {
              const startDateStr = startDate.toISOString().split('T')[0]
              const endDateStr = endDate.toISOString().split('T')[0]
              const rawYouTubeData = await getYouTubeComprehensiveAnalytics(accessToken, startDateStr, endDateStr)
              
              if (rawYouTubeData) {
                // Import the calculator function
                const { calculateYouTubeAnalytics } = await import('@/lib/analytics/analytics-calculator')
                
                // Process YouTube data through the calculator
                const processedYouTubeData = calculateYouTubeAnalytics(rawYouTubeData, periodDays, youtubeAccount.accountId)
                
                // Debug: Log the raw YouTube data structure
                console.log('🔍 Raw YouTube Data Structure:', {
                  hasChannelStats: !!rawYouTubeData.channelStats,
                  hasMonthlyAnalytics: !!rawYouTubeData.monthlyAnalytics,
                  hasRecentVideos: !!rawYouTubeData.recentVideos,
                  recentVideosCount: rawYouTubeData.recentVideos?.length || 0,
                  hasDemographics: !!rawYouTubeData.demographics,
                  hasTrafficSources: !!rawYouTubeData.trafficSources,
                  hasDeviceTypes: !!rawYouTubeData.deviceTypes
                })
                
                // Debug: Log the processed data
                console.log('🔍 Processed YouTube Data:', {
                  totalImpressions: processedYouTubeData.overview.totalImpressions,
                  totalLikes: processedYouTubeData.overview.totalLikes,
                  totalComments: processedYouTubeData.overview.totalComments,
                  totalShares: processedYouTubeData.overview.totalShares,
                  engagementRate: processedYouTubeData.overview.engagementRate
                })
                
                youtubeAnalytics = {
                  views: processedYouTubeData.overview.totalImpressions,
                  likes: processedYouTubeData.overview.totalLikes,
                  comments: processedYouTubeData.overview.totalComments,
                  shares: processedYouTubeData.overview.totalShares,
                  demographics: rawYouTubeData.demographics || [],
                  trafficSources: rawYouTubeData.trafficSources || [],
                  deviceTypes: rawYouTubeData.deviceTypes || [],
                  watchTime: rawYouTubeData.monthlyAnalytics?.watchTime ? 
                    `${Math.round(rawYouTubeData.monthlyAnalytics.watchTime / 60)}h ${Math.round(rawYouTubeData.monthlyAnalytics.watchTime % 60)}m` : '0h 0m',
                  ctr: rawYouTubeData.monthlyAnalytics?.ctr || 0,
                  revenueEstimate: rawYouTubeData.monthlyAnalytics?.revenue || 0,
                  subscribers: rawYouTubeData.channelStats?.subscriberCount || 0,
                  engagementRate: processedYouTubeData.overview.engagementRate
                }
                
                // Extract other data for the overview
                youtubeTopPosts = (processedYouTubeData.topPosts || []).map(post => ({
                  ...post,
                  publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
                  platforms: post.platforms || []
                }))
                youtubeDailyAnalytics = processedYouTubeData.dailyAnalytics || []
                youtubePlatformPerformance = (processedYouTubeData.platformPerformance || []).map(platform => ({
                  ...platform,
                  username: platform.username || 'YouTube Channel'
                }))
                
                console.log('YouTube analytics processed successfully for overview')
              }
            } else {
              console.log('No valid YouTube access token found')
            }
          } catch (error) {
            console.error('Error fetching YouTube analytics for overview:', error)
            // Continue without YouTube analytics if there's an error
          }
        }

        // Get posts count by platform (only for connected platforms)
        const postsByPlatform = await Promise.all(
          connectedAccounts.map(async (account) => {
            let postCount = await db.post.count({
              where: {
                userId: user.id,
                status: 'PUBLISHED',
                publishedAt: {
                  gte: startDate
                }
              }
            })

            // Add YouTube posts count if this is the YouTube platform AND we should show YouTube data
            if (account.platform === 'YOUTUBE' && youtubeTopPosts.length > 0 && shouldFetchYouTube) {
              postCount += youtubeTopPosts.length
            }

            return {
              platform: account.platform,
              _count: { id: postCount },
              username: account.accountName
            }
          })
        )

        // Get total posts
        const totalPosts = await db.post.count({
          where: {
            userId: user.id,
            publishedAt: {
              gte: startDate
            }
          }
        })

        // Get real engagement metrics from PostAnalytics table
        const analyticsData = await db.postAnalytics.findMany({
          where: {
            post: {
              userId: user.id,
              publishedAt: {
                gte: startDate
              }
            }
          },
          select: {
            impressions: true,
            likes: true,
            comments: true,
            shares: true,
            clicks: true,
            saves: true,
            reach: true,
            engagementRate: true
          }
        })

        // Calculate real engagement metrics
        const engagementMetrics = {
          totalImpressions: analyticsData.reduce((sum, analytics) => sum + (analytics.impressions || 0), 0),
          totalLikes: analyticsData.reduce((sum, analytics) => sum + (analytics.likes || 0), 0),
          totalComments: analyticsData.reduce((sum, analytics) => sum + (analytics.comments || 0), 0),
          totalShares: analyticsData.reduce((sum, analytics) => sum + (analytics.shares || 0), 0),
          totalClicks: analyticsData.reduce((sum, analytics) => sum + (analytics.clicks || 0), 0),
          totalSaves: analyticsData.reduce((sum, analytics) => sum + (analytics.saves || 0), 0),
          totalReach: analyticsData.reduce((sum, analytics) => sum + (analytics.reach || 0), 0)
        }

        // Calculate engagement rate
        const totalEngagement = engagementMetrics.totalLikes + engagementMetrics.totalComments + engagementMetrics.totalShares
        const engagementRate = engagementMetrics.totalImpressions > 0 
          ? ((totalEngagement / engagementMetrics.totalImpressions) * 100).toFixed(2)
          : '0.00'

        // Get top performing posts with real analytics
        const topPosts = await db.post.findMany({
          where: {
            userId: user.id,
            publishedAt: {
              gte: startDate
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
            },
            analytics: {
              select: {
                platform: true,
                impressions: true,
                likes: true,
                comments: true,
                shares: true,
                clicks: true,
                engagementRate: true
              }
            }
          },
          orderBy: {
            publishedAt: 'desc'
          },
          take: 5
        })

        // Get daily analytics for chart with real data
        const dailyAnalytics = []
        for (let i = periodDays - 1; i >= 0; i--) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          const dayStart = new Date(date.setHours(0, 0, 0, 0))
          const dayEnd = new Date(date.setHours(23, 59, 59, 999))
          
          const dayPosts = await db.post.count({
            where: {
              userId: user.id,
              publishedAt: {
                gte: dayStart,
                lt: dayEnd
              }
            }
          })

          // Get real analytics for this day
          const dayAnalytics = await db.postAnalytics.findMany({
            where: {
              post: {
                userId: user.id,
                publishedAt: {
                  gte: dayStart,
                  lt: dayEnd
                }
              }
            },
            select: {
              impressions: true,
              likes: true,
              comments: true,
              shares: true
            }
          })

          const dayImpressions = dayAnalytics.reduce((sum, analytics) => sum + (analytics.impressions || 0), 0)
          const dayEngagement = dayAnalytics.reduce((sum, analytics) => 
            sum + (analytics.likes || 0) + (analytics.comments || 0) + (analytics.shares || 0), 0
          )

          dailyAnalytics.push({
            date: date.toISOString().split('T')[0],
            posts: dayPosts,
            impressions: dayImpressions,
            engagement: dayEngagement
          })
        }

        // Platform performance with real analytics
        const platformPerformance = await Promise.all(
          connectedAccounts.map(async (account) => {
            const platformPosts = await db.post.count({
              where: {
                userId: user.id,
                status: 'PUBLISHED',
                publishedAt: {
                  gte: startDate
                },
                publications: {
                  some: {
                    socialAccount: {
                      platform: account.platform
                    }
                  }
                }
              }
            })

            // Get real analytics for this platform
            const platformAnalytics = await db.postAnalytics.findMany({
              where: {
                post: {
                  userId: user.id,
                  publishedAt: {
                    gte: startDate
                  }
                },
                platform: account.platform
              },
              select: {
                impressions: true,
                likes: true,
                comments: true,
                shares: true,
                engagementRate: true
              }
            })

            const totalReach = platformAnalytics.reduce((sum, analytics) => sum + (analytics.impressions || 0), 0)
            const totalEngagement = platformAnalytics.reduce((sum, analytics) => 
              sum + (analytics.likes || 0) + (analytics.comments || 0) + (analytics.shares || 0), 0
            )
            
            const avgEngagement = totalReach > 0 
              ? ((totalEngagement / totalReach) * 100).toFixed(2)
              : '0.00'

            return {
              platform: account.platform,
              posts: platformPosts,
              username: account.accountName,
              avgEngagement,
              totalReach,
              isConnected: true
            }
          })
        )

        // Combine regular posts with YouTube posts if available
        let combinedTopPosts = topPosts.map(post => {
          // Get platforms for this post
          const platforms = post.publications.map(pub => pub.socialAccount.platform)
          
          // Aggregate metrics across all platforms for this post
          const postMetrics = post.analytics.reduce((acc, analytics) => ({
            impressions: (acc.impressions || 0) + (analytics.impressions || 0),
            likes: (acc.likes || 0) + (analytics.likes || 0),
            comments: (acc.comments || 0) + (analytics.comments || 0),
            shares: (acc.shares || 0) + (analytics.shares || 0),
            clicks: (acc.clicks || 0) + (analytics.clicks || 0)
          }), {} as any)

          return {
            id: post.id,
            content: post.content.length > 100 
              ? post.content.substring(0, 100) + '...' 
              : post.content,
            publishedAt: post.publishedAt,
            platforms,
            metrics: postMetrics
          }
        })

        // Add YouTube posts ONLY if we should show YouTube data
        if (youtubeTopPosts.length > 0 && shouldFetchYouTube) {
          combinedTopPosts = [...youtubeTopPosts, ...combinedTopPosts]
        }

        // Combine daily analytics ONLY if we should show YouTube data
        let combinedDailyAnalytics = [...dailyAnalytics]
        if (youtubeDailyAnalytics.length > 0 && shouldFetchYouTube) {
          // Merge YouTube daily data with existing data
          youtubeDailyAnalytics.forEach(ytDay => {
            const existingDay = combinedDailyAnalytics.find(day => day.date === ytDay.date)
            if (existingDay) {
              existingDay.impressions += ytDay.impressions
              existingDay.engagement += ytDay.engagement
            } else {
              combinedDailyAnalytics.push(ytDay)
            }
          })
        }

        // Combine platform performance ONLY if we should show YouTube data
        let combinedPlatformPerformance = [...platformPerformance]
        if (youtubePlatformPerformance.length > 0 && shouldFetchYouTube) {
          // Replace or add YouTube platform data
          const existingYouTubeIndex = combinedPlatformPerformance.findIndex(p => p.platform === 'YOUTUBE')
          if (existingYouTubeIndex >= 0) {
            combinedPlatformPerformance[existingYouTubeIndex] = youtubePlatformPerformance[0]
          } else {
            combinedPlatformPerformance.push(...youtubePlatformPerformance)
          }
        }

        // Calculate overview data based on platform filter
        const youtubePostsCount = shouldFetchYouTube ? (youtubeTopPosts.length || 0) : 0
        const youtubeViews = shouldFetchYouTube ? (youtubeAnalytics?.views || 0) : 0
        const youtubeLikes = shouldFetchYouTube ? (youtubeAnalytics?.likes || 0) : 0
        const youtubeComments = shouldFetchYouTube ? (youtubeAnalytics?.comments || 0) : 0
        const youtubeShares = shouldFetchYouTube ? (youtubeAnalytics?.shares || 0) : 0
        
        // Debug logging to see what data we have
        console.log('🔍 Overview API Debug Data:', {
          platformFilter,
          shouldFetchYouTube,
          totalPosts: totalPosts + youtubePostsCount,
          regularPosts: totalPosts,
          youtubePosts: youtubePostsCount,
          regularImpressions: engagementMetrics.totalImpressions,
          youtubeViews,
          regularLikes: engagementMetrics.totalLikes,
          youtubeLikes,
          regularComments: engagementMetrics.totalComments,
          youtubeComments,
          regularShares: engagementMetrics.totalShares,
          youtubeShares
        })

        return apiSuccess({
          overview: {
            totalPosts: totalPosts + youtubePostsCount,
            totalImpressions: engagementMetrics.totalImpressions + youtubeViews,
            totalLikes: engagementMetrics.totalLikes + youtubeLikes,
            totalComments: engagementMetrics.totalComments + youtubeComments,
            totalShares: engagementMetrics.totalShares + youtubeShares,
            engagementRate: (engagementMetrics.totalImpressions + youtubeViews) > 0 
              ? (((engagementMetrics.totalLikes + engagementMetrics.totalComments + engagementMetrics.totalShares + 
                   youtubeLikes + youtubeComments + youtubeShares) / 
                  (engagementMetrics.totalImpressions + youtubeViews)) * 100).toFixed(2)
              : engagementRate,
            period: periodDays
          },
          postsByPlatform: postsByPlatform.map(p => ({
            platform: p.platform,
            count: p._count.id
          })),
          topPosts: combinedTopPosts,
          dailyAnalytics: combinedDailyAnalytics,
          platformPerformance: combinedPlatformPerformance,
          youtubeAnalytics: shouldFetchYouTube ? youtubeAnalytics : null
        })
      } catch (error) {
        console.error('Analytics overview error:', error)
        return apiError('Failed to fetch analytics overview', 500)
      }
    })
  )(req)
}
