const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updatePostsPlatform() {
  try {
    console.log('🔍 Finding posts without platform information...')
    
    // Find all posts
    const posts = await prisma.post.findMany({
      include: {
        publications: {
          include: {
            socialAccount: true
          }
        }
      }
    })
    
    console.log(`📝 Found ${posts.length} total posts`)
    
    let updatedCount = 0
    
    for (const post of posts) {
      // If post already has platform, skip
      if (post.platform) {
        console.log(`✅ Post ${post.id} already has platform: ${post.platform}`)
        continue
      }
      
      // Get platform from first publication
      const platform = post.publications?.[0]?.socialAccount?.platform
      
      if (platform) {
        console.log(`🔄 Updating post ${post.id} with platform: ${platform}`)
        
        await prisma.post.update({
          where: { id: post.id },
          data: { platform }
        })
        
        updatedCount++
      } else {
        console.log(`⚠️ Post ${post.id} has no publications, setting default platform: TWITTER`)
        
        await prisma.post.update({
          where: { id: post.id },
          data: { platform: 'TWITTER' }
        })
        
        updatedCount++
      }
    }
    
    console.log(`🎉 Successfully updated ${updatedCount} posts with platform information`)
    
  } catch (error) {
    console.error('❌ Error updating posts:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updatePostsPlatform()
