import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, hashtagsFromString } from '@/lib/api-utils'
import { db } from '@/lib/db'
import { postTweet, postTweetWithVideo } from '@/lib/social/twitter'
import { postToLinkedIn, postToLinkedInWithVideo } from '@/lib/social/linkedin'
import { createInstagramMedia, createInstagramVideo, createInstagramImage, getMediaType, getInstagramAspectRatioGuidance } from '@/lib/social/instagram'
import { uploadYouTubeVideo } from '@/lib/social/youtube'
import { TokenManager } from '@/lib/social/token-manager'
import { AccountType } from '@prisma/client'
import { postToFacebookPage, getUserPages } from '@/lib/social/facebook'

// Minimal local types to improve type safety without changing behavior
type PostPublicationLite = { id: string; status: string; socialAccountId: string }
type PublishResult = {
  platform: string
  accountName: string | null
  success: boolean
  platformPostId?: string | null
  error?: string
  needsReconnection?: boolean
}

// Helper function to combine images from both imageUrl and images columns
function combinePostImages(post: any): string | string[] | undefined {
  const allImages: string[] = []
  
  // Add imageUrl if it exists (first image)
  if (post.imageUrl) {
    allImages.push(post.imageUrl)
  }
  
  // Add images from images field if it exists
  if (post.images) {
    try {
      const imagesArray = JSON.parse(post.images)
      if (Array.isArray(imagesArray)) {
        allImages.push(...imagesArray)
      }
    } catch (parseError) {
      console.warn('Failed to parse images field:', parseError)
    }
  }
  
  // Remove duplicates and return
  const uniqueImages = [...new Set(allImages)]
  
  if (uniqueImages.length === 0) {
    return undefined
  } else if (uniqueImages.length === 1) {
    return uniqueImages[0]
  } else {
    return uniqueImages
  }
}

