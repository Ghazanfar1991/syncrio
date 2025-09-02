// Common analytics calculation service for all platforms
// This service handles data aggregation, filtering, and calculations

export interface PlatformAnalytics {
  platform: string
  accountId: string
  accountName: string
  posts: number
  totalReach: number
  totalLikes: number
  totalComments: number
  totalShares: number
  engagementRate: number
  dailyMetrics: Array<{
    date: string
    posts: number
    reach: number
    engagement: number
  }>
}

export interface CombinedAnalytics {
  overview: {
    totalPosts: number
    totalImpressions: number
    totalLikes: number
    totalComments: number
    totalShares: number
    engagementRate: string
    period: number
  }
  postsByPlatform: Array<{
    platform: string
    count: number
  }>
  platformPerformance: Array<{
    platform: string
    posts: number
    username?: string
    avgEngagement: string
    totalReach: number
    isConnected: boolean
  }>
  dailyAnalytics: Array<{
    date: string
    posts: number
    impressions: number
    engagement: number
  }>
}

export interface YouTubeAnalyticsData {
  channelStats: {
    subscriberCount: number
    viewCount: number
    videoCount: number
    channelName: string
    channelDescription: string
    customUrl?: string
    publishedAt: string
    hiddenSubscriberCount: boolean
    commentCount: number
  }
  monthlyAnalytics: {
    views: number
    watchTime: number
    avgViewDuration: number
    subscribersGained: number
    subscribersLost: number
    likes: number
    dislikes: number
    comments: number
    shares: number
    revenue: number
    impressions: number
    ctr: number
    netSubscribers: number
    engagementRate: number
  } | null
  demographics: Array<{
    ageGroup: string
    gender: string
    viewerPercentage: number
  }>
  trafficSources: Array<{
    source: string
    views: number
  }>
  deviceTypes: Array<{
    device: string
    views: number
  }>
  recentVideos: Array<{
    id: string
    title: string
    description: string
    views: number
    likes: number
    dislikes: number
    comments: number
    duration: string
    publishedAt: string
    thumbnail?: string
    tags: string[]
    categoryId: string
    shares: number
  }>
  dailyTrends: Array<{
    date: string
    views: number
    watchTime: number
    subscribers: number
    engagement: number
    likes: number
    dislikes: number
    comments: number
    shares: number
    impressions: number
    ctr: number
  }>
}

export interface TwitterAnalyticsData {
  // Twitter analytics structure
  tweets: number
  impressions: number
  likes: number
  retweets: number
  replies: number
  engagementRate: number
  dailyMetrics: Array<{
    date: string
    tweets: number
    impressions: number
    engagement: number
  }>
}

export interface LinkedInAnalyticsData {
  // LinkedIn analytics structure
  posts: number
  impressions: number
  likes: number
  comments: number
  shares: number
  engagementRate: number
  dailyMetrics: Array<{
    date: string
    posts: number
    impressions: number
    engagement: number
  }>
}

export interface InstagramAnalyticsData {
  // Instagram analytics structure
  posts: number
  impressions: number
  likes: number
  comments: number
  saves: number
  engagementRate: number
  dailyMetrics: Array<{
    date: string
    posts: number
    impressions: number
    engagement: number
  }>
}

export type PlatformAnalyticsData = 
  | { platform: 'YOUTUBE'; data: YouTubeAnalyticsData }
  | { platform: 'TWITTER'; data: TwitterAnalyticsData }
  | { platform: 'LINKEDIN'; data: LinkedInAnalyticsData }
  | { platform: 'INSTAGRAM'; data: InstagramAnalyticsData }

