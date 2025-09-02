// Image handling utilities for social media platforms
export interface ImageValidationResult {
  isValid: boolean
  error?: string
  supportedFormats: string[]
  maxSizeMB: number
}

// Platform-specific image requirements
export const PLATFORM_IMAGE_REQUIREMENTS: Record<string, ImageValidationResult> = {
  TWITTER: {
    isValid: true,
    supportedFormats: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxSizeMB: 5
  },
  X: {
    isValid: true,
    supportedFormats: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxSizeMB: 5
  },
  LINKEDIN: {
    isValid: true,
    supportedFormats: ['.jpg', '.jpeg', '.png', '.gif'],
    maxSizeMB: 5
  },
  INSTAGRAM: {
    isValid: true,
    supportedFormats: ['.jpg', '.jpeg', '.png'],
    maxSizeMB: 8
  },
  FACEBOOK: {
    isValid: true,
    supportedFormats: ['.jpg', '.jpeg', '.png', '.gif'],
    maxSizeMB: 10
  },
  YOUTUBE: {
    isValid: false,
    error: 'YouTube only supports video uploads, not images',
    supportedFormats: [],
    maxSizeMB: 0
  },
  TIKTOK: {
    isValid: true,
    supportedFormats: ['.jpg', '.jpeg', '.png', '.gif'],
    maxSizeMB: 10
  },
  WHATSAPP: {
    isValid: true,
    supportedFormats: ['.jpg', '.jpeg', '.png', '.gif'],
    maxSizeMB: 16
  },
  TELEGRAM: {
    isValid: true,
    supportedFormats: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxSizeMB: 50
  },
  THREADS: {
    isValid: true,
    supportedFormats: ['.jpg', '.jpeg', '.png'],
    maxSizeMB: 8
  }
}

// Validate image URL for a specific platform
export function validateImageForPlatform(imageUrl: string, platform: string): ImageValidationResult {
  const requirements = PLATFORM_IMAGE_REQUIREMENTS[platform] || PLATFORM_IMAGE_REQUIREMENTS.TWITTER
  
  try {
    const url = new URL(imageUrl)
    
    // Check if it's a data URL or base64 (not supported by most platforms)
    if (url.protocol === 'data:' || imageUrl.startsWith('data:')) {
      return {
        isValid: false,
        error: `${platform} does not support data URLs or base64 images. Please use a direct image URL.`,
        supportedFormats: requirements.supportedFormats,
        maxSizeMB: requirements.maxSizeMB
      }
    }
    
    // Check if it's a supported format
    const hasSupportedFormat = requirements.supportedFormats.some(format => 
      url.pathname.toLowerCase().includes(format)
    )
    
    if (!hasSupportedFormat) {
      return {
        isValid: false,
        error: `${platform} does not support this image format. Supported formats: ${requirements.supportedFormats.join(', ')}`,
        supportedFormats: requirements.supportedFormats,
        maxSizeMB: requirements.maxSizeMB
      }
    }
    
    return requirements
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid image URL for ${platform}`,
      supportedFormats: requirements.supportedFormats,
      maxSizeMB: requirements.maxSizeMB
    }
  }
}

// Get user-friendly error message for image issues
export function getImageErrorMessage(platform: string, imageUrl?: string): string {
  if (!imageUrl) {
    return 'No image provided'
  }
  
  const validation = validateImageForPlatform(imageUrl, platform)
  
  if (validation.isValid) {
    return 'Image is valid for this platform'
  }
  
  return validation.error || `Image is not supported by ${platform}`
}

// Check if platform supports images
export function platformSupportsImages(platform: string): boolean {
  const requirements = PLATFORM_IMAGE_REQUIREMENTS[platform]
  return requirements ? requirements.isValid : false
}

// Get supported image formats for a platform
export function getSupportedFormats(platform: string): string[] {
  const requirements = PLATFORM_IMAGE_REQUIREMENTS[platform]
  return requirements ? requirements.supportedFormats : []
}

// Get maximum image size for a platform
export function getMaxImageSize(platform: string): number {
  const requirements = PLATFORM_IMAGE_REQUIREMENTS[platform]
  return requirements ? requirements.maxSizeMB : 5
}
