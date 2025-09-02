// Middleware utilities for API routes
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { db } from './db'

// Authentication middleware
export function withAuth(
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const session = await getServerSession(authOptions)

      if (!session?.user?.email) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      const user = await db.user.findUnique({
        where: { email: session.user.email },
        include: { subscription: true }
      })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      return handler(req, user)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

// Subscription check middleware
export function withSubscription(
  handler: (req: NextRequest, user: any) => Promise<NextResponse>,
  requiredTier?: string
) {
  return withAuth(async (req: NextRequest, user: any) => {
    if (!user.subscription || user.subscription.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Active subscription required' },
        { status: 403 }
      )
    }

    if (requiredTier && user.subscription.tier !== requiredTier) {
      return NextResponse.json(
        { error: `${requiredTier} subscription required` },
        { status: 403 }
      )
    }

    return handler(req, user)
  })
}

// Rate limiting middleware (basic implementation)
const rateLimitMap = new Map()

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  limit: number = 100,
  windowMs: number = 60000 // 1 minute
) {
  return async (req: NextRequest) => {
    const ip = req.ip || 'unknown'
    const now = Date.now()
    const windowStart = now - windowMs

    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, [])
    }

    const requests = rateLimitMap.get(ip)
    const validRequests = requests.filter((time: number) => time > windowStart)

    if (validRequests.length >= limit) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    validRequests.push(now)
    rateLimitMap.set(ip, validRequests)

    return handler(req)
  }
}

// Error handling wrapper
export function withErrorHandling(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      return await handler(req)
    } catch (error) {
      console.error('API Error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

// CORS middleware
export function withCors(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const response = await handler(req)
    
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response
  }
}
