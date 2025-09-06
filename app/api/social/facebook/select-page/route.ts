import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPageAccessToken } from '@/lib/social/facebook'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const userId: string | undefined = body?.userId
    const pageId: string | undefined = body?.pageId
    const pageName: string | undefined = body?.pageName

    if (!userId || !pageId) {
      return NextResponse.json(
        { success: false, error: { message: 'Missing userId or pageId' } },
        { status: 400 }
      )
    }

    const userAccount = await (db as any).socialAccount.findFirst({
      where: { userId, platform: 'FACEBOOK', isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!userAccount?.accessToken) {
      return NextResponse.json(
        { success: false, error: { message: 'Facebook not connected' } },
        { status: 404 }
      )
    }

    const pageAccessToken = await getPageAccessToken(pageId, userAccount.accessToken)
    if (!pageAccessToken) {
      return NextResponse.json(
        { success: false, error: { message: 'Unable to fetch page access token' } },
        { status: 400 }
      )
    }

    const prisma: any = db as any
    await prisma.socialAccount.upsert({
      where: {
        userId_platform_accountId: {
          userId,
          platform: 'FACEBOOK',
          accountId: pageId,
        },
      },
      create: {
        userId,
        platform: 'FACEBOOK',
        accountId: pageId,
        accountName: pageName || `Facebook Page ${pageId}`,
        displayName: pageName || undefined,
        accessToken: pageAccessToken,
        refreshToken: userAccount.accessToken, // store user token as refresh seed
        isActive: true,
        isConnected: true,
        accountType: 'BUSINESS',
      },
      update: {
        accountName: pageName || undefined,
        displayName: pageName || undefined,
        accessToken: pageAccessToken,
        refreshToken: userAccount.accessToken,
        isActive: true,
        isConnected: true,
        accountType: 'BUSINESS',
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Unknown error' } },
      { status: 500 }
    )
  }
}

