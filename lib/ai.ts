// AI service configuration with OpenRouter integration
import OpenAI from 'openai'
import { AIModelManager } from './ai/config'

let aiService: OpenAI | null = null

// Check if AI service is configured
export function isAIConfigured(): boolean {
  return !!(process.env.OPENROUTER_API_KEY)
}

// Initialize AI service only if configured
if (isAIConfigured()) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    console.log('🔑 OpenRouter API Key found:', apiKey ? `${apiKey.substring(0, 8)}...` : 'undefined')
    
    aiService = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey!,
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Social Bot AI Content Generator'
      }
    })
    console.log('OpenRouter AI service initialized successfully')
  } catch (error) {
    console.warn('AI service initialization failed:', error)
    aiService = null
  }
} else {
  console.log('AI service not configured - OPENROUTER_API_KEY not provided')
  console.log('💡 To enable AI features, add OPENROUTER_API_KEY to your .env file')
  console.log('🔗 Get your API key from: https://openrouter.ai/keys')
}

export { aiService }

// Test OpenRouter connection
export async function testOpenRouterConnection(): Promise<{ success: boolean; error?: string }> {
  if (!isAIConfigured() || !aiService) {
    return { success: false, error: 'AI service not configured' }
  }

  try {
    console.log('🧪 Testing OpenRouter connection...')
    
    // Make a simple test call
    const testCompletion = await aiService.chat.completions.create({
      model: 'qwen/qwen3-4b:free',
      messages: [
        { role: "user", content: "Hello, this is a test message." }
      ],
      max_tokens: 10,
      temperature: 0.1,
    })

    console.log('✅ OpenRouter connection test successful')
    return { success: true }
  } catch (error: any) {
    console.error('❌ OpenRouter connection test failed:', error)
    
    let errorMessage = 'Unknown error'
    if (error?.status === 401) {
      errorMessage = 'API key is invalid or expired. Please check your OpenRouter API key.'
    } else if (error?.status === 403) {
      errorMessage = 'Access denied. Please check your OpenRouter account permissions.'
    } else if (error?.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again later.'
    } else if (error?.status === 500) {
      errorMessage = 'OpenRouter service error. Please try again later.'
    } else if (error?.message) {
      errorMessage = error.message
    }
    
    return { success: false, error: errorMessage }
  }
}

