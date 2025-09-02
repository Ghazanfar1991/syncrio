import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// Configure R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: NextRequest) {
  try {
    const { key, buffer, contentType } = await request.json()

    if (!key || !buffer) {
      return NextResponse.json({ error: 'Missing key or buffer' }, { status: 400 })
    }

    console.log('📤 R2 Direct Upload:', {
      key,
      contentType,
      bufferLength: buffer.length
    })

    // Convert base64 buffer to Buffer
    const fileBuffer = Buffer.from(buffer, 'base64')

    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType || 'application/octet-stream',
    })

    await r2Client.send(uploadCommand)

    // Generate public URL
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`

    console.log('✅ R2 upload successful:', publicUrl)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      key
    })
  } catch (error) {
    console.error('❌ R2 upload failed:', error)
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