// Calculate combined analytics across all platforms
export function calculateCombinedAnalytics(
  platformData: PlatformAnalyticsData[],
  period: number,
  selectedPlatform?: string,
  selectedAccount?: string
): CombinedAnalytics {
  // Filter data based on selection
  let filteredData = platformData
  
  if (selectedPlatform && selectedPlatform !== 'all') {
    filteredData = platformData.filter(item => item.platform === selectedPlatform)
  }

  // Calculate totals
  const totalPosts = filteredData.reduce((sum, platform) => {
    if (platform.platform === 'YOUTUBE') {
      return sum + (platform.data as YouTubeAnalyticsData).recentVideos.length
    } else if (platform.platform === 'TWITTER') {
      return sum + (platform.data as TwitterAnalyticsData).tweets
    } else if (platform.platform === 'LINKEDIN') {
      return sum + (platform.data as LinkedInAnalyticsData).posts
    } else if (platform.platform === 'INSTAGRAM') {
      return sum + (platform.data as InstagramAnalyticsData).posts
    }
    return sum
  }, 0)

  const totalImpressions = filteredData.reduce((sum, platform) => {
    if (platform.platform === 'YOUTUBE') {
      return sum + ((platform.data as YouTubeAnalyticsData).monthlyAnalytics?.views || 0)
    } else if (platform.platform === 'TWITTER') {
      return sum + (platform.data as TwitterAnalyticsData).impressions
    } else if (platform.platform === 'LINKEDIN') {
      return sum + (platform.data as LinkedInAnalyticsData).impressions
    } else if (platform.platform === 'INSTAGRAM') {
      return sum + (platform.data as InstagramAnalyticsData).impressions
    }
    return sum
  }, 0)

  const totalLikes = filteredData.reduce((sum, platform) => {
    if (platform.platform === 'YOUTUBE') {
      return sum + ((platform.data as YouTubeAnalyticsData).monthlyAnalytics?.likes || 0)
    } else if (platform.platform === 'TWITTER') {
      return sum + (platform.data as TwitterAnalyticsData).likes
    } else if (platform.platform === 'LINKEDIN') {
      return sum + (platform.data as LinkedInAnalyticsData).likes
    } else if (platform.platform === 'INSTAGRAM') {
      return sum + (platform.data as InstagramAnalyticsData).likes
    }
    return sum
  }, 0)

  const totalComments = filteredData.reduce((sum, platform) => {
    if (platform.platform === 'YOUTUBE') {
      return sum + ((platform.data as YouTubeAnalyticsData).monthlyAnalytics?.comments || 0)
    } else if (platform.platform === 'TWITTER') {
      return sum + (platform.data as TwitterAnalyticsData).replies
    } else if (platform.platform === 'LINKEDIN') {
      return sum + (platform.data as LinkedInAnalyticsData).comments
    } else if (platform.platform === 'INSTAGRAM') {
      return sum + (platform.data as InstagramAnalyticsData).comments
    }
    return sum
  }, 0)

  const totalShares = filteredData.reduce((sum, platform) => {
    if (platform.platform === 'YOUTUBE') {
      return sum + ((platform.data as YouTubeAnalyticsData).monthlyAnalytics?.shares || 0)
    } else if (platform.platform === 'TWITTER') {
      return sum + (platform.data as TwitterAnalyticsData).retweets
    } else if (platform.platform === 'LINKEDIN') {
      return sum + (platform.data as LinkedInAnalyticsData).shares
    } else if (platform.platform === 'INSTAGRAM') {
      return sum + (platform.data as InstagramAnalyticsData).saves
    }
    return sum
  }, 0)

  // Calculate engagement rate
  const engagementRate = totalImpressions > 0 
    ? ((totalLikes + totalComments + totalShares) / totalImpressions) * 100 
    : 0

  // Generate platform performance data
  const platformPerformance = platformData.map(platform => {
    let posts = 0
    let totalReach = 0
    let engagement = 0

    if (platform.platform === 'YOUTUBE') {
      const data = platform.data as YouTubeAnalyticsData
      posts = data.recentVideos.length
      totalReach = data.monthlyAnalytics?.views || 0
      engagement = (data.monthlyAnalytics?.engagementRate || 0)
    } else if (platform.platform === 'TWITTER') {
      const data = platform.data as TwitterAnalyticsData
      posts = data.tweets
      totalReach = data.impressions
      engagement = data.engagementRate
    } else if (platform.platform === 'LINKEDIN') {
      const data = platform.data as LinkedInAnalyticsData
      posts = data.posts
      totalReach = data.impressions
      engagement = data.engagementRate
    } else if (platform.platform === 'INSTAGRAM') {
      const data = platform.data as InstagramAnalyticsData
      posts = data.posts
      totalReach = data.impressions
      engagement = data.engagementRate
    }

    return {
      platform: platform.platform,
      posts,
      avgEngagement: engagement.toFixed(2),
      totalReach,
      isConnected: true
    }
  })

  // Generate posts by platform
  const postsByPlatform = platformData.map(platform => {
    let count = 0
    if (platform.platform === 'YOUTUBE') {
      count = (platform.data as YouTubeAnalyticsData).recentVideos.length
    } else if (platform.platform === 'TWITTER') {
      count = (platform.data as TwitterAnalyticsData).tweets
    } else if (platform.platform === 'LINKEDIN') {
      count = (platform.data as LinkedInAnalyticsData).posts
    } else if (platform.platform === 'INSTAGRAM') {
      count = (platform.data as InstagramAnalyticsData).posts
    }

    return {
      platform: platform.platform,
      count
    }
  })

  // Generate daily analytics (combine all platforms)
  const dailyAnalytics = generateCombinedDailyAnalytics(platformData, period)

  return {
    overview: {
      totalPosts,
      totalImpressions,
      totalLikes,
      totalComments,
      totalShares,
      engagementRate: engagementRate.toFixed(2),
      period
    },
    postsByPlatform,
    platformPerformance,
    dailyAnalytics
  }
}

