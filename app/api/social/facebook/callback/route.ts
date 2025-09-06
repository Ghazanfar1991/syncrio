import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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

function redactToken(s?: string | null) {
  if (!s) return ''
  if (s.length <= 10) return '***'
  return `${s.slice(0, 6)}…${s.slice(-4)}`
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = originFromRequest(req)
  const log = (...args: any[]) => console.log('[FB_CALLBACK]', ...args)

  const fbError = url.searchParams.get('error')
  const fbErrorDesc = url.searchParams.get('error_description')
  if (fbError) {
    log('OAuth error from Facebook:', fbError, fbErrorDesc)
    return NextResponse.redirect(new URL(`/integrations?error=facebook_oauth_failed`, origin))
  }

  const code = url.searchParams.get('code')
  if (!code) {
    log('Missing code in callback URL')
    return NextResponse.redirect(new URL(`/integrations?error=missing_code`, origin))
  }

  try {
    log('Exchanging code for token…')
    const tokenSet = await exchangeCodeForToken(code)
    log('Token exchange ok:', {
      accessToken: redactToken(tokenSet.accessToken),
      longLivedAccessToken: redactToken(tokenSet.longLivedAccessToken),
      expiresIn: tokenSet.expiresIn,
      longLivedExpiresIn: tokenSet.longLivedExpiresIn,
    })
    const userToken = tokenSet.longLivedAccessToken || tokenSet.accessToken

    // Resolve user id from state/header/cookie or NextAuth session
    const state = url.searchParams.get('state')
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

    let appUserId: string | null = null
    let userIdSource = 'none'
    if (state) {
      const obj = tryParse(decodeURIComponent(state)) || tryParse(state)
      const uid = obj && (obj.userId || obj.uid || obj.u)
      if (typeof uid === 'string') {
        appUserId = uid
        userIdSource = 'state'
      }
    }
    if (!appUserId) {
      const headerUid =
        req.headers.get('x-user-id') ||
        req.headers.get('x-user') ||
        req.headers.get('x-userid')
      if (headerUid) {
        appUserId = headerUid
        userIdSource = 'header'
      }
    }
    if (!appUserId) {
      const cookiesHeader = req.headers.get('cookie') || ''
      if (cookiesHeader) {
        const parts = cookiesHeader.split(/;\s*/)
        const kv: Record<string, string> = {}
        for (const p of parts) {
          const idx = p.indexOf('=')
          if (idx > -1) kv[p.slice(0, idx).trim()] = decodeURIComponent(p.slice(idx + 1))
        }
        const cookieUid = kv['userId'] || kv['uid']
        if (cookieUid) {
          appUserId = cookieUid
          userIdSource = 'cookie'
        }
      }
    }
    if (!appUserId) {
      try {
        const sessionAny = (await getServerSession(authOptions as any)) as any
        if (sessionAny?.user?.id) {
          appUserId = sessionAny.user.id as string
          userIdSource = 'session'
        }
      } catch {}
    }
    log('Resolved app userId:', appUserId || '(none)', 'source:', userIdSource)

    // Fetch FB profile id and name
    let fbProfileId = ''
    let fbProfileName = ''
    try {
      log('Fetching Facebook user profile…')
      const profile = await getUserProfile(userToken || '')
      fbProfileId = (profile as any)?.id || ''
      fbProfileName = (profile as any)?.name || ''
      log('Profile fetched:', { id: fbProfileId, name: fbProfileName })
    } catch (e: any) {
      log('Failed to fetch profile:', e?.message || e)
    }

    // Persist only if we have necessary context
    if (appUserId && userToken && fbProfileId) {
      const expiresAt = tokenSet.longLivedExpiresIn
        ? new Date(Date.now() + tokenSet.longLivedExpiresIn * 1000)
        : tokenSet.expiresIn
        ? new Date(Date.now() + tokenSet.expiresIn * 1000)
        : null

      const prisma: any = db as any
      log('Upserting SocialAccount…', {
        userId: appUserId,
        platform: 'FACEBOOK',
        accountId: fbProfileId,
        name: fbProfileName,
      })
      const saved = await prisma.socialAccount.upsert({
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
      log('Upserted SocialAccount id:', saved?.id)
      return NextResponse.redirect(new URL(`/integrations?success=facebook_connected`, origin))
    }

    log('Persistence skipped. Context:', {
      hasAppUserId: !!appUserId,
      hasToken: !!userToken,
      hasFbProfileId: !!fbProfileId,
    })
    return NextResponse.redirect(new URL(`/integrations?error=facebook_oauth_failed`, origin))
  } catch (err: any) {
    console.error('[FB_CALLBACK] Callback error:', err?.message || err)
    return NextResponse.redirect(new URL(`/integrations?error=facebook_oauth_failed`, origin))
  }
}
