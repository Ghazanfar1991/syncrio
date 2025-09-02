
# Twitter Integration Guide

## Overview
This document outlines the **hybrid OAuth approach** required for Twitter integration:
- **OAuth 2.0**: Used for account connection and general API access (ALready Implemented)
- **OAuth 1.0a**: Required for media uploads (images/videos)

## Why Hybrid OAuth?

### OAuth 2.0 (Keep As-Is)
- ✅ **Account Connection**: OAuth 2.0 handles user authorization
- ✅ **Token Management**: Refresh tokens, access tokens
- ✅ **General API Calls**: Posting tweets, user info, etc.
- ✅ **Security**: Modern, secure authentication

### OAuth 1.0a (Required for Media)
- ❌ **Media Uploads**: Twitter's v1.1 `/media/upload.json` endpoint requires OAuth 1.0a
- ❌ **No OAuth 2.0 Support**: Twitter explicitly rejects OAuth 2.0 for media endpoints
- ❌ **Legacy Requirement**: Twitter's media API still uses OAuth 1.0a

## Implementation Requirements

### 1. Database Schema Updates
Add OAuth 1.0a fields to `SocialAccount` model:

```prisma
model SocialAccount {
  // ... existing OAuth 2.0 fields ...
  accessToken      String
  refreshToken     String?
  expiresAt        DateTime?
  
  // NEW: OAuth 1.0a fields for media uploads
  consumerKey      String?
  consumerSecret   String?
  accessTokenSecret String?
  
  // ... rest of model ...
}
```

### 2. Environment Variables
Add to `.env` file:

```env
# Twitter OAuth 1.0a (for media uploads)
TWITTER_CONSUMER_KEY=your_consumer_key_here
TWITTER_CONSUMER_SECRET=your_consumer_secret_here

# Twitter OAuth 2.0 (for account connection - KEEP EXISTING)
TWITTER_CLIENT_ID=your_client_id_here
TWITTER_CLIENT_SECRET=your_client_secret_here
```

### 3. OAuth 1.0a Implementation
update if not availabel `lib/social/twitter-oauth.ts`:

```typescript
import crypto from 'crypto';

export function generateOAuth1Signature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  accessTokenSecret: string
): string {
  // Implementation for OAuth 1.0a signature generation
}

export function createOAuth1Header(
  consumerKey: string,
  accessToken: string,
  signature: string,
  timestamp: string,
  nonce: string
): string {
  // Implementation for OAuth 1.0a Authorization header
}

export function createTwitterMediaUploadRequest(
  imageBuffer: Buffer,
  mimeType: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): { body: any, headers: Record<string, string> } {
  // Implementation for multipart/form-data media upload
}
```

### 4. Media Upload Function
Update `lib/social/twitter.ts`:

```typescript
export async function uploadTwitterMedia(
  imageBuffer: Buffer,
  mimeType: string,
  userId: string,
  accountId: string
): Promise<string> {
  // 1. Get OAuth 1.0a credentials from database
  const account = await db.socialAccount.findUnique({
    where: { id: accountId, userId }
  });
  
  if (!account?.consumerKey || !account?.consumerSecret || !account?.accessTokenSecret) {
    throw new Error('OAuth 1.0a credentials not found for media upload');
  }
  
  // 2. Use OAuth 1.0a for media upload
  const { body, headers } = createTwitterMediaUploadRequest(
    imageBuffer,
    mimeType,
    account.consumerKey,
    account.consumerSecret,
    account.accessToken,
    account.accessTokenSecret
  );
  
  // 3. Upload to Twitter v1.1 API
  const response = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
    method: 'POST',
    headers,
    body
  });
  
  // 4. Return media_id for tweet attachment
  const result = await response.json();
  return result.media_id_string;
}
```

### 5. Tweet Posting with Media
Update `postTweet` function:

```typescript
export async function postTweet(
  accessToken: string,
  content: string,
  imageUrl?: string | string[],
  userId?: string,
  accountId?: string
): Promise<any> {
  let mediaIds: string[] = [];
  
  // Handle media uploads with OAuth 1.0a
  if (imageUrl && userId && accountId) {
    if (Array.isArray(imageUrl)) {
      mediaIds = await uploadMultipleTwitterMedia(imageUrl, userId, accountId);
    } else {
      const mediaId = await uploadTwitterMedia(
        Buffer.from(imageUrl, 'base64'),
        'image/jpeg',
        userId,
        accountId
      );
      mediaIds = [mediaId];
    }
  }
  
  // Post tweet with OAuth 2.0 (existing implementation)
  const tweetData: any = { text: content };
  if (mediaIds.length > 0) {
    tweetData.media = { media_ids: mediaIds };
  }
  
  // Use existing OAuth 2.0 implementation for posting
  return await postTweetWithOAuth2(accessToken, tweetData);
}
```

## Critical Implementation Notes

### ⚠️ DO NOT CHANGE OAuth 2.0
- **Keep all existing OAuth 2.0 code unchanged**
- **OAuth 2.0 handles account connections**
- **OAuth 2.0 handles tweet posting**
- **Only add OAuth 1.0a for media uploads**

### 🔑 OAuth 1.0a Credentials
- **Consumer Key/Secret**: App-level credentials (same for all users)
- **Access Token/Secret**: User-specific credentials (stored per account)
- **Get from Twitter Developer Portal**: OAuth 1.0a section

### 📁 File Structure
```
lib/social/
├── twitter.ts          # Main Twitter functions (OAuth 2.0 + media)
├── twitter-oauth.ts    # OAuth 1.0a implementation
└── image-upload.ts     # Image processing utilities
```

## Twitter Developer Portal Setup

### OAuth 2.0 Settings (Keep Existing)
- ✅ App permissions: "Read and Write"
- ✅ OAuth 2.0: Enabled
- ✅ Callback URL: `http://localhost:3000/api/social/twitter/callback`

### OAuth 1.0a Settings (Add New)
- ✅ OAuth 1.0a: Enabled
- ✅ App permissions: "Read and Write"
- ✅ Generate access token and secret for your app

## Testing Strategy

### 1. Test OAuth 2.0 Connection
- Verify account connection still works
- Verify text-only tweets still work

### 2. Test OAuth 1.0a Media Upload
- Test media upload endpoint separately
- Verify media_id is returned

### 3. Test Combined Flow
- Post tweet with image
- Verify both text and image appear

## Common Issues & Solutions

### Media Upload 403 Error
- **Cause**: Using OAuth 2.0 for media upload
- **Solution**: Ensure OAuth 1.0a is implemented

### Missing OAuth 1.0a Credentials
- **Cause**: Database missing consumer key/secret
- **Solution**: Add to environment variables and database

### Media Upload 400 Error
- **Cause**: Incorrect OAuth 1.0a signature
- **Solution**: Verify signature generation algorithm

## Summary

**The key is to implement OAuth 1.0a ONLY for media uploads while keeping OAuth 2.0 completely unchanged for account connections and general API access.**

This hybrid approach allows:
- ✅ Account connections via OAuth 2.0
- ✅ Text tweets via OAuth 2.0  
- ✅ Image uploads via OAuth 1.0a
- ✅ Combined tweets with media via both OAuth systems

**Remember: Do not modify any existing OAuth 2.0 code - only add OAuth 1.0a functionality for media uploads.**
