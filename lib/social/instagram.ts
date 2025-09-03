// Instagram OAuth and API integration
import { db } from '@/lib/db'

export interface InstagramConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

// Build a proper base URL (avoid raw VERCEL_URL without protocol)
const INSTAGRAM_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  process.env.NEXTAUTH_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
  'http://localhost:3000'

// Choose OAuth provider: 'instagram' (Basic Display) or 'facebook' (Facebook Login for Instagram Graph)
const IG_OAUTH_PROVIDER = (process.env.INSTAGRAM_OAUTH_PROVIDER || 'instagram').toLowerCase()
const USE_FACEBOOK_OAUTH = IG_OAUTH_PROVIDER === 'facebook' || IG_OAUTH_PROVIDER === 'graph'

const IG_CLIENT_ID = USE_FACEBOOK_OAUTH
  ? (process.env.FACEBOOK_APP_ID || '')
  : (process.env.INSTAGRAM_CLIENT_ID || '')

const IG_CLIENT_SECRET = USE_FACEBOOK_OAUTH
  ? (process.env.FACEBOOK_APP_SECRET || '')
  : (process.env.INSTAGRAM_CLIENT_SECRET || '')

export const instagramConfig: InstagramConfig = {
  clientId: IG_CLIENT_ID,
  clientSecret: IG_CLIENT_SECRET,
  redirectUri: `${INSTAGRAM_BASE_URL}/api/social/instagram/callback`
} 

// Instagram OAuth 2.0 URLs - Instagram API with Instagram Login (2024)
// OAuth endpoints (Basic Display vs Facebook Login) with env overrides
export const INSTAGRAM_OAUTH_URL =
  process.env.INSTAGRAM_AUTH_URL ||
  (USE_FACEBOOK_OAUTH
    ? 'https://www.facebook.com/v18.0/dialog/oauth'
    : 'https://api.instagram.com/oauth/authorize')

export const INSTAGRAM_TOKEN_URL =
  process.env.INSTAGRAM_TOKEN_URL ||
  (USE_FACEBOOK_OAUTH
    ? 'https://graph.facebook.com/v18.0/oauth/access_token'
    : 'https://api.instagram.com/oauth/access_token')

// API base remains graph.instagram.com for read-only (Basic Display).
// Note: For publishing via Instagram Graph, switch to https://graph.facebook.com/v18.0/{ig-user-id}
export const INSTAGRAM_API_BASE = 'https://graph.instagram.com'

// Generate Instagram OAuth authorization URL
export function getInstagramAuthUrl(userId: string, state?: string): string {
  const SCOPES =
    process.env.INSTAGRAM_SCOPES ||
    (USE_FACEBOOK_OAUTH
      ? 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,pages_manage_posts'
      : 'user_profile,user_media')
  const params = new URLSearchParams({
    client_id: instagramConfig.clientId,
    redirect_uri: instagramConfig.redirectUri,
    scope: SCOPES,
    response_type: 'code',
    state: state || userId,
  })

  return `${INSTAGRAM_OAUTH_URL}?${params.toString()}`
}

// Exchange authorization code for access token
export async function exchangeInstagramCode(code: string): Promise<{
  access_token: string
  user_id: string
}> {
  const response = await fetch(INSTAGRAM_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: instagramConfig.clientId,
      client_secret: instagramConfig.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: instagramConfig.redirectUri,
      code,
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Instagram token exchange failed: ${error}`)
  }

  return response.json()
}

// Get long-lived access token
export async function getLongLivedToken(shortLivedToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const response = await fetch(
    `${INSTAGRAM_API_BASE}/access_token?grant_type=ig_exchange_token&client_secret=${instagramConfig.clientSecret}&access_token=${shortLivedToken}`,
    { method: 'GET' }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Instagram long-lived token exchange failed: ${error}`)
  }

  return response.json()
}

