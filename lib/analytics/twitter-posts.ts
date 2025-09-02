// Twitter posts fetcher for real data
import { db } from '@/lib/db'

interface TwitterPost {
  id: string
  text: string
  created_at: string
  public_metrics?: {
    retweet_count: number
    like_count: number
    reply_count: number
    quote_count: number
    impression_count?: number
  }
  author_id?: string
}

// Fetch real Twitter posts from user's account
export async function fetchTwitterPosts(userId: string, accountId: string): Promise<TwitterPost[]> {
  try {
    // Get the user's Twitter account
    const account = await db.socialAccount.findFirst({
      where: {
        userId,
        accountId,
        platform: 'TWITTER',
        isActive: true
      }
    })

    if (!account || !account.accessToken) {
      console.log('No valid Twitter account found')
      return []
    }

    console.log('Fetching Twitter posts for account:', account.accountName)

    // Fetch user's tweets from Twitter API v2
    const response = await fetch(
      `https://api.twitter.com/2/users/${accountId}/tweets?max_results=25&tweet.fields=created_at,public_metrics,text&expansions=author_id`,
      {
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Twitter API error:', response.status, errorText)
      
      // Try alternative endpoint for user timeline
      const timelineResponse = await fetch(
        `https://api.twitter.com/2/users/me/tweets?max_results=25&tweet.fields=created_at,public_metrics,text`,
        {
          headers: {
            'Authorization': `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (!timelineResponse.ok) {
        console.error('Twitter timeline API also failed:', await timelineResponse.text())
        return []
      }
      
      const timelineData = await timelineResponse.json()
      return timelineData.data || []
    }

    const data = await response.json()
    
    if (!data.data) {
      console.log('No Twitter posts found')
      return []
    }

    console.log(`Found ${data.data.length} Twitter posts`)
    return data.data
  } catch (error) {
    console.error('Error fetching Twitter posts:', error)
    return []
  }
}

// Get Twitter account info
export async function getTwitterAccountInfo(userId: string, accountId: string) {
  try {
    const account = await db.socialAccount.findFirst({
      where: {
        userId,
        accountId,
        platform: 'TWITTER',
        isActive: true
      }
    })

    if (!account || !account.accessToken) {
      return null
    }

    const response = await fetch(
      `https://api.twitter.com/2/users/me?user.fields=public_metrics,verified`,
      {
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      console.error('Twitter account info fetch failed:', await response.text())
      return null
    }

    const accountInfo = await response.json()
    
    return {
      id: accountInfo.data.id,
      username: accountInfo.data.username,
      name: accountInfo.data.name,
      verified: accountInfo.data.verified,
      followersCount: accountInfo.data.public_metrics?.followers_count,
      followingCount: accountInfo.data.public_metrics?.following_count,
      tweetCount: accountInfo.data.public_metrics?.tweet_count
    }
  } catch (error) {
    console.error('Error fetching Twitter account info:', error)
    return null
  }
}
