import { NextRequest, NextResponse } from 'next/server'
import { postToLinkedIn } from '@/lib/social/linkedin'
import { withAuth } from '@/lib/middleware'

export async function POST(req: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const { content, imageUrl } = await req.json()
      
      if (!content) {
        return NextResponse.json({ error: 'Content is required' }, { status: 400 })
      }
      
      // Get the user's LinkedIn account
      const { db } = await import('@/lib/db')
      const linkedinAccount = await db.socialAccount.findFirst({
        where: {
          userId: user.id,
          platform: 'LINKEDIN'
        }
      })
      
      if (!linkedinAccount) {
        return NextResponse.json({ error: 'No LinkedIn account found. Please connect your LinkedIn account first.' }, { status: 400 })
      }
      
      if (!linkedinAccount.accessToken) {
        return NextResponse.json({ error: 'LinkedIn account has no valid access token. Please reconnect your account.' }, { status: 400 })
      }
      
      console.log('🧪 Testing LinkedIn v2 UGC API implementation...')
      console.log('📝 Content:', content.substring(0, 100) + '...')
      console.log('🖼️ Image URL:', imageUrl || 'None')
      console.log('🔑 Access token length:', linkedinAccount.accessToken.length)
      
      // Test the new posting function
      const result = await postToLinkedIn(
        linkedinAccount.accessToken,
        content,
        linkedinAccount.accountId,
        imageUrl
      )
      
      console.log('✅ Test successful! Post ID:', result.id)
      
             return NextResponse.json({
         success: true,
         message: 'LinkedIn posting test successful!',
         postId: result.id,
         postUrl: result.url,
         apiUsed: 'v2 UGC API (/v2/ugcPosts)',
         permissions: 'w_member_social'
       })
      
    } catch (error) {
      console.error('❌ LinkedIn test failed:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
             return NextResponse.json({
         success: false,
         error: errorMessage,
         apiUsed: 'v2 UGC API (/v2/ugcPosts)',
         permissions: 'w_member_social',
         troubleshooting: [
           'Check if your LinkedIn app has w_member_social permission',
           'Verify your access token is valid and not expired',
           'Ensure your content meets LinkedIn guidelines',
           'Check the console logs for detailed error information'
         ]
       }, { status: 500 })
    }
  })(req)
}
