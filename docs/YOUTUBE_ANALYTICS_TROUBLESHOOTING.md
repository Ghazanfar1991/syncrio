# YouTube Analytics Troubleshooting Guide

## Issue: YouTube Analytics Not Fetching or Displaying Data

### Root Cause Analysis

The YouTube analytics are not working due to one or more of these common issues:

1. **Missing Environment Variables** - YouTube OAuth credentials not configured
2. **OAuth Not Set Up** - YouTube account not connected to the application
3. **API Quota Exceeded** - YouTube API limits reached
4. **Token Expired** - OAuth access token needs refresh
5. **Missing API Permissions** - Required YouTube APIs not enabled

### Solution Steps

#### Step 1: Check Environment Variables

Ensure these environment variables are set in your `.env.local` file:

```bash
# Required for YouTube OAuth
YOUTUBE_CLIENT_ID=your_google_client_id_here
YOUTUBE_CLIENT_SECRET=your_google_client_secret_here
NEXTAUTH_URL=http://localhost:3000
```

**To get these credentials:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable YouTube Data API v3 and YouTube Analytics API v2
4. Go to Credentials → Create Credentials → OAuth 2.0 Client IDs
5. Set Application type to "Web application"
6. Add authorized redirect URI: `http://localhost:3000/api/social/youtube/callback`
7. Copy Client ID and Client Secret

#### Step 2: Connect YouTube Account

1. Go to `/integrations` page in your app
2. Click "Add YouTube Account"
3. Complete OAuth flow
4. Ensure account is marked as "Active"

#### Step 3: Test API Endpoints

Test these endpoints to diagnose the issue:

```bash
# Test YouTube API configuration
curl "http://localhost:3000/api/test-youtube-api"

# Test YouTube analytics directly
curl "http://localhost:3000/api/analytics/youtube?period=30"

# Test overview with YouTube data
curl "http://localhost:3000/api/analytics/overview?period=30"
```

#### Step 4: Check Browser Console

1. Open browser developer tools
2. Go to Console tab
3. Navigate to analytics page
4. Look for error messages related to YouTube API calls

### Common Error Messages and Solutions

#### "Unauthorized" Error
- **Cause**: User not logged in or YouTube account not connected
- **Solution**: Log in and connect YouTube account

#### "No active YouTube account found"
- **Cause**: YouTube account not connected or marked inactive
- **Solution**: Connect YouTube account via integrations page

#### "YouTube access token expired or invalid"
- **Cause**: OAuth token expired and refresh failed
- **Solution**: Reconnect YouTube account

#### "YouTube API quota exceeded"
- **Cause**: Daily API limit reached
- **Solution**: Wait until quota resets (usually midnight PST)

#### "Failed to fetch YouTube analytics"
- **Cause**: Network error or API permission issue
- **Solution**: Check internet connection and API permissions

### Rate Limiting and Caching

#### Smart Rate Limiting
The system now uses intelligent rate limiting that:

- **Prevents API quota exhaustion** by limiting calls to once per minute per channel
- **Allows fresh data fetching** when no cache exists (even if rate limited)
- **Returns cached data** when available to reduce API calls
- **Automatically overrides rate limits** for channels with no cached data

#### Cache Behavior
- **Fresh cache**: Data less than 24 hours old is used immediately
- **Expired cache**: Data older than 24 hours is returned if rate limited
- **No cache**: API call is allowed regardless of rate limiting

#### Rate Limit Override
When there's no cached data available:
```
[YouTube] Rate limited but no cache exists for [channelId], allowing API call
```

This ensures you always get data, even if it means making an API call.

### Debug Mode

Enable debug logging by checking the server console for messages starting with `[YouTube]`. These logs show:

- API call attempts
- Cache hits/misses
- Rate limiting status
- Error details
- Cache override decisions

### API Quotas and Limits

- **YouTube Data API v3**: 10,000 units/day
- **YouTube Analytics API v2**: 50,000 requests/day
- **Rate Limits**: 300 requests/100 seconds/user
- **Smart Rate Limiting**: 1 minute between calls per channel (with cache override)

### Testing Checklist

- [ ] Environment variables set correctly
- [ ] YouTube APIs enabled in Google Cloud Console
- [ ] OAuth redirect URI matches exactly
- [ ] YouTube account connected and active
- [ ] User logged in with valid session
- [ ] No API quota exceeded
- [ ] Network connectivity working
- [ ] Rate limiting allows fresh data fetching when no cache exists

### Still Having Issues?

If the problem persists:

1. Check server logs for detailed error messages
2. Verify OAuth scopes include `yt-analytics.readonly`
3. Test with a different YouTube account
4. Check if the issue occurs in incognito/private browsing mode
5. Verify the YouTube channel meets analytics requirements (public channel with videos)

### Support

For additional help:
1. Check the main [YouTube Analytics Implementation Guide](../YOUTUBE_ANALYTICS_IMPLEMENTATION.md)
2. Review [OAuth Setup Guide](../OAUTH_SETUP_GUIDE.md)
3. Check server console logs for detailed error information
