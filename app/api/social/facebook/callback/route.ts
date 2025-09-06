import { NextResponse } from 'next/server'
import { headers as nextHeaders, cookies as nextCookies } from 'next/headers'
import {
  exchangeCodeForToken,
  getUserProfile,
} from '@/lib/social/facebook'
import { db } from '@/lib/db'

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

    // Resolve current app userId from state/header/cookie
    const resolveUserId = (): string | null => {
      // 1) Try state JSON or base64 JSON
      const state = url.searchParams.get('state')
      if (state) {
        const tryParse = (s: string) => {
          try {
            return JSON.parse(s)
          } catch {
            try {
              const decoded = Buffer.from(s, 'base64').toString('utf8')
              return JSON.parse(decoded)
            } catch {
              return null
            }
          }
        }
        const obj = tryParse(decodeURIComponent(state)) || tryParse(state)
        if (obj && typeof obj === 'object') {
          const uid = (obj as any).userId || (obj as any).uid || (obj as any).u
          if (uid && typeof uid === 'string') return uid
        }
      }
      // 2) Try header
      try {
        const h = nextHeaders()
        const headerUid = h.get('x-user-id') || h.get('x-user') || h.get('x-userid')
        if (headerUid) return headerUid
      } catch {}
      // 3) Try cookie
      try {
        const c = nextCookies()
        const cookieUid = c.get('userId')?.value || c.get('uid')?.value
        if (cookieUid) return cookieUid
      } catch {}
      return null
    }

    const appUserId = resolveUserId()

    // Fetch Facebook user profile id for accountId
    let fbProfileId = ''
    try {
      const profile = await getUserProfile(userToken || '')
      fbProfileId = profile?.id || ''
    } catch {}

    // Persist if we can resolve both app user and fb account id
    if (appUserId && userToken && fbProfileId) {
      const expiresAt = tokenSet.longLivedExpiresIn
        ? new Date(Date.now() + tokenSet.longLivedExpiresIn * 1000)
        : tokenSet.expiresIn
        ? new Date(Date.now() + tokenSet.expiresIn * 1000)
        : null

      const prisma: any = db as any
      await prisma.socialAccount.upsert({
        where: {
          userId_platform_accountId: {
            userId: appUserId,
            platform: 'FACEBOOK',
            accountId: fbProfileId,
          },
        },
        create: {
          userId: appUserId,
          platform: 'FACEBOOK',
          accountId: fbProfileId,
          accessToken: userToken,
          // Use access token as refresh seed so TokenManager can re-extend
          refreshToken: userToken,
          expiresAt,
          isActive: true,
        },
        update: {
          accessToken: userToken,
          refreshToken: userToken,
          expiresAt,
          isActive: true,
          updatedAt: new Date(),
        },
      })
    }

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
