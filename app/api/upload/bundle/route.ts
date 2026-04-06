// Proxy upload route to Bundle.social
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { bundleSocial } from '@/lib/bundle-social'

export const config = {
  api: {
    bodyParser: false, // Handle multipart/form-data manually or via specific helpers
  },
}

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const formData = await req.formData()
        const file = formData.get('file') as File
        
        if (!file) {
          return apiError('No file provided', 400)
        }

        const teamId = process.env.BUNDLE_SOCIAL_TEAM_ID
        if (!teamId) {
          return apiError('Bundle.social Team ID not configured', 500)
        }

        // Upload to Bundle.social
        const upload = await bundleSocial.upload.uploadCreate({
          formData: {
            teamId,
            file,
          },
        })

        if (!upload || !(upload as any).id) {
          throw new Error('Upload failed to generate an ID from Bundle.social')
        }

        return apiSuccess({
          id: (upload as any).id,
          url: (upload as any).url, // If returned
          type: file.type,
        })
      } catch (error) {
        console.error('Bundle.social upload error:', error)
        return apiError(error instanceof Error ? error.message : 'Failed to upload to Bundle.social', 500)
      }
    })
  )(req)
}
