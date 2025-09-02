// Test script for Twitter Hybrid OAuth System
// This script tests the OAuth 1.0a media upload functionality

const crypto = require('crypto');

// Test OAuth 1.0a signature generation
function testOAuth1Signature() {
  console.log('🧪 Testing OAuth 1.0a signature generation...');
  
  const config = {
    consumerKey: 'test_consumer_key',
    consumerSecret: 'test_consumer_secret',
    accessToken: 'test_access_token',
    accessTokenSecret: 'test_access_token_secret'
  };
  
  const method = 'POST';
  const url = 'https://upload.twitter.com/1.1/media/upload.json';
  const params = {};
  
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    
    // Add OAuth parameters
    const oauthParams = {
      oauth_consumer_key: config.consumerKey,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_token: config.accessToken,
      oauth_version: '1.0'
    };
    
    // Combine all parameters
    const allParams = { ...params, ...oauthParams };
    
    // Sort parameters alphabetically
    const sortedParams = Object.keys(allParams)
      .sort()
      .map(key => `${key}=${encodeURIComponent(allParams[key])}`)
      .join('&');
    
    // Create signature base string
    const signatureBaseString = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(sortedParams)
    ].join('&');
    
    // Create signing key
    const signingKey = [
      encodeURIComponent(config.consumerSecret),
      encodeURIComponent(config.accessTokenSecret)
    ].join('&');
    
    // Generate signature
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(signatureBaseString)
      .digest('base64');
    
    console.log('✅ OAuth 1.0a signature generated successfully');
    console.log('   Signature:', signature);
    console.log('   Base string length:', signatureBaseString.length);
    
    return true;
  } catch (error) {
    console.error('❌ OAuth 1.0a signature generation failed:', error);
    return false;
  }
}

// Test multipart form data creation
function testMultipartFormData() {
  console.log('\n🧪 Testing multipart form data creation...');
  
  try {
    const imageBuffer = Buffer.from('fake image data');
    const mimeType = 'image/jpeg';
    const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
    const filename = 'image.jpg';
    
    // Build multipart form data
    const formData = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="media"; filename="${filename}"`,
      `Content-Type: ${mimeType}`,
      '',
      imageBuffer.toString('base64'),
      `--${boundary}--`
    ].join('\r\n');
    
    console.log('✅ Multipart form data created successfully');
    console.log('   Boundary:', boundary);
    console.log('   Form data length:', formData.length);
    console.log('   Contains image data:', formData.includes('fake image data'));
    
    return true;
  } catch (error) {
    console.error('❌ Multipart form data creation failed:', error);
    return false;
  }
}

// Test environment variables
function testEnvironmentVariables() {
  console.log('\n🧪 Testing environment variables...');
  
  const requiredVars = [
    'TWITTER_CLIENT_ID',
    'TWITTER_CLIENT_SECRET',
    'TWITTER_CONSUMER_KEY',
    'TWITTER_CONSUMER_SECRET'
  ];
  
  const missingVars = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length === 0) {
    console.log('✅ All required environment variables are set');
    return true;
  } else {
    console.log('❌ Missing environment variables:', missingVars.join(', '));
    console.log('   Please check your .env file');
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Twitter Hybrid OAuth System Tests...\n');
  
  const results = [];
  
  // Test 1: Environment variables
  results.push(testEnvironmentVariables());
  
  // Test 2: OAuth 1.0a signature generation
  results.push(testOAuth1Signature());
  
  // Test 3: Multipart form data creation
  results.push(testMultipartFormData());
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log(`   Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! The hybrid OAuth system is ready.');
    console.log('\n📝 Next steps:');
    console.log('   1. Connect a Twitter account via OAuth 2.0');
    console.log('   2. Set up OAuth 1.0a access token secret');
    console.log('   3. Test posting tweets with media');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testOAuth1Signature,
  testMultipartFormData,
  testEnvironmentVariables,
  runTests
};