// Helper function to combine videos from both videoUrl and videos columns
function combinePostVideos(post: any): string | string[] | undefined {
  const allVideos: string[] = []

  // Add videoUrl if it exists (first video)
  if (post.videoUrl) {
    allVideos.push(post.videoUrl)
  }

  // Add videos from videos field if it exists
  if (post.videos) {
    try {
      const videosArray = JSON.parse(post.videos)
      if (Array.isArray(videosArray)) {
        allVideos.push(...videosArray)
      }
    } catch (parseError) {
      console.warn('Failed to parse videos field:', parseError)
    }
  }

  // Remove duplicates and return
  const uniqueVideos = [...new Set(allVideos)]

  if (uniqueVideos.length === 0) {
    return undefined
  } else if (uniqueVideos.length === 1) {
    return uniqueVideos[0]
  } else {
    return uniqueVideos
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        console.log('🚀 PUBLISH ENDPOINT: Starting publish process...')
        const { id: postId } = await params
        console.log('🚀 PUBLISH ENDPOINT: Post ID:', postId)
        console.log('🚀 PUBLISH ENDPOINT: User ID:', user.id)

        // Get the post and verify ownership
        console.log('🚀 PUBLISH ENDPOINT: Fetching post from database...')
        const post = await db.post.findFirst({
          where: {
            id: postId,
            userId: user.id
          },
          include: {
            publications: {
              include: {
                socialAccount: true
              }
            }
          }
        })

        console.log('🚀 PUBLISH ENDPOINT: Post found:', !!post)
        if (post) {
          console.log('🚀 PUBLISH ENDPOINT: Post status:', post.status)
          console.log('🚀 PUBLISH ENDPOINT: Post publications count:', post.publications?.length || 0)
          console.log('🚀 PUBLISH ENDPOINT: Post content length:', post.content?.length || 0)
          console.log('🚀 PUBLISH ENDPOINT: Post has image:', !!post.imageUrl)
        }

        if (!post) {
          console.log('❌ PUBLISH ENDPOINT: Post not found')
          return apiError('Post not found', 404)
        }

        if (post.status === 'PUBLISHED') {
          console.log('❌ PUBLISH ENDPOINT: Post is already published')
          return apiError('Post is already published', 400)
        }

        // Check if post has publications (social accounts selected)
        if (!post.publications || post.publications.length === 0) {
          console.log('❌ PUBLISH ENDPOINT: No publications found for post')
          
          // Let's check if there are any publications in the database for this post
          const dbPublications: PostPublicationLite[] = await db.postPublication.findMany({
            where: { postId: postId },
            select: { id: true, status: true, socialAccountId: true }
          })
          console.log('🚀 PUBLISH ENDPOINT: Database publications found:', dbPublications.length)
          if (dbPublications.length > 0) {
            console.log('🚀 PUBLISH ENDPOINT: Database publications:', dbPublications.map((p) => ({
              id: p.id,
              status: p.status,
              socialAccountId: p.socialAccountId
            })))
          }
          
          return apiError('No social accounts selected for this post. Please select at least one social account before publishing.', 400)
        }

        // Log each publication
        console.log('🚀 PUBLISH ENDPOINT: Publications found:')
        post.publications.forEach((pub: any, index: number) => {
          console.log(`  ${index + 1}. Platform: ${pub.socialAccount.platform}`)
          console.log(`     Account: ${pub.socialAccount.accountName}`)
          console.log(`     Status: ${pub.status}`)
          console.log(`     Account ID: ${pub.socialAccount.id}`)
          console.log(`     Account Active: ${pub.socialAccount.isActive}`)
        })

        // Prepare content with hashtags
        const hashtags = hashtagsFromString(post.hashtags)
        const contentWithHashtags = `${post.content || ''}\n\n${hashtags.join(' ')}`

        console.log('🚀 PUBLISH ENDPOINT: Content prepared:')
        console.log('  - Original content length:', post.content?.length || 0)
        console.log('  - Hashtags count:', hashtags.length)
        console.log('  - Final content length:', contentWithHashtags.length)
        console.log('  - YouTube title:', post.title || 'No title')
        console.log('  - YouTube description:', post.description || 'No description')

        const publishResults: PublishResult[] = []
        let hasErrors = false

        console.log(`🚀 PUBLISH ENDPOINT: Starting to publish to ${post.publications.length} social accounts`)

        // Publish to each social account
        for (const publication of post.publications) {
          const account = publication.socialAccount
          console.log(`\n🚀 PUBLISH ENDPOINT: Publishing to ${account.platform} (${account.accountName})...`)

          try {
            // Validate and refresh token using TokenManager
            console.log(`🚀 PUBLISH ENDPOINT: Validating token for ${account.platform}...`)
            const tokenValidation = await TokenManager.validateAndRefresh(
              user.id, 
              account.platform, 
              account.accountId
            )

            console.log(`🚀 PUBLISH ENDPOINT: Token validation result:`, {
              isValid: tokenValidation.isValid,
              hasAccessToken: !!tokenValidation.accessToken,
              needsReconnection: tokenValidation.needsReconnection,
              error: tokenValidation.error
            })

            if (!tokenValidation.isValid) {
              if (tokenValidation.needsReconnection) {
                throw new Error(`Account needs reconnection: ${tokenValidation.error}`)
              } else {
                throw new Error(`Token validation failed: ${tokenValidation.error}`)
              }
            }

            let result
            let platformPostId = null

            switch (account.platform) {
              case 'FACEBOOK': {
                console.log('🚀 PUBLISH ENDPOINT: Posting to Facebook...')
                if (!tokenValidation.accessToken) {
                  throw new Error('No valid Facebook token available')
                }

                // Resolve target Page and tokens
                let pageId: string | undefined
                let pageAccessToken: string | undefined
                let userAccessToken: string | undefined

                const selectedPageId = (account as any)?.metadata?.selectedPageId
                const isBusiness = account.accountType === AccountType.BUSINESS

                if (isBusiness) {
                  // Page-level connection: accountId is the Page id and accessToken is the Page token
                  pageId = account.accountId
                  pageAccessToken = tokenValidation.accessToken
                } else {
                  // User-level connection: need a Page id. Prefer selectedPageId, else auto-pick if exactly one.
                  userAccessToken = tokenValidation.accessToken

                  if (selectedPageId) {
                    pageId = selectedPageId
                  } else {
                    // Try to find a connected Page account for this user and use it if exactly one exists
                    try {
                      const pageAccounts = await db.socialAccount.findMany({
                        where: {
                          userId: user.id,
                          platform: 'FACEBOOK' as any,
                          accountType: AccountType.BUSINESS,
                          isActive: true,
                        },
                        orderBy: { createdAt: 'desc' },
                      })
                      if (pageAccounts.length === 1) {
                        pageId = pageAccounts[0].accountId
                        pageAccessToken = pageAccounts[0].accessToken
                        userAccessToken = undefined
                        console.log('🚀 PUBLISH ENDPOINT: Using connected Page account:', pageAccounts[0].accountName)
                      } else if (pageAccounts.length > 1) {
                        throw new Error('Multiple Facebook Pages connected. Select one in Integrations or assign this post to a specific Page.')
                      }
                    } catch (e) {
                      console.warn('⚠️ Failed to resolve connected Page account fallback:', e)
                    }

                    try {
                      if (userAccessToken) {
                        const pages = await getUserPages(userAccessToken)
                        if (pages.length === 1) {
                          pageId = pages[0].id
                        }
                      }
                    } catch (e) {
                      console.warn('⚠️ Failed to list Facebook pages for auto-pick:', e)
                    }
                  }

                  if (!pageId) {
                    throw new Error('No Facebook Page selected. Connect a Page or select one in Integrations.')
                  }
                }

                // Prepare media
                const fbImage = combinePostImages(post)
                const imageUrl = Array.isArray(fbImage) ? fbImage[0] : fbImage

                // Optional scheduling: if you have a scheduledAt field, convert to unix seconds
                const scheduledPublishTime = undefined as number | undefined

                const fbRes = await postToFacebookPage({
                  pageId: pageId!,
                  message: contentWithHashtags,
                  linkUrl: undefined,
                  imageUrl: imageUrl,
                  scheduledPublishTime,
                  pageAccessToken,
                  userAccessToken,
                })

                platformPostId = fbRes.id
                console.log(`✅ PUBLISH ENDPOINT: Facebook post successful! ID: ${platformPostId}`)
                break
              }
              case 'TWITTER':
                console.log(`🚀 PUBLISH ENDPOINT: ===== TWITTER POSTING START =====`)
                console.log(`🚀 PUBLISH ENDPOINT: Posting to Twitter...`)
                console.log(`🚀 PUBLISH ENDPOINT: Content with hashtags:`, contentWithHashtags.substring(0, 100) + '...')
                console.log(`🚀 PUBLISH ENDPOINT: Content length:`, contentWithHashtags.length)

                const twitterImages = combinePostImages(post)
                const twitterVideos = combinePostVideos(post)

                console.log(`🚀 PUBLISH ENDPOINT: Twitter media:`, {
                  hasImages: !!twitterImages,
                  imageCount: Array.isArray(twitterImages) ? twitterImages.length : 1,
                  hasVideos: !!twitterVideos,
                  videoCount: Array.isArray(twitterVideos) ? twitterVideos.length : 1
                })
                console.log(`🚀 PUBLISH ENDPOINT: User ID:`, user.id)
                console.log(`🚀 PUBLISH ENDPOINT: Account ID:`, account.id)
                console.log(`🚀 PUBLISH ENDPOINT: Access token length:`, tokenValidation.accessToken?.length || 'N/A')

                if (!tokenValidation.accessToken) {
                  throw new Error('No valid Twitter token available')
                }
                const accessToken: string = tokenValidation.accessToken

                // Use video-enabled Twitter posting
                const twitterVideoToPost = Array.isArray(twitterVideos) ? twitterVideos[0] : twitterVideos
                const twitterImageToPost = Array.isArray(twitterImages) ? twitterImages[0] : twitterImages

                console.log(`🚀 PUBLISH ENDPOINT: Twitter media to post:`, {
                  videoUrl: twitterVideoToPost ? twitterVideoToPost.substring(0, 50) + '...' : 'none',
                  imageUrl: twitterImageToPost ? twitterImageToPost.substring(0, 50) + '...' : 'none'
                })

                result = await postTweetWithVideo(
                  accessToken,
                  contentWithHashtags,
                  twitterVideoToPost, // Video URL
                  twitterImageToPost, // Image URL (only used if no video)
                  user.id,
                  account.id
                )

                platformPostId = result.id
                console.log(`✅ PUBLISH ENDPOINT: Twitter post successful! ID: ${platformPostId}`)
                console.log(`🚀 PUBLISH ENDPOINT: ===== TWITTER POSTING COMPLETED =====`)
                break

              case 'LINKEDIN':
                console.log('🚀 PUBLISH ENDPOINT: Posting to LinkedIn...')
                if (!tokenValidation.accessToken) {
                  throw new Error('No valid LinkedIn token available')
                }

                // Use helper function to combine images from both columns
                const imagesToPost = combinePostImages(post)
                const videosToPost = combinePostVideos(post)

                console.log(`🚀 PUBLISH ENDPOINT: LinkedIn media:`, {
                  hasImages: !!imagesToPost,
                  imageCount: Array.isArray(imagesToPost) ? imagesToPost.length : 1,
                  hasVideos: !!videosToPost,
                  videoCount: Array.isArray(videosToPost) ? videosToPost.length : 1
                })

                // Use video-enabled LinkedIn posting with full support for multiple videos
                console.log(`🚀 PUBLISH ENDPOINT: LinkedIn media to post:`, {
                  videoUrls: videosToPost ? (Array.isArray(videosToPost) ? videosToPost.map(v => v.substring(0, 50) + '...') : [videosToPost.substring(0, 50) + '...']) : [],
                  imageUrls: imagesToPost ? (Array.isArray(imagesToPost) ? imagesToPost.map(i => i.substring(0, 50) + '...') : [imagesToPost.substring(0, 50) + '...']) : []
                })

                result = await postToLinkedInWithVideo(
                  tokenValidation.accessToken,
                  contentWithHashtags,
                  account.accountId,
                  videosToPost, // Support multiple videos
                  imagesToPost  // Support multiple images (only used if no videos)
                )

                platformPostId = result.id
                console.log(`✅ PUBLISH ENDPOINT: LinkedIn post successful! ID: ${platformPostId}`)
                break

              case 'INSTAGRAM':
                console.log('🚀 PUBLISH ENDPOINT: Posting to Instagram...')

                const instagramImages = combinePostImages(post)
                const instagramVideos = combinePostVideos(post)

                console.log(`🚀 PUBLISH ENDPOINT: Instagram media:`, {
                  hasImages: !!instagramImages,
                  imageCount: Array.isArray(instagramImages) ? instagramImages.length : 1,
                  hasVideos: !!instagramVideos,
                  videoCount: Array.isArray(instagramVideos) ? instagramVideos.length : 1
                })

                if (!tokenValidation.accessToken) {
                  throw new Error('No valid Instagram token available')
                }

                // Instagram doesn't support mixed media (images + videos) in one post
                // Prioritize video over images, but warn user about mixed media
                if (instagramVideos && instagramImages) {
                  console.log('⚠️ Mixed media detected (images + videos). Instagram only supports one media type per post.')
                  console.log('📹 Prioritizing video over images for this post.')
                  console.log('💡 Tip: Create separate posts for images and videos for better engagement.')
                }

                if (instagramVideos) {
                  console.log('📹 Posting video to Instagram (as REEL - VIDEO type deprecated)...')
                  const videoUrl = Array.isArray(instagramVideos) ? instagramVideos[0] : instagramVideos

                  result = await createInstagramVideo(
                    tokenValidation.accessToken,
                    videoUrl,
                    contentWithHashtags,
                    user.id
                  )
                } else if (instagramImages) {
                  console.log('📸 Posting image(s) to Instagram...')

                  // Handle single image or multiple images (carousel)
                  result = await createInstagramImage(
                    tokenValidation.accessToken,
                    instagramImages, // Pass the full array or single string
                    contentWithHashtags,
                    user.id
                  )
                } else {
                  throw new Error('Instagram posts require either an image or video')
                }

                platformPostId = result.id
                console.log(`✅ PUBLISH ENDPOINT: Instagram post successful! ID: ${platformPostId}`)
                break

              case 'YOUTUBE':
                console.log('🚀 PUBLISH ENDPOINT: Posting to YouTube...')
                if (!tokenValidation.accessToken) {
                  throw new Error('No valid YouTube token available')
                }

                // Get video content for YouTube
                const youtubeVideos = combinePostVideos(post)
                console.log(`🚀 PUBLISH ENDPOINT: YouTube videos:`, {
                  hasVideos: !!youtubeVideos,
                  videoCount: Array.isArray(youtubeVideos) ? youtubeVideos.length : 1
                })

                if (!youtubeVideos) {
                  throw new Error('YouTube posts require video content')
                }

                // Use the first video if multiple videos are provided
                const videoToUpload = Array.isArray(youtubeVideos) ? youtubeVideos[0] : youtubeVideos

                // Get thumbnail URL (use first image if available)
                const thumbnailUrl = post.imageUrl || (post.images && Array.isArray(post.images) && post.images.length > 0 ? post.images[0] : undefined)

                // Use post title and description for YouTube, fallback to content
                const youtubeTitle = post.title || contentWithHashtags.substring(0, 100) || 'Untitled Video'
                const youtubeDescription = post.description || contentWithHashtags || 'No description'

                result = await uploadYouTubeVideo(
                  tokenValidation.accessToken,
                  videoToUpload,
                  youtubeTitle, // Use dedicated title field
                  youtubeDescription, // Use dedicated description field
                  thumbnailUrl // Thumbnail URL
                )
                platformPostId = result.id
                console.log(`✅ PUBLISH ENDPOINT: YouTube video uploaded successfully! ID: ${platformPostId}`)
                break

              default:
                throw new Error(`Unsupported platform: ${account.platform}`)
            }

            // Update publication status to published
            console.log(`🚀 PUBLISH ENDPOINT: Updating publication status for ${account.platform}...`)
            await db.postPublication.update({
              where: { id: publication.id },
              data: {
                status: 'PUBLISHED',
                platformPostId,
                publishedAt: new Date()
              }
            })

            publishResults.push({
              platform: account.platform,
              accountName: account.accountName,
              success: true,
              platformPostId
            })

            console.log(`✅ PUBLISH ENDPOINT: Successfully published to ${account.platform}`)

          } catch (error) {
            hasErrors = true
            console.error(`❌ PUBLISH ENDPOINT: Failed to publish to ${account.platform}:`, error)

            // Determine if this is a reconnection issue
            let errorMessage = error instanceof Error ? error.message : 'Unknown error'

            // Add helpful guidance for Instagram aspect ratio errors
            if (account.platform === 'INSTAGRAM' && errorMessage.includes('aspect ratio')) {
              console.log(getInstagramAspectRatioGuidance())
              errorMessage += '\n\n💡 See console for Instagram aspect ratio requirements.'
            }

            const needsReconnection = errorMessage.includes('needs reconnection') ||
                                    errorMessage.includes('permission') ||
                                    errorMessage.includes('ACCESS_DENIED')

            // Update publication status to failed
            await db.postPublication.update({
              where: { id: publication.id },
              data: {
                status: 'FAILED',
                errorMessage: errorMessage
              }
            })

            publishResults.push({
              platform: account.platform,
              accountName: account.accountName,
              success: false,
              error: errorMessage,
              needsReconnection
            })
          }
        }

        console.log(`🚀 PUBLISH ENDPOINT: Publishing completed. Results:`, publishResults)

        // Calculate success metrics first
        const successCount = publishResults.filter(r => r.success).length
        const totalCount = publishResults.length
        const reconnectionNeeded = publishResults.some(r => !r.success && r.needsReconnection)

        console.log(`🚀 PUBLISH ENDPOINT: Success metrics:`, {
          successCount,
          totalCount,
          reconnectionNeeded
        })

        // Update post status based on results - only mark as PUBLISHED if at least one platform succeeded
        const postStatus = successCount > 0 ? 'PUBLISHED' : 'FAILED'
        console.log(`🚀 PUBLISH ENDPOINT: Updating post status to: ${postStatus}`)
        
        const updatedPost = await db.post.update({
          where: { id: postId },
          data: {
            status: postStatus,
            publishedAt: successCount > 0 ? new Date() : null
          },
          include: {
            publications: {
              include: {
                socialAccount: true
              }
            },
            analytics: true
          }
        })

        // Return response based on whether any platforms succeeded
        if (successCount === 0) {
          // All platforms failed - return error response
          console.log(`❌ PUBLISH ENDPOINT: All platforms failed`)
          const failedPublications = publishResults.filter((r: PublishResult) => !r.success)
          const reconnectionAccounts = failedPublications.filter((r: PublishResult) => r.needsReconnection)
          
          let errorMessage = `Post publishing failed on all platforms`
          
          if (reconnectionAccounts.length > 0) {
            const platforms = [...new Set(reconnectionAccounts.map((r: PublishResult) => r.platform))]
            errorMessage += `. The following platforms need reconnection: ${platforms.join(', ')}`
          }

          return apiError(errorMessage, 400)
        } else if (successCount < totalCount) {
          // Some platforms succeeded, some failed - return success with warnings
          console.log(`⚠️ PUBLISH ENDPOINT: Partial success: ${successCount}/${totalCount} platforms succeeded`)
          const failedPublications = publishResults.filter((r: PublishResult) => !r.success)
          const reconnectionAccounts = failedPublications.filter((r: PublishResult) => r.needsReconnection)
          
          let message = `Post published with errors: ${successCount}/${totalCount} platforms succeeded`
          
          if (reconnectionAccounts.length > 0) {
            const platforms = [...new Set(reconnectionAccounts.map((r: PublishResult) => r.platform))]
            message += `. The following platforms need reconnection: ${platforms.join(', ')}`
          }

          return apiSuccess({
            post: updatedPost,
            publishResults,
            successCount,
            totalCount,
            message,
            hasWarnings: true,
            needsReconnection: reconnectionNeeded,
            reconnectionPlatforms: reconnectionNeeded ? 
              [...new Set(failedPublications.filter((r: PublishResult) => r.needsReconnection).map((r: PublishResult) => r.platform))] : []
          })
        } else {
          // All platforms succeeded
          console.log(`✅ PUBLISH ENDPOINT: All platforms succeeded`)
          return apiSuccess({
            post: updatedPost,
            publishResults,
            successCount,
            totalCount,
            message: `Post published successfully to all ${totalCount} platforms`
          })
        }
      } catch (error) {
        console.error('❌ PUBLISH ENDPOINT: Failed to publish post:', error)
        return apiError('Failed to publish post', 500)
      }
    })
  )(req)
}
