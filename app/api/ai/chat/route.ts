// AI Chat endpoint for content generation
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, validateRequest, schemas } from '@/lib/api-utils'
import { generateContent, generateHashtags, isAIConfigured } from '@/lib/ai'
import { z } from 'zod'

// Define chat request schema
const chatRequestSchema = z.object({
  message: z.string().min(1),
  platform: z.enum(['X', 'TWITTER', 'LINKEDIN', 'INSTAGRAM', 'YOUTUBE']).optional(),
  context: z.object({
    content: z.string()
  }).partial().optional()
})

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        // Check if AI is configured
        if (!isAIConfigured()) {
          return apiError('AI service not configured. Please contact administrator.', 503)
        }

        const body = await req.json()
        console.log('AI Chat API - Request body:', body)

        // Temporarily bypass validation for debugging
        const message = body.message
        const platform = body.platform
        const context = body.context

        console.log('AI Chat API - Extracted values:', { message, platform, context })

        // Detect intent from the message
        const intent = detectIntent(message)
        console.log('AI Chat API - Detected intent:', intent)

        let response: any = {}

        switch (intent.type) {
          case 'generate_content':
            const content = await generateContent(
              message,
              intent.platform || platform,
              {
                tone: intent.tone as 'professional' | 'casual' | 'inspiring' | 'humorous' | undefined,
                length: intent.length as 'short' | 'medium' | 'long' | undefined,
                includeHashtags: intent.includeHashtags,
                includeEmojis: intent.includeEmojis
              }
            )
            
            // Generate hashtags for the content
            const hashtags = await generateHashtags(content, intent.platform || platform || 'GENERAL')
            
            response = {
              type: 'content_generated',
              content,
              metadata: {
                platform: intent.platform || platform,
                hashtags,
                tone: intent.tone,
                contentType: 'post'
              }
            }
            break

          case 'generate_hashtags':
            const extractedContent = intent.content || context?.content || ''
            if (!extractedContent) {
              return apiError('No content provided for hashtag generation', 400)
            }
            
            const generatedHashtags = await generateHashtags(extractedContent, intent.platform || platform || 'GENERAL')
            
            response = {
              type: 'hashtags_generated',
              content: `Here are relevant hashtags for your content:\n\n${generatedHashtags.join(' ')}`,
              metadata: {
                hashtags: generatedHashtags,
                contentType: 'hashtags'
              }
            }
            break

          case 'content_ideas':
            const ideas = await generateContent(
              `Generate 5 creative content ideas about: ${intent.topic}`,
              intent.platform || platform,
              { tone: 'inspiring', length: 'medium' }
            )
            
            response = {
              type: 'content_ideas',
              content: ideas,
              metadata: {
                topic: intent.topic,
                platform: intent.platform || platform,
                contentType: 'ideas'
              }
            }
            break

          default:
            // General conversation
            const generalResponse = await generateContent(
              message,
              platform,
              { tone: 'casual', length: 'medium', includeHashtags: false }
            )
            
            response = {
              type: 'general_response',
              content: generalResponse,
              metadata: {
                contentType: 'conversation'
              }
            }
        }

        return apiSuccess(response)
      } catch (error) {
        console.error('AI chat error:', error)
        return apiError(
          error instanceof Error ? error.message : 'Failed to process AI request',
          500
        )
      }
    })
  )(req)
}

// Intent detection helper
function detectIntent(message: string): {
  type: 'generate_content' | 'generate_hashtags' | 'content_ideas' | 'general'
  platform?: string
  tone?: string
  length?: string
  includeHashtags?: boolean
  includeEmojis?: boolean
  content?: string
  topic?: string
} {
  const lowerMessage = message.toLowerCase()
  
  // Platform detection
  const platformMap: Record<string, string> = {
    'x ': 'X', // Space after X to avoid matching words containing 'x'
    ' x ': 'X',
    'twitter': 'X', // Map Twitter to X
    'tweet': 'X',
    'linkedin': 'LINKEDIN',
    'instagram': 'INSTAGRAM',
    'youtube': 'YOUTUBE'
  }
  
  let platform: string | undefined
  for (const [key, value] of Object.entries(platformMap)) {
    if (lowerMessage.includes(key)) {
      platform = value
      break
    }
  }

  // Content generation intent
  if (lowerMessage.includes('create') || lowerMessage.includes('write') || lowerMessage.includes('generate')) {
    // Check for specific hashtag generation (only if explicitly asking for hashtags)
    if ((lowerMessage.includes('generate hashtag') || lowerMessage.includes('create hashtag')) && !lowerMessage.includes('post')) {
      return {
        type: 'generate_hashtags',
        platform,
        content: extractContentFromMessage(message)
      }
    }
    
    if (lowerMessage.includes('idea') || lowerMessage.includes('topic')) {
      return {
        type: 'content_ideas',
        platform,
        topic: extractTopicFromMessage(message)
      }
    }
    
    return {
      type: 'generate_content',
      platform,
      tone: extractTone(lowerMessage),
      length: extractLength(lowerMessage),
      includeHashtags: !lowerMessage.includes('no hashtag'),
      includeEmojis: !lowerMessage.includes('no emoji')
    }
  }

  // Hashtag generation intent
  if (lowerMessage.includes('hashtag')) {
    return {
      type: 'generate_hashtags',
      platform,
      content: extractContentFromMessage(message)
    }
  }

  // Content ideas intent
  if (lowerMessage.includes('idea') || lowerMessage.includes('brainstorm')) {
    return {
      type: 'content_ideas',
      platform,
      topic: extractTopicFromMessage(message)
    }
  }

  return {
    type: 'general',
    platform
  }
}

function extractTone(message: string): string {
  if (message.includes('professional') || message.includes('formal')) return 'professional'
  if (message.includes('casual') || message.includes('friendly')) return 'casual'
  if (message.includes('inspiring') || message.includes('motivational')) return 'inspiring'
  if (message.includes('funny') || message.includes('humorous')) return 'humorous'
  return 'professional'
}

function extractLength(message: string): string {
  if (message.includes('short') || message.includes('brief')) return 'short'
  if (message.includes('long') || message.includes('detailed')) return 'long'
  return 'medium'
}

function extractContentFromMessage(message: string): string {
  // Simple extraction - look for quoted content or content after "for"
  const quotedMatch = message.match(/"([^"]+)"/);
  if (quotedMatch) return quotedMatch[1]
  
  const forMatch = message.match(/for[:\s]+(.+)/i);
  if (forMatch) return forMatch[1]
  
  return ''
}

function extractTopicFromMessage(message: string): string {
  // Extract topic after "about", "on", or similar keywords
  const aboutMatch = message.match(/about[:\s]+([^.!?]+)/i);
  if (aboutMatch) return aboutMatch[1].trim()
  
  const onMatch = message.match(/on[:\s]+([^.!?]+)/i);
  if (onMatch) return onMatch[1].trim()
  
  return message.replace(/create|generate|write|ideas?|topics?/gi, '').trim()
}
