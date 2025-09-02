const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function setupTwitterOAuth1() {
  try {
    console.log('🔧 Setting up Twitter OAuth 1.0a credentials...')
    
    // Get all Twitter accounts
    const accounts = await prisma.socialAccount.findMany({
      where: { platform: 'TWITTER' },
      select: {
        id: true,
        accountName: true,
        consumerKey: true,
        consumerSecret: true,
        accessTokenSecret: true
      }
    })
    
    if (accounts.length === 0) {
      console.log('❌ No Twitter accounts found in database')
      return
    }
    
    console.log(`📱 Found ${accounts.length} Twitter account(s):`)
    accounts.forEach((account, index) => {
      console.log(`\n${index + 1}. Account: ${account.accountName}`)
      console.log(`   ID: ${account.id}`)
      console.log(`   Consumer Key: ${account.consumerKey ? '✅ Set' : '❌ Missing'}`)
      console.log(`   Consumer Secret: ${account.consumerSecret ? '✅ Set' : '❌ Missing'}`)
      console.log(`   Access Token Secret: ${account.accessTokenSecret ? '✅ Set' : '❌ Missing'}`)
    })
    
    // Check if we have the required environment variables
    const envVars = {
      TWITTER_CONSUMER_KEY: process.env.TWITTER_CONSUMER_KEY,
      TWITTER_CONSUMER_SECRET: process.env.TWITTER_CONSUMER_SECRET
    }
    
    console.log('\n🔑 Environment Variables:')
    console.log(`   TWITTER_CONSUMER_KEY: ${envVars.TWITTER_CONSUMER_KEY ? '✅ Set' : '❌ Missing'}`)
    console.log(`   TWITTER_CONSUMER_SECRET: ${envVars.TWITTER_CONSUMER_SECRET ? '✅ Set' : '❌ Missing'}`)
    
    if (!envVars.TWITTER_CONSUMER_KEY || !envVars.TWITTER_CONSUMER_SECRET) {
      console.log('\n❌ Missing environment variables!')
      console.log('   Please add TWITTER_CONSUMER_KEY and TWITTER_CONSUMER_SECRET to your .env file')
      return
    }
    
    // Update accounts with environment variable values
    console.log('\n🔄 Updating Twitter accounts with environment variable credentials...')
    
    for (const account of accounts) {
      const updateData = {}
      
      if (!account.consumerKey) {
        updateData.consumerKey = envVars.TWITTER_CONSUMER_KEY
        console.log(`   ✅ Setting consumer key for ${account.accountName}`)
      }
      
      if (!account.consumerSecret) {
        updateData.consumerSecret = envVars.TWITTER_CONSUMER_SECRET
        console.log(`   ✅ Setting consumer secret for ${account.accountName}`)
      }
      
      if (Object.keys(updateData).length > 0) {
        await prisma.socialAccount.update({
          where: { id: account.id },
          data: updateData
        })
      }
    }
    
    console.log('\n📋 Next Steps:')
    console.log('1. Go to https://developer.twitter.com/en/portal/dashboard')
    console.log('2. Click on your app')
    console.log('3. Go to "Keys and Tokens" tab')
    console.log('4. Look for "Authentication Tokens" section')
    console.log('5. Copy the "Access Token Secret"')
    console.log('6. Run this command to set it:')
    console.log('   node -e "require(\'./scripts/setup-twitter-oauth1.js\').setAccessTokenSecret(\'YOUR_ACCESS_TOKEN_SECRET\')"')
    
    console.log('\n✅ Setup completed! You still need to provide the Access Token Secret manually.')
    
  } catch (error) {
    console.error('❌ Error setting up Twitter OAuth 1.0a:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function setAccessTokenSecret(accessTokenSecret) {
  try {
    console.log('🔧 Setting Access Token Secret for Twitter accounts...')
    
    if (!accessTokenSecret) {
      console.log('❌ Please provide the Access Token Secret as an argument')
      console.log('   Usage: node -e "require(\'./scripts/setup-twitter-oauth1.js\').setAccessTokenSecret(\'YOUR_SECRET\')"')
      return
    }
    
    // Update all Twitter accounts with the Access Token Secret
    const result = await prisma.socialAccount.updateMany({
      where: { platform: 'TWITTER' },
      data: { accessTokenSecret }
    })
    
    console.log(`✅ Updated ${result.count} Twitter account(s) with Access Token Secret`)
    console.log('🎉 You can now try posting with images!')
    
  } catch (error) {
    console.error('❌ Error setting Access Token Secret:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function setOAuth1Tokens(accessToken, accessTokenSecret) {
  try {
    console.log('🔧 Setting OAuth 1.0a tokens for Twitter accounts...')
    
    if (!accessToken || !accessTokenSecret) {
      console.log('❌ Please provide both Access Token and Access Token Secret')
      console.log('   Usage: node -e "require(\'./scripts/setup-twitter-oauth1.js\').setOAuth1Tokens(\'ACCESS_TOKEN\', \'ACCESS_TOKEN_SECRET\')"')
      return
    }
    
    // Update all Twitter accounts with both OAuth 1.0a tokens
    const result = await prisma.socialAccount.updateMany({
      where: { platform: 'TWITTER' },
      data: { 
        accessTokenSecret,
        oauth1AccessToken: accessToken
      }
    })
    
    console.log(`✅ Updated ${result.count} Twitter account(s) with OAuth 1.0a tokens`)
    console.log('🎉 You can now try posting with images!')
    
  } catch (error) {
    console.error('❌ Error setting OAuth 1.0a tokens:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Export functions for use in command line
module.exports = {
  setupTwitterOAuth1,
  setAccessTokenSecret,
  setOAuth1Tokens
}

// Run setup if called directly
if (require.main === module) {
  setupTwitterOAuth1()
}
