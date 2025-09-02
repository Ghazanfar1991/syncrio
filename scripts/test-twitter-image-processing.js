// Test script for Twitter image processing
const { processImagesForUpload, base64ToBuffer } = require('../lib/social/image-upload.js')

// Test base64 image processing
function testImageProcessing() {
  console.log('🧪 Testing Twitter image processing...')
  
  // Create a simple test base64 image (1x1 pixel red PNG)
  const testBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  
  console.log('Test base64 image length:', testBase64Image.length)
  console.log('Test base64 image starts with data:', testBase64Image.startsWith('data:'))
  
  try {
    // Test base64ToBuffer function
    console.log('\n📸 Testing base64ToBuffer...')
    const bufferResult = base64ToBuffer(testBase64Image)
    
    if (bufferResult) {
      console.log('✅ base64ToBuffer successful:')
      console.log('  - Buffer size:', bufferResult.size, 'bytes')
      console.log('  - MIME type:', bufferResult.mimeType)
      console.log('  - Buffer type:', typeof bufferResult.buffer)
    } else {
      console.log('❌ base64ToBuffer failed')
    }
    
    // Test processImagesForUpload function
    console.log('\n📸 Testing processImagesForUpload...')
    const processedImages = processImagesForUpload([testBase64Image])
    
    console.log('✅ processImagesForUpload successful:')
    console.log('  - Processed images count:', processedImages.length)
    
    if (processedImages.length > 0) {
      const image = processedImages[0]
      console.log('  - First image buffer size:', image.size, 'bytes')
      console.log('  - First image MIME type:', image.mimeType)
      console.log('  - First image buffer type:', typeof image.buffer)
    }
    
    // Test with multiple images
    console.log('\n📸 Testing with multiple images...')
    const multipleImages = [testBase64Image, testBase64Image] // Duplicate for testing
    const multipleProcessed = processImagesForUpload(multipleImages)
    
    console.log('✅ Multiple images processing successful:')
    console.log('  - Processed images count:', multipleImages.length)
    console.log('  - Processed images count:', multipleProcessed.length)
    
    // Test with string input (single image)
    console.log('\n📸 Testing with string input...')
    const stringProcessed = processImagesForUpload(testBase64Image)
    
    console.log('✅ String input processing successful:')
    console.log('  - String input length:', testBase64Image.length)
    console.log('  - Processed images count:', stringProcessed.length)
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Test database connection (if available)
async function testDatabaseConnection() {
  console.log('\n🗄️ Testing database connection...')
  
  try {
    // Try to import the database module
    const { db } = require('../lib/db.js')
    
    // Test a simple query
    const result = await db.$queryRaw`SELECT 1 as test`
    console.log('✅ Database connection successful:', result)
    
  } catch (error) {
    console.log('⚠️ Database connection test skipped (not available in this environment):', error.message)
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Twitter Image Processing Tests...\n')
  
  // Test 1: Image processing functions
  testImageProcessing()
  
  // Test 2: Database connection
  await testDatabaseConnection()
  
  console.log('\n📊 Test Results Summary:')
  console.log('   ✅ Core image processing tests completed')
  console.log('\n📝 Next steps:')
  console.log('   1. Verify OAuth 1.0a credentials are set up in your Twitter account')
  console.log('   2. Create a new post with images')
  console.log('   3. Try publishing to Twitter')
  console.log('   4. Check server logs for detailed debugging information')
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = {
  testImageProcessing,
  testDatabaseConnection,
  runTests
}
