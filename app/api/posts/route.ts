// Posts API endpoint for content management
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, validateRequest, schemas, parseQueryParams, hashtagsToString, formatPostWithHashtags } from '@/lib/api-utils'
import { db, checkUsageLimit } from '@/lib/db'

// Local platform type (Prisma enum not exported in this schema)
type SocialPlatform = 'TWITTER' | 'LINKEDIN' | 'INSTAGRAM' | 'YOUTUBE'

// Minimal social account shape used in this handler
type SocialAccountLite = {
  id: string
  platform: string
  accountName: string | null
  isActive: boolean
}

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const { page, limit, status, platform } = parseQueryParams(req.url)
      const skip = (page - 1) * limit

      const where: any = { userId: user.id }
      if (status) where.status = status
      
      console.log('GET /api/posts - Query params:', { page, limit, status, platform })
      console.log('GET /api/posts - Where clause:', where)
      
      const posts = await db.post.findMany({
        where,
        include: {
          publications: {
            include: {
              socialAccount: true
            }
          },
          analytics: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })

      const total = await db.post.count({ where })
      
      console.log('GET /api/posts - Found posts:', posts.length)
      console.log('GET /api/posts - Posts data:', posts.map((p: any) => ({ id: p.id, status: p.status, content: p.content ? p.content.substring(0, 50) : 'No content' })))

      return apiSuccess({
        posts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      })
    })
  )(req)
}

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const body = await req.json()

      try {
        console.log('POST /api/posts - Raw request body keys:', Object.keys(body))
        console.log('POST /api/posts - Raw request body types:', Object.fromEntries(
          Object.entries(body).map(([key, value]) => [key, typeof value])
        ))

        // Log specific fields that might be causing issues
        console.log('POST /api/posts - Content:', body.content ? `"${body.content.substring(0, 100)}..."` : 'null/undefined')
        console.log('POST /api/posts - VideoUrl length:', body.videoUrl ? body.videoUrl.length : 'null/undefined')
        console.log('POST /api/posts - Videos array length:', body.videos ? body.videos.length : 'null/undefined')
        console.log('POST /api/posts - SocialAccountIds:', body.socialAccountIds)
        console.log('POST /api/posts - Platform:', body.platform)

        const { content, hashtags, imageUrl, images, videoUrl, videos, platform, socialAccountIds, scheduledAt, title, description } = validateRequest(schemas.createPost, body)

        console.log('POST /api/posts - Validation passed successfully')
        console.log('POST /api/posts - Validated data:', { content, hashtags, imageUrl, images, videoUrl, videos, platform, socialAccountIds, scheduledAt })

        // Check usage limits
        const canPost = await checkUsageLimit(user.id, user.subscription?.tier || 'STARTER')
        if (!canPost) {
          return apiError('Monthly post limit reached. Please upgrade your subscription.', 403)
        }

        // Validate social accounts belong to user and are active
        console.log('📝 Creating post with socialAccountIds:', socialAccountIds)

        if (!socialAccountIds || socialAccountIds.length === 0) {
          return apiError('At least one social account must be selected', 400)
        }

        const socialAccounts: SocialAccountLite[] = await db.socialAccount.findMany({
          where: {
            id: { in: socialAccountIds },
            userId: user.id,
            isActive: true
          },
          select: {
            id: true,
            platform: true,
            accountName: true,
            isActive: true,
          }
        })

        console.log(`📝 Found ${socialAccounts.length} active social accounts for user ${user.id}:`,  
          socialAccounts.map((acc: SocialAccountLite) => ({ id: acc.id, platform: acc.platform, accountName: acc.accountName, isActive: acc.isActive })))

        if (socialAccounts.length !== socialAccountIds.length) {
          console.error(`❌ Social account validation failed. Requested: ${socialAccountIds.length}, Found: ${socialAccounts.length}`)
          console.error('Requested IDs:', socialAccountIds)
          console.error('Found accounts:', socialAccounts.map((acc: SocialAccountLite) => acc.id))
          return apiError('One or more selected social accounts are invalid or inactive', 400)
        }

        // Use the platform from the request body if provided, otherwise from social account
        const postPlatform = (platform as SocialPlatform) || socialAccounts[0]?.platform || 'TWITTER'
        
        // Create the post - only include fields that exist in the schema
        const postData: any = {
          userId: user.id,
          content: content && content.trim() ? content : null, // Allow null content for video-only posts
          hashtags: hashtagsToString(hashtags || []),
          imageUrl: imageUrl || (images && images.length > 0 ? images[0] : null),
          videoUrl: videoUrl || (videos && videos.length > 0 ? videos[0] : null),
          platform: postPlatform,
          status: scheduledAt ? 'SCHEDULED' : 'DRAFT'
        }

        // Add title and description only if they exist (to avoid schema issues)
        if (title && title.trim()) {
          postData.title = title.trim()
        }
        if (description && description.trim()) {
          postData.description = description.trim()
        }

        // Only add scheduledAt if it exists
        if (scheduledAt) {
          postData.scheduledAt = new Date(scheduledAt)
        }

        // Only add images field if images array exists and has content
        if (images && Array.isArray(images) && images.length > 0) {
          postData.images = JSON.stringify(images)
        }

        // Only add videos field if videos array exists and has content
        if (videos && Array.isArray(videos) && videos.length > 0) {
          postData.videos = JSON.stringify(videos)
        }
        
        console.log('POST /api/posts - Creating post with data:', postData)
        console.log('POST /api/posts - Data keys:', Object.keys(postData))
        console.log('POST /api/posts - Data values:', Object.values(postData))
        
        let post
        try {
          console.log('POST /api/posts - Attempting to create post with data:', JSON.stringify(postData, null, 2))
          
          post = await db.post.create({
            data: postData,
            include: {
              publications: {
                include: {
                  socialAccount: true
                }
              },
              analytics: true
            }
          })
          
          console.log('POST /api/posts - Post created successfully:', post.id)
        } catch (dbError) {
          console.error('POST /api/posts - Database create failed:', dbError)
          console.error('POST /api/posts - Failed data:', JSON.stringify(postData, null, 2))
          console.error('POST /api/posts - Error details:', {
            name: dbError instanceof Error ? dbError.name : 'Unknown',
            message: dbError instanceof Error ? dbError.message : 'Unknown error',
            stack: dbError instanceof Error ? dbError.stack : 'No stack trace'
          })

          // Provide more specific error messages
          if (dbError instanceof Error) {
            if (dbError.message.includes('Unknown argument')) {
              console.error('POST /api/posts - Schema mismatch detected. Available fields might not match schema.')
              return apiError('Database schema mismatch. Please contact support.')
            }
            if (dbError.message.includes('title') || dbError.message.includes('description')) {
              console.error('POST /api/posts - Title/description field error detected')
              return apiError('Database field error: ' + dbError.message)
            }
            return apiError('Database create failed: ' + dbError.message)
          }

          return apiError('Database create failed: Unknown error')
        }

        // Create post publications for each selected social account
        console.log(`📝 Creating ${socialAccounts.length} publications for post ${post.id}`)
        const publications = await Promise.all(
          socialAccounts.map((account: SocialAccountLite) => {
            console.log(`📝 Creating publication for account ${account.id} (${account.platform})`)
            return db.postPublication.create({
              data: {
                postId: post.id,
                socialAccountId: account.id,
                status: scheduledAt ? 'PENDING' : 'PENDING'
              }
            })
          })
        )
        console.log(`✅ Created ${publications.length} publications successfully`)

        // Update usage tracking
        const currentMonth = new Date().getMonth() + 1
        const currentYear = new Date().getFullYear()

        await db.usageTracking.upsert({
          where: {
            userId_month_year: {
              userId: user.id,
              month: currentMonth,
              year: currentYear
            }
          },
          update: {
            postsUsed: { increment: 1 }
          },
          create: {
            userId: user.id,
            month: currentMonth,
            year: currentYear,
            postsUsed: 1
          }
        })

        // Fetch the complete post with publications
        const completePost = await db.post.findUnique({
          where: { id: post.id },
          include: {
            publications: {
              include: {
                socialAccount: true
              }
            },
            analytics: true
          }
        })

        return apiSuccess({ post: formatPostWithHashtags(completePost!) }, 201)
      } catch (error) {
        console.error('POST /api/posts - Validation or general error:', error)
        console.error('POST /api/posts - Request body:', JSON.stringify(body, null, 2))
        return apiError(error instanceof Error ? error.message : 'Invalid request')
      }
    })
  )(req)
}
