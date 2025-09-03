// Instagram OAuth callback handler
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { exchangeInstagramCode, getLongLivedToken, getInstagramUser } from '@/lib/social/instagram'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const mk = (path: string) => new URL(path, req.url)

    // Handle OAuth errors
    if (error) {
      console.error('Instagram OAuth error:', error)
      return NextResponse.redirect(mk('/dashboard?error=instagram_oauth_failed'))
    }

    if (!code) {
      return NextResponse.redirect(mk('/dashboard?error=missing_code'))
    }

    // Get current user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.redirect(mk('/auth/signin?error=unauthorized'))
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { subscription: true }
    })

    if (!user) {
      return NextResponse.redirect(mk('/dashboard?error=user_not_found'))
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
      return NextResponse.redirect(mk('/dashboard?error=account_limit_reached'))
    }

    try {
      // Exchange code for short-lived access token
      const shortLivedTokens = await exchangeInstagramCode(code)
      
      // Exchange for long-lived access token
      const longLivedTokens = await getLongLivedToken(shortLivedTokens.access_token)
      
      // Get Instagram user information
      const instagramUser = await getInstagramUser(longLivedTokens.access_token)
      
      // Save Instagram account directly to database
      const accountData = {
        platform: 'INSTAGRAM' as const,
        accountId: instagramUser.id,
        accountName: instagramUser.username,
        displayName: instagramUser.username,
        username: instagramUser.username,
        accessToken: (instagramUser as any).page_access_token || longLivedTokens.access_token,
        refreshToken: null,
        expiresAt: longLivedTokens.expires_in ? new Date(Date.now() + longLivedTokens.expires_in * 1000) : null,
        accountType: instagramUser.account_type === 'BUSINESS' ? 'BUSINESS' : 'PERSONAL',
        permissions: ['user_profile', 'user_media'],
        isConnected: true,
        isActive: true,
        userId: user.id
      }
      
      // Save to database directly
      const savedAccount = await db.socialAccount.create({
        data: accountData as any
      })
      
      if (!savedAccount) {
        throw new Error('Failed to save account to database')
      }

      // Redirect to integrations page with success message
      return NextResponse.redirect(mk('/integrations?success=instagram_connected'))
    } catch (error) {
      console.error('Instagram token exchange failed:', error)
      return NextResponse.redirect(mk('/integrations?error=instagram_connection_failed'))
    }
  } catch (error) {
    console.error('Instagram OAuth callback error:', error)
    return NextResponse.redirect(new URL('/dashboard?error=oauth_callback_failed', req.url))
  }
}
