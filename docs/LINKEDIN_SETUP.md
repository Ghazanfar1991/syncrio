# LinkedIn API Setup Guide

## Error: "Not enough permissions to access: ugcPosts.CREATE.NO_VERSION"

This error occurs when your LinkedIn app doesn't have the required permissions to create posts. Here's how to fix it:

## Step 1: LinkedIn App Configuration

1. **Go to LinkedIn Developer Portal**
   - Visit: https://www.linkedin.com/developers/
   - Sign in with your LinkedIn account

2. **Create or Update Your App**
   - If you don't have an app, click "Create App"
   - If you have an app, select it from your apps list

3. **Request Required Permissions**
   Your app needs these specific permissions:
   - ✅ `r_liteprofile` - Basic profile info
   - ✅ `r_emailaddress` - Email address
   - ✅ `w_member_social` - **CRITICAL: Post on behalf of members**

## Step 2: Permission Request Process

⚠️ **Important**: LinkedIn requires manual approval for `w_member_social` permission.

1. **In your LinkedIn app dashboard:**
   - Go to "Products" tab
   - Look for "Share on LinkedIn" or "Marketing Developer Platform"
   - Click "Request access" if not already added

2. **Fill out the application:**
   - Explain your use case (social media management tool)
   - Provide detailed description of how you'll use the permission
   - Include screenshots of your application

3. **Wait for approval:**
   - This can take 1-7 business days
   - LinkedIn will review your request manually

## Step 3: Update OAuth Scope

Once approved, update your OAuth scope to include the new permission:

```javascript
// In lib/social/linkedin.ts
scope: 'openid profile email w_member_social'
```

## Step 4: Reconnect LinkedIn Account

After getting approval:

1. **Disconnect existing LinkedIn account:**
   - Go to Settings in your app
   - Disconnect LinkedIn account

2. **Reconnect with new permissions:**
   - Connect LinkedIn account again
   - This will request the new permissions

## Step 5: Test Publishing

Try publishing a post again. It should now work!

## Alternative Solutions

### Option 1: Use LinkedIn Company Pages
If you have a LinkedIn Company Page, you can use the Company API which has different permission requirements.

### Option 2: Manual Posting
For development/testing, you can:
1. Generate the content in your app
2. Copy the content
3. Manually post to LinkedIn

### Option 3: Third-party Services
Consider using services like:
- Buffer API
- Hootsuite API
- Sprout Social API

These services already have LinkedIn permissions and can post on your behalf.

## Troubleshooting

### Common Issues:

1. **"Invalid token" errors:**
   - Token may have expired
   - Reconnect your LinkedIn account

2. **"Insufficient permissions" errors:**
   - App doesn't have `w_member_social` permission
   - Follow the permission request process above

3. **"Rate limit exceeded" errors:**
   - LinkedIn has strict rate limits
   - Wait before trying again

### Debug Steps:

1. **Check token validity:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        "https://api.linkedin.com/v2/people/~"
   ```

2. **Verify permissions:**
   - Check your LinkedIn app dashboard
   - Ensure `w_member_social` is approved and active

3. **Test with minimal post:**
   - Try posting simple text without hashtags
   - Gradually add complexity

## Contact LinkedIn Support

If you continue having issues:
1. Go to LinkedIn Developer Support
2. Reference your app ID
3. Mention the specific error message
4. Include your use case details

---

**Note**: LinkedIn's API policies change frequently. Always check the latest documentation at https://docs.microsoft.com/en-us/linkedin/
