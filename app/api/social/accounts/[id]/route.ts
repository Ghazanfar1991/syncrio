// Individual social account API endpoint
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, formatSocialAccount } from '@/lib/api-utils'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const account = await db.socialAccount.findFirst({
        where: {
          id: params.id,
          userId: user.id
        }
      })

      if (!account) {
        return apiError('Social account not found', 404)
      }

      return apiSuccess({ account: formatSocialAccount(account) })
    })
  )(req)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const body = await req.json()
      const { isActive } = body
      
      const existingAccount = await db.socialAccount.findFirst({
        where: {
          id: params.id,
          userId: user.id
        }
      })

      if (!existingAccount) {
        return apiError('Social account not found', 404)
      }

      const updatedAccount = await db.socialAccount.update({
        where: { id: params.id },
        data: {
          isActive: isActive !== undefined ? isActive : existingAccount.isActive,
          updatedAt: new Date()
        }
      })

      return apiSuccess({ account: formatSocialAccount(updatedAccount) })
    })
  )(req)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      const existingAccount = await db.socialAccount.findFirst({
        where: {
          id: params.id,
          userId: user.id
        }
      })

      if (!existingAccount) {
        return apiError('Social account not found', 404)
      }

      await db.socialAccount.delete({
        where: { id: params.id }
      })

      return apiSuccess({ message: 'Social account disconnected successfully' })
    })
  )(req)
}
