// App Owner Authentication Middleware
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth'
import { db } from '../db'

export interface AppOwnerUser {
  id: string
  email: string
  name?: string
  role: 'APP_OWNER' | 'USER'
  subscription?: {
    tier: string
    status: string
  }
}

/**
 * Middleware to ensure only app owners can access admin functionality
 */
export function withAppOwnerAuth(
  handler: (req: NextRequest, user: AppOwnerUser) => Promise<NextResponse>
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

      // Check if user is app owner (hardcoded for simplicity)
      if (user.email !== 'ghazanfarnaseer91@gmail.com') {
        return NextResponse.json(
          { 
            error: 'App owner access required',
            message: 'This functionality is restricted to app owners only',
            code: 'APP_OWNER_ACCESS_REQUIRED'
          },
          { status: 403 }
        )
      }

      const appOwnerUser: AppOwnerUser = {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: 'APP_OWNER' as const, // Hardcoded role
        subscription: user.subscription ? {
          tier: user.subscription.tier,
          status: user.subscription.status
        } : undefined
      }

      return handler(req, appOwnerUser)
    } catch (error) {
      console.error('App owner auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Check if a user is an app owner
 */
export async function isAppOwner(email: string): Promise<boolean> {
  try {
    // Hardcoded check for simplicity
    return email === 'ghazanfarnaseer91@gmail.com'
  } catch (error) {
    console.error('Error checking app owner status:', error)
    return false
  }
}

/**
 * Get app owner user data
 */
export async function getAppOwnerUser(email: string): Promise<AppOwnerUser | null> {
  try {
    // Hardcoded check for simplicity
    if (email !== 'ghazanfarnaseer91@gmail.com') {
      return null
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { subscription: true }
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: 'APP_OWNER' as const, // Hardcoded role
      subscription: user.subscription ? {
        tier: user.subscription.tier,
        status: user.subscription.status
      } : undefined
    }
  } catch (error) {
    console.error('Error getting app owner user:', error)
    return null
  }
}
