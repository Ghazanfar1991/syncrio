import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserPages } from '@/lib/social/facebook'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || ''
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { message: 'Missing userId' } },
        { status: 400 }
      )
    }

    const account = await (db as any).socialAccount.findFirst({
      where: { userId, platform: 'FACEBOOK', isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!account?.accessToken) {
      return NextResponse.json(
        { success: false, error: { message: 'Facebook not connected' } },
        { status: 404 }
      )
    }

    const pages = await getUserPages(account.accessToken)
    return NextResponse.json({ success: true, data: { pages } })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Unknown error' } },
      { status: 500 }
    )
  }
}

