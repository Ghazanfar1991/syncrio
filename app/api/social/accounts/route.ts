import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const accounts = await db.socialAccount.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: [
        { platform: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: accounts
    })
  } catch (error) {
    console.error('Failed to fetch social accounts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch social accounts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { platform, accountId, accountName, displayName, username, accessToken, refreshToken, expiresAt, accountType, permissions } = body

    if (!platform || !accountId || !accountName || !accessToken) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if account already exists for this user and platform
    const existingAccount = await db.socialAccount.findFirst({
      where: {
        userId: session.user.id,
        platform,
        accountId
      }
    })

    if (existingAccount) {
      // Update existing account
      const updatedAccount = await db.socialAccount.update({
        where: { id: existingAccount.id },
        data: {
          accountName,
          displayName,
          username,
          accessToken,
          refreshToken,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          accountType: accountType || 'PERSONAL',
          permissions: permissions || [],
          isConnected: true,
          isActive: true,
          updatedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        data: updatedAccount,
        message: 'Account updated successfully'
      })
    } else {
      // Create new account
      const newAccount = await db.socialAccount.create({
        data: {
          userId: session.user.id,
          platform,
          accountId,
          accountName,
          displayName,
          username,
          accessToken,
          refreshToken,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          accountType: accountType || 'PERSONAL',
          permissions: permissions || [],
          isConnected: true,
          isActive: true
        }
      })

      return NextResponse.json({
        success: true,
        data: newAccount,
        message: 'Account created successfully'
      })
    }
  } catch (error) {
    console.error('Failed to create/update social account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create/update social account' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Verify the account belongs to the user
    const existingAccount = await db.socialAccount.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!existingAccount) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    // Update the account
    const updatedAccount = await db.socialAccount.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedAccount,
      message: 'Account updated successfully'
    })
  } catch (error) {
    console.error('Failed to update social account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update social account' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Verify the account belongs to the user
    const existingAccount = await db.socialAccount.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!existingAccount) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    // Delete the account
    await db.socialAccount.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    })
  } catch (error) {
    console.error('Failed to delete social account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete social account' },
      { status: 500 }
    )
  }
}
