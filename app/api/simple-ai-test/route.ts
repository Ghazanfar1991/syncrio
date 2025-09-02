import { NextRequest } from 'next/server'
import { generateContent, isAIConfigured } from '@/lib/ai'

export async function GET(req: NextRequest) {
  try {
    console.log('Simple AI Test - Starting')
    
    // Check if AI is configured
    if (!isAIConfigured()) {
      return Response.json({ error: 'AI service not configured' }, { status: 503 })
    }
    
    console.log('Simple AI Test - AI is configured')
    
    // Test basic content generation
    const content = await generateContent(
      'Create a LinkedIn post about AI trends',
      'LINKEDIN',
      { tone: 'professional', length: 'medium', includeHashtags: true }
    )
    
    console.log('Simple AI Test - Content generated:', content)
    
    return Response.json({
      success: true,
      content,
      message: 'AI test successful'
    })
    
  } catch (error) {
    console.error('Simple AI Test - Error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
