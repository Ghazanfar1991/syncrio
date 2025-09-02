'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Image, CheckCircle, AlertCircle, Zap } from 'lucide-react'
import { AIModelManager } from '@/lib/ai/config'

interface ModelStatus {
  id: string
  name: string
  provider: 'openrouter' | 'huggingface'
  model: string
  isDefault: boolean
  isActive: boolean
  status: 'available' | 'testing' | 'error'
}

export function ImageGenerationStatus() {
  const [models, setModels] = useState<ModelStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)

  const loadModels = async () => {
    try {
      setLoading(true)
      const imageModels = await AIModelManager.getModelsForPurpose('image_generation')
      
      const modelStatuses: ModelStatus[] = imageModels.map(model => ({
        id: model.id,
        name: model.name,
        provider: model.provider as 'openrouter' | 'huggingface',
        model: model.model,
        isDefault: model.isDefault,
        isActive: model.isActive,
        status: 'available'
      }))

      setModels(modelStatuses)
    } catch (error) {
      console.error('Failed to load image generation models:', error)
    } finally {
      setLoading(false)
    }
  }

  const testModel = async (modelId: string) => {
    setTesting(modelId)
    try {
      // Test the model with a simple prompt
      const response = await fetch('/api/ai/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'A simple test image of a blue circle',
          platforms: ['TWITTER']
        })
      })

      const result = await response.json()
      
      setModels(prev => prev.map(model => 
        model.id === modelId 
          ? { ...model, status: result.success ? 'available' : 'error' }
          : model
      ))
    } catch (error) {
      setModels(prev => prev.map(model => 
        model.id === modelId 
          ? { ...model, status: 'error' }
          : model
      ))
    } finally {
      setTesting(null)
    }
  }

  useEffect(() => {
    loadModels()
  }, [])

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openrouter':
        return '🔗'
      case 'huggingface':
        return '🤗'
      default:
        return '🤖'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Image Generation Models
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading models...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Image Generation Models
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadModels}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {models.map((model) => (
          <div
            key={model.id}
            className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">{getProviderIcon(model.provider)}</div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{model.name}</h4>
                  {model.isDefault && (
                    <Badge variant="default" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Default
                    </Badge>
                  )}
                  {!model.isActive && (
                    <Badge variant="secondary" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {model.provider} • {model.model}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {getStatusIcon(model.status)}
                <span className="text-sm capitalize">{model.status}</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => testModel(model.id)}
                disabled={testing === model.id || !model.isActive}
              >
                {testing === model.id ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Test'
                )}
              </Button>
            </div>
          </div>
        ))}
        
        {models.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No image generation models configured
          </div>
        )}
      </CardContent>
    </Card>
  )
}