// Content generation with platform-specific optimization
export const generateContent = async (
  prompt: string,
  platform?: string,
  context?: {
    tone?: 'professional' | 'casual' | 'inspiring' | 'humorous'
    length?: 'short' | 'medium' | 'long'
    includeHashtags?: boolean
    includeEmojis?: boolean
  }
) => {
  if (!isAIConfigured() || !aiService) {
    // Provide fallback content when AI is not available
    const fallbackContent = generateFallbackContent(prompt, platform, context)
    return fallbackContent
  }

  try {
    // Get the best model for content generation
    let modelConfig = await AIModelManager.getModelForPurpose('content_generation')
    
    // If the default model fails due to credits, try to use a free model
    let useFreeModel = false
    
    const platformGuidelines = {
      X: 'Maximum 280 characters. Use engaging hooks, conversational tone, relevant hashtags. Include emojis for engagement.',
      LINKEDIN: 'Professional tone, 1300-3000 characters optimal. Focus on insights, value, thought leadership. Use line breaks for readability.',
      INSTAGRAM: 'Visual-first captions, 125-150 characters for optimal engagement. Use emojis, storytelling, strategic hashtags.',
      YOUTUBE: 'Compelling titles (60 chars max), descriptions with keywords, clear call-to-actions. SEO-optimized.'
    }

    const systemPrompt = `Generate publication-ready social media content. Return ONLY the post content without any prefixes, explanations, or formatting markers.

PLATFORM: ${platform || 'General'}
RULES: ${platform ? platformGuidelines[platform as keyof typeof platformGuidelines] : 'Follow general social media best practices'}
TONE: ${context?.tone || 'professional'}
LENGTH: ${context?.length || 'medium'}

REQUIREMENTS:
- Return content ready for immediate publishing
- Follow exact character limits for the platform
- Include hashtags only if requested: ${context?.includeHashtags !== false}
- Include emojis only if requested: ${context?.includeEmojis !== false}
- No prefixes like "Here's your post:" or explanatory text
- No markdown formatting or quotes around content`

    let completion
    try {
      console.log(`🚀 Making OpenRouter API call with model: ${modelConfig.model}`)
      console.log(`📝 Prompt length: ${prompt.length} characters`)
      console.log(`🎯 Max tokens: ${modelConfig.maxTokens}`)
      
      completion = await aiService.chat.completions.create({
        model: modelConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
      })
      
      console.log(`✅ OpenRouter API call successful`)
    } catch (error: any) {
      console.error(`❌ OpenRouter API call failed:`, {
        status: error?.status,
        message: error?.message,
        code: error?.code,
        type: error?.type
      })
      
      // If we get a credit error and haven't tried the free model yet, retry with free model
      if (error?.status === 402 && !useFreeModel && error.message?.includes('credits')) {
        console.log('Retrying with free model due to credit exhaustion...')
        useFreeModel = true
        modelConfig = await AIModelManager.getModelForPurpose('content_generation_free')
        
        completion = await aiService.chat.completions.create({
          model: modelConfig.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          max_tokens: Math.min(modelConfig.maxTokens, 500), // Reduce tokens for free model
          temperature: modelConfig.temperature,
        })
      } else {
        throw error
      }
    }

    return completion.choices[0]?.message?.content || "Failed to generate content"
  } catch (error: any) {
    console.error('Content generation error:', error)
    
    // Handle specific OpenRouter errors
    if (error?.status === 401) {
      if (error.message?.includes('User not found')) {
        throw new Error('OpenRouter API key is invalid or expired. Please check your API key in the environment variables.')
      }
      throw new Error('AI service authentication failed. Please check your OpenRouter API key.')
    }
    
    if (error?.status === 402) {
      if (error.message?.includes('credits') || error.message?.includes('afford')) {
        throw new Error('AI service credits exhausted. Please check your OpenRouter account or try again later.')
      }
      if (error.message?.includes('max_tokens')) {
        throw new Error('AI service token limit exceeded. Please try with a shorter prompt.')
      }
    }
    
    if (error?.status === 403) {
      throw new Error('Access denied. Please check your OpenRouter account permissions.')
    }
    
    if (error?.status === 429) {
      console.log('🔄 Rate limit hit, trying fallback models...')

      // Try to get alternative models for the same purpose
      const allModels = await AIModelManager.getModelsForPurpose('content_generation')
      const fallbackModels = allModels.filter(m => m.id !== modelConfig.id && m.isActive)

      if (fallbackModels.length > 0) {
        console.log(`🔄 Trying fallback model: ${fallbackModels[0].id}`)

        try {
          const fallbackCompletion = await aiService.chat.completions.create({
            model: fallbackModels[0].model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ],
            max_tokens: fallbackModels[0].maxTokens,
            temperature: fallbackModels[0].temperature
          })

          if (fallbackCompletion.choices[0]?.message?.content) {
            console.log('✅ Fallback model succeeded')
            return fallbackCompletion.choices[0].message.content
          }
        } catch (fallbackError) {
          console.log('❌ Fallback model also failed:', fallbackError)
        }
      }

      throw new Error('AI service rate limit exceeded. Please try again in a few minutes.')
    }
    
    if (error?.status === 500) {
      throw new Error('OpenRouter service error. Please try again later.')
    }
    
    // Provide more specific error messages
    if (error?.message) {
      if (error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.')
      }
      if (error.message.includes('timeout')) {
        throw new Error('Request timeout. Please try again.')
      }
    }
    
    throw new Error(`Failed to generate content: ${error?.message || 'Unknown error'}`)
  }
}

