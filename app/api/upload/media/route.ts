import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { db } from '@/lib/db'
import { supabaseAdmin } from '@/lib/supabase/admin'

const MEDIA_BUCKET = process.env.SUPABASE_VIDEO_BUCKET || process.env.SUPABASE_IMAGE_BUCKET || 'post-images'
const BUNDLE_API = 'https://api.bundle.social/api/v1'
const BUNDLE_KEY = () => process.env.BUNDLE_SOCIAL_API_KEY!
const anyDb = supabaseAdmin as any

async function getBundleTeamId(userId: string): Promise<string | null> {
  const { data } = await anyDb
    .from('teams')
    .select('bundle_social_team_id')
    .eq('owner_id', userId)
    .maybeSingle()
  return (data as any)?.bundle_social_team_id || null
}

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        console.log('📤 Media upload request received for user:', user.id)
        
        // Parse multipart form data
        const formData = await req.formData()
        const file = formData.get('file') as File
        const platform = formData.get('platform') as string
        
        if (!file) {
          return NextResponse.json({
            success: false,
            error: 'No media file provided'
          }, { status: 400 })
        }
        
        // Validate size (50MB fallback)
        // Bundle Social handles file sizes natively, but we enforce basic sanity
        const MAX_SIZE = 50 * 1024 * 1024 // 50MB
        if (file.size > MAX_SIZE) {
          return NextResponse.json({
            success: false,
            error: 'Media file too large (max 50MB)'
          }, { status: 400 })
        }

        // 1. Upload directly to Bundle.social first
        console.log('📤 Uploading to Bundle.social...')
        const bundleTeamId = await getBundleTeamId(user.id)
        let uploadId: string | null = null
        
        if (bundleTeamId) {
           const bundleFormData = new FormData()
           bundleFormData.append('file', file)
           bundleFormData.append('teamId', bundleTeamId)
           
           const bundleRes = await fetch(`${BUNDLE_API}/upload`, {
             method: 'POST',
             headers: {
               'x-api-key': BUNDLE_KEY()
             },
             body: bundleFormData
           })
           
           if (!bundleRes.ok) {
             const errText = await bundleRes.text()
             console.error('❌ Bundle media upload failed:', errText)
             throw new Error(`Bundle API rejected the file: ${bundleRes.status}`)
           }
           
           const result = await bundleRes.json()
           uploadId = result.id
           console.log(`✅ Bundle upload successful! uploadId: ${uploadId}`)
        } else {
           throw new Error('User has no Bundle Social team attached.')
        }

        // 2. Upload to Supabase Storage purely for instant UI previews
        console.log('💾 Caching in Supabase for UI preview...')
        const buffer = Buffer.from(await file.arrayBuffer())
        const timestamp = Date.now()
        const path = `${user.id}/${timestamp}-${file.name}`
        
        const { error: storageError } = await db.storage
          .from(MEDIA_BUCKET)
          .upload(path, buffer, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false
          })
          
        if (storageError) {
          console.error('❌ Supabase proxy cache error (non-fatal):', storageError)
        }
        
        const { data: { publicUrl } } = db.storage
          .from(MEDIA_BUCKET)
          .getPublicUrl(path)
        
        return NextResponse.json({
          success: true,
          data: {
            url: publicUrl,
            key: path,
            uploadId: uploadId,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
            platform
          }
        })
        
      } catch (error) {
        console.error('❌ Media upload failed:', error)
        return NextResponse.json({
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed'
        }, { status: 500 })
      }
    })
  )(req)
}

// Handle DELETE for unified media cleanup
export async function DELETE(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const { key } = await req.json()

        if (!key) {
          return NextResponse.json({
            success: false,
            error: 'Media key is required'
          }, { status: 400 })
        }

        // Verify the key belongs to the user
        if (!key.startsWith(`${user.id}/`)) {
          console.log('❌ Unauthorized deletion attempt for key:', key)
          return NextResponse.json({
            success: false,
            error: 'Unauthorized'
          }, { status: 403 })
        }

        const { error } = await db.storage
          .from(MEDIA_BUCKET)
          .remove([key])

        if (error) {
          throw error
        }

        return NextResponse.json({
          success: true,
          message: 'Media deleted successfully'
        })

      } catch (error) {
        console.error('❌ Media deletion failed:', error)
        return NextResponse.json({
          success: false,
          error: error instanceof Error ? error.message : 'Deletion failed'
        }, { status: 500 })
      }
    })
  )(req)
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
