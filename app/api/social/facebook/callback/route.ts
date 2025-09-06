import { NextResponse } from 'next/server'
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
    const redirectUrl = new URL(`/integrations?error=facebook_oauth_failed`, origin)
    return NextResponse.redirect(redirectUrl)
  }

  const code = url.searchParams.get('code')
  if (!code) {
    const redirectUrl = new URL(`/integrations?error=missing_code`, origin)
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
      // 2) Try request headers
      const headerUid =
        req.headers.get('x-user-id') ||
        req.headers.get('x-user') ||
        req.headers.get('x-userid')
      if (headerUid) return headerUid
      // 3) Try cookies header
      const cookiesHeader = req.headers.get('cookie') || ''
      if (cookiesHeader) {
        const parts = cookiesHeader.split(/;\s*/)
        const kv: Record<string, string> = {}
        for (const p of parts) {
          const idx = p.indexOf('=')
          if (idx > -1) kv[p.slice(0, idx).trim()] = decodeURIComponent(p.slice(idx + 1))
        }
        const cookieUid = kv['userId'] || kv['uid']
        if (cookieUid) return cookieUid
      }
      return null
    }

    const appUserId = resolveUserId()

    // Fetch Facebook user profile id for accountId
    let fbProfileId = ''
    let fbProfileName = ''
    try {
      const profile = await getUserProfile(userToken || '')
      fbProfileId = profile?.id || ''
      fbProfileName = (profile as any)?.name || ''
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
          accountName: fbProfileName || `Facebook User ${fbProfileId}`,
          displayName: fbProfileName || undefined,
          accessToken: userToken,
          // Use access token as refresh seed so TokenManager can re-extend
          refreshToken: userToken,
          expiresAt,
          isActive: true,
          isConnected: true,
        },
        update: {
          accountName: fbProfileName || undefined,
          displayName: fbProfileName || undefined,
          accessToken: userToken,
          refreshToken: userToken,
          expiresAt,
          isActive: true,
          updatedAt: new Date(),
        },
      })

      const redirectUrl = new URL(`/integrations?success=facebook_connected`, origin)
      return NextResponse.redirect(redirectUrl)
    }

    // Missing context to persist
    const redirectUrl = new URL(`/integrations?error=facebook_oauth_failed`, origin)
    return NextResponse.redirect(redirectUrl)
  } catch (err: any) {
    const redirectUrl = new URL(`/integrations?error=facebook_oauth_failed`, origin)
    return NextResponse.redirect(redirectUrl)
  }
}
