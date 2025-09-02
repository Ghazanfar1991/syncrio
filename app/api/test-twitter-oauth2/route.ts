import { NextRequest, NextResponse } from 'next/server'
import { uploadMediaWithOAuth2 } from '@/lib/social/twitter-oauth-config'
import { postTweet } from '@/lib/social/twitter'
import { TokenManager } from '@/lib/social/token-manager'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const { accountId, testMessage } = await request.json()
        
        if (!accountId) {
          return apiError('Account ID is required', 400)
        }
        
        console.log('🧪 Testing Twitter OAuth 2.0 functionality...')
        console.log('🧪 User ID:', user.id)
        console.log('🧪 Account ID:', accountId)
        
        // Validate and get fresh token
        console.log('🔄 Validating Twitter token...')
        const tokenValidation = await TokenManager.validateAndRefresh(
          user.id, 
          'TWITTER', 
          accountId
        )
        
        if (!tokenValidation.isValid || !tokenValidation.accessToken) {
          return apiError(`Token validation failed: ${tokenValidation.error}`, 401)
        }
        
        console.log('✅ Token validated successfully')
        
        // Test basic tweet posting (without media first)
        const testContent = testMessage || `OAuth 2.0 test tweet - ${new Date().toISOString()}`
        
        console.log('📝 Posting test tweet...')
        const tweetResult = await postTweet(
          tokenValidation.accessToken,
          testContent,
          undefined, // No image for basic test
          user.id,
          accountId
        )
        
        console.log('✅ Test tweet posted successfully!')
        console.log('✅ Tweet ID:', tweetResult.id)
        
        return apiSuccess({
          message: 'Twitter OAuth 2.0 test completed successfully',
          tweetId: tweetResult.id,
          tweetText: tweetResult.text,
          tokenValid: true,
          accessTokenLength: tokenValidation.accessToken.length
        })
        
      } catch (error) {
        console.error('❌ Twitter OAuth 2.0 test failed:', error)
        return apiError(
          `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          500
        )
      }
    })
  )(request)
}
