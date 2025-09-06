import { NextResponse } from 'next/server'
import { postToFacebookPage } from '@/lib/social/facebook'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      pageId,
      message,
      linkUrl,
      imageUrl,
      scheduledPublishTime,
      pageAccessToken,
      userAccessToken,
    } = body || {}

    if (!pageId) {
      return NextResponse.json(
        { error: 'Missing required field: pageId' },
        { status: 400 }
      )
    }

    if (!pageAccessToken && !userAccessToken) {
      return NextResponse.json(
        { error: 'Provide pageAccessToken or userAccessToken' },
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

    return NextResponse.json({ ok: true, id: result.id })
  } catch (err: any) {
    console.error('Facebook post error', err)
    const message = err?.message || 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