// Get Instagram user information
export async function getInstagramUser(accessToken: string): Promise<{
  id: string
  username: string
  account_type: string
  media_count: number
}> {
  const response = await fetch(
    `${INSTAGRAM_API_BASE}/me?fields=id,username,account_type,media_count&access_token=${accessToken}`
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get Instagram user: ${error}`)
  }

  return response.json()
}

// Upload base64 image to Cloudflare R2 and return public URL
async function uploadBase64ImageToR2(base64Image: string, userId: string): Promise<string> {
  try {
    console.log('📤 Uploading base64 image to R2 for Instagram...')

    // Extract base64 data and mime type
    let base64Data = base64Image
    let mimeType = 'image/jpeg'

    if (base64Image.startsWith('data:')) {
      const parts = base64Image.split(',')
      if (parts.length === 2) {
        const header = parts[0]
        base64Data = parts[1]

        const mimeMatch = header.match(/data:([^;]+)/)
        if (mimeMatch) {
          mimeType = mimeMatch[1]
        }
      }
    }

    // Convert to buffer
    const buffer = Buffer.from(base64Data, 'base64')

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const extension = mimeType.split('/')[1] || 'jpg'
    const key = `instagram-images/${userId}/${timestamp}-${randomId}.${extension}`

    // Upload to R2 using direct S3 client instead of API route
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')

    const r2Client = new S3Client({
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    })

    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })

    await r2Client.send(uploadCommand)

    // Generate public URL
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`
    console.log('✅ Image uploaded to R2:', publicUrl)

    return publicUrl
  } catch (error) {
    console.error('❌ Failed to upload base64 image to R2:', error)
    throw error
  }
}

