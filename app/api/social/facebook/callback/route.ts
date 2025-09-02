// Facebook OAuth callback handler
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('Facebook OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/integrations?error=facebook_oauth_failed`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/integrations?error=missing_code`
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
        `${process.env.NEXTAUTH_URL}/integrations?error=user_not_found`
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
        `${process.env.NEXTAUTH_URL}/integrations?error=account_limit_reached`
      )
    }

    try {
      // Exchange code for access token
      const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.FACEBOOK_CLIENT_ID || '',
          client_secret: process.env.FACEBOOK_CLIENT_SECRET || '',
          code,
          redirect_uri: `${process.env.NEXTAUTH_URL}/api/social/facebook/callback`,
        })
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for access token')
      }

      const tokens = await tokenResponse.json()

      // Get Facebook page information
      const pageResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${tokens.access_token}`
      )

      if (!pageResponse.ok) {
        throw new Error('Failed to get Facebook pages')
      }

      const pagesData = await pageResponse.json()
      const page = pagesData.data?.[0] // Get first page

      if (!page) {
        throw new Error('No Facebook pages found')
      }

                   // Save Facebook account directly to database
             const accountData = {
               platform: 'FACEBOOK',
               accountId: page.id,
               accountName: page.name,
               displayName: page.name,
               username: page.id,
               accessToken: page.access_token,
               refreshToken: null,
               expiresAt: null, // Facebook tokens don't expire
               accountType: 'BUSINESS',
               permissions: ['pages_manage_posts', 'pages_read_engagement'],
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
        `${process.env.NEXTAUTH_URL}/integrations?success=facebook_connected`
      )
    } catch (error) {
      console.error('Facebook token exchange failed:', error)
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/integrations?error=facebook_connection_failed`
      )
    }
  } catch (error) {
    console.error('Facebook OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/integrations?error=oauth_callback_failed`
    )
  }
}
