// Image upload utilities for social media platforms
import { Buffer } from 'buffer'

export interface ImageUploadResult {
  success: boolean
  mediaId?: string
  assetUrn?: string
  error?: string
  size?: number
  format?: string
}

export interface PlatformUploadResult {
  success: boolean
  mediaIds?: string[]
  assetUrns?: string[]
  error?: string
}

// Convert base64 image to Buffer
export function base64ToBuffer(base64String: string): { buffer: Buffer; mimeType: string; size: number } | null {
  console.log('🔄 [DEBUG] ===== STARTING BASE64 TO BUFFER CONVERSION =====')
  console.log('🔄 [DEBUG] Input string length:', base64String.length)
  console.log('🔄 [DEBUG] Input string preview:', base64String.substring(0, 100) + '...')
  
  try {
    let base64Data = base64String
    let mimeType = 'image/jpeg'
    
    // Handle data URLs (data:image/png;base64,<data>)
    if (base64String.startsWith('data:')) {
      console.log('🔄 [DEBUG] Detected data URL format')
      const parts = base64String.split(',')
      console.log('🔄 [DEBUG] Data URL parts count:', parts.length)
      
      if (parts.length !== 2) {
        console.error('❌ [DEBUG] Invalid data URL format - expected 2 parts, got', parts.length)
        return null
      }
      
      const header = parts[0]
      base64Data = parts[1]
      console.log('🔄 [DEBUG] Header part:', header)
      console.log('🔄 [DEBUG] Base64 data part length:', base64Data.length)
      
      // Extract MIME type
      const mimeMatch = header.match(/data:([^;]+)/)
      if (mimeMatch) {
        mimeType = mimeMatch[1]
        console.log('🔄 [DEBUG] Extracted MIME type:', mimeType)
      } else {
        console.log('🔄 [DEBUG] No MIME type found in header, using default:', mimeType)
      }
    } else {
      console.log('🔄 [DEBUG] Raw base64 string detected (no data URL header)')
    }
    
    console.log('🔄 [DEBUG] Converting base64 to Buffer...')
    console.log('🔄 [DEBUG] Base64 data length:', base64Data.length)
    console.log('🔄 [DEBUG] Final MIME type:', mimeType)
    
    // Convert base64 to Buffer
    const buffer = Buffer.from(base64Data, 'base64')
    console.log('🔄 [DEBUG] Buffer created successfully')
    console.log('🔄 [DEBUG] Buffer length:', buffer.length, 'bytes')
    console.log('🔄 [DEBUG] Buffer type:', typeof buffer)
    
    const result = {
      buffer,
      mimeType,
      size: buffer.length
    }
    
    console.log('✅ [DEBUG] Base64 to Buffer conversion successful:')
    console.log('   - Buffer size:', result.buffer.length, 'bytes')
    console.log('   - MIME type:', result.mimeType)
    console.log('   - Size:', result.size, 'bytes')
    console.log('🔄 [DEBUG] ===== BASE64 TO BUFFER CONVERSION COMPLETED =====')
    
    return result
  } catch (error) {
    console.error('❌ [DEBUG] Failed to convert base64 to buffer:', error)
    console.error('❌ [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.log('🔄 [DEBUG] ===== BASE64 TO BUFFER CONVERSION FAILED =====')
    return null
  }
}

// Check if image is base64 or data URL
export function isBase64Image(imageUrl: string): boolean {
  return imageUrl.startsWith('data:') || imageUrl.includes('base64') || imageUrl.length > 10000
}

// Get image format from base64 data URL
export function getImageFormatFromBase64(base64String: string): string {
  if (base64String.startsWith('data:')) {
    const mimeMatch = base64String.match(/data:([^;]+)/)
    if (mimeMatch && mimeMatch[1]) {
      return mimeMatch[1]
    }
  }
  return 'image/jpeg' // Default fallback
}

// Validate image size and format for platform
export function validateImageForUpload(imageBuffer: Buffer, mimeType: string, platform: string): { valid: boolean; error?: string } {
  const sizeMB = imageBuffer.length / (1024 * 1024)
  
  const platformRequirements = {
    TWITTER: { maxSizeMB: 5, formats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] },
    X: { maxSizeMB: 5, formats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] },
    LINKEDIN: { maxSizeMB: 5, formats: ['image/jpeg', 'image/png', 'image/gif'] },
    INSTAGRAM: { maxSizeMB: 8, formats: ['image/jpeg', 'image/png'] },
    FACEBOOK: { maxSizeMB: 10, formats: ['image/jpeg', 'image/png', 'image/gif'] }
  }
  
  const requirements = platformRequirements[platform as keyof typeof platformRequirements] || platformRequirements.TWITTER
  
  // Check size
  if (sizeMB > requirements.maxSizeMB) {
    return {
      valid: false,
      error: `Image size (${sizeMB.toFixed(2)}MB) exceeds ${platform}'s limit of ${requirements.maxSizeMB}MB`
    }
  }
  
  // Check format
  if (!requirements.formats.includes(mimeType)) {
    return {
      valid: false,
      error: `${platform} does not support ${mimeType}. Supported formats: ${requirements.formats.join(', ')}`
    }
  }
  
  return { valid: true }
}

