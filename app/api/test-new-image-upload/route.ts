import { NextRequest, NextResponse } from 'next/server'
import { 
  processImagesForUpload, 
  validateImageForUpload, 
  base64ToBuffer,
  isBase64Image 
} from '@/lib/social/image-upload'

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, platform } = await request.json()
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }
    
    console.log('Testing new image upload system for:', platform)
    console.log('Image URL (first 100 chars):', imageUrl.substring(0, 100))
    
    // Test basic functions
    const isBase64 = isBase64Image(imageUrl)
    console.log('Is base64:', isBase64)
    
    if (isBase64) {
      // Test base64 to buffer conversion
      const bufferResult = base64ToBuffer(imageUrl)
      if (bufferResult) {
        console.log('Buffer conversion successful:', {
          size: `${(bufferResult.size / (1024 * 1024)).toFixed(2)}MB`,
          format: bufferResult.mimeType
        })
        
        // Test validation
        const validation = validateImageForUpload(bufferResult.buffer, bufferResult.mimeType, platform || 'TWITTER')
        console.log('Validation result:', validation)
      } else {
        console.log('Buffer conversion failed')
      }
    }
    
    // Test image processing
    const processedImages = processImagesForUpload(imageUrl)
    console.log('Processed images count:', processedImages.length)
    
    processedImages.forEach((image, index) => {
      console.log(`Image ${index + 1}:`, {
        size: `${(image.size / (1024 * 1024)).toFixed(2)}MB`,
        format: image.mimeType
      })
    })
    
    return NextResponse.json({
      isBase64,
      processedImagesCount: processedImages.length,
      processedImages: processedImages.map(img => ({
        size: `${(img.size / (1024 * 1024)).toFixed(2)}MB`,
        format: img.mimeType
      }))
    })
    
  } catch (error) {
    console.error('New image upload test error:', error)
    return NextResponse.json({ 
      error: 'Failed to test new image upload system',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
