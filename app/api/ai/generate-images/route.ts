import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, validateRequest, schemas } from '@/lib/api-utils'
import { generateImagesForPlatforms } from '@/lib/image-generation'
import { z } from 'zod'

// Schema for image generation request
const generateImagesSchema = z.object({
  prompt: z.string().min(1, 'Image prompt is required'),
  platforms: z.array(z.enum(['X', 'TWITTER', 'LINKEDIN', 'INSTAGRAM', 'YOUTUBE'])).min(1, 'At least one platform is required')
})

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const body = await req.json()
        const { prompt, platforms } = validateRequest(generateImagesSchema, body)

        console.log(`Generating images for platforms: ${platforms.join(', ')}`)
        console.log(`Image prompt: ${prompt}`)

        // Generate images for all platforms
        const imageResults = await generateImagesForPlatforms(prompt, platforms)

        // Check if any images were generated successfully
        const successfulImages = Object.entries(imageResults).filter(([_, result]) => result.success)
        const failedImages = Object.entries(imageResults).filter(([_, result]) => !result.success)

        if (successfulImages.length === 0) {
          return apiError('Failed to generate images for any platform', 500)
        }

        return apiSuccess({
          message: `Generated ${successfulImages.length} images successfully`,
          images: imageResults,
          summary: {
            successful: successfulImages.length,
            failed: failedImages.length,
            platforms: platforms
          }
        })

      } catch (error) {
        console.error('Image generation API error:', error)
        return apiError(
          error instanceof Error ? error.message : 'Failed to generate images',
          500
        )
      }
    })
  )(req)
}
