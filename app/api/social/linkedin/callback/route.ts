// LinkedIn OAuth callback handler
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { exchangeLinkedInCode, getLinkedInUser } from '@/lib/social/linkedin'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('LinkedIn OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard?error=linkedin_oauth_failed`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard?error=missing_code`
      )
    }

    // Get current user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/auth/signin?error=unauthorized`
      )
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { subscription: true }
    })

    if (!user) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard?error=user_not_found`
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
        `${process.env.NEXTAUTH_URL}/dashboard?error=account_limit_reached`
      )
    }

    try {
      // Exchange code for access token
      const tokens = await exchangeLinkedInCode(code)
      
      // Get LinkedIn user information
      const linkedinUser = await getLinkedInUser(tokens.access_token)
      
      // Save LinkedIn account directly to database
      const accountData = {
        platform: 'LINKEDIN',
        accountId: linkedinUser.id,
        accountName: `${linkedinUser.firstName} ${linkedinUser.lastName}`,
        displayName: `${linkedinUser.firstName} ${linkedinUser.lastName}`,
        username: linkedinUser.id,
        accessToken: tokens.access_token,
        refreshToken: null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        accountType: 'PERSONAL',
        permissions: ['openid', 'profile', 'email', 'w_member_social'],
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
        `${process.env.NEXTAUTH_URL}/integrations?success=linkedin_connected`
      )
    } catch (error) {
      console.error('LinkedIn token exchange failed:', error)
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/integrations?error=linkedin_connection_failed`
      )
    }
  } catch (error) {
    console.error('LinkedIn OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard?error=oauth_callback_failed`
    )
  }
}
