// Multi-Image Post Management System
export interface ImageAsset {
  id: string
  url: string
  altText: string
  platform: string
  isGenerated: boolean
  orderIndex: number
  metadata: {
    width: number
    height: number
    fileSize: number
    format: string
    aspectRatio: number
  }
  createdAt: Date
}

export interface PlatformImageRestrictions {
  maxImages: number
  formats: string[]
  maxSize: number // in bytes
  minDimensions: { width: number; height: number }
  maxDimensions: { width: number; height: number }
  aspectRatioRange?: { min: number; max: number }
}

export interface ImageValidationResult {
  isValid: boolean
  restrictions: string[]
  suggestedChanges: string[]
  warnings: string[]
}

export class MultiImageManager {
  private static platformRestrictions: Record<string, PlatformImageRestrictions> = {
    TWITTER: {
      maxImages: 4,
      formats: ['jpg', 'png', 'gif', 'webp'],
      maxSize: 5 * 1024 * 1024, // 5MB
      minDimensions: { width: 300, height: 300 },
      maxDimensions: { width: 4096, height: 4096 },
      aspectRatioRange: { min: 0.5, max: 2.0 }
    },
    LINKEDIN: {
      maxImages: 1,
      formats: ['jpg', 'png'],
      maxSize: 5 * 1024 * 1024, // 5MB
      minDimensions: { width: 200, height: 200 },
      maxDimensions: { width: 4096, height: 4096 },
      aspectRatioRange: { min: 0.8, max: 1.91 }
    },
    INSTAGRAM: {
      maxImages: 10,
      formats: ['jpg', 'png'],
      maxSize: 8 * 1024 * 1024, // 8MB
      minDimensions: { width: 320, height: 320 },
      maxDimensions: { width: 1080, height: 1350 },
      aspectRatioRange: { min: 0.8, max: 1.91 }
    },
    YOUTUBE: {
      maxImages: 1,
      formats: ['jpg', 'png'],
      maxSize: 2 * 1024 * 1024, // 2MB
      minDimensions: { width: 1200, height: 675 },
      maxDimensions: { width: 1920, height: 1080 },
      aspectRatioRange: { min: 1.6, max: 1.8 }
    }
  }

  /**
   * Validate images for a specific platform
   */
  static async validatePlatformImageRestrictions(
    platform: string,
    images: ImageAsset[]
  ): Promise<ImageValidationResult> {
    const restrictions = this.platformRestrictions[platform]
    if (!restrictions) {
      return {
        isValid: false,
        restrictions: [`Platform ${platform} not supported`],
        suggestedChanges: [],
        warnings: []
      }
    }

    const result: ImageValidationResult = {
      isValid: true,
      restrictions: [],
      suggestedChanges: [],
      warnings: []
    }

    // Check image count
    if (images.length > restrictions.maxImages) {
      result.isValid = false
      result.restrictions.push(
        `${platform} supports maximum ${restrictions.maxImages} images, but ${images.length} were provided`
      )
      result.suggestedChanges.push(
        `Remove ${images.length - restrictions.maxImages} images to meet platform requirements`
      )
    }

    // Validate each image
    for (let i = 0; i < images.length; i++) {
      const image = images[i]
      const imageValidation = this.validateSingleImage(image, restrictions, platform)
      
      if (!imageValidation.isValid) {
        result.isValid = false
        result.restrictions.push(
          `Image ${i + 1}: ${imageValidation.restrictions.join(', ')}`
        )
        result.suggestedChanges.push(
          `Image ${i + 1}: ${imageValidation.suggestedChanges.join(', ')}`
        )
      }
      
      if (imageValidation.warnings.length > 0) {
        result.warnings.push(
          `Image ${i + 1}: ${imageValidation.warnings.join(', ')}`
        )
      }
    }

    return result
  }

  /**
   * Validate a single image against platform restrictions
   */
  private static validateSingleImage(
    image: ImageAsset,
    restrictions: PlatformImageRestrictions,
    platform: string
  ): ImageValidationResult {
    const result: ImageValidationResult = {
      isValid: true,
      restrictions: [],
      suggestedChanges: [],
      warnings: []
    }

    // Check file format
    const format = image.metadata.format.toLowerCase()
    if (!restrictions.formats.includes(format)) {
      result.isValid = false
      result.restrictions.push(
        `Format ${format} not supported. Supported formats: ${restrictions.formats.join(', ')}`
      )
      result.suggestedChanges.push(
        `Convert image to ${restrictions.formats[0]} format`
      )
    }

    // Check file size
    if (image.metadata.fileSize > restrictions.maxSize) {
      result.isValid = false
      result.restrictions.push(
        `File size ${(image.metadata.fileSize / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(restrictions.maxSize / 1024 / 1024).toFixed(2)}MB`
      )
      result.suggestedChanges.push(
        `Compress image to reduce file size`
      )
    }

    // Check dimensions
    const { width, height } = image.metadata
    if (width < restrictions.minDimensions.width || height < restrictions.minDimensions.height) {
      result.isValid = false
      result.restrictions.push(
        `Dimensions ${width}x${height} below minimum ${restrictions.minDimensions.width}x${restrictions.minDimensions.height}`
      )
      result.suggestedChanges.push(
        `Resize image to at least ${restrictions.minDimensions.width}x${restrictions.minDimensions.height}`
      )
    }

    if (width > restrictions.maxDimensions.width || height > restrictions.maxDimensions.height) {
      result.warnings.push(
        `Dimensions ${width}x${height} above recommended ${restrictions.maxDimensions.width}x${restrictions.maxDimensions.height}`
      )
      result.suggestedChanges.push(
        `Consider resizing to recommended dimensions for better performance`
      )
    }

    // Check aspect ratio
    if (restrictions.aspectRatioRange) {
      const aspectRatio = width / height
      if (aspectRatio < restrictions.aspectRatioRange.min || aspectRatio > restrictions.aspectRatioRange.max) {
        result.warnings.push(
          `Aspect ratio ${aspectRatio.toFixed(2)} outside recommended range ${restrictions.aspectRatioRange.min}-${restrictions.aspectRatioRange.max}`
        )
        result.suggestedChanges.push(
          `Consider cropping to recommended aspect ratio for better display`
        )
      }
    }

    return result
  }

