// Simple database test script
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...')
    
    // Test basic connection
    const userCount = await prisma.user.count()
    console.log(`✅ Database connected! Current user count: ${userCount}`)
    
    // Test creating a simple user
    console.log('🧪 Testing user creation...')
    
    const testEmail = `test-${Date.now()}@example.com`
    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Test User',
        password: 'hashedpassword123',
        emailVerified: new Date()
      }
    })
    
    console.log(`✅ User created successfully:`, {
      id: testUser.id,
      email: testUser.email,
      name: testUser.name
    })
    
    // Test creating subscription
    console.log('🧪 Testing subscription creation...')
    
    const subscription = await prisma.subscription.create({
      data: {
        userId: testUser.id,
        tier: 'STARTER',
        status: 'TRIALING',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      }
    })
    
    console.log(`✅ Subscription created successfully:`, {
      id: subscription.id,
      tier: subscription.tier,
      status: subscription.status
    })
    
    // Clean up test data
    await prisma.subscription.delete({ where: { id: subscription.id } })
    await prisma.user.delete({ where: { id: testUser.id } })
    
    console.log('🧹 Test data cleaned up')
    console.log('🎉 Database test completed successfully!')
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabase()