// Generate combined daily analytics from all platforms
function generateCombinedDailyAnalytics(
  platformData: PlatformAnalyticsData[],
  period: number
): Array<{ date: string; posts: number; impressions: number; engagement: number }> {
  const dailyData: { [key: string]: { posts: number; impressions: number; engagement: number } } = {}

  // Initialize daily data for the period
  const endDate = new Date()
  const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000)
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0]
    dailyData[dateKey] = { posts: 0, impressions: 0, engagement: 0 }
  }

  // Aggregate data from all platforms
  platformData.forEach(platform => {
    if (platform.platform === 'YOUTUBE') {
      const data = platform.data as YouTubeAnalyticsData
      data.dailyTrends?.forEach(day => {
        if (dailyData[day.date]) {
          dailyData[day.date].posts += 1 // Assume 1 post per day for YouTube
          dailyData[day.date].impressions += day.views
          dailyData[day.date].engagement += day.engagement
        }
      })
    } else if (platform.platform === 'TWITTER') {
      const data = platform.data as TwitterAnalyticsData
      data.dailyMetrics?.forEach(day => {
        if (dailyData[day.date]) {
          dailyData[day.date].posts += day.tweets
          dailyData[day.date].impressions += day.impressions
          dailyData[day.date].engagement += day.engagement
        }
      })
    } else if (platform.platform === 'LINKEDIN') {
      const data = platform.data as LinkedInAnalyticsData
      data.dailyMetrics?.forEach(day => {
        if (dailyData[day.date]) {
          dailyData[day.date].posts += day.posts
          dailyData[day.date].impressions += day.impressions
          dailyData[day.date].engagement += day.engagement
        }
      })
    } else if (platform.platform === 'INSTAGRAM') {
      const data = platform.data as InstagramAnalyticsData
      data.dailyMetrics?.forEach(day => {
        if (dailyData[day.date]) {
          dailyData[day.date].posts += day.posts
          dailyData[day.date].impressions += day.impressions
          dailyData[day.date].engagement += day.engagement
        }
      })
    }
  })

  // Convert to array and sort by date
  return Object.entries(dailyData)
    .map(([date, data]) => ({
      date,
      posts: data.posts,
      impressions: data.impressions,
      engagement: data.engagement
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Calculate platform-specific analytics
export function calculatePlatformAnalytics(
  platformData: PlatformAnalyticsData,
  period: number
): PlatformAnalytics {
  if (platformData.platform === 'YOUTUBE') {
    const data = platformData.data as YouTubeAnalyticsData
    return {
      platform: 'YOUTUBE',
      accountId: '', // Will be set by caller
      accountName: data.channelStats.channelName,
      posts: data.recentVideos.length,
      totalReach: data.monthlyAnalytics?.views || 0,
      totalLikes: data.monthlyAnalytics?.likes || 0,
      totalComments: data.monthlyAnalytics?.comments || 0,
      totalShares: data.monthlyAnalytics?.shares || 0,
      engagementRate: data.monthlyAnalytics?.engagementRate || 0,
      dailyMetrics: data.dailyTrends?.map(day => ({
        date: day.date,
        posts: 1, // Assume 1 post per day
        reach: day.views,
        engagement: day.engagement
      })) || []
    }
  }

  // Add other platforms as needed
  return {
    platform: platformData.platform,
    accountId: '',
    accountName: '',
    posts: 0,
    totalReach: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    engagementRate: 0,
    dailyMetrics: []
  }
}

// Enhanced function to calculate YouTube-specific analytics
export function calculateYouTubeAnalytics(
  youtubeData: YouTubeAnalyticsData,
  period: number,
  accountId?: string
): {
  overview: {
    totalPosts: number
    totalImpressions: number
    totalLikes: number
    totalComments: number
    totalShares: number
    engagementRate: string
    period: number
  }
  postsByPlatform: Array<{
    platform: string
    count: number
  }>
  platformPerformance: Array<{
    platform: string
    posts: number
    username?: string
    avgEngagement: string
    totalReach: number
    isConnected: boolean
  }>
  dailyAnalytics: Array<{
    date: string
    posts: number
    impressions: number
    engagement: number
  }>
  topPosts: Array<{
    id: string
    content: string
    publishedAt: string
    platforms: string[]
    metrics: {
      impressions: number
      likes: number
      comments: number
      shares: number
    }
    thumbnail?: string
    duration?: string
    description?: string
  }>
} {
  // Extract data from YouTube analytics
  const monthlyData = youtubeData.monthlyAnalytics
  const recentVideos = youtubeData.recentVideos || []
  const dailyTrends = youtubeData.dailyTrends || []
  const channelStats = youtubeData.channelStats

  // Calculate overview metrics from recent videos (since monthlyAnalytics might not be available)
  const totalPosts = recentVideos.length
  
  // Sum up views, likes, comments from all videos
  const totalImpressions = recentVideos.reduce((sum, video) => sum + (video.views || 0), 0)
  const totalLikes = recentVideos.reduce((sum, video) => sum + (video.likes || 0), 0)
  const totalComments = recentVideos.reduce((sum, video) => sum + (video.comments || 0), 0)
  const totalShares = recentVideos.reduce((sum, video) => sum + (video.shares || 0), 0)
  
  // Calculate engagement rate
  const totalEngagement = totalLikes + totalComments + totalShares
  const engagementRate = totalImpressions > 0 
    ? ((totalEngagement / totalImpressions) * 100).toFixed(2)
    : '0.00'

  // Generate posts by platform
  const postsByPlatform = [{
    platform: 'YOUTUBE',
    count: totalPosts
  }]

  // Generate platform performance
  const platformPerformance = [{
    platform: 'YOUTUBE',
    posts: totalPosts,
    username: channelStats.channelName || 'YouTube Channel',
    avgEngagement: engagementRate,
    totalReach: totalImpressions,
    isConnected: true
  }]

  // Generate daily analytics from recent videos (group by date)
  const dailyAnalytics: { [key: string]: { posts: number; impressions: number; engagement: number } } = {}
  
  recentVideos.forEach(video => {
    const date = video.publishedAt ? video.publishedAt.split('T')[0] : new Date().toISOString().split('T')[0]
    
    if (!dailyAnalytics[date]) {
      dailyAnalytics[date] = { posts: 0, impressions: 0, engagement: 0 }
    }
    
    dailyAnalytics[date].posts += 1
    dailyAnalytics[date].impressions += video.views || 0
    dailyAnalytics[date].engagement += (video.likes || 0) + (video.comments || 0) + (video.shares || 0)
  })
  
  // Convert to array format
  const dailyAnalyticsArray = Object.entries(dailyAnalytics).map(([date, data]) => ({
    date,
    posts: data.posts,
    impressions: data.impressions,
    engagement: data.engagement
  }))

  // Generate top posts from recent videos
  const topPosts = recentVideos.map(video => ({
    id: video.id,
    content: video.title,
    publishedAt: video.publishedAt,
    platforms: ['YOUTUBE'],
    metrics: {
      impressions: video.views || 0,
      likes: video.likes || 0,
      comments: video.comments || 0,
      shares: 0 // YouTube doesn't provide share count in basic API
    },
    thumbnail: video.thumbnail,
    duration: video.duration,
    description: video.description
  }))

  return {
    overview: {
      totalPosts,
      totalImpressions,
      totalLikes,
      totalComments,
      totalShares,
      engagementRate,
      period
    },
    postsByPlatform,
    platformPerformance,
    dailyAnalytics: dailyAnalyticsArray,
    topPosts
  }
}
