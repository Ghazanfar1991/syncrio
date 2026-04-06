// User registration is now handled directly by Supabase Auth client-side.
// This endpoint creates the user profile row after Supabase Auth signup,
// and is called via the Supabase Auth trigger (see: scripts/supabase-migration.sql).
// Kept for manual profile creation if needed.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { apiSuccess, apiError } from '@/lib/api-utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, name, password } = body

    if (!email || !password) {
      return apiError('Email and password are required', 400)
    }

    // Use admin client to create the user in Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, full_name: name },
      email_confirm: true, // Auto-confirm for now
    })

    if (error) {
      return apiError(error.message, 400)
    }

    // Create starter subscription
    if (data.user) {
      await supabaseAdmin.from('subscriptions').insert({
        user_id: data.user.id,
        tier: 'STARTER',
        status: 'TRIALING',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
    }

    return apiSuccess({ message: 'Account created successfully. Please sign in.' }, 201)
  } catch (error) {
    console.error('Registration error:', error)
    return apiError('Registration failed', 500)
  }
}
