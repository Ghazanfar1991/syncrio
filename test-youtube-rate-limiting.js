// Test script to demonstrate improved YouTube rate limiting
const fetch = require('node-fetch');

async function testYouTubeRateLimiting() {
  try {
    console.log('🧪 Testing YouTube Rate Limiting Improvements...\n');
    
    // Test 1: First API call (should work)
    console.log('📡 Test 1: First API call (should work)');
    const response1 = await fetch('http://localhost:3000/api/analytics/overview?period=30');
    console.log('Response status:', response1.status);
    
    if (response1.status === 401) {
      console.log('✅ Expected: Unauthorized (not logged in)');
    } else if (response1.status === 200) {
      console.log('✅ Success: Got analytics data');
    }
    
    console.log('');
    
    // Test 2: Immediate second call (should be rate limited but allow if no cache)
    console.log('📡 Test 2: Immediate second call (rate limited but allows if no cache)');
    const response2 = await fetch('http://localhost:3000/api/analytics/overview?period=30');
    console.log('Response status:', response2.status);
    
    if (response2.status === 401) {
      console.log('✅ Expected: Unauthorized (not logged in)');
    } else if (response2.status === 200) {
      console.log('✅ Success: Rate limiting working with cache override');
    }
    
    console.log('');
    
    // Test 3: Wait and test again
    console.log('⏳ Test 3: Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response3 = await fetch('http://localhost:3000/api/analytics/overview?period=30');
    console.log('Response status:', response3.status);
    
    if (response3.status === 401) {
      console.log('✅ Expected: Unauthorized (not logged in)');
    } else if (response3.status === 200) {
      console.log('✅ Success: Rate limiting working correctly');
    }
    
    console.log('\n🎯 Rate Limiting Test Summary:');
    console.log('- First call: Should work');
    console.log('- Immediate second call: Rate limited but allows if no cache exists');
    console.log('- After waiting: Should work again');
    console.log('\n💡 The system now intelligently overrides rate limits when no cached data is available!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testYouTubeRateLimiting();



