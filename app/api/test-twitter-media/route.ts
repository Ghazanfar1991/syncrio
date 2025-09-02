import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { accessToken, imageUrl } = await request.json()
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }
    
    console.log('Testing Twitter media upload with token:', accessToken.substring(0, 20) + '...')
    
    // Test 1: Check if we can access Twitter API
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    console.log('Twitter user API response:', userResponse.status)
    if (userResponse.ok) {
      const userData = await userResponse.json()
      console.log('Twitter user data:', userData)
    } else {
      const error = await userResponse.text()
      console.error('Twitter user API error:', error)
    }
    
    // Test 2: Try media upload endpoint
    if (imageUrl) {
      console.log('Testing media upload with image...')
      
      // Convert base64 to buffer
      const base64Data = imageUrl.split(',')[1] || imageUrl
      const buffer = Buffer.from(base64Data, 'base64')
      
      // Create FormData
      const formData = new FormData()
      const blob = new Blob([buffer], { type: 'image/jpeg' })
      formData.append('media', blob, 'test.jpg')
      
      // Try v1.1 media upload
      const mediaResponse = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      })
      
      console.log('Twitter media upload response:', mediaResponse.status)
      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json()
        console.log('Twitter media upload success:', mediaData)
      } else {
        const error = await mediaResponse.text()
        console.error('Twitter media upload error:', error)
      }
      
      // Try v2 media upload
      const mediaV2Response = await fetch('https://api.twitter.com/2/media', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      })
      
      console.log('Twitter v2 media upload response:', mediaV2Response.status)
      if (mediaV2Response.ok) {
        const mediaData = await mediaV2Response.json()
        console.log('Twitter v2 media upload success:', mediaData)
      } else {
        const error = await mediaV2Response.text()
        console.error('Twitter v2 media upload error:', error)
      }
    }
    
    return NextResponse.json({
      message: 'Twitter API tests completed',
      userApiStatus: userResponse.status,
      mediaApiStatus: imageUrl ? 'tested' : 'skipped'
    })
    
  } catch (error) {
    console.error('Twitter media test error:', error)
    return NextResponse.json({ 
      error: 'Failed to test Twitter media upload',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
