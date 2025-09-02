// Database connection test endpoint
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    // Test database connection
    const userCount = await db.user.count()
    const subscriptionCount = await db.subscription.count()
    
    return NextResponse.json({
      success: true,
      data: {
        message: 'Database connection successful',
        userCount,
        subscriptionCount,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({
      success: false,
      error: {
        message: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}
