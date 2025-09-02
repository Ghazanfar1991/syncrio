// Instagram webhook verification endpoint
import { NextRequest, NextResponse } from 'next/server'

const VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'your_verify_token_here'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  
  // Facebook/Instagram webhook verification
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Instagram webhook verified')
    return new NextResponse(challenge, { status: 200 })
  } else {
    console.log('Instagram webhook verification failed')
    return new NextResponse('Forbidden', { status: 403 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Instagram webhook received:', body)
    
    // Handle Instagram webhook events here
    // This is for receiving notifications about posts, comments, etc.
    
    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Instagram webhook error:', error)
    return new NextResponse('Error', { status: 500 })
  }
}
