import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    console.log('🧪 Testing database with video data...')

    // Test with progressively larger data sizes
    const testSizes = [1000, 10000, 100000, 1000000] // 1KB, 10KB, 100KB, 1MB
    const results = []

    for (const size of testSizes) {
      try {
        const testData = 'data:video/mp4;base64,' + 'A'.repeat(size)
        console.log(`🧪 Testing with ${size} bytes...`)

        // Try to create a test post
        const testPost = await db.post.create({
          data: {
            userId: 'test-user-' + Date.now(),
            content: 'Test post',
            hashtags: '',
            videoUrl: testData,
            platform: 'YOUTUBE',
            status: 'DRAFT'
          }
        })

        console.log(`✅ Test post created with ${size} bytes:`, testPost.id)

        // Clean up
        await db.post.delete({
          where: { id: testPost.id }
        })

        results.push({ size, success: true })
      } catch (error) {
        console.error(`❌ Failed with ${size} bytes:`, error)
        results.push({
          size,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        break // Stop testing larger sizes if this one failed
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database size test completed',
      results
    })
  } catch (error) {
    console.error('🧪 Database test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
