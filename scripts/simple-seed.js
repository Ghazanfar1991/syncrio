// Simple seed script for SQLite database
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function simpleSeed() {
  try {
    console.log('🌱 Starting simple database seeding...')

    // Create demo user
    const hashedPassword = await bcrypt.hash('password123', 12)
    
    const user = await prisma.user.upsert({
      where: { email: 'demo@conversai.social' },
      update: {},
      create: {
        email: 'demo@conversai.social',
        name: 'Demo User',
        password: hashedPassword,
        emailVerified: new Date(),
      }
    })

    console.log(`✅ Created user: ${user.email}`)

    // Create subscription
    const subscription = await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        tier: 'STARTER',
        status: 'TRIALING',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      }
    })

    console.log(`✅ Created subscription: ${subscription.tier}`)

    // Create sample social account
    const socialAccount = await prisma.socialAccount.upsert({
      where: {
        userId_platform_accountId: {
          userId: user.id,
          platform: 'TWITTER',
          accountId: 'demo_twitter_123'
        }
      },
      update: {},
      create: {
        userId: user.id,
        platform: 'TWITTER',
        accountId: 'demo_twitter_123',
        accountName: '@demo_user',
        accessToken: 'demo_token_123',
        isActive: true,
      }
    })

    console.log(`✅ Created social account: ${socialAccount.platform}`)

    // Create sample post
    const post = await prisma.post.create({
      data: {
        userId: user.id,
        content: "🚀 Just set up ConversAI Social! This AI-powered platform makes social media management so much easier. #AI #SocialMedia #Automation",
        hashtags: JSON.stringify(["AI", "SocialMedia", "Automation"]),
        status: 'PUBLISHED',
        publishedAt: new Date(),
      }
    })

    console.log(`✅ Created post: ${post.id}`)

    // Create usage tracking
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()

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
        postsUsed: 1,
      }
    })

    console.log(`✅ Created usage tracking`)

    console.log('🎉 Simple seeding completed successfully!')
    console.log('\n📝 Demo Account:')
    console.log('Email: demo@conversai.social')
    console.log('Password: password123')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

simpleSeed()
