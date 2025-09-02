import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        console.log('Test AI API - GET request')

        // Test the AI chat API directly
        const response = await fetch(`${req.nextUrl.origin}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: "Create a LinkedIn post about AI trends",
            platform: "LINKEDIN"
          })
        })

        const data = await response.json()
        console.log('Test AI API - Response:', data)

        return apiSuccess({
          message: 'Test completed',
          response: data,
          status: response.status
        })

      } catch (error) {
        console.error('Test AI error:', error)
        return apiError(
          error instanceof Error ? error.message : 'Test failed',
          500
        )
      }
    })
  )(req)
}

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const body = await req.json()
        console.log('Test AI API - Request body:', body)

        // Test the AI chat API directly
        const response = await fetch(`${req.nextUrl.origin}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: "Create a LinkedIn post about AI trends",
            platform: "LINKEDIN"
          })
        })

        const data = await response.json()
        console.log('Test AI API - Response:', data)

        return apiSuccess({
          message: 'Test completed',
          response: data,
          status: response.status
        })

      } catch (error) {
        console.error('Test AI error:', error)
        return apiError(
          error instanceof Error ? error.message : 'Test failed',
          500
        )
      }
    })
  )(req)
}
