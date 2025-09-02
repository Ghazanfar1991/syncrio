"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Eye, 
  Heart, 
  MessageSquare, 
  ThumbsDown, 
  Users, 
  Clock, 
  TrendingUp, 
  Play,
  Calendar,
  RefreshCw
} from 'lucide-react'

interface YouTubeAnalytics {
  platform: string
  account: {
    id: string
    name: string
    isActive: boolean
    channelInfo: {
      id: string
      title: string
      description: string
      subscriberCount: string
      videoCount: string
      viewCount: string
      thumbnails: any
    }
  }
  summary: {
    totalViews: number
    totalWatchTime: number
    totalLikes: number
    totalDislikes: number
    totalSubscribers: number
    averageViewDuration: number
    subscriberGrowth: number
    totalVideos: number
    averageEngagementRate: number
  }
  chartData: Array<{
    date: string
    views: number
    watchTime: number
    likes: number
    dislikes: number
    subscribers: number
    engagement: number
  }>
  topVideos: Array<{
    id: string
    title: string
    publishedAt: string
    thumbnail: string
    metrics: {
      views: number
      likes: number
      dislikes: number
      comments: number
      averageViewDuration: number
      watchTime: number
      engagementRate: number
    }
  }>
  insights: {
    bestPerformingVideo: any
    averageViewsPerVideo: number
    totalEngagement: number
    subscriberGrowthRate: number
  }
  videosCount: number
  dateRange: {
    start: string
    end: string
    period: number
  }
}

export function YouTubeAnalytics() {
  const [analytics, setAnalytics] = useState<YouTubeAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState(30)
  const [includeVideos, setIncludeVideos] = useState(true)

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(
        `/api/analytics/youtube?period=${period}&includeVideos=${includeVideos}`
      )
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch YouTube analytics')
      }
      
      const data = await response.json()
      setAnalytics(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [period, includeVideos])

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toLocaleString()
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatWatchTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`
    }
    return `${remainingMinutes}m`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-red-600 mb-2">⚠️ Error loading YouTube analytics</div>
            <div className="text-sm text-red-500 mb-4">{error}</div>
            <Button onClick={fetchAnalytics} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            No YouTube analytics data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">YouTube Analytics</h2>
          <p className="text-gray-600">
            {analytics.account.channelInfo.title} • {formatNumber(analytics.summary.totalSubscribers)} subscribers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeVideos}
              onChange={(e) => setIncludeVideos(e.target.checked)}
            />
            Include videos
          </label>
          <Button onClick={fetchAnalytics} size="sm" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold">{formatNumber(analytics.summary.totalViews)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {analytics.dateRange.period} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Watch Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold">{formatWatchTime(analytics.summary.totalWatchTime)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Avg: {formatDuration(analytics.summary.averageViewDuration)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              <span className="text-2xl font-bold">{formatNumber(analytics.summary.totalLikes)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {analytics.summary.averageEngagementRate.toFixed(1)}% rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Subscribers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              <span className="text-2xl font-bold">{formatNumber(analytics.summary.totalSubscribers)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              +{formatNumber(analytics.summary.subscriberGrowth)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Performance Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Videos</span>
              <span className="font-semibold">{analytics.summary.totalVideos}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average Views per Video</span>
              <span className="font-semibold">{formatNumber(analytics.insights.averageViewsPerVideo)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Engagement</span>
              <span className="font-semibold">{formatNumber(analytics.insights.totalEngagement)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Subscriber Growth Rate</span>
              <span className="font-semibold">{analytics.insights.subscriberGrowthRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Top Performing Video
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.insights.bestPerformingVideo ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={analytics.insights.bestPerformingVideo.thumbnail}
                    alt="Video thumbnail"
                    className="w-16 h-12 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {analytics.insights.bestPerformingVideo.title}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {new Date(analytics.insights.bestPerformingVideo.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-blue-600">
                      {formatNumber(analytics.insights.bestPerformingVideo.metrics.views)}
                    </div>
                    <div className="text-xs text-gray-500">Views</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-600">
                      {formatNumber(analytics.insights.bestPerformingVideo.metrics.likes)}
                    </div>
                    <div className="text-xs text-gray-500">Likes</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">
                      {formatNumber(analytics.insights.bestPerformingVideo.metrics.comments)}
                    </div>
                    <div className="text-xs text-gray-500">Comments</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                No video data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Videos */}
      {includeVideos && analytics.topVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Videos</CardTitle>
            <CardDescription>
              Videos with highest views in the last {period} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topVideos.slice(0, 5).map((video, index) => (
                <div key={video.id} className="flex items-center gap-4 p-3 rounded-lg border">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                  </div>
                  <img
                    src={video.thumbnail}
                    alt="Video thumbnail"
                    className="w-20 h-15 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{video.title}</h4>
                    <p className="text-xs text-gray-500">
                      {new Date(video.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-blue-600">
                        {formatNumber(video.metrics.views)}
                      </div>
                      <div className="text-xs text-gray-500">Views</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-red-600">
                        {formatNumber(video.metrics.likes)}
                      </div>
                      <div className="text-xs text-gray-500">Likes</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-green-600">
                        {formatNumber(video.metrics.comments)}
                      </div>
                      <div className="text-xs text-gray-500">Comments</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-purple-600">
                        {video.metrics.engagementRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">Engagement</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart Data */}
      {analytics.chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Performance</CardTitle>
            <CardDescription>
              Daily metrics over the last {period} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.chartData.slice(-7).map((day) => (
                <div key={day.date} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-4">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">
                      {new Date(day.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-blue-500" />
                      <span>{formatNumber(day.views)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span>{formatNumber(day.likes)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-green-500" />
                      <span>{formatNumber(day.engagement)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-500" />
                      <span>{formatNumber(day.subscribers)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