// Create Instagram media container (supports images, videos, and reels)
export async function createInstagramMedia(
  accessToken: string,
  mediaUrl: string | string[],
  caption: string,
  mediaType: 'IMAGE' | 'VIDEO' | 'REELS' = 'IMAGE',
  userId?: string
): Promise<{ id: string }> {
  console.log('📸 Creating Instagram media container...')
  console.log('Media type:', mediaType)
  console.log('Media URL type:', typeof mediaUrl)
  console.log('Is array:', Array.isArray(mediaUrl))

  // Log video requirements for debugging
  if (mediaType === 'REELS') {
    console.log('📹 Instagram Reels Requirements:')
    console.log('   - Format: MP4 with H.264 video codec')
    console.log('   - Audio: AAC audio codec')
    console.log('   - Duration: 3-60 seconds')
    console.log('   - Size: Max 100MB')
    console.log('   - Resolution: 1080x1920 (9:16 aspect ratio) recommended')
    console.log('   - Frame rate: 30fps recommended')
  }

  // Handle single media URL
  const singleMediaUrl = Array.isArray(mediaUrl) ? mediaUrl[0] : mediaUrl

  // Check if it's a base64 image and upload to R2 if needed
  let finalMediaUrl = singleMediaUrl
  if (singleMediaUrl.startsWith('data:')) {
    console.log('📤 Base64 image detected, uploading to R2...')
    // Use provided userId or generate a default
    const uploadUserId = userId || `instagram-user-${Date.now()}`
    finalMediaUrl = await uploadBase64ImageToR2(singleMediaUrl, uploadUserId)
  }

  console.log('Final media URL:', finalMediaUrl.substring(0, 100) + '...')

  // Step 1: Create media container
  const createParams: Record<string, string> = {
    caption: caption,
    access_token: accessToken,
  }

  // Add media URL based on type
  if (mediaType === 'VIDEO' || mediaType === 'REELS') {
    createParams.video_url = finalMediaUrl
    createParams.media_type = mediaType
  } else {
    createParams.image_url = finalMediaUrl
  }

  console.log('📤 Creating media container with params:', {
    ...createParams,
    access_token: '[HIDDEN]',
    image_url: createParams.image_url ? createParams.image_url.substring(0, 50) + '...' : undefined,
    video_url: createParams.video_url ? createParams.video_url.substring(0, 50) + '...' : undefined
  })

  const createResponse = await fetch(
    `${INSTAGRAM_API_BASE}/me/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(createParams)
    }
  )

  if (!createResponse.ok) {
    const error = await createResponse.text()
    console.error('❌ Failed to create Instagram media container:', error)
    throw new Error(`Failed to create Instagram media: ${error}`)
  }

  const createData = await createResponse.json()
  console.log('✅ Media container created:', createData.id)

  // Step 2: Check media status (required for videos)
  if (mediaType === 'VIDEO' || mediaType === 'REELS') {
    console.log('🔄 Checking video processing status...')
    try {
      await waitForMediaProcessing(accessToken, createData.id)
    } catch (error) {
      console.error('❌ Video processing failed:', error)
      console.log('⚠️ Attempting to publish anyway (some videos may work despite processing errors)...')
      // Continue with publishing - sometimes Instagram processes videos after publishing
    }
  }

  // Step 3: Publish media
  console.log('📤 Publishing media container...')
  const publishResponse = await fetch(
    `${INSTAGRAM_API_BASE}/me/media_publish`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        creation_id: createData.id,
        access_token: accessToken,
      })
    }
  )

  if (!publishResponse.ok) {
    const error = await publishResponse.text()
    console.error('❌ Failed to publish Instagram media:', error)
    throw new Error(`Failed to publish Instagram media: ${error}`)
  }

  const publishData = await publishResponse.json()
  console.log('✅ Instagram media published successfully:', publishData.id)

  return publishData
}

// Wait for video processing to complete
async function waitForMediaProcessing(accessToken: string, containerId: string): Promise<void> {
  const maxAttempts = 12 // 2 minutes max wait time (reduced from 5 minutes)
  const delayMs = 10000 // 10 seconds between checks

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔄 Checking media status (attempt ${attempt}/${maxAttempts})...`)

    try {
      const statusResponse = await fetch(
        `${INSTAGRAM_API_BASE}/${containerId}?fields=status_code,status&access_token=${accessToken}`
      )

      if (!statusResponse.ok) {
        console.warn('⚠️ Failed to check media status, continuing...')
        break
      }

      const statusData = await statusResponse.json()
      console.log('📊 Media status:', statusData.status_code)
      console.log('📊 Media details:', statusData)

      if (statusData.status_code === 'FINISHED') {
        console.log('✅ Media processing completed!')
        return
      } else if (statusData.status_code === 'ERROR') {
        console.error('❌ Instagram video processing failed. Common causes:')
        console.error('   - Video format not supported (use MP4 with H.264)')
        console.error('   - Video too large (max 100MB)')
        console.error('   - Video too long (max 60 seconds for Reels)')
        console.error('   - Video resolution issues (recommended: 1080x1920 for Reels)')
        console.error('   - Audio codec issues (use AAC)')

        // Get more detailed error info if available
        try {
          const detailResponse = await fetch(
            `${INSTAGRAM_API_BASE}/${containerId}?fields=status_code,status,error&access_token=${accessToken}`
          )
          if (detailResponse.ok) {
            const detailData = await detailResponse.json()
            console.error('📊 Detailed error info:', detailData)
          }
        } catch (e) {
          console.warn('Could not get detailed error info')
        }

        throw new Error(`Instagram video processing failed. Check video format: MP4, H.264, max 100MB, max 60s for Reels`)
      }

      // Wait before next check
      if (attempt < maxAttempts) {
        console.log(`⏳ Waiting ${delayMs/1000} seconds before next check...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    } catch (error) {
      console.warn(`⚠️ Error checking media status (attempt ${attempt}):`, error)
      if (attempt === maxAttempts) {
        throw error
      }
    }
  }

  console.log('⚠️ Media processing status check timed out, proceeding with publish...')
}

// Validate video for Instagram Reels
function validateVideoForInstagram(videoUrl: string): { valid: boolean; error?: string } {
  console.log('🔍 Validating video for Instagram Reels...')

  // Check URL format
  if (!videoUrl || typeof videoUrl !== 'string') {
    return { valid: false, error: 'Invalid video URL' }
  }

  // Check if it's a supported video format
  const supportedFormats = ['.mp4', '.mov', '.m4v']
  const hasValidFormat = supportedFormats.some(format =>
    videoUrl.toLowerCase().includes(format)
  )

  if (!hasValidFormat) {
    return {
      valid: false,
      error: 'Unsupported video format. Use MP4, MOV, or M4V'
    }
  }

  console.log('✅ Video format validation passed')
  return { valid: true }
}

// Create Instagram video post (all videos are now REELS per Instagram API update)
export async function createInstagramVideo(
  accessToken: string,
  videoUrl: string,
  caption: string,
  userId?: string
): Promise<{ id: string }> {
  console.log('📹 Creating Instagram video as REEL (VIDEO type deprecated)')

  // Validate video before processing
  const validation = validateVideoForInstagram(videoUrl)
  if (!validation.valid) {
    throw new Error(`Video validation failed: ${validation.error}`)
  }

  return createInstagramMedia(accessToken, videoUrl, caption, 'REELS', userId)
}

// Validate image aspect ratio for Instagram
async function validateImageAspectRatio(imageUrl: string): Promise<{ valid: boolean; error?: string; aspectRatio?: string }> {
  try {
    // For base64 images, we can't easily check dimensions without decoding
    // For now, we'll let Instagram handle the validation and provide better error handling
    if (imageUrl.startsWith('data:')) {
      console.log('⚠️ Base64 image detected - aspect ratio will be validated by Instagram')
      return { valid: true }
    }

    // For URL images, we could potentially fetch and check dimensions
    // But this would add complexity and delay, so we'll rely on Instagram's validation
    return { valid: true }
  } catch (error) {
    return { valid: false, error: 'Could not validate image aspect ratio' }
  }
}

// Create Instagram carousel post (multiple images)
export async function createInstagramCarousel(
  accessToken: string,
  imageUrls: string[],
  caption: string,
  userId?: string
): Promise<{ id: string }> {
  console.log(`📸 Creating Instagram carousel with ${imageUrls.length} images...`)
  console.log('📏 Instagram carousel requirements:')
  console.log('   - 2-10 images per carousel')
  console.log('   - Supported aspect ratios: 1:1 (square), 4:5 (portrait), 1.91:1 (landscape)')
  console.log('   - All images in carousel should have similar aspect ratios')
  console.log('   - Recommended: Use consistent aspect ratio for all images')

  if (imageUrls.length < 2 || imageUrls.length > 10) {
    throw new Error('Instagram carousel requires 2-10 images')
  }

  // Step 1: Create media containers for each image with better error handling
  const mediaIds: string[] = []
  const failedImages: Array<{ index: number; error: string }> = []

  for (let i = 0; i < imageUrls.length; i++) {
    console.log(`📸 Creating media container ${i + 1}/${imageUrls.length}...`)

    try {
      let imageUrl = imageUrls[i]

      // Handle base64 images
      if (imageUrl.startsWith('data:')) {
        console.log(`📤 Converting base64 image ${i + 1} to public URL...`)
        const uploadUserId = userId || `instagram-user-${Date.now()}`
        imageUrl = await uploadBase64ImageToR2(imageUrl, uploadUserId)
      }

      // Validate aspect ratio
      const validation = await validateImageAspectRatio(imageUrl)
      if (!validation.valid) {
        console.warn(`⚠️ Image ${i + 1} aspect ratio validation warning: ${validation.error}`)
      }

      const createResponse = await fetch(
        `${INSTAGRAM_API_BASE}/me/media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            image_url: imageUrl,
            is_carousel_item: 'true',
            access_token: accessToken,
          })
        }
      )

      if (!createResponse.ok) {
        const error = await createResponse.text()
        const errorData = JSON.parse(error)

        // Handle aspect ratio errors specifically
        if (errorData.error?.code === 36003) {
          const aspectRatioError = `Image ${i + 1} has invalid aspect ratio. Instagram supports: 1:1 (square), 4:5 (portrait), 1.91:1 (landscape). All images in carousel should have similar ratios.`
          console.error(`❌ ${aspectRatioError}`)
          failedImages.push({ index: i + 1, error: aspectRatioError })
          continue // Skip this image and try the next one
        }

        throw new Error(`Failed to create carousel item ${i + 1}: ${error}`)
      }

      const createData = await createResponse.json()
      mediaIds.push(createData.id)
      console.log(`✅ Created carousel item ${i + 1}: ${createData.id}`)
    } catch (error) {
      console.error(`❌ Failed to process image ${i + 1}:`, error)
      failedImages.push({
        index: i + 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // Check if we have enough valid images for a carousel
  if (mediaIds.length < 2) {
    if (failedImages.length > 0) {
      const errorSummary = failedImages.map(f => `Image ${f.index}: ${f.error}`).join('\n')
      throw new Error(`Not enough valid images for carousel. Failed images:\n${errorSummary}\n\nTip: Ensure all images have consistent aspect ratios (1:1, 4:5, or 1.91:1)`)
    } else {
      throw new Error('Instagram carousel requires at least 2 valid images')
    }
  }

  // Warn about failed images but continue with valid ones
  if (failedImages.length > 0) {
    console.warn(`⚠️ ${failedImages.length} image(s) failed validation and were skipped. Continuing with ${mediaIds.length} valid images.`)
  }

  // Step 2: Create carousel container
  console.log('📸 Creating carousel container...')
  const carouselResponse = await fetch(
    `${INSTAGRAM_API_BASE}/me/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        media_type: 'CAROUSEL',
        children: mediaIds.join(','),
        caption: caption,
        access_token: accessToken,
      })
    }
  )

  if (!carouselResponse.ok) {
    const error = await carouselResponse.text()
    throw new Error(`Failed to create carousel container: ${error}`)
  }

  const carouselData = await carouselResponse.json()
  console.log('✅ Carousel container created:', carouselData.id)

  // Step 3: Publish carousel
  console.log('📤 Publishing carousel...')
  const publishResponse = await fetch(
    `${INSTAGRAM_API_BASE}/me/media_publish`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        creation_id: carouselData.id,
        access_token: accessToken,
      })
    }
  )

  if (!publishResponse.ok) {
    const error = await publishResponse.text()
    throw new Error(`Failed to publish carousel: ${error}`)
  }

  const publishData = await publishResponse.json()
  console.log('✅ Instagram carousel published successfully:', publishData.id)

  return publishData
}

// Create Instagram image post (handles base64 conversion)
export async function createInstagramImage(
  accessToken: string,
  imageUrl: string | string[],
  caption: string,
  userId?: string
): Promise<{ id: string }> {
  // Handle multiple images as carousel
  if (Array.isArray(imageUrl)) {
    if (imageUrl.length > 1) {
      try {
        return await createInstagramCarousel(accessToken, imageUrl, caption, userId)
      } catch (error) {
        console.error('❌ Carousel creation failed:', error)
        console.log('🔄 Falling back to posting first image only...')
        console.log('💡 Tip: Ensure all images have consistent aspect ratios for carousel posts')

        // Fallback to posting just the first image
        return createInstagramMedia(accessToken, imageUrl[0], caption, 'IMAGE', userId)
      }
    } else if (imageUrl.length === 1) {
      return createInstagramMedia(accessToken, imageUrl[0], caption, 'IMAGE', userId)
    } else {
      throw new Error('No images provided')
    }
  }

  return createInstagramMedia(accessToken, imageUrl, caption, 'IMAGE', userId)
}

// Determine media type from URL
export function getMediaType(mediaUrl: string): 'IMAGE' | 'VIDEO' {
  if (!mediaUrl) return 'IMAGE'

  // Check file extension
  const url = mediaUrl.toLowerCase()
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

  for (const ext of videoExtensions) {
    if (url.includes(ext)) return 'VIDEO'
  }

  for (const ext of imageExtensions) {
    if (url.includes(ext)) return 'IMAGE'
  }

  // Check if it's a base64 image
  if (mediaUrl.startsWith('data:image/')) return 'IMAGE'
  if (mediaUrl.startsWith('data:video/')) return 'VIDEO'

  // Default to image
  return 'IMAGE'
}

// Helper function to provide aspect ratio guidance
export function getInstagramAspectRatioGuidance(): string {
  return `
📏 Instagram Aspect Ratio Requirements:

✅ SUPPORTED ASPECT RATIOS:
   • 1:1 (Square) - 1080x1080px - Best for feed posts
   • 4:5 (Portrait) - 1080x1350px - Good for mobile viewing
   • 1.91:1 (Landscape) - 1080x566px - Wider format

🎯 CAROUSEL POSTS:
   • All images should have the SAME aspect ratio
   • Mix of different ratios will cause errors
   • 2-10 images maximum per carousel

❌ AVOID THESE RATIOS:
   • Extreme vertical (taller than 4:5)
   • Extreme horizontal (wider than 1.91:1)
   • Inconsistent ratios in carousels

💡 TIPS:
   • Use photo editing tools to crop to supported ratios
   • For carousels, crop all images to the same ratio first
   • Square (1:1) works best for mixed content
`
}

// Get Instagram media insights
export async function getInstagramMediaInsights(
  accessToken: string,
  mediaId: string
): Promise<{
  impressions?: number
  reach?: number
  likes?: number
  comments?: number
  saves?: number
}> {
  const response = await fetch(
    `${INSTAGRAM_API_BASE}/${mediaId}/insights?metric=impressions,reach,likes,comments,saves&access_token=${accessToken}`
  )

  if (!response.ok) {
    // Return empty insights if not available
    return {}
  }

  const data = await response.json()
  const insights: any = {}
  
  data.data?.forEach((metric: any) => {
    insights[metric.name] = metric.values?.[0]?.value || 0
  })

  return insights
}

// Save Instagram account to database
export async function saveInstagramAccount(
  userId: string,
  accessToken: string,
  expiresIn?: number
): Promise<void> {
  // Get user info from Instagram
  const instagramUser = await getInstagramUser(accessToken)
  
  const expiresAt = expiresIn 
    ? new Date(Date.now() + expiresIn * 1000)
    : null

  // Save to database
  await db.socialAccount.upsert({
    where: {
      userId_platform_accountId: {
        userId,
        platform: 'INSTAGRAM',
        accountId: instagramUser.id
      }
    },
    update: {
      accessToken,
      accountName: `@${instagramUser.username}`,
      expiresAt,
      isActive: true,
      updatedAt: new Date()
    },
    create: {
      userId,
      platform: 'INSTAGRAM',
      accountId: instagramUser.id,
      accountName: `@${instagramUser.username}`,
      accessToken,
      expiresAt,
      isActive: true
    }
  })
}

// Helper function to get valid Instagram token for user
export async function getValidInstagramToken(userId: string, accountId: string): Promise<string | null> {
  const account = await db.socialAccount.findUnique({
    where: {
      userId_platform_accountId: {
        userId,
        platform: 'INSTAGRAM',
        accountId
      }
    }
  })

  if (!account || !account.isActive) {
    return null
  }

  // Check if token is expired
  if (account.expiresAt && account.expiresAt < new Date()) {
    // Instagram long-lived tokens can be refreshed
    try {
      const newTokens = await getLongLivedToken(account.accessToken)
      
      // Update in database
      await db.socialAccount.update({
        where: { id: account.id },
        data: {
          accessToken: newTokens.access_token,
          expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
          updatedAt: new Date()
        }
      })

      return newTokens.access_token
    } catch (error) {
      console.error('Failed to refresh Instagram token:', error)
      // Mark account as inactive
      await db.socialAccount.update({
        where: { id: account.id },
        data: { isActive: false }
      })
      return null
    }
  }

  return account.accessToken
}

// Refresh Instagram token (Instagram supports long-lived token refresh)
export async function refreshInstagramToken(accessToken: string): Promise<{
  access_token: string
  refresh_token?: string
  expires_in?: number
}> {
  try {
    const newTokens = await getLongLivedToken(accessToken)
    return {
      access_token: newTokens.access_token,
      expires_in: newTokens.expires_in
    }
  } catch (error) {
    throw new Error(`Failed to refresh Instagram token: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
