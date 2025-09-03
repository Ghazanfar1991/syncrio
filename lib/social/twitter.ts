// Twitter OAuth and API integration
import { db } from '../db'
import { processImagesForUpload } from './image-upload'
import { uploadMediaWithOAuth2 } from './twitter-oauth-config'

const TWITTER_API_BASE = 'https://api.twitter.com/2'
const TWITTER_UPLOAD_BASE = 'https://upload.twitter.com/2'

// Add timestamp to make tweets unique (disabled to avoid unwanted hashtags)
function addTimestampToTweet(content: string): string {
  // Return content as-is without adding timestamp hashtag
  return content
}

// Upload media using OAuth 1.0a (required for Twitter media upload endpoint)
export async function uploadTwitterMediaOAuth1a(
  imageBuffer: Buffer,
  mimeType: string,
  userId: string,
  accountId: string
): Promise<string> {
  console.log('📸 [DEBUG] Starting media upload to Twitter using OAuth 1.0a...')
  console.log('📸 [DEBUG] Image buffer size:', imageBuffer.length, 'bytes')
  console.log('📸 [DEBUG] MIME type:', mimeType)
  console.log('📸 [DEBUG] User ID:', userId)
  console.log('📸 [DEBUG] Account ID:', accountId)
  
  try {
    // Get OAuth 1.0a credentials from database
    const account = await db.socialAccount.findUnique({
      where: { id: accountId, userId },
      select: { consumerKey: true, consumerSecret: true, accessTokenSecret: true, oauth1AccessToken: true }
    })
    
    if (!account?.consumerKey || !account?.consumerSecret || !account?.accessTokenSecret || !account?.oauth1AccessToken) {
      console.error('❌ [DEBUG] OAuth 1.0a credentials not found for media upload')
      console.error('❌ [DEBUG] Missing credentials:', {
        hasConsumerKey: !!account?.consumerKey,
        hasConsumerSecret: !!account?.consumerSecret,
        hasAccessTokenSecret: !!account?.accessTokenSecret,
        hasOAuth1AccessToken: !!account?.oauth1AccessToken
      })
      throw new Error('OAuth 1.0a credentials not configured for media upload. Please set up media upload in your social accounts settings.')
    }
    
    console.log('✅ [DEBUG] OAuth 1.0a credentials found, proceeding with media upload...')
    
    // Import OAuth 1.0a functions
    const { createTwitterMediaUploadRequest } = await import('./twitter-oauth')
    
    // Create OAuth 1.0a request
    const { body, headers } = createTwitterMediaUploadRequest(
      imageBuffer,
      mimeType,
      account.consumerKey,
      account.consumerSecret,
      account.oauth1AccessToken, // Use OAuth 1.0a access token
      account.accessTokenSecret
    )
    
    console.log('📸 [DEBUG] OAuth 1.0a request created successfully')
    console.log('📸 [DEBUG] Request headers:', JSON.stringify(headers, null, 2))
    
    const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json'
    console.log('📸 [DEBUG] Upload URL:', uploadUrl)
    
    console.log('📸 [DEBUG] Sending POST request to Twitter media upload...')
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body
    })
    
    console.log('📸 [DEBUG] Response received')
    console.log('📸 [DEBUG] Response status:', response.status)
    console.log('📸 [DEBUG] Response status text:', response.statusText)
    console.log('📸 [DEBUG] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [DEBUG] Media upload failed with status:', response.status)
      console.error('❌ [DEBUG] Error response:', errorText)
      throw new Error(`Media upload failed: ${errorText}`)
    }

    const data = await response.json()
    console.log('✅ [DEBUG] Media upload successful!')
    console.log('✅ [DEBUG] Response data:', JSON.stringify(data, null, 2))
    console.log('✅ [DEBUG] Media ID:', data.media_id_string)
    
    return data.media_id_string
  } catch (error) {
    console.error('❌ [DEBUG] Media upload error:', error)
    console.error('❌ [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    throw error
  }
}

