// Multi-provider image generation service (OpenRouter + Hugging Face)
import { AIModelManager } from './ai/config'
import { aiService } from './ai'

interface ImageGenerationRequest {
  prompt: string
  platform: 'TWITTER' | 'LINKEDIN' | 'INSTAGRAM' | 'YOUTUBE'
  model?: string
}

interface ImageGenerationResponse {
  success: boolean
  imageUrl?: string
  error?: string
  provider?: 'openrouter' | 'huggingface'
}

// Platform-specific image dimensions
const PLATFORM_DIMENSIONS = {
  X: { width: 1200, height: 675, ratio: '16:9' }, // X (Twitter) card
  TWITTER: { width: 1200, height: 675, ratio: '16:9' }, // Legacy Twitter support
  LINKEDIN: { width: 1200, height: 627, ratio: '1.91:1' }, // LinkedIn post
  INSTAGRAM: { width: 1080, height: 1080, ratio: '1:1' }, // Instagram square
  YOUTUBE: { width: 1280, height: 720, ratio: '16:9' } // YouTube thumbnail
}

// Generate platform-optimized image prompt
export function generateImagePrompt(basePrompt: string, platform: string, postContent: string): string {
  const normalizedPlatform = platform === 'TWITTER' ? 'X' : platform
  const dimensions = PLATFORM_DIMENSIONS[normalizedPlatform as keyof typeof PLATFORM_DIMENSIONS] || PLATFORM_DIMENSIONS.X

  // Platform-specific style guidelines
  const platformStyles = {
    X: 'clean modern design, professional social media graphic, X-style layout, engaging visual',
    LINKEDIN: 'professional business graphic, corporate style, thought leadership visual, clean design',
    INSTAGRAM: 'vibrant aesthetic, engaging visual, Instagram-style design, eye-catching colors',
    YOUTUBE: 'YouTube thumbnail style, bold design, attention-grabbing, clear focal point'
  }

  const style = platformStyles[normalizedPlatform as keyof typeof platformStyles] || platformStyles.X

  // Create optimized prompt
  const optimizedPrompt = `${basePrompt}, ${style}, ${dimensions.ratio} aspect ratio, high quality, professional, detailed, suitable for ${normalizedPlatform} social media`

  return optimizedPrompt
}

