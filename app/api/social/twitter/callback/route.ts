// Twitter OAuth callback handler
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { exchangeTwitterCode, getTwitterUser } from '@/lib/social/twitter-oauth-config'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('Twitter OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.VERCEL_URL}/dashboard?error=twitter_oauth_failed`
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

    const limit = tierLimits[user.subscription?.tier as keyof typeof tierLimits] || 3
    
    if (accountCount >= limit) {
      return NextResponse.redirect(
        `${process.env.VERCEL_URL}/dashboard?error=account_limit_reached`
      )
    }

    try {
      // Validate and exchange code for access token
      if (!code || !state) {
        throw new Error('Missing OAuth callback parameters: code/state')
      }
      const tokens = await exchangeTwitterCode(code, state)
      
      // Get Twitter user information
      const twitterUser = await getTwitterUser(tokens.access_token)
      
      // Save Twitter account directly to database
      const accountData = {
        platform: 'TWITTER' as const,
        accountId: twitterUser.id,
        accountName: twitterUser.username,
        displayName: twitterUser.name,
        username: twitterUser.username,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        // OAuth 1.0a credentials for media uploads
        consumerKey: process.env.TWITTER_CONSUMER_KEY || null,
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET || null,
        accessTokenSecret: null, // This will be set later when user provides OAuth 1.0a access token
        accountType: 'PERSONAL' as const,
        permissions: ['tweet.read', 'tweet.write', 'users.read', 'media.write'],
        isConnected: true,
        isActive: true,
        userId: user.id
      }
      
      // Save to database directly
      const savedAccount = await db.socialAccount.create({
        data: accountData
      })
      
      if (!savedAccount) {
        throw new Error('Failed to save account to database')
      }

      // Redirect to integrations page with success message
      return NextResponse.redirect(
        `${process.env.VERCEL_URL}/integrations?success=twitter_connected`
      )
    } catch (error) {
      console.error('Twitter token exchange failed:', error)
      return NextResponse.redirect(
        `${process.env.VERCEL_URL}/integrations?error=twitter_connection_failed`
      )
    }
  } catch (error) {
    console.error('Twitter OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.VERCEL_URL}/dashboard?error=oauth_callback_failed`
    )
  }
}
