// Simple test script to verify YouTube analytics API
const fetch = require('node-fetch');

async function testYouTubeAPI() {
  try {
    console.log('Testing YouTube Analytics API...');
    
    // Test the overview endpoint
    const response = await fetch('http://localhost:3000/api/analytics/overview?period=30');
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ API call successful');
      if (data.data.youtubeAnalytics) {
        console.log('✅ YouTube analytics data found:', data.data.youtubeAnalytics);
      } else {
        console.log('⚠️ No YouTube analytics data in response');
      }
    } else {
      console.log('❌ API call failed:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testYouTubeAPI();