// Upload multiple media files using OAuth 1.0a
export async function uploadMultipleTwitterMediaOAuth1a(
  images: Array<{ buffer: Buffer; mimeType: string }>,
  userId: string,
  accountId: string
): Promise<string[]> {
  console.log(`📸 [DEBUG] Starting multiple media upload to Twitter using OAuth 1.0a...`)
  console.log(`📸 [DEBUG] Total images to upload: ${images.length}`)
  console.log(`📸 [DEBUG] User ID: ${userId}`)
  console.log(`📸 [DEBUG] Account ID: ${accountId}`)
  
  const mediaIds: string[] = []
  
  for (let i = 0; i < images.length; i++) {
    const image = images[i]
    console.log(`📸 [DEBUG] Processing image ${i + 1}/${images.length}`)
    console.log(`📸 [DEBUG] Image buffer size: ${image.buffer.length} bytes`)
    console.log(`📸 [DEBUG] Image MIME type: ${image.mimeType}`)
    
    try {
      console.log(`📸 [DEBUG] Calling uploadTwitterMediaOAuth1a for image ${i + 1}...`)
      const mediaId = await uploadTwitterMediaOAuth1a(image.buffer, image.mimeType, userId, accountId)
      mediaIds.push(mediaId)
      console.log(`✅ [DEBUG] Successfully uploaded image ${i + 1}/${images.length}, media_id: ${mediaId}`)
    } catch (error) {
      console.error(`❌ [DEBUG] Failed to upload image ${i + 1}/${images.length}:`, error)
      console.error(`❌ [DEBUG] Error details:`, error instanceof Error ? error.message : String(error))
      throw error
    }
  }
  
  console.log(`🎉 [DEBUG] Successfully uploaded ${mediaIds.length} media files`)
  console.log(`🎉 [DEBUG] Final media IDs:`, mediaIds)
  return mediaIds
}

