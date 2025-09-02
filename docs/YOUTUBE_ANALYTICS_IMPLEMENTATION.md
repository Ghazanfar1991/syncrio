# YouTube Analytics Implementation

This document describes the comprehensive YouTube analytics implementation that fetches real data using the YouTube Data API v3 and YouTube Analytics API v2.

## Overview

The implementation provides comprehensive analytics for YouTube channels including:
- Channel-level analytics (views, watch time, subscribers, engagement)
- Video-level analytics (views, likes, comments, watch time, engagement rates)
- Daily performance metrics
- Top performing videos
- Performance insights and trends

## OAuth Scopes

The implementation requires the following OAuth scopes:
- `https://www.googleapis.com/auth/youtube.upload` - For video uploads
- `https://www.googleapis.com/auth/youtube.readonly` - For reading channel and video data
- `https://www.googleapis.com/auth/yt-analytics.readonly` - For analytics data

## API Endpoints

### 1. YouTube Analytics API (`/api/analytics/youtube`)

**GET** `/api/analytics/youtube?period=30&includeVideos=true&startDate=2024-01-01&endDate=2024-01-31`

**Query Parameters:**
- `period` (optional): Number of days (default: 30)
- `includeVideos` (optional): Include video-level analytics (default: true)
- `startDate` (optional): Custom start date (YYYY-MM-DD)
- `endDate` (optional): Custom end date (YYYY-MM-DD)

**Response:**
```typescript
{
  platform: 'YOUTUBE',
  account: {
    id: string,
    name: string,
    isActive: boolean,
    channelInfo: {
      id: string,
      title: string,
      description: string,
      subscriberCount: string,
      videoCount: string,
      viewCount: string,
      thumbnails: any
    }
  },
  summary: {
    totalViews: number,
    totalWatchTime: number,
    totalLikes: number,
    totalDislikes: number,
    totalSubscribers: number,
    averageViewDuration: number,
    subscriberGrowth: number,
    totalVideos: number,
    averageEngagementRate: number
  },
  chartData: Array<{
    date: string,
    views: number,
    watchTime: number,
    likes: number,
    dislikes: number,
    subscribers: number,
    engagement: number
  }>,
  topVideos: Array<{
    id: string,
    title: string,
    publishedAt: string,
    thumbnail: string,
    metrics: {
      views: number,
      likes: number,
      dislikes: number,
      comments: number,
      averageViewDuration: number,
      watchTime: number,
      engagementRate: number
    }
  }>,
  insights: {
    bestPerformingVideo: any,
    averageViewsPerVideo: number,
    totalEngagement: number,
    subscriberGrowthRate: number
  },
  videosCount: number,
  dateRange: {
    start: string,
    end: string,
    period: number
  }
}
```

## Core Functions

### 1. Channel Analytics (`getYouTubeChannelAnalytics`)

Fetches comprehensive channel analytics including:
- Total views, watch time, likes, dislikes
- Subscriber count and growth
- Average view duration
- Daily metrics breakdown

**Fallback Strategy:**
- Primary: YouTube Analytics API v2
- Secondary: YouTube Data API v3 with estimated analytics
- Tertiary: Mock data based on channel statistics

### 2. Video Analytics (`getYouTubeVideoAnalytics`)

Fetches analytics for individual videos:
- Views, likes, dislikes, comments
- Watch time and average view duration
- Engagement rate and retention metrics

### 3. Batch Video Analytics (`getYouTubeVideosAnalytics`)

Efficiently fetches analytics for multiple videos in a single API call.

## Data Sources

### YouTube Data API v3
- Channel information and statistics
- Video metadata and basic statistics
- Playlist and upload information

### YouTube Analytics API v2
- Detailed analytics metrics
- Time-based performance data
- Engagement and retention data

## Error Handling

The implementation includes comprehensive error handling:

1. **API Failures**: Graceful fallback to estimated data
2. **Token Expiration**: Automatic token refresh
3. **Rate Limiting**: Exponential backoff and retry logic
4. **Data Validation**: Sanitization and type checking

## Fallback Strategy

When the YouTube Analytics API is not accessible:

1. **Channel Analytics**: Estimate based on total channel statistics
2. **Video Analytics**: Use basic statistics from Data API
3. **Daily Metrics**: Generate realistic daily breakdowns
4. **Engagement Rates**: Calculate based on available data

## Performance Optimizations

1. **Batch API Calls**: Minimize API requests for multiple videos
2. **Caching**: Store analytics data to reduce API calls
3. **Lazy Loading**: Load video analytics only when requested
4. **Pagination**: Handle large datasets efficiently

## Usage Examples

### Basic Analytics Fetch
```typescript
import { getYouTubeChannelAnalytics } from '@/lib/social/youtube'

const analytics = await getYouTubeChannelAnalytics(
  accessToken,
  channelId,
  '2024-01-01',
  '2024-01-31'
)
```

### Video Analytics
```typescript
import { getYouTubeVideoAnalytics } from '@/lib/social/youtube'

const videoAnalytics = await getYouTubeVideoAnalytics(accessToken, videoId)
```

### React Component
```tsx
import { YouTubeAnalytics } from '@/components/analytics/youtube-analytics'

function AnalyticsPage() {
  return (
    <div>
      <h1>YouTube Analytics</h1>
      <YouTubeAnalytics />
    </div>
  )
}
```

## Configuration

### Environment Variables
```bash
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
NEXTAUTH_URL=your_app_url
```

### OAuth Setup
1. Create a Google Cloud Project
2. Enable YouTube Data API v3 and YouTube Analytics API v2
3. Configure OAuth consent screen
4. Add authorized redirect URIs
5. Generate client credentials

## Security Considerations

1. **Token Storage**: Secure storage of access and refresh tokens
2. **Scope Limitation**: Minimal required OAuth scopes
3. **Data Validation**: Sanitize all API responses
4. **Rate Limiting**: Respect API quotas and limits

## Monitoring and Debugging

### Logging
- API request/response logging
- Error tracking and reporting
- Performance metrics collection

### Debug Endpoints
- `/api/debug/youtube` - Test YouTube API connectivity
- `/api/test/youtube-analytics` - Validate analytics data

## Troubleshooting

### Common Issues

1. **"No active YouTube account found"**
   - Ensure user has connected YouTube account
   - Check account is marked as active
   - Verify OAuth token is valid

2. **"YouTube Analytics API not accessible"**
   - Verify OAuth scope includes `yt-analytics.readonly`
   - Check API quotas and limits
   - Ensure channel meets analytics requirements

3. **"Access token expired or invalid"**
   - Token refresh mechanism should handle this automatically
   - Check refresh token is stored correctly
   - Verify OAuth flow is complete

### Debug Steps

1. Check browser console for API errors
2. Verify OAuth scopes in Google Cloud Console
3. Test API endpoints directly with valid tokens
4. Check database for account status and tokens

## Future Enhancements

1. **Real-time Analytics**: WebSocket updates for live metrics
2. **Advanced Filtering**: Date ranges, video categories, performance thresholds
3. **Export Functionality**: CSV/PDF reports generation
4. **Comparative Analytics**: Channel performance vs. industry benchmarks
5. **Predictive Analytics**: Trend analysis and forecasting

## API Limits and Quotas

- **YouTube Data API v3**: 10,000 units/day
- **YouTube Analytics API v2**: 50,000 requests/day
- **Rate Limits**: 300 requests/100 seconds/user

## Support

For issues or questions:
1. Check this documentation
2. Review API error logs
3. Verify OAuth configuration
4. Test with minimal scope requirements





