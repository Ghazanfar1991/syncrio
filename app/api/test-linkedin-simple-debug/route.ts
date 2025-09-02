import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'

export async function POST(req: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
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
      
      console.log('🧪 Testing LinkedIn API connectivity...')
      console.log('🔑 Access token length:', linkedinAccount.accessToken.length)
      console.log('👤 Account ID:', linkedinAccount.accountId)
      
             // Test basic profile access using v2 API (works with w_member_social permission)
              const profileResponse = await fetch('https://api.linkedin.com/v2/people/~:(id,first-name,last-name)', {
         headers: {
           'Authorization': `Bearer ${linkedinAccount.accessToken}`,
           'Content-Type': 'application/json'
         }
       })
      
      console.log('📊 Profile API response status:', profileResponse.status)
      console.log('📊 Profile API response headers:', Object.fromEntries(profileResponse.headers.entries()))
      
      if (!profileResponse.ok) {
        const errorText = await profileResponse.text()
        console.error('❌ Profile API failed:', errorText)
        
        return NextResponse.json({
          success: false,
          error: `Profile API failed: ${profileResponse.status} - ${errorText}`,
          test: 'Profile API connectivity',
          status: profileResponse.status
        }, { status: 500 })
      }
      
      const profileData = await profileResponse.json()
      console.log('✅ Profile API successful:', profileData)
      
             // Test v2 UGC API endpoint (legacy API for w_member_social)
       const testPostData = {
         author: `urn:li:person:${profileData.id}`,
         lifecycleState: 'DRAFT', // Use DRAFT to avoid actually posting
         specificContent: {
           'com.linkedin.ugc.ShareContent': {
             shareCommentary: { text: 'Test post - API validation only' },
             shareMediaCategory: 'NONE'
           }
         },
         visibility: {
           'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
         }
       }
       
       console.log('📤 Testing v2 UGC API with data:', JSON.stringify(testPostData, null, 2))
       
       const ugcResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${linkedinAccount.accessToken}`,
           'LinkedIn-Version': '202412',
           'Content-Type': 'application/json',
           'X-Restli-Protocol-Version': '2.0.0'
         },
         body: JSON.stringify(testPostData)
       })
      
             console.log('📊 v2 UGC API response status:', ugcResponse.status)
       console.log('📊 v2 UGC API response headers:', Object.fromEntries(ugcResponse.headers.entries()))
       
       if (!ugcResponse.ok) {
         const errorText = await ugcResponse.text()
         console.error('❌ v2 UGC API failed:', errorText)
         
         return NextResponse.json({
           success: false,
           error: `v2 UGC API failed: ${ugcResponse.status} - ${errorText}`,
           test: 'v2 UGC API validation',
           status: ugcResponse.status,
           requestData: testPostData
         }, { status: 500 })
       }
       
       const ugcData = await ugcResponse.json()
       console.log('✅ v2 UGC API successful:', ugcData)
      
      return NextResponse.json({
        success: true,
        message: 'LinkedIn API connectivity test successful!',
        profile: profileData,
        ugcPost: ugcData,
                 tests: [
           'Profile API connectivity',
           'v2 UGC API validation'
         ],
        permissions: 'w_member_social (verified)'
      })
      
    } catch (error) {
      console.error('❌ LinkedIn connectivity test failed:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        test: 'API connectivity',
        troubleshooting: [
          'Check if your LinkedIn app has correct permissions',
          'Verify your access token is valid and not expired',
          'Check the console logs for detailed error information',
          'Ensure your LinkedIn app is properly configured'
        ]
      }, { status: 500 })
    }
  })(req)
}
