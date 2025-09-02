# AI Setup Guide for Social Bot

## Overview
This application uses OpenRouter for AI content generation and Hugging Face for image generation.

## Required Environment Variables

### 1. OpenRouter API Key
```bash
# Add to your .env.local file
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

**To get your OpenRouter API key:**
1. Go to [https://openrouter.ai/keys](https://openrouter.ai/keys)
2. Sign up or log in to your account
3. Create a new API key
4. Copy the key and add it to your `.env.local` file

### 2. App URL (Optional but recommended)
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## AI Models Configuration

### Content Generation Models
- **Primary Model**: `qwen/qwen3-4b:free` (Free tier)
- **Provider**: OpenRouter
- **Purpose**: Content generation, hashtag generation, chat

### Image Generation Model
- **Model**: `black-forest-labs/FLUX.1-schnell`
- **Provider**: Hugging Face
- **Purpose**: Image generation

## Testing the Connection

### 1. Test AI Connection
```bash
# Make a GET request to test the OpenRouter connection
GET /api/ai/test-connection
```

### 2. Debug Environment Variables (Development only)
```bash
# Check if environment variables are loaded correctly
GET /api/debug/env
```

## Common Issues and Solutions

### 1. "401 User not found" Error
**Cause**: Invalid or expired OpenRouter API key
**Solution**: 
- Verify your API key is correct
- Check if the key has expired
- Ensure the key has proper permissions

### 2. "AI service not configured" Error
**Cause**: Missing OPENROUTER_API_KEY environment variable
**Solution**:
- Add the environment variable to your `.env.local` file
- Restart your development server
- Verify the variable is loaded correctly

### 3. Rate Limiting Errors
**Cause**: Too many requests to OpenRouter
**Solution**:
- Wait a few minutes before retrying
- Check your OpenRouter usage limits
- Consider upgrading your plan if needed

## Troubleshooting Steps

1. **Check Environment Variables**
   ```bash
   # Visit this endpoint in development
   GET /api/debug/env
   ```

2. **Test AI Connection**
   ```bash
   # Test the OpenRouter connection
   GET /api/ai/test-connection
   ```

3. **Verify API Key**
   - Go to [OpenRouter Dashboard](https://openrouter.ai/keys)
   - Check if your key is active
   - Verify the key has the correct permissions

4. **Check Console Logs**
   - Look for AI initialization messages
   - Check for connection test results
   - Monitor API call logs

## Model Configuration

The AI models are configured in `lib/ai/config.ts`. You can modify:
- Model parameters (temperature, max tokens)
- Performance settings
- Cost optimization settings

## Support

If you continue to experience issues:
1. Check the console logs for detailed error messages
2. Verify your OpenRouter account status
3. Test with a simple API call to OpenRouter directly
4. Check the OpenRouter status page for service issues
