import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isYouTubeConfigured, testYouTubeAPIConnection } from '@/lib/social/youtube'

export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check YouTube configuration
    const configStatus = {
      isConfigured: isYouTubeConfigured(),
      clientId: process.env.YOUTUBE_CLIENT_ID ? 'Set' : 'Not set',
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET ? 'Set' : 'Not set',
      redirectUri: process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/social/youtube/callback` : 'Not set'
    }

    return NextResponse.json({
      message: 'YouTube API test endpoint',
      configStatus,
      environment: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'Not set',
        NODE_ENV: process.env.NODE_ENV || 'Not set'
      }
    })
  } catch (error) {
    console.error('YouTube API test error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
