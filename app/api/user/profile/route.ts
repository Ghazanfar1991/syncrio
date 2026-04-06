// User profile API endpoint using Supabase
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, formatUser } from '@/lib/api-utils'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  newPassword: z.string().min(8).optional()
})

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const { data: profile, error } = await (db as any)
        .from('users')
        .select(`
          *,
          subscription:subscriptions(*),
          social_accounts(id, platform, account_name, is_connected, is_active, created_at)
        `)
        .eq('id', user.id)
        .single()

      if (error || !profile) {
        return apiError('User not found', 404)
      }

      // Get post count
      const { count: postCount } = await (db as any)
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const enrichedProfile = {
        ...profile,
        _count: {
          posts: postCount || 0
        }
      }

      return apiSuccess({ user: formatUser(enrichedProfile) })
    })
  )(req)
}

export async function PUT(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const body = await req.json()
      
      try {
        const { name, email, newPassword } = updateProfileSchema.parse(body)
        
        const updateData: any = {}
        const authData: any = {}
        
        if (name) {
          updateData.name = name
          authData.user_metadata = { name, full_name: name }
        }
        
        if (email) {
          updateData.email = email
          authData.email = email
        }
        
        if (newPassword) {
          authData.password = newPassword
        }

        // Update profiles in public schema
        if (Object.keys(updateData).length > 0) {
          const { error: profileError } = await (db as any)
            .from('users')
            .update(updateData)
            .eq('id', user.id)
          
          if (profileError) throw profileError
        }

        // Update Supabase Auth via Admin Client
        if (Object.keys(authData).length > 0) {
          const { error: authError } = await (db as any).auth.admin.updateUserById(
            user.id,
            authData
          )
          
          if (authError) throw authError
        }
        
        // Fetch updated profile
        const { data: updatedProfile } = await (db as any)
          .from('users')
          .select(`
            *,
            subscription:subscriptions(*),
            social_accounts(id, platform, account_name, is_connected, is_active, created_at)
          `)
          .eq('id', user.id)
          .single()
        
        return apiSuccess({ user: formatUser(updatedProfile) })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return apiError(`Validation error: ${error.errors.map(e => e.message).join(', ')}`)
        }
        return apiError(error instanceof Error ? error.message : 'Invalid request')
      }
    })
  )(req)
}
