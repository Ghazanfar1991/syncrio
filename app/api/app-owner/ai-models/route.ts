// App Owner AI Models Management API
import { NextRequest } from 'next/server'
import { withErrorHandling } from '@/lib/middleware'
import { withAppOwnerAuth } from '@/lib/middleware/app-owner-auth'
import { apiSuccess, apiError } from '@/lib/api-utils'
import { AIModelManager } from '@/lib/ai/config'

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAppOwnerAuth(async (req: NextRequest, user: any) => {
      try {
        const models = await AIModelManager.getAllModels()
        return apiSuccess({ models })
      } catch (error) {
        console.error('Failed to fetch AI models:', error)
        return apiError('Failed to fetch AI models', 500)
      }
    })
  )(req)
}

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAppOwnerAuth(async (req: NextRequest, user: any) => {
      try {
        const body = await req.json()
        const { name, provider, model, purpose, maxTokens, temperature, costPer1kTokens, isActive, isDefault, performance } = body

        // Validate required fields
        if (!name || !provider || !model || !purpose) {
          return apiError('Missing required fields: name, provider, model, purpose', 400)
        }

        // Validate purpose
        const validPurposes = ['content_generation', 'hashtag_generation', 'image_generation', 'chat']
        if (!validPurposes.includes(purpose)) {
          return apiError(`Invalid purpose. Must be one of: ${validPurposes.join(', ')}`, 400)
        }

        // Validate provider
        const validProviders = ['openrouter', 'openai', 'anthropic']
        if (!validProviders.includes(provider)) {
          return apiError(`Invalid provider. Must be one of: ${validProviders.join(', ')}`, 400)
        }

        // Add the new model
        const modelId = await AIModelManager.addModel({
          name,
          provider,
          model,
          purpose,
          maxTokens: maxTokens || 1000,
          temperature: temperature || 0.7,
          costPer1kTokens: costPer1kTokens || 0,
          isActive: isActive !== false,
          isDefault: isDefault || false,
          performance: performance || { accuracy: 80, speed: 80, reliability: 80 }
        })

        const newModel = await AIModelManager.getAllModels()
        const addedModel = newModel.find(m => m.id === modelId)

        return apiSuccess({ 
          model: addedModel,
          message: 'AI model added successfully'
        }, 201)
      } catch (error) {
        console.error('Failed to add AI model:', error)
        return apiError('Failed to add AI model', 500)
      }
    })
  )(req)
}
