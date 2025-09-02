// LinkedIn posts fetcher for real data
import { db } from '@/lib/db'

interface LinkedInPost {
  id: string
  commentary?: string
  text?: string
  createdAt?: string
  created_at?: string
  socialCounts?: {
    numLikes: number
    numComments: number
    numShares: number
  }
  author?: string
}

// Fetch real LinkedIn posts from user's account
export async function fetchLinkedInPosts(userId: string, accountId: string): Promise<LinkedInPost[]> {
  try {
    // Get the user's LinkedIn account
    const account = await db.socialAccount.findFirst({
      where: {
        userId,
        accountId,
        platform: 'LINKEDIN',
        isActive: true
      }
    })

    if (!account || !account.accessToken) {
      console.log('No valid LinkedIn account found')
      return []
    }

    console.log('Fetching LinkedIn posts for account:', account.accountName)

    // Fetch user's posts from LinkedIn API
    const response = await fetch(
      `https://api.linkedin.com/v2/shares?q=owners&owners=urn:li:person:${accountId}&count=25&sortBy=CREATED&projection=(elements*(id,commentary,created,socialCounts))`,
      {
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LinkedIn API error:', response.status, errorText)
      
      // Try alternative endpoint for posts
      const postsResponse = await fetch(
        `https://api.linkedin.com/v2/posts?q=author&author=urn:li:person:${accountId}&count=25&sortBy=CREATED`,
        {
          headers: {
            'Authorization': `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      )
      
      if (!postsResponse.ok) {
        console.error('LinkedIn posts API also failed:', await postsResponse.text())
        return []
      }
      
      const postsData = await postsResponse.json()
      return postsData.elements || []
    }

    const data = await response.json()
    
    if (!data.elements) {
      console.log('No LinkedIn posts found')
      return []
    }

    console.log(`Found ${data.elements.length} LinkedIn posts`)
    return data.elements
  } catch (error) {
    console.error('Error fetching LinkedIn posts:', error)
    return []
  }
}

// Get LinkedIn account info
export async function getLinkedInAccountInfo(userId: string, accountId: string) {
  try {
    const account = await db.socialAccount.findFirst({
      where: {
        userId,
        accountId,
        platform: 'LINKEDIN',
        isActive: true
      }
    })

    if (!account || !account.accessToken) {
      return null
    }

    const response = await fetch(
      `https://api.linkedin.com/v2/people/(id:${accountId})?projection=(id,firstName,lastName,profilePicture)`,
      {
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    )

    if (!response.ok) {
      console.error('LinkedIn account info fetch failed:', await response.text())
      return null
    }

    const accountInfo = await response.json()
    
    return {
      id: accountInfo.id,
      firstName: accountInfo.firstName?.localized?.en_US,
      lastName: accountInfo.lastName?.localized?.en_US,
      profilePicture: accountInfo.profilePicture
    }
  } catch (error) {
    console.error('Error fetching LinkedIn account info:', error)
    return null
  }
}
