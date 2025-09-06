import { NextResponse } from 'next/server'
import { getFacebookAuthUrl } from '@/lib/social/facebook'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const state = searchParams.get('state') || undefined
    const redirectUri = searchParams.get('redirectUri') || undefined

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
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}))
      state = body?.state
      redirectUri = body?.redirectUri
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const form = await req.formData()
      state = (form.get('state') as string) || undefined
      redirectUri = (form.get('redirectUri') as string) || undefined
    }

    const url = getFacebookAuthUrl({ state, redirectUri })
    return NextResponse.json({ success: true, data: { authUrl: url } })
  } catch (err: any) {
    const message =
      err?.message || 'Facebook integration not configured. Please contact administrator.'
    return NextResponse.json({ success: false, error: { message } }, { status: 400 })
  }
}
