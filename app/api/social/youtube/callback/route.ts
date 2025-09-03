// YouTube OAuth callback handler
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { exchangeYouTubeCode, getYouTubeChannelInfo, testYouTubeAPIConnection, getYouTubeUserProfile } from '@/lib/social/youtube'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('YouTube OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.VERCEL_URL}/dashboard?error=youtube_oauth_failed`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.VERCEL_URL}/dashboard?error=missing_code`
      )
    }

    // Get current user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.redirect(
        `${process.env.VERCEL_URL}/auth/signin?error=unauthorized`
      )
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { subscription: true }
    })

    if (!user) {
      return NextResponse.redirect(
        `${process.env.VERCEL_URL}/dashboard?error=user_not_found`
      )
    }

    // Check if user has reached account limit
    const accountCount = await db.socialAccount.count({
      where: { userId: user.id, isActive: true }
    })

    const tierLimits = {
      STARTER: 3,
      GROWTH: 10,
      BUSINESS: 25,
      AGENCY: 100
    }

    const userTier = user.subscription?.tier as keyof typeof tierLimits
    const limit = tierLimits[userTier] || 3
    
    console.log('[YouTube] Account limit check:', {
      currentCount: accountCount,
      userTier: userTier || 'No subscription',
      limit: limit,
      canAddMore: accountCount < limit
    })
    
    if (accountCount >= limit) {
      return NextResponse.redirect(
        `${process.env.VERCEL_URL}/dashboard?error=account_limit_reached&current=${accountCount}&limit=${limit}`
      )
    }

    try {
      console.log('[YouTube] Starting OAuth callback process...')
      
      // Exchange code for access token
      console.log('[YouTube] Exchanging code for tokens...')
      const tokens = await exchangeYouTubeCode(code)
      console.log('[YouTube] Token exchange successful, access token:', tokens.accessToken.substring(0, 20) + '...')
      
      // Test API connectivity first
      console.log('[YouTube] Testing API connectivity...')
      const apiTest = await testYouTubeAPIConnection(tokens.accessToken)
      if (!apiTest.success) {
        throw new Error(`API connectivity test failed: ${apiTest.error}`)
      }
      console.log('[YouTube] API connectivity test passed')
      
      // Get YouTube channel information
      console.log('[YouTube] Fetching channel information...')
      let channel
      let accountData
      
      try {
        channel = await getYouTubeChannelInfo(tokens.accessToken)
        console.log('[YouTube] Channel info retrieved:', { id: channel.id, title: channel.title })
        
        accountData = {
          platform: 'YOUTUBE' as const,
          accountId: channel.id,
          accountName: channel.title,
          displayName: channel.title,
          username: channel.id,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
          accountType: 'CREATOR' as const,
          permissions: JSON.stringify(['youtube.upload', 'youtube.readonly']),
          isConnected: true,
          isActive: true,
          userId: user.id
        }
      } catch (channelError) {
        console.log('[YouTube] Channel info failed, trying user profile fallback...')
        
        // Fallback to user profile if channel info fails
        const userProfile = await getYouTubeUserProfile(tokens.accessToken)
        console.log('[YouTube] User profile retrieved:', { id: userProfile.id, name: userProfile.name })
        
        accountData = {
          platform: 'YOUTUBE' as const,
          accountId: userProfile.id,
          accountName: userProfile.name,
          displayName: userProfile.name,
          username: userProfile.id,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
          accountType: 'PERSONAL' as const,
          permissions: JSON.stringify(['youtube.readonly']), // Limited permissions for personal accounts
          isConnected: true,
          isActive: true,
          userId: user.id
        }
      }
      
      // Validate account data
      if (!accountData.accountId || !accountData.accountName) {
        throw new Error('Invalid account data: missing accountId or accountName')
      }
      
      console.log('[YouTube] Account data prepared:', {
        platform: accountData.platform,
        accountId: accountData.accountId,
        accountName: accountData.accountName,
        accountType: accountData.accountType
      })
      
      console.log('[YouTube] Creating new YouTube account...')
      console.log('[YouTube] Account data to save:', JSON.stringify(accountData, null, 2))
      
      // Save to database directly
      let savedAccount
      try {
        savedAccount = await db.socialAccount.create({
          data: accountData
        })
      } catch (dbError) {
        console.error('[YouTube] Database error when creating account:', dbError)
        
        // Check if it's a unique constraint violation
        if (dbError && typeof dbError === 'object' && 'code' in dbError) {
          if (dbError.code === 'P2002') {
            throw new Error(`Account with ID ${accountData.accountId} already exists for this user`)
          }
          
          // Check if it's a foreign key constraint violation
          if (dbError.code === 'P2003') {
            throw new Error('Invalid user ID or database constraint violation')
          }
        }
        
        throw new Error(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}`)
      }
      
      if (!savedAccount) {
        throw new Error('Failed to save account to database')
      }

      console.log('[YouTube] New YouTube account created successfully:', {
        id: savedAccount.id,
        accountId: savedAccount.accountId,
        accountName: savedAccount.accountName,
        platform: savedAccount.platform
      })
      
      // Verify the account was actually saved by fetching it back
      const verifyAccount = await db.socialAccount.findUnique({
        where: { id: savedAccount.id }
      })
      
      if (!verifyAccount) {
        throw new Error('Account was not properly saved to database')
      }
      
      console.log('[YouTube] Account verification successful:', verifyAccount.id)
      
      const redirectUrl = `${process.env.NEXTAUTH_URL}/integrations?success=youtube_connected&accountName=${encodeURIComponent(accountData.accountName)}`
      console.log('[YouTube] Redirecting to:', redirectUrl)
      
      // Redirect to integrations page with success message
      return NextResponse.redirect(redirectUrl)
    } catch (error) {
      console.error('YouTube token exchange failed:', error)
      return NextResponse.redirect(
        `${process.env.VERCEL_URL}/integrations?error=youtube_connection_failed&details=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`
      )
    }
  } catch (error) {
    console.error('YouTube OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.VERCEL_URL}/dashboard?error=oauth_callback_failed`
    )
  }
}
