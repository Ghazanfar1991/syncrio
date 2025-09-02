// AI Model Configuration System
export interface AIModelConfig {
  id: string
  name: string
  provider: 'openrouter' | 'openai' | 'anthropic' | 'huggingface'
  model: string
  purpose: 'content_generation' | 'content_generation_free' | 'hashtag_generation' | 'image_generation' | 'chat'
  maxTokens: number
  temperature: number
  costPer1kTokens: number
  isActive: boolean
  isDefault: boolean
  performance: {
    accuracy: number // 0-100
    speed: number // 0-100
    reliability: number // 0-100
  }
  createdAt: Date
  updatedAt: Date
}

export interface AIModelUsage {
  id: string
  modelId: string
  userId: string
  tokensUsed: number
  cost: number
  purpose: string
  success: boolean
  responseTime: number // milliseconds
  createdAt: Date
}

export interface AIModelPerformance {
  modelId: string
  totalRequests: number
  successfulRequests: number
  totalTokens: number
  totalCost: number
  averageResponseTime: number
  lastUsed: Date
}

export class AIModelManager {
  private static models: Map<string, AIModelConfig> = new Map()
  private static defaultModels: Map<string, string> = new Map()

  /**
   * Initialize the AI model manager with default configurations
   */
  static initialize() {
    console.log('🤖 Initializing AI Model Manager...')
    
    // Set default models (use the model IDs, not the model names)
    this.defaultModels.set('content_generation', 'qwen-qwen3-4b-free-content')
    this.defaultModels.set('hashtag_generation', 'qwen-qwen3-4b-free-hashtags')
    this.defaultModels.set('image_generation', 'gemini-2-5-flash-image') // New OpenRouter default
    this.defaultModels.set('chat', 'qwen-qwen3-4b-free-chat')

    console.log('📝 Default models mapping:', Object.fromEntries(this.defaultModels))

    // Add default model configurations
    const defaultConfigs: AIModelConfig[] = [
      {
        id: 'qwen-qwen3-4b-free-content',
        name: 'Qwen 3.5 4B (Free) - Content Generation',
        provider: 'openrouter',
        model: 'qwen/qwen3-4b:free',
        purpose: 'content_generation',
        maxTokens: 800,
        temperature: 0.7,
        costPer1kTokens: 0.003,
        isActive: true,
        isDefault: true,
        performance: { accuracy: 95, speed: 85, reliability: 98 },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'qwen-qwen3-4b-free-hashtags',
        name: 'Qwen 3.5 4B (Free) - Hashtag Generation',
        provider: 'openrouter',
        model: 'qwen/qwen3-4b:free',
        purpose: 'hashtag_generation',
        maxTokens: 200,
        temperature: 0.3,
        costPer1kTokens: 0.01,
        isActive: true,
        isDefault: true,
        performance: { accuracy: 90, speed: 90, reliability: 95 },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'qwen-qwen3-4b-free-chat',
        name: 'Qwen 3.5 4B (Free) - Chat',
        provider: 'openrouter',
        model: 'qwen/qwen3-4b:free',
        purpose: 'chat',
        maxTokens: 800,
        temperature: 0.7,
        costPer1kTokens: 0.003,
        isActive: true,
        isDefault: true,
        performance: { accuracy: 90, speed: 85, reliability: 95 },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Additional fallback models for content generation
      {
        id: 'llama-3-8b-free-content',
        name: 'Llama 3 8B (Free) - Content Generation Fallback',
        provider: 'openrouter',
        model: 'meta-llama/llama-3-8b-instruct:free',
        purpose: 'content_generation',
        maxTokens: 800,
        temperature: 0.8,
        costPer1kTokens: 0.0,
        isActive: true,
        isDefault: false, // Fallback model
        performance: { accuracy: 80, speed: 85, reliability: 90 },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'mistral-7b-free-content',
        name: 'Mistral 7B (Free) - Content Generation Fallback',
        provider: 'openrouter',
        model: 'mistralai/mistral-7b-instruct:free',
        purpose: 'content_generation',
        maxTokens: 800,
        temperature: 0.8,
        costPer1kTokens: 0.0,
        isActive: true,
        isDefault: false, // Fallback model
        performance: { accuracy: 78, speed: 88, reliability: 85 },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'gemini-2-5-flash-image',
        name: 'Google Gemini 2.5 Flash Image Preview (Free) - Primary',
        provider: 'openrouter',
        model: 'google/gemini-2.5-flash-image-preview:free',
        purpose: 'image_generation',
        maxTokens: 1000, // For chat completion API
        temperature: 0.7,
        costPer1kTokens: 0.0, // Free model
        isActive: true,
        isDefault: true,
        performance: { accuracy: 90, speed: 95, reliability: 95 },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'flux-1-schnell-image',
        name: 'FLUX.1 Schnell - Hugging Face Fallback',
        provider: 'huggingface',
        model: 'black-forest-labs/FLUX.1-schnell',
        purpose: 'image_generation',
        maxTokens: 0, // Not applicable for image generation
        temperature: 0.7,
        costPer1kTokens: 0.04, // Per image
        isActive: true,
        isDefault: false, // Fallback model
        performance: { accuracy: 95, speed: 80, reliability: 90 },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    defaultConfigs.forEach(config => {
      this.models.set(config.id, config)
      console.log(`✅ Added model: ${config.id} (${config.name}) for purpose: ${config.purpose}`)
    })
    
    console.log('🎯 Available models by purpose:')
    const purposes = Array.from(new Set(defaultConfigs.map(c => c.purpose)))
    purposes.forEach(purpose => {
      const modelsForPurpose = Array.from(this.models.values()).filter(m => m.purpose === purpose)
      console.log(`  ${purpose}: ${modelsForPurpose.map(m => m.id).join(', ')}`)
    })
    
    console.log('✅ AI Model Manager initialized successfully')
  }

  /**
   * Get the best model for a specific purpose
   */
  static async getModelForPurpose(purpose: string): Promise<AIModelConfig> {
    console.log(`🔍 Getting model for purpose: ${purpose}`)
    console.log(`📋 Available default models:`, Object.fromEntries(this.defaultModels))
    console.log(`📚 Total models in registry:`, this.models.size)
    
    // First try to get the default model for the purpose
    const defaultModelId = this.defaultModels.get(purpose)
    console.log(`🎯 Default model ID for ${purpose}:`, defaultModelId)
    
    if (defaultModelId) {
      const defaultModel = this.models.get(defaultModelId)
      console.log(`📦 Found default model:`, defaultModel ? `${defaultModel.id} (active: ${defaultModel.isActive})` : 'not found')
      
      if (defaultModel && defaultModel.isActive) {
        console.log(`✅ Using default model: ${defaultModel.id}`)
        return defaultModel
      }
    }

    // Fallback to any active model for the purpose
    const availableModels = Array.from(this.models.values())
      .filter(model => model.purpose === purpose && model.isActive)
      .sort((a, b) => {
        // Sort by performance score (accuracy + speed + reliability)
        const scoreA = a.performance.accuracy + a.performance.speed + a.performance.reliability
        const scoreB = b.performance.accuracy + b.performance.speed + b.performance.reliability
        return scoreB - scoreA
      })

    console.log(`🔄 Available fallback models for ${purpose}:`, availableModels.map(m => `${m.id} (${m.name})`))

    if (availableModels.length > 0) {
      console.log(`✅ Using fallback model: ${availableModels[0].id}`)
      return availableModels[0]
    }

    console.error(`❌ No active models available for purpose: ${purpose}`)
    console.error(`📊 Model registry contents:`, Array.from(this.models.entries()).map(([id, model]) => ({ id, purpose: model.purpose, isActive: model.isActive })))
    
    throw new Error(`No active models available for purpose: ${purpose}`)
  }

  /**
   * Get a free model for a specific purpose (fallback when credits are exhausted)
   */
  static async getFreeModelForPurpose(purpose: string): Promise<AIModelConfig> {
    const freeModelId = this.defaultModels.get(`${purpose}_free`)
    if (!freeModelId) {
      // Fallback to the regular purpose model
      return this.getModelForPurpose(purpose)
    }
    
    const freeModel = this.models.get(freeModelId)
    if (freeModel && freeModel.isActive) {
      return freeModel
    }
    
    // If free model not found, fallback to regular model
      return this.getModelForPurpose(purpose)
  }

  /**
   * Get all models for a specific purpose
   */
  static async getModelsForPurpose(purpose: string): Promise<AIModelConfig[]> {
    return Array.from(this.models.values())
      .filter(model => model.purpose === purpose)
      .sort((a, b) => {
        const scoreA = a.performance.accuracy + a.performance.speed + a.performance.reliability
        const scoreB = b.performance.accuracy + b.performance.speed + b.performance.reliability
        return scoreB - scoreA
      })
  }

  /**
   * Update model configuration
   */
  static async updateModelConfig(config: Partial<AIModelConfig>): Promise<void> {
    if (!config.id) {
      throw new Error('Model ID is required for updates')
    }

    const existingModel = this.models.get(config.id)
    if (!existingModel) {
      throw new Error(`Model with ID ${config.id} not found`)
    }

    const updatedModel: AIModelConfig = {
      ...existingModel,
      ...config,
      updatedAt: new Date()
    }

    this.models.set(config.id, updatedModel)

    // If this is now the default model, update the default mapping
    if (config.isDefault) {
      this.defaultModels.set(updatedModel.purpose, updatedModel.id)
      
      // Remove default flag from other models of the same purpose
      Array.from(this.models.values())
        .filter(model => model.purpose === updatedModel.purpose && model.id !== updatedModel.id)
        .forEach(model => {
          model.isDefault = false
          this.models.set(model.id, model)
        })
    }
  }

  /**
   * Test a model to ensure it's working
   */
  static async testModel(modelId: string): Promise<boolean> {
    try {
      const model = this.models.get(modelId)
      if (!model) {
        throw new Error(`Model ${modelId} not found`)
      }

      // Simple test prompt
      const testPrompt = 'Generate a simple test response'
      
      // This would actually call the AI service
      // For now, we'll simulate a successful test
      await new Promise(resolve => setTimeout(resolve, 100))
      
      return true
    } catch (error) {
      console.error(`Model test failed for ${modelId}:`, error)
      return false
    }
  }

  /**
   * Get model performance metrics
   */
  static async getModelPerformance(modelId: string): Promise<AIModelPerformance | null> {
    // This would fetch from database in a real implementation
    // For now, return mock data
    return {
      modelId,
      totalRequests: 1000,
      successfulRequests: 950,
      totalTokens: 50000,
      totalCost: 0.50,
      averageResponseTime: 2500,
      lastUsed: new Date()
    }
  }

  /**
   * Get cost optimization recommendations
   */
  static async getCostOptimizationRecommendations(): Promise<{
    currentCost: number
    potentialSavings: number
    recommendations: string[]
  }> {
    const activeModels = Array.from(this.models.values()).filter(m => m.isActive)
    const currentCost = activeModels.reduce((sum, model) => sum + model.costPer1kTokens, 0)
    
    const recommendations: string[] = []
    let potentialSavings = 0

    // Check for expensive models that could be replaced
    const expensiveModels = activeModels.filter(m => m.costPer1kTokens > 0.01)
    expensiveModels.forEach(model => {
      const cheaperAlternatives = activeModels.filter(m => 
        m.purpose === model.purpose && 
        m.costPer1kTokens < model.costPer1kTokens &&
        m.performance.accuracy >= model.performance.accuracy * 0.9
      )
      
      if (cheaperAlternatives.length > 0) {
        const bestAlternative = cheaperAlternatives[0]
        const savings = model.costPer1kTokens - bestAlternative.costPer1kTokens
        potentialSavings += savings
        recommendations.push(`Consider replacing ${model.name} with ${bestAlternative.name} for ${model.purpose} (potential savings: $${savings.toFixed(4)}/1k tokens)`)
      }
    })

    return {
      currentCost,
      potentialSavings,
      recommendations
    }
  }

  /**
   * Get all models
   */
  static async getAllModels(): Promise<AIModelConfig[]> {
    return Array.from(this.models.values())
  }

  /**
   * Add a new model
   */
  static async addModel(config: Omit<AIModelConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `model_${Date.now()}`
    const newModel: AIModelConfig = {
      ...config,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.models.set(id, newModel)
    return id
  }

  /**
   * Remove a model
   */
  static async removeModel(modelId: string): Promise<void> {
    const model = this.models.get(modelId)
    if (!model) {
      throw new Error(`Model ${modelId} not found`)
    }

    if (model.isDefault) {
      throw new Error('Cannot remove default model. Set another model as default first.')
    }

    this.models.delete(modelId)
  }
}

// Initialize the manager when the module is loaded
AIModelManager.initialize()
