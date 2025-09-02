# Twitter Hybrid OAuth System Implementation

## Overview

This document describes the implementation of the **hybrid OAuth system** for Twitter integration in the social-bot application. The system uses:

- **OAuth 2.0**: For account connection and general API access (tweet posting, user info)
- **OAuth 1.0a**: For media uploads (images/videos)

## Architecture

### Database Schema

The `SocialAccount` model has been extended with OAuth 1.0a fields:

```prisma
model SocialAccount {
  // ... existing OAuth 2.0 fields ...
  accessToken      String
  refreshToken     String?
  expiresAt        DateTime?
  
  // NEW: OAuth 1.0a fields for media uploads
  consumerKey      String?      // App-level consumer key
  consumerSecret   String?      // App-level consumer secret  
  accessTokenSecret String?     // User-specific access token secret
  
  // ... rest of model ...
}
```

### File Structure

```
lib/social/
├── twitter.ts              # Main Twitter functions (hybrid OAuth)
├── twitter-oauth.ts        # OAuth 1.0a implementation
└── image-upload.ts         # Image processing utilities

app/api/social/twitter/
├── callback/route.ts       # OAuth 2.0 callback (updated)
├── connect/route.ts        # OAuth 2.0 connection
├── post/route.ts           # Tweet posting (updated)
└── oauth1-setup/route.ts  # OAuth 1.0a setup endpoint

components/social/
├── social-accounts-manager.tsx  # Account management (updated)
└── twitter-oauth1-setup.tsx    # OAuth 1.0a setup UI
```

## Implementation Details

### 1. OAuth 2.0 (Account Connection)

**Purpose**: Handle user authorization and account connection
**Status**: ✅ Fully implemented and unchanged

**Flow**:
1. User clicks "Connect Twitter" 
2. Redirected to Twitter OAuth 2.0 authorization
3. User authorizes the app
4. Twitter redirects back with authorization code
5. App exchanges code for access/refresh tokens
6. Account saved to database with OAuth 2.0 credentials

**Files**: `app/api/social/twitter/callback/route.ts`, `app/api/social/twitter/connect/route.ts`

### 2. OAuth 1.0a (Media Uploads)

**Purpose**: Handle media uploads for tweets
**Status**: ✅ Newly implemented

**Flow**:
1. User connects Twitter account (OAuth 2.0)
2. User provides OAuth 1.0a access token secret via UI
3. App stores OAuth 1.0a credentials in database
4. When posting tweet with media:
   - Use OAuth 1.0a for media upload to `upload.twitter.com/1.1/media/upload.json`
   - Use OAuth 2.0 for posting tweet with media IDs

**Files**: `lib/social/twitter-oauth.ts`, `app/api/social/twitter/oauth1-setup/route.ts`

### 3. Hybrid Tweet Posting

**Purpose**: Combine both OAuth systems for complete functionality
**Status**: ✅ Implemented

**Flow**:
1. User creates post with image
2. App processes image (base64 → Buffer)
3. App uploads media using OAuth 1.0a
4. App receives media IDs from Twitter
5. App posts tweet with media IDs using OAuth 2.0

**Files**: `lib/social/twitter.ts`, `app/api/social/twitter/post/route.ts`

## Environment Variables

Required environment variables in `.env`:

```env
# Twitter OAuth 2.0 (for account connection)
TWITTER_CLIENT_ID=your_oauth2_client_id
TWITTER_CLIENT_SECRET=your_oauth2_client_secret

# Twitter OAuth 1.0a (for media uploads)
TWITTER_CONSUMER_KEY=your_oauth1_consumer_key
TWITTER_CONSUMER_SECRET=your_oauth1_consumer_secret

# Base URL
NEXTAUTH_URL=http://localhost:3000
```

## User Experience Flow

### 1. Initial Account Connection

1. User visits `/integrations` page
2. Clicks "Connect Account" for Twitter
3. Redirected to Twitter OAuth 2.0
4. Authorizes the app
5. Redirected back with success message
6. Account appears in "Connected Accounts" list

### 2. OAuth 1.0a Setup (Required for Media)

1. User sees "Media Upload Setup Required" card
2. Clicks to expand OAuth 1.0a setup form
3. Enters OAuth 1.0a access token secret
4. Submits form to `/api/social/twitter/oauth1-setup`
5. Card changes to "Media Upload Ready" status
6. Account shows "Media Ready" badge

