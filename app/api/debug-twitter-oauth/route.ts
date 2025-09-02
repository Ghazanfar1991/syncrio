import { NextRequest, NextResponse } from 'next/server'
import { getTwitterAuthUrl } from '@/lib/social/twitter-oauth-config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'test-user'
    
    // Generate OAuth URL
    const authUrl = getTwitterAuthUrl(userId)
    
    // Parse the URL to show all parameters
    const url = new URL(authUrl)
    const params = Object.fromEntries(url.searchParams.entries())
    
    // Check environment variables (without exposing secrets)
    const envCheck = {
      TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID ? 'Set' : 'Missing',
      TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET ? 'Set' : 'Missing',
      TWITTER_REDIRECT_URI: process.env.TWITTER_REDIRECT_URI || 'Missing',
      NODE_ENV: process.env.NODE_ENV
    }
    
    return NextResponse.json({
      message: 'Twitter OAuth Debug Information',
      authUrl,
      parsedParams: params,
      environmentCheck: envCheck,
      recommendations: [
        'Verify your X Developer App settings match these parameters',
        'Check that your redirect URI is exactly: ' + process.env.TWITTER_REDIRECT_URI,
        'Ensure your app has OAuth 2.0 enabled (not just OAuth 1.0a)',
        'Verify your app has the correct permissions: Read, Write, and Direct Messages',
        'Make sure your app is not in restricted mode',
        'Check that your client ID matches your X Developer App'
      ],
      commonIssues: [
        'Redirect URI mismatch (must be exact match)',
        'App not configured for OAuth 2.0',
        'Missing or incorrect client ID',
        'App in restricted/sandbox mode',
        'Incorrect scopes for your app type',
        'PKCE configuration issues'
      ]
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
