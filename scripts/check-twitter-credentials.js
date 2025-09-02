// Script to check Twitter OAuth credentials in database
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkTwitterCredentials() {
  console.log('🔍 Checking Twitter OAuth credentials in database...\n')
  
  try {
    // Get all Twitter accounts
    const twitterAccounts = await prisma.socialAccount.findMany({
      where: {
        platform: 'TWITTER'
      },
      select: {
        id: true,
        accountName: true,
        isActive: true,
        consumerKey: true,
        consumerSecret: true,
        accessTokenSecret: true,
        createdAt: true
      }
    })
    
    console.log(`📊 Found ${twitterAccounts.length} Twitter accounts:\n`)
    
    twitterAccounts.forEach((account, index) => {
      console.log(`${index + 1}. Account: ${account.accountName}`)
      console.log(`   ID: ${account.id}`)
      console.log(`   Active: ${account.isActive ? '✅ Yes' : '❌ No'}`)
      console.log(`   Consumer Key: ${account.consumerKey ? '✅ Set' : '❌ Missing'}`)
      console.log(`   Consumer Secret: ${account.consumerSecret ? '✅ Set' : '❌ Missing'}`)
      console.log(`   Access Token Secret: ${account.accessTokenSecret ? '✅ Set' : '❌ Missing'}`)
      console.log(`   Created: ${account.createdAt.toISOString()}`)
      
      // Check if OAuth 1.0a is fully configured
      const oauth1Configured = account.consumerKey && account.consumerSecret && account.accessTokenSecret
      console.log(`   OAuth 1.0a Ready: ${oauth1Configured ? '✅ Yes' : '❌ No'}`)
      
      if (!oauth1Configured) {
        if (!account.accessTokenSecret) {
          console.log(`   ⚠️  Missing: Access Token Secret`)
          console.log(`   💡 You need to get this from Twitter Developer Portal`)
          console.log(`   💡 Go to: https://developer.twitter.com/en/portal/dashboard`)
          console.log(`   💡 Navigate to your app → Keys and Tokens → Authentication Tokens`)
          console.log(`   💡 Copy the "Access Token Secret" (not the Access Token)`)
        }
      }
      
      console.log('')
    })
    
    // Summary
    const fullyConfigured = twitterAccounts.filter(acc => 
      acc.consumerKey && acc.consumerSecret && acc.accessTokenSecret
    ).length
    
    console.log('📋 Summary:')
    console.log(`   Total Twitter accounts: ${twitterAccounts.length}`)
    console.log(`   Fully configured for media: ${fullyConfigured}`)
    console.log(`   Missing OAuth 1.0a setup: ${twitterAccounts.length - fullyConfigured}`)
    
    if (fullyConfigured === 0) {
      console.log('\n🚨 No Twitter accounts are fully configured for media uploads!')
      console.log('   You need to set up the Access Token Secret for at least one account.')
    } else {
      console.log('\n✅ You have at least one Twitter account ready for media uploads!')
    }
    
  } catch (error) {
    console.error('❌ Error checking credentials:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check
checkTwitterCredentials().catch(console.error)

