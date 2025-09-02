// Test registration endpoint
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const testUser = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'password123'
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: testUser.email }
    })
    
    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: 'Test user already exists',
        userId: existingUser.id
      })
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(testUser.password, 12)
    
    // Create user
    const user = await db.user.create({
      data: {
        email: testUser.email,
        name: testUser.name,
        password: hashedPassword,
        emailVerified: new Date(),
      }
    })
    
    // Create default starter subscription
    const subscription = await db.subscription.create({
      data: {
        userId: user.id,
        tier: 'STARTER',
        status: 'TRIALING',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Test user created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      subscription: {
        tier: subscription.tier,
        status: subscription.status
      }
    })
  } catch (error) {
    console.error('Test registration error:', error)
    return NextResponse.json({
      success: false,
      error: {
        message: 'Test registration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}
