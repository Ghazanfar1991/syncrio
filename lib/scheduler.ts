// Content scheduling service with cron jobs
import cron from 'node-cron'
import { db } from '@/lib/db'
import { postTweet } from '@/lib/social/twitter'
import { postToLinkedIn } from '@/lib/social/linkedin'
import { createInstagramMedia, createInstagramImage, createInstagramVideo, getMediaType } from '@/lib/social/instagram'
import { hashtagsFromString } from '@/lib/api-utils'
import { refreshAllAnalytics } from '@/lib/analytics/social-analytics'

interface ScheduledPost {
  id: string
  content: string
  hashtags: string
  imageUrl?: string
  images?: string // JSON string array of image URLs
  scheduledAt: Date
  userId: string
  publications: Array<{
    id: string
    status: string
    socialAccount: {
      id: string
      platform: string
      accountId: string
      accessToken: string
      refreshToken?: string
      expiresAt?: Date
    }
  }>
}

// Initialize scheduler
let schedulerInitialized = false

export function initializeScheduler() {
  if (schedulerInitialized) return
  
  console.log('🕐 Initializing content scheduler...')
  
  // Run every minute to check for scheduled posts
  cron.schedule('* * * * *', async () => {
    await processScheduledPosts()
  })
  
  // Run every hour to cleanup old posts
  cron.schedule('0 * * * *', async () => {
    await cleanupOldPosts()
  })

  // Run every 4 hours to refresh analytics
  cron.schedule('0 */4 * * *', async () => {
    await refreshAllAnalytics()
  })
  
  schedulerInitialized = true
  console.log('✅ Content scheduler initialized')
}

// Process posts scheduled for publishing
async function processScheduledPosts() {
  try {
    const now = new Date()
    const scheduledPosts = await db.post.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          lte: now
        }
      },
      include: {
        publications: {
          include: {
            socialAccount: true
          }
        }
      }
    })

    console.log(`📅 Found ${scheduledPosts.length} scheduled posts to process`)

    for (const post of scheduledPosts) {
      await publishScheduledPost(post as any)
    }
  } catch (error) {
    console.error('Error processing scheduled posts:', error)
  }
}