// Generate image using OpenRouter API (Gemini 2.5 Flash Image Preview)
export async function generateImageWithOpenRouter(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
  try {
    if (!aiService) {
      return {
        success: false,
        error: 'OpenRouter AI service not configured',
        provider: 'openrouter'
      }
    }

    const dimensions = PLATFORM_DIMENSIONS[request.platform]
    const optimizedPrompt = generateImagePrompt(request.prompt, request.platform, '')

    console.log(`Generating ${request.platform} image with OpenRouter:`, optimizedPrompt)

    // Use OpenRouter's chat completion API with Gemini 2.5 Flash Image Preview
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Social Bot AI Image Generator'
      },
      body: JSON.stringify({
        model: request.model || 'google/gemini-2.5-flash-image-preview:free',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Create a social media image: ${optimizedPrompt}

SPECIFICATIONS:
- Dimensions: ${dimensions.width}x${dimensions.height} pixels
- Platform: ${request.platform === 'TWITTER' ? 'X' : request.platform}
- Format: High-quality, web-optimized
- Style: Professional, engaging, platform-appropriate

Generate the image directly without explanatory text.`
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenRouter image generation error:', errorText)
      return {
        success: false,
        error: `OpenRouter image generation failed: ${response.status} ${response.statusText}`,
        provider: 'openrouter'
      }
    }

    const result = await response.json()
    console.log('🔍 OpenRouter response:', JSON.stringify(result, null, 2))

    // Check if the response contains an image in the content
    if (result.choices && result.choices[0] && result.choices[0].message) {
      const message = result.choices[0].message

      // Look for image data in the response
      if (message.content && typeof message.content === 'string') {
        // If the model returns a base64 image or image URL
        if (message.content.includes('data:image') || message.content.includes('base64')) {
          return {
            success: true,
            imageUrl: message.content,
            provider: 'openrouter'
          }
        }
      }

      // If content is an array (multimodal response)
      if (Array.isArray(message.content)) {
        for (const item of message.content) {
          if (item.type === 'image_url' && item.image_url) {
            return {
              success: true,
              imageUrl: item.image_url.url,
              provider: 'openrouter'
            }
          }
        }
      }
    }

    // If no image found in response, return error
    return {
      success: false,
      error: 'No image data found in OpenRouter response. The model may not support image generation.',
      provider: 'openrouter'
    }

  } catch (error) {
    console.error('OpenRouter image generation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      provider: 'openrouter'
    }
  }
}

// Generate image using Hugging Face API (Fallback)
export async function generateImageWithHuggingFace(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
  try {
    const hfToken = process.env.HF_TOKEN
    if (!hfToken) {
      return {
        success: false,
        error: 'Hugging Face token not configured',
        provider: 'huggingface'
      }
    }

    const dimensions = PLATFORM_DIMENSIONS[request.platform]
    const optimizedPrompt = generateImagePrompt(request.prompt, request.platform, '')

    console.log(`Generating ${request.platform} image with Hugging Face:`, optimizedPrompt)

    // Use Hugging Face FLUX.1-schnell model as fallback
    const model = request.model || 'black-forest-labs/FLUX.1-schnell'
    console.log(`🎨 Using Hugging Face model: ${model}`)

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: optimizedPrompt,
          parameters: {
            num_inference_steps: 4,
            guidance_scale: 7.5,
            width: dimensions.width,
            height: dimensions.height
          }
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Hugging Face FLUX model failed:', errorText)
      return {
        success: false,
        error: `Hugging Face FLUX model failed: ${response.status} ${response.statusText}`,
        provider: 'huggingface'
      }
    }

    // Hugging Face Inference API returns the image as a blob
    if (response.headers.get('content-type')?.includes('image')) {
      const imageBlob = await response.blob()
      const imageBuffer = await imageBlob.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString('base64')
      const imageUrl = `data:image/png;base64,${base64Image}`

      return {
        success: true,
        imageUrl,
        provider: 'huggingface'
      }
    } else {
      // Try to parse as JSON for error messages
      const result = await response.json()
      return {
        success: false,
        error: result.error || 'Invalid response format from Hugging Face image generation API',
        provider: 'huggingface'
      }
    }

  } catch (error) {
    console.error('Hugging Face image generation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      provider: 'huggingface'
    }
  }
}

// Main image generation function with fallback logic
export async function generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
  try {
    // Get the best model for image generation
    const modelConfig = await AIModelManager.getModelForPurpose('image_generation')

    console.log(`Using image generation model: ${modelConfig.id} (${modelConfig.provider})`)

    // Try primary provider first
    if (modelConfig.provider === 'openrouter') {
      const result = await generateImageWithOpenRouter({
        ...request,
        model: modelConfig.model
      })

      if (result.success) {
        console.log('✅ OpenRouter image generation successful')
        return result
      }

      console.log('❌ OpenRouter failed, trying Hugging Face fallback...')
      // If OpenRouter fails, try Hugging Face as fallback
      const fallbackModels = await AIModelManager.getModelsForPurpose('image_generation')
      const hfModel = fallbackModels.find(m => m.provider === 'huggingface' && m.isActive)

      if (hfModel) {
        return await generateImageWithHuggingFace({
          ...request,
          model: hfModel.model
        })
      }

      return result // Return original error if no fallback available
    } else {
      // Use Hugging Face directly if it's the primary
      return await generateImageWithHuggingFace({
        ...request,
        model: modelConfig.model
      })
    }

  } catch (error) {
    console.error('Image generation error:', error)

    // Try Hugging Face as last resort fallback
    console.log('🔄 Trying Hugging Face as last resort fallback...')
    const fallbackResult = await generateImageWithHuggingFace(request)

    // If even Hugging Face fails, generate a placeholder
    if (!fallbackResult.success) {
      console.log('🎨 Generating placeholder image...')
      return generatePlaceholderImage(request)
    }

    return fallbackResult
  }
}

// Generate a placeholder image when all else fails
function generatePlaceholderImage(request: ImageGenerationRequest): ImageGenerationResponse {
  const dimensions = PLATFORM_DIMENSIONS[request.platform]

  // Create a simple SVG placeholder
  const svg = `
    <svg width="${dimensions.width}" height="${dimensions.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="24" fill="#6b7280">
        Image Generation
      </text>
      <text x="50%" y="60%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="18" fill="#9ca3af">
        Temporarily Unavailable
      </text>
      <text x="50%" y="70%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="14" fill="#d1d5db">
        ${request.platform} • ${dimensions.width}x${dimensions.height}
      </text>
    </svg>
  `

  const base64Svg = Buffer.from(svg).toString('base64')
  const dataUrl = `data:image/svg+xml;base64,${base64Svg}`

  return {
    success: true,
    imageUrl: dataUrl,
    provider: 'placeholder'
  }
}

// Generate images for multiple platforms with delay
export async function generateImagesForPlatforms(
  prompt: string, 
  platforms: string[]
): Promise<Record<string, ImageGenerationResponse>> {
  const results: Record<string, ImageGenerationResponse> = {}
  
  // Generate images with 2-second delay between requests to avoid rate limiting
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i] as 'TWITTER' | 'LINKEDIN' | 'INSTAGRAM' | 'YOUTUBE'
    
    if (i > 0) {
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    console.log(`Generating image for ${platform}...`)
    results[platform] = await generateImage({ prompt, platform })
  }
  
  return results
}

// Get platform dimensions for UI display
export function getPlatformDimensions(platform: string) {
  return PLATFORM_DIMENSIONS[platform as keyof typeof PLATFORM_DIMENSIONS] || PLATFORM_DIMENSIONS.TWITTER
}
