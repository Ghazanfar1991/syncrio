// User profile API endpoint
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, formatUser } from '@/lib/api-utils'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional()
})

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const userWithDetails = await db.user.findUnique({
        where: { id: user.id },
        include: {
          subscription: true,
          socialAccounts: {
            select: {
              id: true,
              platform: true,
              accountName: true,
              isActive: true,
              createdAt: true
            }
          },
          _count: {
            select: {
              posts: true,
              chatMessages: true
            }
          }
        }
      })

      if (!userWithDetails) {
        return apiError('User not found', 404)
      }

      return apiSuccess({ user: formatUser(userWithDetails) })
    })
  )(req)
}

export async function PUT(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const body = await req.json()
      
      try {
        const { name, email, currentPassword, newPassword } = updateProfileSchema.parse(body)
        
        const updateData: any = {}
        
        if (name) updateData.name = name
        
        if (email && email !== user.email) {
          // Check if email is already taken
          const existingUser = await db.user.findUnique({
            where: { email }
          })
          
          if (existingUser) {
            return apiError('Email already in use', 400)
          }
          
          updateData.email = email
        }
        
        if (newPassword) {
          if (!currentPassword) {
            return apiError('Current password required to change password', 400)
          }
          
          // Verify current password
          if (user.password) {
            const isValidPassword = await bcrypt.compare(currentPassword, user.password)
            if (!isValidPassword) {
              return apiError('Current password is incorrect', 400)
            }
          }
          
          // Hash new password
          updateData.password = await bcrypt.hash(newPassword, 12)
        }
        
        const updatedUser = await db.user.update({
          where: { id: user.id },
          data: updateData,
          include: {
            subscription: true,
            socialAccounts: {
              select: {
                id: true,
                platform: true,
                accountName: true,
                isActive: true,
                createdAt: true
              }
            }
          }
        })
        
        return apiSuccess({ user: formatUser(updatedUser) })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return apiError(`Validation error: ${error.errors.map(e => e.message).join(', ')}`)
        }
        return apiError(error instanceof Error ? error.message : 'Invalid request')
      }
    })
  )(req)
}