// Upload multiple media files using OAuth 2.0
export async function uploadMultipleTwitterMediaOAuth2(
  images: Array<{ buffer: Buffer; mimeType: string }>,
  accessToken: string
): Promise<string[]> {
  console.log(`📸 [DEBUG] Starting multiple media upload to Twitter using OAuth 2.0...`)
  console.log(`📸 [DEBUG] Total images to upload: ${images.length}`)
  console.log(`📸 [DEBUG] Access token length: ${accessToken.length}`)

  const mediaIds: string[] = []

  for (let i = 0; i < images.length; i++) {
    const image = images[i]
    console.log(`📸 [DEBUG] Processing image ${i + 1}/${images.length}`)
    console.log(`📸 [DEBUG] Image buffer size: ${image.buffer.length} bytes`)
    console.log(`📸 [DEBUG] Image MIME type: ${image.mimeType}`)

    try {
      console.log(`📸 [DEBUG] Calling uploadMediaWithOAuth2 for image ${i + 1}...`)
      const result = await uploadMediaWithOAuth2(accessToken, image.buffer, image.mimeType)
      mediaIds.push(result.media_id_string)
      console.log(`✅ [DEBUG] Successfully uploaded image ${i + 1}/${images.length}, media_id: ${result.media_id_string}`)
    } catch (error) {
      console.error(`❌ [DEBUG] Failed to upload image ${i + 1}/${images.length}:`, error)
      console.error(`❌ [DEBUG] Error details:`, error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  console.log(`🎉 [DEBUG] Successfully uploaded ${mediaIds.length} media files using OAuth 2.0`)
  console.log(`🎉 [DEBUG] Final media IDs:`, mediaIds)
  return mediaIds
}

// Upload video to Twitter using OAuth 2.0 (Twitter API v2)
export async function uploadTwitterVideo(
  videoUrl: string,
  userId: string,
  accountId: string
): Promise<string> {
  try {
    console.log('[Twitter] Starting video upload with OAuth 2.0...')
    console.log('[Twitter] Video URL:', videoUrl.substring(0, 50) + '...')

    // Step 1: Download video from R2
    console.log('[Twitter] Downloading video from R2...')
    const videoResponse = await fetch(videoUrl)
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`)
    }

    const videoBuffer = await videoResponse.arrayBuffer()
    console.log('[Twitter] Video downloaded, size:', videoBuffer.byteLength)

    // Step 2: Get OAuth credentials from database
    // Video uploads require OAuth 1.0a, but we'll try OAuth 2.0 first and fallback
    const account = await db.socialAccount.findUnique({
      where: { id: accountId, userId },
      select: {
        accessToken: true,
        consumerKey: true,
        consumerSecret: true,
        accessTokenSecret: true,
        oauth1AccessToken: true
      }
    })

    if (!account?.accessToken) {
      throw new Error('No access token found for video upload')
    }

    // Check OAuth 1.0a credentials from environment (not database)
    const envConsumerKey = process.env.TWITTER_CONSUMER_KEY
    const envConsumerSecret = process.env.TWITTER_CONSUMER_SECRET
    const envAccessToken = process.env.TWITTER_ACCESS_TOKEN
    const envAccessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET

    const hasOAuth1FromEnv = envConsumerKey && envConsumerSecret && envAccessToken && envAccessTokenSecret

    console.log('[Twitter] OAuth credentials check:', {
      hasOAuth2: !!account.accessToken,
      hasOAuth1FromDatabase: !!(account.consumerKey && account.consumerSecret && account.accessTokenSecret && account.oauth1AccessToken),
      hasOAuth1FromEnv: !!hasOAuth1FromEnv,
      envConsumerKey: !!envConsumerKey,
      envConsumerSecret: !!envConsumerSecret,
      envAccessToken: !!envAccessToken,
      envAccessTokenSecret: !!envAccessTokenSecret
    })

    // Step 3: Upload video using OAuth 1.0a hybrid approach
    if (!hasOAuth1FromEnv) {
      console.error('[Twitter] Missing OAuth 1.0a credentials in environment')
      console.error('[Twitter] Required: TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET')
      console.error('[Twitter] Current values:', {
        TWITTER_CONSUMER_KEY: envConsumerKey ? 'SET' : 'MISSING',
        TWITTER_CONSUMER_SECRET: envConsumerSecret ? 'SET' : 'MISSING',
        TWITTER_ACCESS_TOKEN: envAccessToken ? 'SET' : 'MISSING',
        TWITTER_ACCESS_TOKEN_SECRET: envAccessTokenSecret ? 'SET' : 'MISSING'
      })
      throw new Error('TWITTER_OAUTH1_MISSING: OAuth 1.0a credentials required for video uploads. Please add TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_TOKEN_SECRET to your .env file.')
    }

    console.log('[Twitter] Using OAuth 1.0a hybrid approach for video upload...')
    console.log('[Twitter] OAuth 1.0a credentials found, proceeding with video upload...')

    try {
      return await uploadVideoWithOAuth1(
        videoBuffer,
        envConsumerKey!,
        envConsumerSecret!,
        envAccessToken!,
        envAccessTokenSecret!
      )
    } catch (error) {
      console.error('[Twitter] OAuth 1.0a video upload failed:', error)
      throw error
    }


  } catch (error) {
    console.error('[Twitter] Video upload error:', error)
    throw error
  }
}

// Upload video using OAuth 1.0a (required for video uploads)
async function uploadVideoWithOAuth1(
  videoBuffer: ArrayBuffer,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): Promise<string> {
  try {
    console.log('[Twitter] Starting OAuth 1.0a video upload...')
    console.log('[Twitter] Video size:', videoBuffer.byteLength, 'bytes')

    // Import OAuth 1.0a video upload function
    const { createTwitterVideoUploadRequest } = await import('./twitter-oauth')

    // Step 1: Initialize upload
    console.log('[Twitter] Initializing chunked upload...')
    const initResponse = await createTwitterVideoUploadRequest(
      'INIT',
      Buffer.from(videoBuffer),
      'video/mp4',
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret
    )

    if (!initResponse.media_id_string) {
      console.error('[Twitter] Init response:', initResponse)
      throw new Error('Failed to initialize video upload - no media_id returned')
    }

    const mediaId = initResponse.media_id_string
    console.log('[Twitter] Video upload initialized, media_id:', mediaId)

    // Step 2: Upload video chunks
    console.log('[Twitter] Uploading video chunks...')
    const chunkSize = 5 * 1024 * 1024 // 5MB chunks
    const totalChunks = Math.ceil(videoBuffer.byteLength / chunkSize)
    console.log('[Twitter] Total chunks to upload:', totalChunks)

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, videoBuffer.byteLength)
      const chunk = videoBuffer.slice(start, end)

      console.log(`[Twitter] Uploading chunk ${i + 1}/${totalChunks} (${chunk.byteLength} bytes)`)

      await createTwitterVideoUploadRequest(
        'APPEND',
        Buffer.from(chunk),
        'video/mp4',
        consumerKey,
        consumerSecret,
        accessToken,
        accessTokenSecret,
        mediaId,
        i
      )

      console.log(`[Twitter] Chunk ${i + 1}/${totalChunks} uploaded successfully`)
    }

    // Step 3: Finalize upload
    console.log('[Twitter] Finalizing video upload...')
    const finalizeResponse = await createTwitterVideoUploadRequest(
      'FINALIZE',
      Buffer.from(videoBuffer),
      'video/mp4',
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret,
      mediaId
    )

    console.log('[Twitter] Finalize response:', finalizeResponse)

    // Step 4: Wait for video processing if needed
    if (finalizeResponse.processing_info) {
      console.log('[Twitter] Video processing required:', finalizeResponse.processing_info)
      await waitForVideoProcessing(mediaId, consumerKey, consumerSecret, accessToken, accessTokenSecret)
    }

    console.log('[Twitter] Video upload completed successfully, media_id:', mediaId)
    return mediaId

  } catch (error) {
    console.error('[Twitter] OAuth 1.0a video upload error:', error)
    throw error
  }
}

// Wait for video processing to complete
async function waitForVideoProcessing(
  mediaId: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): Promise<void> {
  console.log('[Twitter] Waiting for video processing to complete...')

  const maxAttempts = 30 // Maximum 30 attempts (about 5 minutes)
  let attempts = 0

  while (attempts < maxAttempts) {
    attempts++
    console.log(`[Twitter] Checking processing status (attempt ${attempts}/${maxAttempts})...`)

    try {
      // Import the status check function
      const { createTwitterVideoUploadRequest } = await import('./twitter-oauth')

      // Check processing status
      const statusResponse = await createTwitterVideoUploadRequest(
        'STATUS' as any,
        Buffer.alloc(0), // Empty buffer for status check
        'video/mp4',
        consumerKey,
        consumerSecret,
        accessToken,
        accessTokenSecret,
        mediaId
      )

      console.log('[Twitter] Processing status:', statusResponse.processing_info)

      if (!statusResponse.processing_info) {
        console.log('[Twitter] Video processing completed (no processing_info)')
        return
      }

      const { state, check_after_secs } = statusResponse.processing_info

      if (state === 'succeeded') {
        console.log('[Twitter] Video processing succeeded!')
        return
      }

      if (state === 'failed') {
        throw new Error(`Video processing failed: ${JSON.stringify(statusResponse.processing_info)}`)
      }

      if (state === 'pending' || state === 'in_progress') {
        const waitTime = Math.max(check_after_secs || 5, 1) // Wait at least 1 second
        console.log(`[Twitter] Video still processing (${state}), waiting ${waitTime} seconds...`)
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000))
        continue
      }

      console.log(`[Twitter] Unknown processing state: ${state}`)

    } catch (error) {
      console.error(`[Twitter] Error checking processing status:`, error)
      // Wait a bit and try again
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }

  throw new Error(`Video processing timeout after ${maxAttempts} attempts`)
}

// Post a tweet with video support
export async function postTweetWithVideo(
  accessToken: string,
  content: string,
  videoUrl?: string,
  imageUrl?: string,
  userId?: string,
  accountId?: string
): Promise<{ id: string; text: string }> {
  console.log('🎬 [NEW TWITTER FUNCTION] postTweetWithVideo called with video support!')
  console.log('[Twitter] Posting tweet with video support:', {
    contentLength: content.length,
    hasVideo: !!videoUrl,
    hasImage: !!imageUrl,
    userId,
    accountId
  })

  const uniqueContent = addTimestampToTweet(content)
  let tweetData: any = { text: uniqueContent }

  try {
    // Handle video upload if provided
    if (videoUrl && userId && accountId) {
      try {
        console.log('[Twitter] Uploading video...')
        const videoMediaId = await uploadTwitterVideo(videoUrl, userId, accountId)
        tweetData.media = { media_ids: [videoMediaId] }
        console.log('[Twitter] Video uploaded successfully, media_id:', videoMediaId)
      } catch (error) {
        console.error('[Twitter] Video upload failed:', error)

        // If video upload fails due to missing OAuth 1.0a credentials, post text with note
        if (error instanceof Error && error.message.includes('TWITTER_OAUTH1_MISSING')) {
          console.log('[Twitter] OAuth 1.0a credentials missing for video upload')
          console.log('[Twitter] Falling back to text-only post with setup instructions...')
          const videoNote = '\n\n📹 Video upload requires OAuth 1.0a credentials. Please add TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_TOKEN_SECRET to your .env file.'
          tweetData.text = uniqueContent + videoNote
        } else if (error instanceof Error && (
          error.message.includes('TWITTER_VIDEO_NOT_SUPPORTED') ||
          error.message.includes('OAuth 1.0a') ||
          error.message.includes('API v2 does not support video')
        )) {
          console.log('[Twitter] Video upload failed with OAuth/API error')
          console.log('[Twitter] Falling back to text-only post with video note...')
          const videoNote = '\n\n📹 Video content available - video upload failed.'
          tweetData.text = uniqueContent + videoNote
        } else {
          throw error // Re-throw other errors
        }
      }
    }
    // Handle image upload if provided (and no video)
    else if (imageUrl && userId && accountId && !videoUrl) {
      console.log('[Twitter] Processing images...')
      const processedImages = await processImagesForUpload(imageUrl)

      if (processedImages.length > 0) {
        const mediaIds = await uploadMultipleTwitterMediaOAuth2(processedImages, accessToken)
        if (mediaIds.length > 0) {
          tweetData.media = { media_ids: mediaIds }
        }
      }
    }

    console.log('[Twitter] Final tweet data:', JSON.stringify(tweetData, null, 2))

    const response = await fetch(`${TWITTER_API_BASE}/tweets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tweetData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Twitter] Tweet post failed:', errorText)
      throw new Error(`Twitter post failed: ${response.status}`)
    }

    const responseData = await response.json()
    console.log('[Twitter] Tweet posted successfully:', responseData)

    return {
      id: responseData.data.id,
      text: responseData.data.text
    }

  } catch (error) {
    console.error('[Twitter] Tweet post error:', error)
    throw error
  }
}

// Post a tweet with media using OAuth 2.0
export async function postTweet(
  accessToken: string, 
  content: string, 
  imageUrl?: string,
  userId?: string,
  accountId?: string
): Promise<{
  id: string
  text: string
}> {
  console.log('🐦 [DEBUG] ===== STARTING TWEET POSTING PROCESS =====')
  console.log('🐦 [DEBUG] Posting tweet with OAuth 2.0 media support:', { 
    contentLength: content.length, 
    hasImage: !!imageUrl, 
    userId, 
    accountId 
  })
  console.log('🐦 [DEBUG] Access token length:', accessToken.length)
  console.log('🐦 [DEBUG] Access token preview:', accessToken.substring(0, 20) + '...')

  const uniqueContent = addTimestampToTweet(content)
  console.log('🐦 [DEBUG] Content with timestamp:', uniqueContent)
  let tweetData: any = { text: uniqueContent }
  console.log('🐦 [DEBUG] Initial tweet data:', JSON.stringify(tweetData, null, 2))

  if (userId && accountId) {
    console.log('🐦 [DEBUG] User ID and Account ID provided, proceeding with image processing...')
    try {
      console.log('🔍 [DEBUG] Fetching post data to get all images...')
      
      // Find the post by content (no timestamp removal needed since we're not adding timestamps)
      const cleanContent = content.trim()
      console.log('🔍 [DEBUG] Clean content:', cleanContent.substring(0, 100) + '...')
      
      let post = await db.post.findFirst({
        where: { content: cleanContent, userId: userId },
        select: { id: true, imageUrl: true, images: true, createdAt: true, content: true },
        orderBy: { createdAt: 'desc' }
      })
      
      if (!post) {
        console.log('📝 [DEBUG] Post not found by content, trying to find recent posts...')
        post = await db.post.findFirst({
          where: { userId: userId, status: { in: ['DRAFT', 'SCHEDULED'] } },
          select: { id: true, imageUrl: true, images: true, createdAt: true, content: true },
          orderBy: { createdAt: 'desc' }
        })
        if (post) { 
          console.log('✅ [DEBUG] Found recent post:', { 
            id: post.id, 
            contentPreview: post.content?.substring(0, 100) + '...', 
            hasImageUrl: !!post.imageUrl, 
            hasImages: !!post.images 
          })
        } else {
          console.log('⚠️ [DEBUG] No recent posts found for user')
        }
      } else {
        console.log('✅ [DEBUG] Post found by content match')
      }

      if (post) {
        console.log('📋 [DEBUG] Post found:', { id: post.id, hasImageUrl: !!post.imageUrl, hasImages: !!post.images })
        
        // Collect all images from both columns
        const allImages: string[] = []
        if (post.imageUrl) { 
          allImages.push(post.imageUrl)
          console.log('➕ [DEBUG] Added imageUrl to collection, length:', post.imageUrl.length)
        }
        if (post.images) {
          try {
            const imagesArray = JSON.parse(post.images)
            if (Array.isArray(imagesArray)) { 
              allImages.push(...imagesArray)
              console.log(`➕ [DEBUG] Added ${imagesArray.length} images from images column`)
              console.log(`➕ [DEBUG] Images array preview:`, imagesArray.map((img: string) => img.substring(0, 50) + '...'))
            }
          } catch (parseError) { 
            console.warn('⚠️ [DEBUG] Failed to parse images field:', parseError)
          }
        }
        
        const uniqueImages = [...new Set(allImages)]
        console.log(`📊 [DEBUG] Total unique images found: ${uniqueImages.length}`)
        console.log(`📊 [DEBUG] All images array:`, uniqueImages.map((img: string) => img.substring(0, 50) + '...'))
        
        if (uniqueImages.length > 0) {
          try {
            console.log('🔄 [DEBUG] Processing images for Twitter using OAuth 2.0...')
            
            const processedImages = processImagesForUpload(uniqueImages)
            console.log(`✅ [DEBUG] Processed ${processedImages.length} images for upload`)
            console.log(`✅ [DEBUG] Processed images details:`, processedImages.map((img: any) => ({
              bufferSize: img.buffer.length,
              mimeType: img.mimeType
            })))
            
            if (processedImages.length > 0) {
              console.log(`📤 [DEBUG] Starting upload of ${processedImages.length} images to Twitter...`)
              console.log(`📤 [DEBUG] Calling uploadMultipleTwitterMediaOAuth2...`)

              const mediaIds = await uploadMultipleTwitterMediaOAuth2(processedImages, accessToken)

              if (mediaIds.length > 0) {
                tweetData = { text: uniqueContent, media: { media_ids: mediaIds } }
                console.log('🎉 [DEBUG] Twitter media uploaded successfully using OAuth 2.0, media IDs:', mediaIds)
                console.log('🎉 [DEBUG] Updated tweet data:', JSON.stringify(tweetData, null, 2))
              } else {
                console.warn('⚠️ [DEBUG] No images were successfully uploaded to Twitter')
              }
            } else { 
              console.warn('⚠️ [DEBUG] No valid images found for Twitter upload')
            }
          } catch (error) { 
            console.error('❌ [DEBUG] Failed to upload images to Twitter:', error)
            console.error('❌ [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
            console.warn('⚠️ [DEBUG] Continuing with text-only tweet due to image upload failure')
          }
        } else { 
          console.log('📭 [DEBUG] No images found in post data')
        }
      } else if (imageUrl) {
        console.log('🔄 [DEBUG] Processing fallback imageUrl for Twitter using OAuth 2.0...')
        console.log('🔄 [DEBUG] Fallback imageUrl length:', imageUrl.length)
        console.log('🔄 [DEBUG] Fallback imageUrl preview:', imageUrl.substring(0, 100) + '...')
        
        try {
          const processedImages = processImagesForUpload(imageUrl)
          console.log(`✅ [DEBUG] Processed ${processedImages.length} fallback images`)
          
          if (processedImages.length > 0) {
            console.log(`📤 [DEBUG] Uploading ${processedImages.length} fallback images to Twitter...`)
            const mediaIds = await uploadMultipleTwitterMediaOAuth2(processedImages, accessToken)

            if (mediaIds.length > 0) {
              tweetData = { text: uniqueContent, media: { media_ids: mediaIds } }
              console.log('🎉 [DEBUG] Twitter fallback media uploaded successfully using OAuth 2.0, media IDs:', mediaIds)
              console.log('🎉 [DEBUG] Updated tweet data with fallback:', JSON.stringify(tweetData, null, 2))
            } else {
              console.warn('⚠️ [DEBUG] No fallback images were successfully uploaded to Twitter')
            }
          } else { 
            console.warn('⚠️ [DEBUG] No valid fallback images found for Twitter upload')
          }
        } catch (error) { 
          console.error('❌ [DEBUG] Failed to upload fallback image to Twitter:', error)
          console.error('❌ [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
          console.warn('⚠️ [DEBUG] Continuing with text-only tweet due to fallback image upload failure')
        }
      } else { 
        console.log('📭 [DEBUG] Post not found, and no fallback imageUrl parameter provided.')
      }
    } catch (error) { 
      console.error('❌ [DEBUG] Failed to fetch post data or process images:', error)
      console.error('❌ [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      console.warn('⚠️ [DEBUG] Continuing with text-only tweet due to image processing failure')
    }
  } else { 
    console.log('ℹ️ [DEBUG] No userId or accountId provided, skipping image processing')
  }

  console.log('🐦 [DEBUG] Final tweet data before posting:', JSON.stringify(tweetData, null, 2))
  console.log('🐦 [DEBUG] Posting tweet to Twitter API...')
  
  const response = await fetch(`${TWITTER_API_BASE}/tweets`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${accessToken}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(tweetData)
  })

  console.log('🐦 [DEBUG] Twitter API response received')
  console.log('🐦 [DEBUG] Response status:', response.status)
  console.log('🐦 [DEBUG] Response status text:', response.statusText)

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ [DEBUG] Tweet posting failed with status:', response.status)
    console.error('❌ [DEBUG] Error response:', error)
    throw new Error(`Failed to post tweet: ${error}`)
  }

  const data = await response.json()
  console.log('✅ [DEBUG] Tweet posted successfully!')
  console.log('✅ [DEBUG] Twitter API response:', JSON.stringify(data, null, 2))
  console.log('✅ [DEBUG] Tweet ID:', data.data?.id)
  console.log('🐦 [DEBUG] ===== TWEET POSTING PROCESS COMPLETED =====')
  
  return data.data
}

// Legacy function for backward compatibility (now uses OAuth 2.0)
export async function uploadTwitterMedia(
  imageBuffer: Buffer,
  mimeType: string,
  userId: string,
  accountId: string
): Promise<string> {
  console.log('🔄 Legacy uploadTwitterMedia called, redirecting to OAuth 2.0...')
  
  // Get access token from database
  const account = await db.socialAccount.findUnique({
    where: { id: accountId, userId },
    select: { accessToken: true }
  })
  
  if (!account?.accessToken) {
    throw new Error('Access token not found for account')
  }
  
  return uploadTwitterMediaOAuth1a(imageBuffer, mimeType, userId, accountId)
}

// Legacy function for backward compatibility (now uses OAuth 2.0)
export async function uploadMultipleTwitterMedia(
  images: Array<{ buffer: Buffer; mimeType: string }>,
  userId: string,
  accountId: string
): Promise<string[]> {
  console.log('🔄 Legacy uploadMultipleTwitterMedia called, redirecting to OAuth 2.0...')

  // Get access token from database
  const account = await db.socialAccount.findUnique({
    where: { id: accountId, userId },
    select: { accessToken: true }
  })

  if (!account?.accessToken) {
    throw new Error('Access token not found for account')
  }

  return uploadMultipleTwitterMediaOAuth2(images, account.accessToken)
}

// Get tweet analytics
export async function getTweetAnalytics(accessToken: string, tweetId: string): Promise<{
  impression_count?: number
  like_count?: number
  reply_count?: number
  retweet_count?: number
}> {
  const response = await fetch(
    `${TWITTER_API_BASE}/tweets/${tweetId}?tweet.fields=public_metrics`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get tweet analytics: ${error}`)
  }

  const data = await response.json()
  return data.data?.public_metrics || {}
}