  /**
   * Optimize images for a specific platform
   */
  static async optimizeImagesForPlatform(
    images: ImageAsset[],
    platform: string
  ): Promise<ImageAsset[]> {
    const restrictions = this.platformRestrictions[platform]
    if (!restrictions) {
      throw new Error(`Platform ${platform} not supported`)
    }

    const optimizedImages: ImageAsset[] = []

    for (const image of images) {
      const optimizedImage = { ...image }
      
      // Apply platform-specific optimizations
      switch (platform) {
        case 'TWITTER':
          // Twitter prefers square-ish images
          if (image.metadata.aspectRatio < 0.8 || image.metadata.aspectRatio > 1.2) {
            optimizedImage.metadata = {
              ...image.metadata,
              aspectRatio: 1.0
            }
          }
          break

        case 'LINKEDIN':
          // LinkedIn prefers 1.91:1 aspect ratio
          optimizedImage.metadata = {
            ...image.metadata,
            aspectRatio: 1.91
          }
          break

        case 'INSTAGRAM':
          // Instagram prefers 1:1 or 4:5 aspect ratio
          const instagramRatio = image.metadata.aspectRatio > 1 ? 1.25 : 1.0
          optimizedImage.metadata = {
            ...image.metadata,
            aspectRatio: instagramRatio
          }
          break

        case 'YOUTUBE':
          // YouTube prefers 16:9 aspect ratio
          optimizedImage.metadata = {
            ...image.metadata,
            aspectRatio: 1.78
          }
          break
      }

      optimizedImages.push(optimizedImage)
    }

    return optimizedImages
  }

  /**
   * Generate alt text for images using AI
   */
  static async generateAltText(
    imageUrl: string,
    context?: string
  ): Promise<string> {
    // This would integrate with an AI service to generate descriptive alt text
    // For now, return a placeholder
    return `Image related to ${context || 'social media content'}`
  }

  /**
   * Sort images by order index
   */
  static sortImagesByOrder(images: ImageAsset[]): ImageAsset[] {
    return [...images].sort((a, b) => a.orderIndex - b.orderIndex)
  }

  /**
   * Get platform-specific image recommendations
   */
  static getPlatformImageRecommendations(platform: string): {
    optimalDimensions: string
    recommendedFormats: string[]
    tips: string[]
  } {
    const restrictions = this.platformRestrictions[platform]
    if (!restrictions) {
      return {
        optimalDimensions: 'Unknown',
        recommendedFormats: [],
        tips: []
      }
    }

    const tips: string[] = []
    
    switch (platform) {
      case 'TWITTER':
        tips.push(
          'Use high-quality images with clear subjects',
          'Square images (1:1) work best for timeline display',
          'Keep file size under 5MB for faster loading'
        )
        break
      case 'LINKEDIN':
        tips.push(
          'Professional, high-quality images perform better',
          'Use 1.91:1 aspect ratio for optimal display',
          'Ensure images are clear and relevant to your content'
        )
        break
      case 'INSTAGRAM':
        tips.push(
          'High-resolution images are essential',
          'Use consistent aspect ratios for your feed',
          'Consider using carousel posts for multiple images'
        )
        break
      case 'YOUTUBE':
        tips.push(
          'Use 16:9 aspect ratio for thumbnail compatibility',
          'High contrast images work better as thumbnails',
          'Include text or branding for better recognition'
        )
        break
    }

    return {
      optimalDimensions: `${restrictions.minDimensions.width}x${restrictions.minDimensions.height} to ${restrictions.maxDimensions.width}x${restrictions.maxDimensions.height}`,
      recommendedFormats: restrictions.formats,
      tips
    }
  }

  /**
   * Calculate total file size of images
   */
  static calculateTotalFileSize(images: ImageAsset[]): number {
    return images.reduce((total, image) => total + image.metadata.fileSize, 0)
  }

  /**
   * Check if images meet platform requirements
   */
  static async meetsPlatformRequirements(
    platform: string,
    images: ImageAsset[]
  ): Promise<boolean> {
    const validation = await this.validatePlatformImageRestrictions(platform, images)
    return validation.isValid
  }
}
