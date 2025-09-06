import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { SocialPlatform, AccountType } from '@prisma/client'
import { postToFacebookPage, getPageAccessToken } from '@/lib/social/facebook'

export async function POST(req: Request) {
  try {
    const sessionAny = (await getServerSession(authOptions as any)) as any
    if (!sessionAny?.user?.id) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const {
      // Preferred: either provide a connected accountId (Page or User) or a pageId
      accountId,
      pageId: inputPageId,
      message,
      linkUrl,
      imageUrl,
      scheduledPublishTime,
      // Legacy direct tokens still supported
      pageAccessToken: inputPageAccessToken,
      userAccessToken: inputUserAccessToken,
    } = body || {}

    const userId = sessionAny.user.id as string

    let pageId: string | undefined = inputPageId
    let pageAccessToken: string | undefined = inputPageAccessToken
    let userAccessToken: string | undefined = inputUserAccessToken

    // Resolve tokens from DB if not provided directly
    if (!pageAccessToken && !userAccessToken) {
      if (!accountId && !pageId) {
        return NextResponse.json(
          { success: false, error: { message: 'Provide accountId or pageId' } },
          { status: 400 }
        )
      }

      // Try to find a Page-level account first
      let account = await (db as any).socialAccount.findFirst({
        where: {
          userId,
          platform: SocialPlatform.FACEBOOK,
          accountId: accountId || pageId,
        },
      })

      if (account && account.accountType === AccountType.BUSINESS) {
        // Connected to a Page already
        pageId = account.accountId
        pageAccessToken = account.accessToken
      } else {
        // Fallback: use the latest user-level connection
        const userAccount = await (db as any).socialAccount.findFirst({
          where: { userId, platform: SocialPlatform.FACEBOOK, isActive: true },
          orderBy: { createdAt: 'desc' },
        })
        if (!userAccount?.accessToken) {
          return NextResponse.json(
            { success: false, error: { message: 'Facebook not connected' } },
            { status: 404 }
          )
        }
        if (!pageId) {
          return NextResponse.json(
            { success: false, error: { message: 'Missing pageId for user-level Facebook posting' } },
            { status: 400 }
          )
        }
        // Derive a page token from the user token
        const token = await getPageAccessToken(pageId, userAccount.accessToken)
        if (!token) {
          return NextResponse.json(
            { success: false, error: { message: 'Unable to obtain page access token' } },
            { status: 400 }
          )
        }
        pageAccessToken = token
      }
    }

    if (!pageId) {
      return NextResponse.json(
        { success: false, error: { message: 'Missing pageId' } },
        { status: 400 }
      )
    }

    const result = await postToFacebookPage({
      pageId,
      message,
      linkUrl,
      imageUrl,
      scheduledPublishTime,
      pageAccessToken,
      userAccessToken,
    })

    return NextResponse.json({ success: true, id: result.id })
  } catch (err: any) {
    console.error('Facebook post error', err)
    const message = err?.message || 'Unknown error'
    return NextResponse.json({ success: false, error: { message } }, { status: 500 })
  }
}
