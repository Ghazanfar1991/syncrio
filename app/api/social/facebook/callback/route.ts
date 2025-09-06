import { NextResponse } from 'next/server'
import {
  exchangeCodeForToken,
  getUserProfile,
} from '@/lib/social/facebook'

function originFromRequest(req: Request): string {
  try {
    const { protocol, host } = new URL(req.url)
    return `${protocol}//${host}`
  } catch {
    return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ''
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = originFromRequest(req)
  const platform = 'facebook'

  const fbError = url.searchParams.get('error')
  const fbErrorDesc = url.searchParams.get('error_description')
  if (fbError) {
    const redirectUrl = new URL(
      `/integrations?platform=${platform}&status=error&reason=${encodeURIComponent(
        fbErrorDesc || fbError
      )}`,
      origin
    )
    return NextResponse.redirect(redirectUrl)
  }

  const code = url.searchParams.get('code')
  if (!code) {
    const redirectUrl = new URL(
      `/integrations?platform=${platform}&status=error&reason=${encodeURIComponent(
        'Missing code'
      )}`,
      origin
    )
    return NextResponse.redirect(redirectUrl)
  }

  try {
    const tokenSet = await exchangeCodeForToken(code)
    const userToken = tokenSet.longLivedAccessToken || tokenSet.accessToken

    // Best-effort profile fetch; ignore failures
    try {
      await getUserProfile(userToken || '')
    } catch {}

    const redirectUrl = new URL(
      `/integrations?platform=${platform}&status=success`,
      origin
    )
    return NextResponse.redirect(redirectUrl)
  } catch (err: any) {
    const message = err?.message || 'Token exchange failed'
    const redirectUrl = new URL(
      `/integrations?platform=${platform}&status=error&reason=${encodeURIComponent(
        message
      )}`,
      origin
    )
    return NextResponse.redirect(redirectUrl)
  }
}

