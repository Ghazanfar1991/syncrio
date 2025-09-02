// Database seeding script for development and testing
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create test users with different subscription tiers
  const users = [
    {
      email: 'demo@conversai.social',
      name: 'Demo User',
      password: await bcrypt.hash('password123', 12),
      tier: 'STARTER' as const,
      status: 'TRIALING' as const
    },
    {
      email: 'growth@conversai.social', 
      name: 'Growth User',
      password: await bcrypt.hash('password123', 12),
      tier: 'GROWTH' as const,
      status: 'ACTIVE' as const
    },
    {
      email: 'business@conversai.social',
      name: 'Business User', 
      password: await bcrypt.hash('password123', 12),
      tier: 'BUSINESS' as const,
      status: 'ACTIVE' as const
    },
    {
      email: 'agency@conversai.social',
      name: 'Agency User',
      password: await bcrypt.hash('password123', 12),
      tier: 'AGENCY' as const,
      status: 'ACTIVE' as const
    }
  ]

  const createdUsers = []

  for (const userData of users) {
    // Create user
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        name: userData.name,
        password: userData.password,
        emailVerified: new Date(),
      }
    })

    // Create subscription
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        tier: userData.tier,
        status: userData.status,
        stripeCustomerId: `cus_demo_${user.id}`,
        stripeSubscriptionId: userData.status === 'ACTIVE' ? `sub_demo_${user.id}` : null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }
    })

    createdUsers.push(user)
    console.log(`✅ Created user: ${userData.email} (${userData.tier})`)
  }

  // Create sample social accounts for demo user
  const demoUser = createdUsers[0]
  const socialAccounts = [
    {
      platform: 'TWITTER' as const,
      accountId: 'demo_twitter_123',
      accountName: '@demo_user',
      accessToken: 'demo_twitter_token',
    },
    {
      platform: 'LINKEDIN' as const,
      accountId: 'demo_linkedin_456',
      accountName: 'Demo User',
      accessToken: 'demo_linkedin_token',
    },
    {
      platform: 'INSTAGRAM' as const,
      accountId: 'demo_instagram_789',
      accountName: '@demo_user_ig',
      accessToken: 'demo_instagram_token',
    }
  ]

  for (const accountData of socialAccounts) {
    await prisma.socialAccount.upsert({
      where: {
        userId_platform_accountId: {
          userId: demoUser.id,
          platform: accountData.platform,
          accountId: accountData.accountId
        }
      },
      update: {},
      create: {
        userId: demoUser.id,
        platform: accountData.platform,
        accountId: accountData.accountId,
        accountName: accountData.accountName,
        accessToken: accountData.accessToken,
        isActive: true,
      }
    })
    console.log(`✅ Created social account: ${accountData.platform} for ${demoUser.email}`)
  }

  // Create sample posts
  const samplePosts = [
    {
      content: "🚀 Just launched our new AI-powered social media automation tool! It's amazing how technology can simplify our daily tasks. #AI #SocialMedia #Automation",
      hashtags: ["AI", "SocialMedia", "Automation", "Technology"],
      status: 'PUBLISHED' as const,
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      content: "💡 Pro tip: Consistency is key in social media marketing. Our AI helps you maintain a regular posting schedule without the hassle! #MarketingTips #Productivity",
      hashtags: ["MarketingTips", "Productivity", "SocialMediaMarketing"],
      status: 'PUBLISHED' as const,
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      content: "🎯 Working on some exciting new features for our platform. Can't wait to share them with you all! Stay tuned... #ComingSoon #Innovation",
      hashtags: ["ComingSoon", "Innovation", "ProductDevelopment"],
      status: 'SCHEDULED' as const,
      scheduledAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
    },
    {
      content: "📊 Analytics show that posts with images get 2.3x more engagement. Our AI automatically suggests the best visuals for your content! #Analytics #ContentStrategy",
      hashtags: ["Analytics", "ContentStrategy", "SocialMediaTips"],
      status: 'DRAFT' as const,
    }
  ]

  for (const postData of samplePosts) {
    const post = await prisma.post.create({
      data: {
        userId: demoUser.id,
        content: postData.content,
        hashtags: postData.hashtags,
        status: postData.status,
        scheduledAt: postData.scheduledAt,
        publishedAt: postData.publishedAt,
      }
    })

    // Create post publications for published posts
    if (postData.status === 'PUBLISHED') {
      const socialAccountsForUser = await prisma.socialAccount.findMany({
        where: { userId: demoUser.id }
      })

      for (const account of socialAccountsForUser.slice(0, 2)) { // Publish to first 2 accounts
        await prisma.postPublication.create({
          data: {
            postId: post.id,
            socialAccountId: account.id,
            platformPostId: `${account.platform.toLowerCase()}_${post.id}_${Math.random().toString(36).substr(2, 9)}`,
            status: 'PUBLISHED',
            publishedAt: postData.publishedAt,
          }
        })

        // Create sample analytics for published posts
        await prisma.postAnalytics.create({
          data: {
            postId: post.id,
            platform: account.platform,
            likes: Math.floor(Math.random() * 100) + 10,
            comments: Math.floor(Math.random() * 20) + 2,
            shares: Math.floor(Math.random() * 15) + 1,
            views: Math.floor(Math.random() * 1000) + 100,
            engagement: Math.random() * 5 + 1, // 1-6% engagement rate
          }
        })
      }
    }

    console.log(`✅ Created post: ${postData.status} - "${postData.content.substring(0, 50)}..."`)
  }

  // Create sample chat messages
  const chatMessages = [
    {
      content: "Hi! I'd like to create a post about our new product launch.",
      type: 'USER' as const,
      timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    },
    {
      content: "I'd be happy to help you create a post about your product launch! Can you tell me more about the product and what makes it special?",
      type: 'ASSISTANT' as const,
      timestamp: new Date(Date.now() - 59 * 60 * 1000),
    },
    {
      content: "It's an AI-powered social media automation tool that helps businesses save time on content creation.",
      type: 'USER' as const,
      timestamp: new Date(Date.now() - 58 * 60 * 1000),
    },
    {
      content: "Perfect! Here's a draft post for your AI social media tool:\n\n🚀 Introducing our game-changing AI social media automation tool! Say goodbye to hours of content planning and hello to effortless, engaging posts. Transform your social media strategy today! #AI #SocialMedia #Automation #Innovation\n\nWould you like me to adjust the tone or add any specific details?",
      type: 'ASSISTANT' as const,
      timestamp: new Date(Date.now() - 57 * 60 * 1000),
    }
  ]

  for (const messageData of chatMessages) {
    await prisma.chatMessage.create({
      data: {
        userId: demoUser.id,
        content: messageData.content,
        type: messageData.type,
        timestamp: messageData.timestamp,
      }
    })
  }

  console.log(`✅ Created ${chatMessages.length} chat messages`)

  // Create usage tracking for current month
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  for (const user of createdUsers) {
    const postsCount = await prisma.post.count({
      where: { userId: user.id }
    })

    await prisma.usageTracking.upsert({
      where: {
        userId_month_year: {
          userId: user.id,
          month: currentMonth,
          year: currentYear
        }
      },
      update: {},
      create: {
        userId: user.id,
        month: currentMonth,
        year: currentYear,
        postsUsed: postsCount,
      }
    })
  }

  console.log('✅ Created usage tracking records')
  console.log('🎉 Database seeding completed successfully!')
  console.log('\n📝 Test Accounts Created:')
  console.log('Email: demo@conversai.social | Password: password123 | Tier: Starter')
  console.log('Email: growth@conversai.social | Password: password123 | Tier: Growth')
  console.log('Email: business@conversai.social | Password: password123 | Tier: Business')
  console.log('Email: agency@conversai.social | Password: password123 | Tier: Agency')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
