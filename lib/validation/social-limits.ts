import { SUPPORTED_PLATFORMS } from '../bundle-social'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface PostContent {
  text: string
  media?: Array<{
    type: 'IMAGE' | 'VIDEO' | 'PDF' | 'GIF'
    size: number // in bytes
    mimeType: string
  }>
}

/**
 * Validates post content against platform-specific limits provided by Bundle.social.
 */
export function validatePostContent(
  content: PostContent,
  platforms: string[]
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {}

  platforms.forEach((platformId) => {
    const platform = SUPPORTED_PLATFORMS.find((p) => p.id === platformId)
    const errors: string[] = []

    if (!platform) {
      results[platformId] = { isValid: false, errors: ['Unsupported platform'] }
      return
    }

    // 1. Character Limit
    if (content.text.length > platform.charLimit) {
      errors.push(`Text exceeds character limit (${content.text.length}/${platform.charLimit})`)
    }

    // 2. Media Type Constraints
    if (content.media && content.media.length > 0) {
      content.media.forEach((m) => {
        if (!platform.mediaTypes.includes(m.type as any)) {
          errors.push(`${platform.name} does not support ${m.type} media`)
        }
      })
    }

    // 3. Platform Specific Rules (Customized for Wow factor)
    if (platformId === 'THREADS' && content.media && content.media.length > 10) {
      errors.push('Threads supports a maximum of 10 media items')
    }
    
    if (platformId === 'YOUTUBE' && (!content.media || !content.media.some(m => m.type === 'VIDEO'))) {
      errors.push('YouTube requires at least one video')
    }

    results[platformId] = {
      isValid: errors.length === 0,
      errors,
    }
  })

  return results
}

/**
 * Returns a summary of limits for display in the UI.
 */
export function getPlatformLimits(platformId: string) {
  return SUPPORTED_PLATFORMS.find((p) => p.id === platformId)
}
