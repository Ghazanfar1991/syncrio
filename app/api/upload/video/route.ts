import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { uploadVideoToR2, validateVideoFile, fileToBuffer } from '@/lib/cloudflare-r2'

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        console.log('📹 Video upload request received for user:', user.id)
        
        // Parse multipart form data
        const formData = await req.formData()
        const file = formData.get('video') as File
        const platform = formData.get('platform') as string
        
        if (!file) {
          return NextResponse.json({
            success: false,
            error: 'No video file provided'
          }, { status: 400 })
        }
        
        console.log('📹 Video file details:', {
          name: file.name,
          size: file.size,
          type: file.type,
          platform
        })
        
        // Validate video file
        const validation = validateVideoFile(file)
        if (!validation.valid) {
          return NextResponse.json({
            success: false,
            error: validation.error
          }, { status: 400 })
        }
        
        // Convert File to Buffer
        console.log('📹 Converting file to buffer...')
        const buffer = await fileToBuffer(file)
        
        // Upload to R2 with progress tracking
        console.log('📹 Uploading to R2...')
        const uploadResult = await uploadVideoToR2(
          buffer,
          file.name,
          file.type,
          user.id,
          (progress) => {
            console.log(`📹 Upload progress: ${progress}%`)
          }
        )
        
        console.log('✅ Video upload completed:', uploadResult)
        
        return NextResponse.json({
          success: true,
          data: {
            url: uploadResult.url,
            key: uploadResult.key,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
            platform
          }
        })
        
      } catch (error) {
        console.error('❌ Video upload failed:', error)
        return NextResponse.json({
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed'
        }, { status: 500 })
      }
    })
  )(req)
}

// Handle video deletion
export async function DELETE(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const { key } = await req.json()

        if (!key) {
          return NextResponse.json({
            success: false,
            error: 'Video key is required'
          }, { status: 400 })
        }

        console.log('🗑️ Deleting video from R2:', key)

        // Import deleteVideoFromR2 here to avoid circular imports
        const { deleteVideoFromR2 } = await import('@/lib/cloudflare-r2')
        await deleteVideoFromR2(key)

        console.log('✅ Video deleted successfully:', key)

        return NextResponse.json({
          success: true,
          message: 'Video deleted successfully'
        })

      } catch (error) {
        console.error('❌ Video deletion failed:', error)
        return NextResponse.json({
          success: false,
          error: error instanceof Error ? error.message : 'Deletion failed'
        }, { status: 500 })
      }
    })
  )(req)
}

// Handle OPTIONS for CORS
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
