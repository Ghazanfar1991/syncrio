// Image conversion utilities for social media platforms
export interface ImageConversionResult {
  success: boolean
  url?: string
  blob?: Blob
  error?: string
  size?: number
  format?: string
}

// Convert base64 image to blob
export function base64ToBlob(base64String: string): ImageConversionResult {
  try {
    // Handle data URLs (data:image/png;base64,<data>)
    let base64Data = base64String
    let mimeType = 'image/jpeg'
    
    if (base64String.startsWith('data:')) {
      const parts = base64String.split(',')
      if (parts.length !== 2) {
        return {
          success: false,
          error: 'Invalid data URL format'
        }
      }
      
      const header = parts[0]
      base64Data = parts[1]
      
      // Extract MIME type
      const mimeMatch = header.match(/data:([^;]+)/)
      if (mimeMatch) {
        mimeType = mimeMatch[1]
      }
    }
    
    // Check if base64 data is too long (Twitter limit is 5MB)
    const estimatedSize = Math.ceil(base64Data.length * 0.75) // Base64 is ~75% of original size
    if (estimatedSize > 5 * 1024 * 1024) {
      return {
        success: false,
        error: `Image too large: estimated ${(estimatedSize / (1024 * 1024)).toFixed(2)}MB (max 5MB)`
      }
    }
    
    // Check if we're in a Node.js environment
    if (typeof window === 'undefined') {
      // Node.js environment - use Buffer
      const buffer = Buffer.from(base64Data, 'base64')
      
      // Create a blob-like object for Node.js
      const blob = {
        size: buffer.length,
        type: mimeType,
        arrayBuffer: () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
      } as any
      
      return {
        success: true,
        blob,
        size: buffer.length,
        format: mimeType
      }
    } else {
      // Browser environment - use Blob
      const byteCharacters = atob(base64Data)
      const byteArray = new Uint8Array(byteCharacters.length)
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i)
      }
      
      const blob = new Blob([byteArray], { type: mimeType })
      
      return {
        success: true,
        blob,
        size: blob.size,
        format: mimeType
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to convert base64: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

// Check if image is base64 or data URL
export function isBase64Image(imageUrl: string): boolean {
  // Also check if the string is extremely long (likely base64)
  return imageUrl.startsWith('data:') || imageUrl.includes('base64') || imageUrl.length > 10000
}

// Get image format from URL or base64
export function getImageFormat(imageUrl: string): string {
  if (isBase64Image(imageUrl)) {
    // For base64, extract MIME type from the data URL header
    if (imageUrl.startsWith('data:')) {
      const mimeMatch = imageUrl.match(/data:([^;]+)/)
      if (mimeMatch && mimeMatch[1]) {
        return mimeMatch[1]
      }
    }
    
    // Fallback: try to convert to blob for format detection
    try {
      const result = base64ToBlob(imageUrl)
      return result.format || 'image/jpeg' // Default to JPEG if we can't determine
    } catch (error) {
      console.warn('Failed to detect base64 format, defaulting to JPEG:', error)
      return 'image/jpeg'
    }
  }
  
  try {
    const url = new URL(imageUrl)
    const pathname = url.pathname.toLowerCase()
    
    if (pathname.includes('.jpg') || pathname.includes('.jpeg')) return 'image/jpeg'
    if (pathname.includes('.png')) return 'image/png'
    if (pathname.includes('.gif')) return 'image/gif'
    if (pathname.includes('.webp')) return 'image/webp'
    
    return 'image/jpeg' // Default to JPEG for unknown formats
  } catch {
    return 'image/jpeg' // Default to JPEG for invalid URLs
  }
}

// Get image size in MB
export function getImageSizeMB(imageUrl: string): number {
  if (isBase64Image(imageUrl)) {
    // Quick size estimation for base64 without full decoding
    if (imageUrl.startsWith('data:')) {
      const parts = imageUrl.split(',')
      if (parts.length === 2) {
        const base64Data = parts[1]
        const estimatedSize = Math.ceil(base64Data.length * 0.75) // Base64 is ~75% of original size
        return estimatedSize / (1024 * 1024)
      }
    }
    
    // Fallback to full conversion
    try {
      const result = base64ToBlob(imageUrl)
      if (result.success && result.size) {
        return result.size / (1024 * 1024)
      }
    } catch (error) {
      console.warn('Failed to get image size:', error)
    }
    return 0
  }
  
  // For URLs, we can't determine size without downloading
  return 0
}

// Validate image for platform requirements
export function validateImageForPlatform(imageUrl: string, platform: string): ImageConversionResult {
  const platformRequirements = {
    TWITTER: { maxSizeMB: 5, formats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] },
    X: { maxSizeMB: 5, formats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] },
    LINKEDIN: { maxSizeMB: 5, formats: ['image/jpeg', 'image/png', 'image/gif'] },
    INSTAGRAM: { maxSizeMB: 8, formats: ['image/jpeg', 'image/png'] },
    FACEBOOK: { maxSizeMB: 10, formats: ['image/jpeg', 'image/png', 'image/gif'] },
    TIKTOK: { maxSizeMB: 10, formats: ['image/jpeg', 'image/png', 'image/gif'] },
    WHATSAPP: { maxSizeMB: 16, formats: ['image/jpeg', 'image/png', 'image/gif'] },
    TELEGRAM: { maxSizeMB: 50, formats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] },
    THREADS: { maxSizeMB: 8, formats: ['image/jpeg', 'image/png'] }
  }
  
  const requirements = platformRequirements[platform as keyof typeof platformRequirements] || platformRequirements.TWITTER
  
  // Check if it's base64 (not supported by LinkedIn)
  if (isBase64Image(imageUrl) && platform === 'LINKEDIN') {
    return {
      success: false,
      error: 'LinkedIn does not support base64 or data URLs. Please use a direct image URL instead.'
    }
  }
  
  // Get image format
  const format = getImageFormat(imageUrl)
  if (!requirements.formats.includes(format)) {
    return {
      success: false,
      error: `${platform} does not support ${format}. Supported formats: ${requirements.formats.join(', ')}`
    }
  }
  
  // Check size for base64 images
  if (isBase64Image(imageUrl)) {
    const sizeMB = getImageSizeMB(imageUrl)
    if (sizeMB > requirements.maxSizeMB) {
      return {
        success: false,
        error: `Image size (${sizeMB.toFixed(2)}MB) exceeds ${platform}'s limit of ${requirements.maxSizeMB}MB`
      }
    }
  }
  
  return {
    success: true,
    format,
    size: getImageSizeMB(imageUrl)
  }
}

// Convert image to platform-appropriate format
export function convertImageForPlatform(imageUrl: string, platform: string): ImageConversionResult {
  const validation = validateImageForPlatform(imageUrl, platform)
  
  if (!validation.success) {
    return validation
  }
  
  if (isBase64Image(imageUrl)) {
    // Convert base64 to blob for platforms that support it
    if (platform === 'LINKEDIN') {
      return {
        success: false,
        error: 'LinkedIn requires direct image URLs. Base64 images are not supported.'
      }
    }
    
    return base64ToBlob(imageUrl)
  }
  
  // For direct URLs, return success
  return {
    success: true,
    url: imageUrl,
    format: validation.format
  }
}
