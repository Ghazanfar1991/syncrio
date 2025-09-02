import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Cloudflare R2 Configuration
const R2_CONFIG = {
  accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID!,
  bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
  region: process.env.CLOUDFLARE_R2_REGION || 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL!
}

// Validate configuration
function validateR2Config() {
  const required = ['accessKeyId', 'secretAccessKey', 'accountId', 'bucketName', 'endpoint']
  const missing = required.filter(key => !R2_CONFIG[key as keyof typeof R2_CONFIG])
  
  if (missing.length > 0) {
    throw new Error(`Missing R2 configuration: ${missing.join(', ')}`)
  }
}

// Create S3 client for R2
function createR2Client() {
  validateR2Config()
  
  return new S3Client({
    region: R2_CONFIG.region,
    endpoint: R2_CONFIG.endpoint,
    credentials: {
      accessKeyId: R2_CONFIG.accessKeyId,
      secretAccessKey: R2_CONFIG.secretAccessKey,
    },
    forcePathStyle: true, // Required for R2
  })
}

// Generate unique filename
function generateFileName(originalName: string, userId: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop() || 'mp4'
  return `videos/${userId}/${timestamp}-${random}.${extension}`
}

// Upload video to R2
export async function uploadVideoToR2(
  file: Buffer | Uint8Array,
  fileName: string,
  contentType: string,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; key: string }> {
  try {
    console.log('🚀 Starting R2 upload:', { fileName, contentType, fileSize: file.length })
    
    const client = createR2Client()
    const key = generateFileName(fileName, userId)
    
    // Use multipart upload for better progress tracking
    const upload = new Upload({
      client,
      params: {
        Bucket: R2_CONFIG.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: {
          userId,
          originalName: fileName,
          uploadedAt: new Date().toISOString()
        }
      }
    })

    // Track upload progress
    if (onProgress) {
      upload.on('httpUploadProgress', (progress) => {
        if (progress.loaded && progress.total) {
          const percentage = Math.round((progress.loaded / progress.total) * 100)
          onProgress(percentage)
        }
      })
    }

    const result = await upload.done()
    console.log('✅ R2 upload completed:', { key, location: result.Location })

    // Generate public URL
    const publicUrl = R2_CONFIG.publicUrl 
      ? `${R2_CONFIG.publicUrl}/${key}`
      : `${R2_CONFIG.endpoint}/${R2_CONFIG.bucketName}/${key}`

    return {
      url: publicUrl,
      key
    }
  } catch (error) {
    console.error('❌ R2 upload failed:', error)
    throw new Error(`Failed to upload video to R2: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Delete video from R2
export async function deleteVideoFromR2(key: string): Promise<void> {
  try {
    console.log('🗑️ Deleting from R2:', key)
    
    const client = createR2Client()
    
    await client.send(new DeleteObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key
    }))
    
    console.log('✅ R2 deletion completed:', key)
  } catch (error) {
    console.error('❌ R2 deletion failed:', error)
    throw new Error(`Failed to delete video from R2: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Generate signed URL for private access
export async function generateSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const client = createR2Client()
    
    const command = new GetObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key
    })
    
    const signedUrl = await getSignedUrl(client, command, { expiresIn })
    return signedUrl
  } catch (error) {
    console.error('❌ Failed to generate signed URL:', error)
    throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Convert File to Buffer (for Node.js server environment)
export async function fileToBuffer(file: File): Promise<Buffer> {
  try {
    console.log('📹 Converting File to Buffer using Node.js arrayBuffer() method')
    // In Node.js, File objects have an arrayBuffer() method
    const arrayBuffer = await file.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error('Failed to convert file to buffer:', error)
    throw new Error('Failed to convert file to buffer')
  }
}

// Validate video file
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 100 * 1024 * 1024 // 100MB
  const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/webm', 'video/quicktime']
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size ${Math.round(file.size / 1024 / 1024)}MB exceeds maximum of 100MB`
    }
  }
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not supported. Allowed: MP4, MOV, AVI, WebM`
    }
  }
  
  return { valid: true }
}
