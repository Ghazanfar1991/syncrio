const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkFields() {
  try {
    console.log('🔍 Checking SocialAccount table fields...')
    
    const account = await prisma.socialAccount.findFirst({
      where: { platform: 'TWITTER' }
    })
    
    if (account) {
      console.log('✅ Found Twitter account')
      console.log('📋 Available fields:', Object.keys(account))
      console.log('\n🔑 OAuth 1.0a fields:')
      console.log('   consumerKey:', account.consumerKey ? '✅ Set' : '❌ Missing')
      console.log('   consumerSecret:', account.consumerSecret ? '✅ Set' : '❌ Missing')
      console.log('   accessTokenSecret:', account.accessTokenSecret ? '✅ Set' : '❌ Missing')
      console.log('   oauth1AccessToken:', account.oauth1AccessToken ? '✅ Set' : '❌ Missing')
    } else {
      console.log('❌ No Twitter accounts found')
    }
    
  } catch (error) {
    console.error('❌ Error checking fields:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkFields()
