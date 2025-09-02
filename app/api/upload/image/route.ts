import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

// R2 Configuration
const R2_CONFIG = {
  bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
  publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL!,
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  region: process.env.CLOUDFLARE_R2_REGION || 'auto'
}

// Create R2 client
const r2Client = new S3Client({
  region: R2_CONFIG.region,
  endpoint: R2_CONFIG.endpoint,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
  forcePathStyle: true,
})

export async function POST(request: NextRequest) {
  try {
    console.log('🖼️ Image upload request received')

    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('❌ Unauthorized image upload attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    console.log('🖼️ Image upload request received for user:', userId)

    // Parse request body
    const body = await request.json()
    const { image, filename, contentType } = body

    if (!image || !filename) {
      console.log('❌ Missing required fields')
      return NextResponse.json({ error: 'Missing image data or filename' }, { status: 400 })
    }

    console.log('🖼️ Image file details:', {
      name: filename,
      type: contentType || 'image/jpeg',
      base64Length: image.length
    })

    // Convert base64 to buffer
    console.log('🖼️ Converting base64 to buffer...')
    const imageBuffer = Buffer.from(image, 'base64')
    console.log('🖼️ Image buffer size:', imageBuffer.length)

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const extension = filename.split('.').pop() || 'jpg'
    const key = `images/${userId}/${timestamp}-${randomId}.${extension}`

    console.log('🖼️ Uploading to R2...')
    console.log('🚀 Starting R2 upload:', {
      fileName: filename,
      contentType: contentType || 'image/jpeg',
      fileSize: imageBuffer.length
    })

    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType || 'image/jpeg',
      ContentLength: imageBuffer.length,
    })

    await r2Client.send(uploadCommand)

    // Generate public URL
    const publicUrl = `${R2_CONFIG.publicUrl}/${key}`

    console.log('✅ R2 upload completed:', {
      key,
      location: publicUrl
    })

    console.log('✅ Image upload completed:', {
      url: publicUrl,
      key
    })

    return NextResponse.json({
      url: publicUrl,
      key,
      message: 'Image uploaded successfully'
    })

  } catch (error) {
    console.error('❌ Image upload failed:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Image deletion request received')

    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('❌ Unauthorized image deletion attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    console.log('🗑️ Image deletion request for user:', userId)

    // Parse request body
    const body = await request.json()
    const { key } = body

    if (!key) {
      console.log('❌ Missing key for deletion')
      return NextResponse.json({ error: 'Missing key' }, { status: 400 })
    }

    // Verify the key belongs to the user (security check)
    if (!key.startsWith(`images/${userId}/`)) {
      console.log('❌ Unauthorized deletion attempt for key:', key)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    console.log('🗑️ Deleting from R2:', key)

    // Delete from R2
    const deleteCommand = new DeleteObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
    })

    await r2Client.send(deleteCommand)

    console.log('✅ Image deleted successfully:', key)

    return NextResponse.json({
      message: 'Image deleted successfully'
    })

  } catch (error) {
    console.error('❌ Image deletion failed:', error)
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    )
  }
}
