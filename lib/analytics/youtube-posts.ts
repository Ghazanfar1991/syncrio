// YouTube videos fetcher for real data
import { db } from '@/lib/db'
import { getYouTubeChannelAnalytics, getYouTubeVideosAnalytics } from '@/lib/social/youtube'

interface YouTubeVideo {
  id: string
  snippet?: {
    title: string
    description: string
    publishedAt: string
    thumbnails?: any
  }
  statistics?: {
    viewCount: string
    likeCount: string
    commentCount: string
    favoriteCount: string
  }
  analytics?: {
    views: number
    likes: number
    dislikes: number
    comments: number
    averageViewDuration: number
    watchTime: number
    engagementRate: number
  }
}

// Fetch real YouTube videos from user's channel with enhanced analytics
export async function fetchYouTubeVideos(userId: string, accountId: string): Promise<YouTubeVideo[]> {
  try {
    // Get the user's YouTube account
    const account = await db.socialAccount.findFirst({
      where: {
        userId,
        accountId,
        platform: 'YOUTUBE',
        isActive: true
      }
    })

    if (!account || !account.accessToken) {
      console.log('No valid YouTube account found')
      return []
    }

    console.log('Fetching YouTube videos for channel:', account.accountName)

    // First, get the channel's uploads playlist ID
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${accountId}&access_token=${account.accessToken}`
    )

    if (!channelResponse.ok) {
      const errorText = await channelResponse.text()
      console.error('YouTube channel API error:', channelResponse.status, errorText)
      return []
    }

    const channelData = await channelResponse.json()
    
    if (!channelData.items || channelData.items.length === 0) {
      console.log('No YouTube channel found')
      return []
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads

    // Get videos from the uploads playlist
    const playlistResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=25&access_token=${account.accessToken}`
    )

    if (!playlistResponse.ok) {
      const errorText = await playlistResponse.text()
      console.error('YouTube playlist API error:', playlistResponse.status, errorText)
      return []
    }

    const playlistData = await playlistResponse.json()
    
    if (!playlistData.items) {
      console.log('No YouTube videos found')
      return []
    }

    // Get video IDs
    const videoIds = playlistData.items.map((item: any) => item.snippet.resourceId.videoId)

    // Get comprehensive video analytics
    const videosAnalytics = await getYouTubeVideosAnalytics(account.accessToken, videoIds)
    
    // Get video statistics and details
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(',')}&access_token=${account.accessToken}`
    )

    if (!videosResponse.ok) {
      const errorText = await videosResponse.text()
      console.error('YouTube videos API error:', videosResponse.status, errorText)
      return []
    }

    const videosData = await videosResponse.json()
    
    if (!videosData.items) {
      console.log('No YouTube video details found')
      return []
    }

    // Combine video data with analytics
    const videosWithAnalytics = videosData.items.map((video: any) => {
      const analytics = videosAnalytics.find((a: any) => a.id === video.id)
      return {
        ...video,
        analytics: analytics || {
          views: 0,
          likes: 0,
          dislikes: 0,
          comments: 0,
          averageViewDuration: 0,
          watchTime: 0,
          engagementRate: 0
        }
      }
    })

    console.log(`Found ${videosWithAnalytics.length} YouTube videos with analytics`)
    return videosWithAnalytics
  } catch (error) {
    console.error('Error fetching YouTube videos:', error)
    return []
  }
}

// Get comprehensive YouTube channel analytics
export async function getYouTubeChannelAnalyticsData(userId: string, accountId: string, startDate?: string, endDate?: string) {
  try {
    const account = await db.socialAccount.findFirst({
      where: {
        userId,
        accountId,
        platform: 'YOUTUBE',
        isActive: true
      }
    })

    if (!account || !account.accessToken) {
      return null
    }

    // Use the enhanced channel analytics function
    const analytics = await getYouTubeChannelAnalytics(account.accessToken, accountId, startDate, endDate)
    
    return {
      ...analytics,
      account: {
        id: account.accountId,
        name: account.accountName,
        isActive: account.isActive
      }
    }
  } catch (error) {
    console.error('Error fetching YouTube channel analytics:', error)
    return null
  }
}

// Get YouTube channel info
export async function getYouTubeChannelInfo(userId: string, accountId: string) {
  try {
    const account = await db.socialAccount.findFirst({
      where: {
        userId,
        accountId,
        platform: 'YOUTUBE',
        isActive: true
      }
    })

    if (!account || !account.accessToken) {
      return null
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${accountId}&access_token=${account.accessToken}`
    )

    if (!response.ok) {
      console.error('YouTube channel info fetch failed:', await response.text())
      return null
    }

    const channelInfo = await response.json()
    
    if (!channelInfo.items || channelInfo.items.length === 0) {
      return null
    }

    const channel = channelInfo.items[0]
    
    return {
      id: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      subscriberCount: channel.statistics.subscriberCount,
      videoCount: channel.statistics.videoCount,
      viewCount: channel.statistics.viewCount,
      thumbnails: channel.snippet.thumbnails
    }
  } catch (error) {
    console.error('Error fetching YouTube channel info:', error)
    return null
  }
}
