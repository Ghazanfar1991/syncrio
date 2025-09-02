#!/usr/bin/env node

/**
 * Test script for YouTube Analytics functionality
 * 
 * This script tests the YouTube analytics API endpoints and functions
 * to ensure they're working correctly.
 * 
 * Usage:
 * node scripts/test-youtube-analytics.js
 */

const https = require('https');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Adjust if your app runs on different port
const TEST_USER_ID = 'test-user-id'; // Replace with actual test user ID

// Test data
const testCases = [
  {
    name: 'YouTube Analytics API - Basic',
    endpoint: '/api/analytics/youtube',
    method: 'GET',
    params: { period: 30, includeVideos: true }
  },
  {
    name: 'YouTube Analytics API - Custom Date Range',
    endpoint: '/api/analytics/youtube',
    method: 'GET',
    params: { 
      startDate: '2024-01-01', 
      endDate: '2024-01-31',
      includeVideos: false 
    }
  },
  {
    name: 'Platform Analytics - YouTube',
    endpoint: '/api/analytics/platform/YOUTUBE',
    method: 'GET',
    params: { period: 30 }
  }
];

// Helper function to make HTTP requests
function makeRequest(url, method = 'GET', params = {}) {
  return new Promise((resolve, reject) => {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    
    console.log(`\n🌐 Making ${method} request to: ${fullUrl}`);
    
    const req = https.request(fullUrl, { method }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// Test function
async function runTests() {
  console.log('🧪 Starting YouTube Analytics Tests\n');
  console.log('=' .repeat(60));
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log('-'.repeat(40));
    
    try {
      const response = await makeRequest(
        `${BASE_URL}${testCase.endpoint}`,
        testCase.method,
        testCase.params
      );
      
      console.log(`✅ Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log('✅ Response received successfully');
        
        if (response.data && response.data.success) {
          console.log('✅ API returned success response');
          
          // Validate response structure
          if (response.data.data) {
            const data = response.data.data;
            
            if (data.platform === 'YOUTUBE') {
              console.log('✅ Platform correctly identified as YouTube');
            }
            
            if (data.summary) {
              console.log('✅ Summary data present');
              console.log(`   - Total Views: ${data.summary.totalViews || 'N/A'}`);
              console.log(`   - Total Subscribers: ${data.summary.totalSubscribers || 'N/A'}`);
            }
            
            if (data.chartData && Array.isArray(data.chartData)) {
              console.log(`✅ Chart data present (${data.chartData.length} days)`);
            }
            
            if (data.topVideos && Array.isArray(data.topVideos)) {
              console.log(`✅ Top videos data present (${data.topVideos.length} videos)`);
            }
          }
          
          passedTests++;
        } else {
          console.log('❌ API did not return success response');
          console.log('Response:', JSON.stringify(response.data, null, 2));
        }
      } else if (response.status === 401) {
        console.log('⚠️  Unauthorized - User not authenticated');
        console.log('This is expected if running without authentication');
      } else if (response.status === 404) {
        console.log('⚠️  Not Found - Endpoint or resource not available');
      } else {
        console.log(`❌ Unexpected status: ${response.status}`);
        console.log('Response:', JSON.stringify(response.data, null, 2));
      }
      
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! YouTube Analytics is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
  }
  
  console.log('\n💡 Tips:');
  console.log('- Ensure your Next.js app is running on the correct port');
  console.log('- Check that YouTube OAuth is properly configured');
  console.log('- Verify environment variables are set correctly');
  console.log('- Ensure you have a valid YouTube account connected');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, makeRequest };