// Generate hashtags for existing content
export const generateHashtags = async (content: string, platform: string) => {
  if (!isAIConfigured() || !aiService) {
    // Return some default hashtags if AI is not configured
    return ["#social", "#content", "#marketing"]
  }

  try {
    // Get the best model for hashtag generation
    const modelConfig = await AIModelManager.getModelForPurpose('hashtag_generation')
    
    const platformRules = {
      X: 'Maximum 2-3 hashtags for optimal engagement. Focus on trending, relevant tags.',
      LINKEDIN: 'Maximum 3-5 hashtags. Use professional, industry-specific tags.',
      INSTAGRAM: 'Maximum 5-10 hashtags. Mix popular and niche tags for reach.',
      YOUTUBE: 'Maximum 3-5 hashtags. Use searchable, keyword-rich tags.'
    }

    const prompt = `Generate hashtags for ${platform === 'TWITTER' ? 'X' : platform}. Return ONLY hashtags, one per line, starting with #.

PLATFORM RULES: ${platformRules[platform as keyof typeof platformRules] || 'Use 3-5 relevant hashtags'}
CONTENT: "${content}"

Requirements:
- No explanatory text
- No numbering or bullets
- Each hashtag on a new line
- Start each line with #`

    const completion = await aiService.chat.completions.create({
      model: modelConfig.model,
      messages: [
        { role: "user", content: prompt }
      ],
      max_tokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
    })

    const response = completion.choices[0]?.message?.content || ""
    const hashtags = response
      .split('\n')
      .filter(line => line.trim().startsWith('#'))
      .map(tag => tag.trim())
      .slice(0, 10)

    return hashtags.length > 0 ? hashtags : ["#social", "#content", "#marketing"]
  } catch (error) {
    console.error('Hashtag generation error:', error)
    return ["#social", "#content", "#marketing"]
  }
}

// Improve existing content
export const improveContent = async (content: string, platform: string, improvements: string[]) => {
  if (!isAIConfigured() || !aiService) {
    throw new Error('AI service not configured. Please set OPENROUTER_API_KEY environment variable.')
  }

  try {
    // Get the best model for content generation
    const modelConfig = await AIModelManager.getModelForPurpose('content_generation')
    
    const prompt = `Improve this ${platform} content based on these specific requests: ${improvements.join(', ')}.

Original content: "${content}"

Please provide an improved version that addresses the requested changes while maintaining the core message and platform best practices.`

    const completion = await aiService.chat.completions.create({
      model: modelConfig.model,
      messages: [
        { role: "user", content: prompt }
      ],
      max_tokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
    })

    return completion.choices[0]?.message?.content || content
  } catch (error) {
    console.error('Content improvement error:', error)
    throw new Error('Failed to improve content. Please try again.')
  }
}

// Generate content ideas
export const generateContentIdeas = async (topic: string, platform: string, count: number = 5) => {
  if (!isAIConfigured() || !aiService) {
    throw new Error('AI service not configured. Please set OPENROUTER_API_KEY environment variable.')
  }

  try {
    // Get the best model for content generation
    const modelConfig = await AIModelManager.getModelForPurpose('content_generation')
    
    const prompt = `Generate ${count} creative content ideas for ${platform} about "${topic}".

For each idea, provide:
1. A compelling hook/title
2. Brief description of the content
3. Suggested format (text, image, video, etc.)

Make them diverse, engaging, and optimized for ${platform}.`

    const completion = await aiService.chat.completions.create({
      model: modelConfig.model,
      messages: [
        { role: "user", content: prompt }
      ],
      max_tokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
    })

    return completion.choices[0]?.message?.content || "Failed to generate content ideas"
  } catch (error) {
    console.error('Content ideas generation error:', error)
    throw new Error('Failed to generate content ideas. Please try again.')
  }
}

