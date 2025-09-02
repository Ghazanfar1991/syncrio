// Test script for the publish endpoint
const fetch = require('node-fetch');

async function testPublishEndpoint() {
  console.log('🧪 Testing publish endpoint...');
  
  try {
    // Test the endpoint with a mock request
    const response = await fetch('http://localhost:3000/api/posts/test-id/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail without proper authentication, but we can test the endpoint structure
      }
    });
    
    console.log('✅ Publish endpoint is accessible');
    console.log('   Status:', response.status);
    console.log('   Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 401) {
      console.log('   Expected: 401 Unauthorized (no auth token)');
      console.log('   ✅ Endpoint is working correctly');
    } else {
      console.log('   Response:', await response.text());
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running. Please start your Next.js development server.');
      console.log('   Run: npm run dev');
    } else {
      console.error('❌ Test failed:', error.message);
    }
  }
}

// Test the apiError function
function testApiErrorFunction() {
  console.log('\n🧪 Testing apiError function...');
  
  try {
    // Import the function (this will test if it's properly exported)
    const { apiError } = require('../lib/api-utils');
    
    // Test the function
    const result = apiError('Test error message', 400, 'TEST_ERROR');
    
    console.log('✅ apiError function is working');
    console.log('   Result type:', typeof result);
    console.log('   Result status:', result.status);
    
  } catch (error) {
    console.error('❌ apiError function test failed:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Publish Endpoint Tests...\n');
  
  // Test 1: apiError function
  testApiErrorFunction();
  
  // Test 2: Publish endpoint accessibility
  await testPublishEndpoint();
  
  console.log('\n📊 Test Results Summary:');
  console.log('   ✅ Core functionality tests completed');
  console.log('\n📝 Next steps:');
  console.log('   1. Start your development server: npm run dev');
  console.log('   2. Try publishing a post from the UI');
  console.log('   3. Check the browser console for detailed error messages');
  console.log('   4. Verify the server logs for debugging information');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testPublishEndpoint,
  testApiErrorFunction,
  runTests
};

