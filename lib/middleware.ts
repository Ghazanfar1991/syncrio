// Middleware utilities for API routes — now uses Supabase Auth
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from './supabase/server'
import { db } from './db'

// Authentication middleware
export function withAuth(
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const supabase = await createClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // Fetch profile to get subscription tier
      const { data: profile } = await db
        .from('users')
        .select('*, subscription:subscriptions(tier, status)')
        .eq('id', user.id)
        .maybeSingle()

      const enrichedUser = {
        id: user.id,
        email: user.email!,
        name: profile?.name || user.user_metadata?.name || null,
        subscriptionTier: profile?.subscription?.tier || 'STARTER',
        subscription: profile?.subscription || null,
      }

      return handler(req, enrichedUser)
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
    if (requiredTier && user.subscriptionTier !== requiredTier) {
      const tiers = ['STARTER', 'GROWTH', 'BUSINESS', 'AGENCY']
      const currentIdx = tiers.indexOf(user.subscriptionTier)
      const requiredIdx = tiers.indexOf(requiredTier)

      if (currentIdx < requiredIdx) {
        return NextResponse.json(
          { error: `${requiredTier} subscription required` },
          { status: 403 }
        )
      }
    }

    return handler(req, user)
  })
}

// Rate limiting middleware (in-memory fallback — no Redis needed)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  limit: number = 100,
  windowMs: number = 60000
) {
  return async (req: NextRequest) => {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'

    const key = `ratelimit:${ip}`
    const now = Date.now()
    const entry = rateLimitMap.get(key)

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    } else {
      entry.count++
      if (entry.count > limit) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        )
      }
    }

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
