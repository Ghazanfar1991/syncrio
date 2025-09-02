import { NextRequest, NextResponse } from 'next/server'
import { convertImageForPlatform, isBase64Image, getImageFormat } from '@/lib/social/image-converter'

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, platform } = await request.json()
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }
    
    console.log('Testing image conversion for:', platform)
    console.log('Image URL (first 100 chars):', imageUrl.substring(0, 100))
    
    // Test basic functions
    const isBase64 = isBase64Image(imageUrl)
    const format = getImageFormat(imageUrl)
    
    console.log('Is base64:', isBase64)
    console.log('Detected format:', format)
    
    // Test platform conversion
    const result = convertImageForPlatform(imageUrl, platform || 'TWITTER')
    
    console.log('Conversion result:', {
      success: result.success,
      format: result.format,
      size: result.size,
      error: result.error,
      hasBlob: !!result.blob,
      hasUrl: !!result.url
    })
    
    return NextResponse.json({
      isBase64,
      detectedFormat: format,
      conversionResult: result
    })
    
  } catch (error) {
    console.error('Image conversion test error:', error)
    return NextResponse.json({ 
      error: 'Failed to test image conversion',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
