import { NextRequest, NextResponse } from 'next/server'
import { generateImage } from '@/lib/image-generation'

export async function GET(req: NextRequest) {
  try {
    console.log('🧪 Testing image generation...')
    
    const result = await generateImage({
      prompt: 'A simple test image of a blue circle on white background',
      platform: 'TWITTER'
    })
    
    console.log('🧪 Test result:', result)
    
    return NextResponse.json({
      success: true,
      result: result,
      message: 'Image generation test completed'
    })
    
  } catch (error) {
    console.error('🧪 Test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed',
      message: 'Image generation test failed'
    }, { status: 500 })
  }
}
