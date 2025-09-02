# OAuth Setup Guide for Social Media Platforms

This guide will help you set up OAuth for all supported social media platforms in Aurora Social.

## Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Base URL (required for all platforms)
NEXTAUTH_URL=http://localhost:3000

# Twitter/X OAuth
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# Instagram OAuth
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret

# YouTube OAuth (Google)
YOUTUBE_CLIENT_ID=your_google_client_id
YOUTUBE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
```

## Platform-Specific Setup

### 1. Twitter/X OAuth Setup

1. **Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)**
2. **Create a new app or use existing one**
3. **Set OAuth 2.0 settings:**
   - **App permissions**: Read and Write
   - **Type of App**: Web App
   - **Callback URLs**: `http://localhost:3000/api/social/twitter/callback`
   - **Website URL**: `http://localhost:3000`
4. **Copy Client ID and Client Secret to your `.env.local`**

**Note**: Twitter is now X, but the OAuth endpoints remain the same.

### 2. LinkedIn OAuth Setup

1. **Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)**
2. **Create a new app**
3. **Set OAuth 2.0 settings:**
   - **Redirect URLs**: `http://localhost:3000/api/social/linkedin/callback`
   - **Products**: Sign In with LinkedIn, Marketing Developer Platform
4. **Request access to these scopes:**
   - `r_liteprofile` (Basic profile info)
   - `r_emailaddress` (Email address)
   - `w_member_social` (Post content - requires approval)
5. **Copy Client ID and Client Secret to your `.env.local`**

**Important**: The `w_member_social` scope requires LinkedIn approval and may take several days.

### 3. Instagram OAuth Setup

1. **Go to [Facebook Developer Portal](https://developers.facebook.com/)**
2. **Create a new app** (Instagram uses Facebook's OAuth system)
3. **Add Instagram Basic Display product**
4. **Set OAuth settings:**
   - **Valid OAuth Redirect URIs**: `http://localhost:3000/api/social/instagram/callback`
   - **Deauthorize Callback URL**: `http://localhost:3000/api/social/instagram/webhook`
   - **Data Deletion Request URL**: `http://localhost:3000/api/social/instagram/webhook`
5. **Copy Client ID and Client Secret to your `.env.local`**

**Note**: Instagram OAuth requires the app to be in "Live" mode for production use.

### 4. YouTube OAuth Setup (Google)

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create a new project or select existing one**
3. **Enable YouTube Data API v3**
4. **Go to Credentials → Create Credentials → OAuth 2.0 Client IDs**
5. **Set OAuth settings:**
   - **Application type**: Web application
   - **Authorized redirect URIs**: `http://localhost:3000/api/social/youtube/callback`
6. **Copy Client ID and Client Secret to your `.env.local`**

**Scopes used**: `https://www.googleapis.com/auth/youtube.upload` and `https://www.googleapis.com/auth/youtube.readonly`

### 5. Facebook OAuth Setup

1. **Go to [Facebook Developer Portal](https://developers.facebook.com/)**
2. **Create a new app**
3. **Add Facebook Login product**
4. **Set OAuth settings:**
   - **Valid OAuth Redirect URIs**: `http://localhost:3000/api/social/facebook/callback`
   - **App Domains**: `localhost`
5. **Copy Client ID and Client Secret to your `.env.local`**

**Scopes used**: `pages_manage_posts` and `pages_read_engagement`

## Testing OAuth Flow

1. **Start your development server**: `npm run dev`
2. **Go to `/integrations` page**
3. **Click "Add [Platform] Account" for any platform**
4. **Check browser console for debugging information**
5. **Verify the OAuth redirect works**

## Common Issues and Solutions

### "Client ID is invalid" Error

- **Cause**: Environment variable not set or incorrect
- **Solution**: Check `.env.local` file and restart server

### "Redirect URI mismatch" Error

- **Cause**: OAuth app callback URL doesn't match exactly
- **Solution**: Ensure callback URLs in OAuth apps match exactly with your environment

### "Scope not allowed" Error

- **Cause**: Requested scopes not approved for your OAuth app
- **Solution**: Check OAuth app permissions and request necessary scopes

### "App not in Live mode" Error (Instagram)

- **Cause**: Instagram app still in development mode
- **Solution**: Submit app for review or add test users

## Production Deployment

When deploying to production:

1. **Update `NEXTAUTH_URL` to your production domain**
2. **Update all callback URLs in OAuth apps to production URLs**
3. **Ensure OAuth apps are in "Live" mode**
4. **Set proper security headers and HTTPS**

## Security Best Practices

1. **Never commit `.env.local` to version control**
2. **Use environment-specific OAuth apps for dev/staging/prod**
3. **Implement proper CSRF protection**
4. **Use HTTPS in production**
5. **Regularly rotate OAuth secrets**

## Troubleshooting

If you encounter issues:

1. **Check browser console for error messages**
2. **Verify environment variables are loaded**
3. **Check OAuth app settings match exactly**
4. **Ensure callback URLs are accessible**
5. **Verify OAuth app permissions and scopes**

## Support

For platform-specific issues:
- **Twitter**: [Twitter Developer Support](https://developer.twitter.com/en/support)
- **LinkedIn**: [LinkedIn Developer Support](https://developer.linkedin.com/support)
- **Instagram**: [Facebook Developer Support](https://developers.facebook.com/support/)
- **YouTube**: [Google Cloud Support](https://cloud.google.com/support)
- **Facebook**: [Facebook Developer Support](https://developers.facebook.com/support/)
