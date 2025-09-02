import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      // Only allow in development
      if (process.env.NODE_ENV === 'production') {
        return apiSuccess({ message: 'Environment variables not accessible in production' })
      }

      const envVars = {
        NODE_ENV: process.env.NODE_ENV,
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? 
          `${process.env.OPENROUTER_API_KEY.substring(0, 8)}...` : 'undefined',
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        // Add other relevant environment variables
      }

      return apiSuccess({
        message: 'Environment variables debug info',
        environment: envVars
      })
    })
  )(req)
}
