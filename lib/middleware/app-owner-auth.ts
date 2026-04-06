// App Owner Authentication Middleware
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, getServerUserProfile } from '../auth'
import { db } from '../db' // Supabase admin client

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
      const authUser = await getServerSession()

      if (!authUser?.email) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // Fetch full user profile including subscription from Supabase
      const user = await getServerUserProfile(authUser.id)

      if (!user) {
        return NextResponse.json(
          { error: 'User not found in database' },
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
        role: 'APP_OWNER' as const,
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
    if (email !== 'ghazanfarnaseer91@gmail.com') {
      return null
    }

    const { data: user, error } = await (db as any)
      .from('users')
      .select('*, subscription:subscriptions(*)')
      .eq('email', email)
      .single()

    if (error || !user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: 'APP_OWNER' as const,
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

