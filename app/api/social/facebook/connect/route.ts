import { NextResponse } from 'next/server'
import { getFacebookAuthUrl } from '@/lib/social/facebook'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    let state = searchParams.get('state') || undefined
    const redirectUri = searchParams.get('redirectUri') || undefined
    const userId = searchParams.get('userId') || undefined

    if (!state && userId) {
      // Build a base64 JSON state with userId for callback persistence
      const raw = JSON.stringify({ userId })
      state = Buffer.from(raw, 'utf8').toString('base64')
    }

    const url = getFacebookAuthUrl({ state, redirectUri })

    // Return JSON matching frontend expectations: data.authUrl
    return NextResponse.json({ success: true, data: { authUrl: url } })
  } catch (err: any) {
    const message =
      err?.message || 'Facebook integration not configured. Please contact administrator.'
    return NextResponse.json({ success: false, error: { message } }, { status: 400 })
  }
}

export async function POST(req: Request) {
  try {
    let state: string | undefined
    let redirectUri: string | undefined
    let userId: string | undefined
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}))
      state = body?.state
      redirectUri = body?.redirectUri
      userId = body?.userId
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const form = await req.formData()
      state = (form.get('state') as string) || undefined
      redirectUri = (form.get('redirectUri') as string) || undefined
      userId = (form.get('userId') as string) || undefined
    }

    if (!state && userId) {
      const raw = JSON.stringify({ userId })
      state = Buffer.from(raw, 'utf8').toString('base64')
    }

    const url = getFacebookAuthUrl({ state, redirectUri })
    return NextResponse.json({ success: true, data: { authUrl: url } })
  } catch (err: any) {
    const message =
      err?.message || 'Facebook integration not configured. Please contact administrator.'
    return NextResponse.json({ success: false, error: { message } }, { status: 400 })
  }
}
