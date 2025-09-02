import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { testOpenRouterConnection, isAIConfigured } from '@/lib/ai'

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        console.log('🧪 Testing AI connection...')
        
        // Check if AI is configured
        if (!isAIConfigured()) {
          return apiError('AI service not configured. Please set OPENROUTER_API_KEY environment variable.', 400)
        }

        // Test the connection
        const result = await testOpenRouterConnection()
        
        if (result.success) {
          return apiSuccess({
            message: 'AI connection test successful',
            status: 'connected',
            provider: 'OpenRouter'
          })
        } else {
          return apiError(`AI connection test failed: ${result.error}`, 500)
        }
      } catch (error) {
        console.error('AI connection test error:', error)
        return apiError('Failed to test AI connection', 500)
      }
    })
  )(req)
}
