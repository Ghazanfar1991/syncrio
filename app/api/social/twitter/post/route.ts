// Twitter posting API endpoint
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { postTweet } from '@/lib/social/twitter'
import { db } from '@/lib/db'
import { z } from 'zod'

const twitterPostSchema = z.object({
  content: z.string().min(1).max(280), // Twitter character limit
  accountId: z.string(),
  postId: z.string().optional() // Optional post ID to link to our posts table
})

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const body = await req.json()
      
      try {
        const { content, accountId, postId } = twitterPostSchema.parse(body)
        
        // Get valid Twitter token
        const socialAccount = await db.socialAccount.findUnique({
          where: {
            userId_platform_accountId: {
              userId: user.id,
              platform: 'TWITTER',
              accountId
            }
          },
          select: { accessToken: true, isActive: true }
        })
        
        if (!socialAccount || !socialAccount.isActive || !socialAccount.accessToken) {
          return apiError('Twitter account not connected or token expired', 401)
        }

        const accessToken = socialAccount.accessToken

        // Post to Twitter with hybrid OAuth system
        const tweetResult = await postTweet(accessToken, content, undefined, user.id, accountId)
        
        // Update post publication record if postId provided
        if (postId) {
          const socialAccount = await db.socialAccount.findUnique({
            where: {
              userId_platform_accountId: {
                userId: user.id,
                platform: 'TWITTER',
                accountId
              }
            }
          })

          if (socialAccount) {
            await db.postPublication.upsert({
              where: {
                postId_socialAccountId: {
                  postId,
                  socialAccountId: socialAccount.id
                }
              },
              update: {
                platformPostId: tweetResult.id,
                status: 'PUBLISHED',
                publishedAt: new Date()
              },
              create: {
                postId,
                socialAccountId: socialAccount.id,
                platformPostId: tweetResult.id,
                status: 'PUBLISHED',
                publishedAt: new Date()
              }
            })

            // Update the main post status
            await db.post.update({
              where: { id: postId },
              data: {
                status: 'PUBLISHED',
                publishedAt: new Date()
              }
            })
          }
        }

        return apiSuccess({
          tweetId: tweetResult.id,
          content: tweetResult.text,
          message: 'Tweet posted successfully'
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return apiError(`Validation error: ${error.issues.map((e: any) => e.message).join(', ')}`)
        }
        
        console.error('Twitter posting error:', error)
        return apiError(
          error instanceof Error ? error.message : 'Failed to post tweet',
          500
        )
      }
    })
  )(req)
}