// Process images for upload (convert base64 to buffers)
export function processImagesForUpload(images: string | string[]): Array<{ buffer: Buffer; mimeType: string; size: number }> {
  console.log('🖼️ [DEBUG] ===== STARTING IMAGE PROCESSING =====')
  console.log('🖼️ [DEBUG] Input images type:', typeof images)
  console.log('🖼️ [DEBUG] Input images length:', Array.isArray(images) ? images.length : 1)
  
  const imageArray = Array.isArray(images) ? images : [images]
  console.log('🖼️ [DEBUG] Normalized to array with length:', imageArray.length)
  
  const processedImages: Array<{ buffer: Buffer; mimeType: string; size: number }> = []
  
  for (let i = 0; i < imageArray.length; i++) {
    const image = imageArray[i]
    console.log(`🖼️ [DEBUG] Processing image ${i + 1}/${imageArray.length}`)
    console.log(`🖼️ [DEBUG] Image length: ${image.length} characters`)
    console.log(`🖼️ [DEBUG] Image preview: ${image.substring(0, 100)}...`)
    console.log(`🖼️ [DEBUG] Is base64 image: ${isBase64Image(image)}`)
    
    if (isBase64Image(image)) {
      console.log(`🖼️ [DEBUG] Processing base64 image ${i + 1}...`)
      const result = base64ToBuffer(image)
      
      if (result) {
        console.log(`✅ [DEBUG] Successfully processed image ${i + 1}:`)
        console.log(`   - Buffer size: ${result.buffer.length} bytes`)
        console.log(`   - MIME type: ${result.mimeType}`)
        console.log(`   - Size: ${result.size} bytes`)
        
        processedImages.push(result)
        console.log(`✅ [DEBUG] Added image ${i + 1} to processed images array`)
      } else {
        console.warn(`⚠️ [DEBUG] Failed to process base64 image ${i + 1}:`, image.substring(0, 100))
      }
    } else {
      console.warn(`⚠️ [DEBUG] Skipping non-base64 image ${i + 1}:`, image.substring(0, 50))
    }
  }
  
  console.log(`🖼️ [DEBUG] Image processing completed`)
  console.log(`🖼️ [DEBUG] Total processed images: ${processedImages.length}`)
  console.log(`🖼️ [DEBUG] Processed images details:`, processedImages.map((img, idx) => ({
    index: idx,
    bufferSize: img.buffer.length,
    mimeType: img.mimeType,
    size: img.size
  })))
  console.log('🖼️ [DEBUG] ===== IMAGE PROCESSING COMPLETED =====')
  
  return processedImages
}

// Get file extension from MIME type
export function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp'
  }
  
  return extensions[mimeType] || 'jpg'
}