// Publish a scheduled post to all selected platforms
async function publishScheduledPost(post: ScheduledPost) {
  console.log(`📤 Publishing scheduled post: ${post.id}`)
  
  try {
    const hashtags = hashtagsFromString(post.hashtags)
    const contentWithHashtags = `${post.content}\n\n${hashtags.join(' ')}`
    
    const publishResults = []
    
    // Process each publication (platform-specific post)
    for (const publication of post.publications) {
      const account = publication.socialAccount
      const platform = account.platform
      
      console.log(`📤 Publishing to ${platform} via publication ${publication.id}`)
      
      try {
        let result
        
        switch (platform) {
          case 'TWITTER':
            result = await postTweet(
              account.accessToken, 
              contentWithHashtags, 
              post.imageUrl,
              post.userId,
              account.id
            )
            break
            
          case 'LINKEDIN':
            // Handle multiple images for LinkedIn
            let linkedinImages: string | string[] | undefined
            
            if (post.images) {
              try {
                const imagesArray = JSON.parse(post.images)
                if (Array.isArray(imagesArray) && imagesArray.length > 0) {
                  // Pass all images to LinkedIn (it supports multiple images)
                  linkedinImages = imagesArray
                  console.log(`📅 LinkedIn: Using ${imagesArray.length} images from images field`)
                }
              } catch (parseError) {
                console.warn('📅 LinkedIn: Failed to parse images field, falling back to imageUrl')
                linkedinImages = post.imageUrl
              }
            } else {
              linkedinImages = post.imageUrl
            }
            
            console.log(`📅 LinkedIn: Posting with ${Array.isArray(linkedinImages) ? linkedinImages.length + ' images' : linkedinImages ? '1 image' : 'no image'}`)
            result = await postToLinkedIn(account.accessToken, contentWithHashtags, account.accountId, linkedinImages)
            break
            
          case 'INSTAGRAM':
            // Check for both images and videos
            const hasImage = (post as any).imageUrl || (post as any).images
            const hasVideo = (post as any).videoUrl || (post as any).videos

            if (!hasImage && !hasVideo) {
              console.warn('Instagram posts require either an image or video, skipping text-only post')
              // Mark as failed
              await db.postPublication.update({
                where: { id: publication.id },
                data: {
                  status: 'FAILED',
                  errorMessage: 'Instagram posts require either an image or video'
                }
              })
              publishResults.push({ platform, success: false, error: 'Instagram posts require either an image or video' })
              continue
            }

            // Prioritize video over image
            if (hasVideo) {
              const videoUrl = (post as any).videoUrl || ((post as any).videos ? JSON.parse((post as any).videos)[0] : null)     
              if (videoUrl) {
                result = await createInstagramVideo(account.accessToken, videoUrl, contentWithHashtags, post.userId)
              }
            } else if (hasImage) {
              // Handle both single image and multiple images
              let imageData = null

              if (post.imageUrl && post.images) {
                // Both single and multiple images - combine them
                const imagesArray = post.images ? JSON.parse(post.images) : []
                imageData = [post.imageUrl, ...imagesArray]
              } else if (post.imageUrl) {
                // Single image only
                imageData = post.imageUrl
              } else if (post.images) {
                // Multiple images only
                const imagesArray = JSON.parse(post.images)
                imageData = imagesArray.length === 1 ? imagesArray[0] : imagesArray
              }

              if (imageData) {
                result = await createInstagramImage(account.accessToken, imageData, contentWithHashtags, post.userId)
              }
            }
            break
            
          case 'YOUTUBE':
            // YouTube requires video content, skip for text-only posts
            console.warn('YouTube posting requires video, skipping text-only post')
            await db.postPublication.update({
              where: { id: publication.id },
              data: {
                status: 'FAILED',
                errorMessage: 'YouTube posting requires video content'
              }
            })
            publishResults.push({ platform, success: false, error: 'YouTube posting requires video content' })
            continue
            
          default:
            console.warn(`Unsupported platform: ${platform}`)
            await db.postPublication.update({
              where: { id: publication.id },
              data: {
                status: 'FAILED',
                errorMessage: `Unsupported platform: ${platform}`
              }
            })
            publishResults.push({ platform, success: false, error: `Unsupported platform: ${platform}` })
            continue
        }
        
        // Update publication status to published
        await db.postPublication.update({
          where: { id: publication.id },
          data: {
            status: 'PUBLISHED',
            platformPostId: (result as any)?.id || null,
            publishedAt: new Date()
          }
        })
        
        publishResults.push({ platform, success: true, id: (result as any)?.id || null })
        console.log(`✅ Published to ${platform}: ${(result as any)?.id ?? 'unknown'}`)
        
      } catch (error) {
        console.error(`❌ Failed to publish to ${platform}:`, error)
        
        // Update publication status to failed
        await db.postPublication.update({
          where: { id: publication.id },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        })
        
        publishResults.push({ platform, success: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }
    
    // Update post status based on results
    const hasSuccessfulPublications = publishResults.some(r => r.success)
    const allFailed = publishResults.every(r => !r.success)
    
    await db.post.update({
      where: { id: post.id },
      data: {
        status: allFailed ? 'FAILED' : 'PUBLISHED',
        publishedAt: hasSuccessfulPublications ? new Date() : null
      }
    })
    
    console.log(`📊 Post ${post.id} publishing complete. Results:`, publishResults)
    
  } catch (error) {
    console.error(`❌ Failed to publish scheduled post ${post.id}:`, error)
    
    // Mark post as failed
    await db.post.update({
      where: { id: post.id },
      data: {
        status: 'FAILED'
      }
    })
  }
}

// Cleanup old completed posts
async function cleanupOldPosts() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const deletedCount = await db.post.deleteMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: {
          lt: thirtyDaysAgo
        }
      }
    })
    
    if (deletedCount.count > 0) {
      console.log(`🧹 Cleaned up ${deletedCount.count} old posts`)
    }
  } catch (error) {
    console.error('Error cleaning up old posts:', error)
  }
}

// Schedule a post for future publishing
export async function schedulePost(
  postId: string,
  scheduledAt: Date
): Promise<boolean> {
  try {
    // Update post status to scheduled
    await db.post.update({
      where: { id: postId },
      data: {
        status: 'SCHEDULED',
        scheduledAt
      }
    })

    // Update all publications to pending status
    await db.postPublication.updateMany({
      where: { postId },
      data: {
        status: 'PENDING'
      }
    })
    
    console.log(`📅 Post ${postId} scheduled for ${scheduledAt.toISOString()}`)
    return true
  } catch (error) {
    console.error('Error scheduling post:', error)
    return false
  }
}

// Cancel a scheduled post
export async function cancelScheduledPost(postId: string): Promise<boolean> {
  try {
    await db.post.update({
      where: { id: postId },
      data: {
        status: 'DRAFT',
        scheduledAt: null
      }
    })
    
    console.log(`❌ Cancelled scheduled post: ${postId}`)
    return true
  } catch (error) {
    console.error('Error cancelling scheduled post:', error)
    return false
  }
}

// Get upcoming scheduled posts
export async function getScheduledPosts(userId: string) {
  return await db.post.findMany({
    where: {
      userId,
      status: 'SCHEDULED',
      scheduledAt: {
        gt: new Date()
      }
    },
    orderBy: {
      scheduledAt: 'asc'
    }
  })
}