// Fallback content generation when AI is not available
function generateFallbackContent(
  prompt: string, 
  platform?: string, 
  context?: {
    tone?: 'professional' | 'casual' | 'inspiring' | 'humorous'
    length?: 'short' | 'medium' | 'long'
    includeHashtags?: boolean
    includeEmojis?: boolean
  }
): string {
  const topic = prompt.replace(/^Create a .* post about:?\s*/i, '').replace(/Make it .*/i, '').trim()
  
  const platformTemplates = {
    TWITTER: {
      professional: `🚀 Exciting developments in ${topic}! The industry is evolving rapidly with innovative solutions and breakthrough technologies. What are your thoughts on these advancements? #${topic.replace(/\s+/g, '')} #Innovation #TechTrends`,
      casual: `Hey everyone! 👋 Just wanted to share some thoughts on ${topic}. It's pretty amazing how things are changing, right? What's your take on this? #${topic.replace(/\s+/g, '')} #Thoughts #Discussion`,
      inspiring: `✨ The future of ${topic} is here, and it's absolutely incredible! These innovations are changing the world as we know it. Let's embrace the possibilities together! #${topic.replace(/\s+/g, '')} #Future #Innovation`,
      humorous: `😂 So apparently ${topic} is a thing now! Who would've thought? The tech world never ceases to amaze me. What's the weirdest thing you've seen in this space? #${topic.replace(/\s+/g, '')} #TechHumor #RandomThoughts`
    },
    LINKEDIN: {
      professional: `The landscape of ${topic} is experiencing significant transformation, driven by emerging technologies and shifting market demands. As professionals, it's crucial to stay informed about these developments and understand their implications for our industry. What strategies are you implementing to adapt to these changes? #${topic.replace(/\s+/g, '')} #ProfessionalDevelopment #IndustryInsights #Innovation`,
      casual: `Interesting developments happening in ${topic}! It's fascinating to see how the industry is evolving. Would love to hear your perspectives and experiences. What trends are you noticing? #${topic.replace(/\s+/g, '')} #Networking #IndustryChat`,
      inspiring: `The innovation happening in ${topic} is truly inspiring. It reminds us that progress is possible when we combine creativity with determination. What inspires you about these developments? #${topic.replace(/\s+/g, '')} #Inspiration #Innovation #Growth`,
      humorous: `Sometimes the best insights come from unexpected places! The ${topic} space has been full of surprises lately. What's the most unexpected thing you've learned? #${topic.replace(/\s+/g, '')} #ProfessionalHumor #Learning`
    },
    INSTAGRAM: {
      professional: `📱 Industry insights: ${topic} is evolving rapidly! 🔥 The innovations we're seeing are game-changing. What's your perspective on these developments? Share your thoughts below! 👇 #${topic.replace(/\s+/g, '')} #Innovation #TechTrends #IndustryInsights`,
      casual: `Hey Instagram fam! 👋 Just wanted to chat about ${topic} - it's pretty wild how things are changing, right? 🤯 What's your take on this? Drop a comment! 💬 #${topic.replace(/\s+/g, '')} #Discussion #Thoughts`,
      inspiring: `✨ The future is bright in ${topic}! 🌟 These innovations are literally changing the world. Let's embrace the possibilities together! 💪 What inspires you most? #${topic.replace(/\s+/g, '')} #Future #Innovation #Inspiration`,
      humorous: `😂 So ${topic} is a thing now! 🤷‍♂️ The tech world never ceases to amaze me. What's the weirdest thing you've seen? Share your stories! 📖 #${topic.replace(/\s+/g, '')} #TechHumor #FunnyTech`
    },
    YOUTUBE: {
      professional: `The evolution of ${topic} represents a significant shift in our industry landscape. These developments are not just technological advancements but fundamental changes in how we approach problem-solving and innovation. Understanding these trends is crucial for anyone looking to stay competitive in today's rapidly changing environment. #${topic.replace(/\s+/g, '')} #IndustryAnalysis #Innovation #ProfessionalDevelopment`,
      casual: `Hey everyone! Today we're diving into the fascinating world of ${topic}. There's so much happening in this space, and I wanted to share my thoughts and get your perspectives. What aspects are you most interested in? #${topic.replace(/\s+/g, '')} #Discussion #Learning #Community`,
      inspiring: `The innovations happening in ${topic} are truly inspiring. They demonstrate what's possible when we combine creativity, technology, and determination. These developments are shaping the future, and it's exciting to be part of this journey. What inspires you most about these changes? #${topic.replace(/\s+/g, '')} #Inspiration #Innovation #Future`,
      humorous: `Sometimes the best insights come from the most unexpected places! The ${topic} space has been full of surprises lately, and I can't help but laugh at some of the developments. What's the most unexpected thing you've encountered? #${topic.replace(/\s+/g, '')} #TechHumor #UnexpectedInsights #FunnyTech`
    }
  }

  const tone = context?.tone || 'professional'
  const platformKey = platform as keyof typeof platformTemplates || 'LINKEDIN'
  const template = platformTemplates[platformKey]?.[tone] || platformTemplates.LINKEDIN.professional

  return template
}