### 3. Posting with Media

1. User creates post with image
2. Selects Twitter account for publishing
3. App automatically:
   - Uploads image using OAuth 1.0a
   - Posts tweet with media using OAuth 2.0
4. User sees success message with tweet ID

## API Endpoints

### OAuth 2.0 (Existing)

- `POST /api/social/twitter/connect` - Initiate OAuth 2.0 connection
- `GET /api/social/twitter/callback` - Handle OAuth 2.0 callback

### OAuth 1.0a (New)

- `POST /api/social/twitter/oauth1-setup` - Set OAuth 1.0a access token secret

### Tweet Posting (Updated)

- `POST /api/social/twitter/post` - Post tweet (supports media via hybrid OAuth)
- `POST /api/posts/[id]/publish` - Publish post to all platforms (updated for Twitter)

## Testing

### Manual Testing

1. **Test OAuth 2.0 Connection**:
   - Connect Twitter account
   - Verify account appears in connected accounts
   - Verify text-only tweets work

2. **Test OAuth 1.0a Setup**:
   - Provide OAuth 1.0a access token secret
   - Verify "Media Ready" status appears

3. **Test Media Upload**:
   - Create post with image
   - Publish to Twitter
   - Verify both text and image appear

### Automated Testing

Run the test script:

```bash
node scripts/test-twitter-hybrid-oauth.js
```

This tests:
- Environment variable configuration
- OAuth 1.0a signature generation
- Multipart form data creation

## Security Considerations

### OAuth 2.0
- ✅ Access tokens expire and can be refreshed
- ✅ Refresh tokens are securely stored
- ✅ User authorization is required

### OAuth 1.0a
- ✅ Consumer key/secret are app-level (same for all users)
- ✅ Access token secret is user-specific and encrypted
- ✅ Signatures are generated using HMAC-SHA1
- ✅ Nonces prevent replay attacks

## Troubleshooting

### Common Issues

1. **"OAuth 1.0a credentials not found"**
   - User needs to complete OAuth 1.0a setup
   - Check if `accessTokenSecret` is set in database

2. **Media upload fails with 403**
   - Verify OAuth 1.0a credentials are correct
   - Check Twitter Developer Portal permissions

3. **Text tweets work but media fails**
   - OAuth 2.0 is working (good)
   - OAuth 1.0a needs setup or has incorrect credentials

### Debug Steps

1. Check browser console for error messages
2. Verify environment variables are set
3. Check database for OAuth 1.0a credentials
4. Test OAuth 1.0a signature generation
5. Verify Twitter Developer Portal settings

## Twitter Developer Portal Setup

### OAuth 2.0 Settings
- ✅ App permissions: "Read and Write"
- ✅ OAuth 2.0: Enabled
- ✅ Callback URL: `http://localhost:3000/api/social/twitter/callback`

### OAuth 1.0a Settings
- ✅ OAuth 1.0a: Enabled
- ✅ App permissions: "Read and Write"
- ✅ Generate access token and secret for your app

## Future Enhancements

1. **Automatic OAuth 1.0a Setup**: Integrate OAuth 1.0a flow into main connection
2. **Token Refresh**: Implement OAuth 1.0a token refresh mechanism
3. **Bulk Media Upload**: Support for multiple images in single request
4. **Media Validation**: Enhanced image format and size validation
5. **Error Recovery**: Better error handling and user guidance

## Summary

The hybrid OAuth system successfully combines:

- **OAuth 2.0**: Modern, secure account connection and general API access
- **OAuth 1.0a**: Legacy requirement for media uploads

**Benefits**:
- ✅ Users can connect accounts easily via OAuth 2.0
- ✅ Media uploads work via OAuth 1.0a
- ✅ No breaking changes to existing OAuth 2.0 functionality
- ✅ Secure credential storage and management
- ✅ Clear user experience for setup and usage

**Key Success Factors**:
1. **No changes to OAuth 2.0**: Existing functionality preserved
2. **Clear separation of concerns**: Each OAuth system handles its specific purpose
3. **User-friendly setup**: Clear guidance for OAuth 1.0a configuration
4. **Robust error handling**: Graceful fallbacks and user feedback
5. **Security best practices**: Proper credential management and signature generation

The system is now ready for production use with Twitter media uploads enabled.

