// Test script for image conversion functionality
const { convertImageForPlatform, isBase64Image, base64ToBlob } = require('../lib/social/image-converter')

// Test cases
const testImages = [
  // Base64 data URL
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  
  // Regular URL
  'https://example.com/image.jpg',
  
  // Invalid base64
  'invalid-base64-data',
  
  // Data URL without base64
  'data:image/png;base64,'
]

console.log('Testing image conversion functionality...\n')

testImages.forEach((imageUrl, index) => {
  console.log(`Test ${index + 1}: ${imageUrl.substring(0, 50)}...`)
  
  try {
    // Test base64 detection
    const isBase64 = isBase64Image(imageUrl)
    console.log(`  Is base64: ${isBase64}`)
    
    // Test conversion for different platforms
    const platforms = ['TWITTER', 'LINKEDIN', 'INSTAGRAM']
    
    platforms.forEach(platform => {
      try {
        const result = convertImageForPlatform(imageUrl, platform)
        console.log(`  ${platform}: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.error || 'OK'}`)
        
        if (result.success) {
          console.log(`    Format: ${result.format}, Size: ${result.size ? result.size.toFixed(2) + 'MB' : 'Unknown'}`)
        }
      } catch (error) {
        console.log(`  ${platform}: ERROR - ${error.message}`)
      }
    })
    
    console.log('')
  } catch (error) {
    console.log(`  ERROR: ${error.message}\n`)
  }
})

console.log('Test completed!')
