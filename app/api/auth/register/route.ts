// User registration API endpoint
import { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, validateRequest, schemas } from '@/lib/api-utils'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  return withErrorHandling(async (req: NextRequest) => {
    const body = await req.json()
    
    try {
      const { email, name, password } = validateRequest(schemas.createUser, body)
      
      // Check if user already exists
      const existingUser = await db.user.findUnique({
        where: { email }
      })
      
      if (existingUser) {
        return apiError('User with this email already exists', 400)
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12)
      
      // Create user
      const user = await db.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          emailVerified: new Date(), // Auto-verify for now, can add email verification later
        }
      })
      
      // Create default starter subscription (free trial)
      await db.subscription.create({
        data: {
          userId: user.id,
          tier: 'STARTER',
          status: 'TRIALING',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        }
      })
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user
      
      return apiSuccess({ 
        user: userWithoutPassword,
        message: 'Account created successfully. You can now sign in.'
      }, 201)
    } catch (error) {
      return apiError(error instanceof Error ? error.message : 'Registration failed')
    }
  })(req)
}
