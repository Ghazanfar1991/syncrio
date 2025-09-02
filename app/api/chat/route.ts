// Chat API endpoint for conversational interface
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, validateRequest, schemas } from '@/lib/api-utils'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const body = await req.json()

      try {
        const { content, type, metadata } = validateRequest(schemas.chatMessage, body)

        // Save user message
        const message = await db.chatMessage.create({
          data: {
            userId: user.id,
            content,
            type,
            metadata
          }
        })

        // TODO: Process with AI and generate response
        // This will be implemented in the AI integration phase

        return apiSuccess({
          message,
          response: "AI response will be implemented in the next phase"
        })
      } catch (error) {
        return apiError(error instanceof Error ? error.message : 'Invalid request')
      }
    })
  )(req)
}

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const { searchParams } = new URL(req.url)
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

      const messages = await db.chatMessage.findMany({
        where: { userId: user.id },
        orderBy: { timestamp: 'desc' },
        take: limit
      })

      return apiSuccess({ messages: messages.reverse() })
    })
  )(req)
}
