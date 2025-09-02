"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface ConfigItem {
  name: string
  status: 'configured' | 'missing' | 'optional'
  description: string
  required: boolean
}

export function ConfigurationStatus() {
  const configs: ConfigItem[] = [
    {
      name: 'Database',
      status: 'configured',
      description: 'SQLite database for local development',
      required: true
    },
    {
      name: 'NextAuth',
      status: 'configured',
      description: 'Authentication system',
      required: true
    },
    {
      name: 'Stripe',
      status: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'configured' : 'optional',
      description: 'Payment processing for subscriptions',
      required: false
    },
    {
      name: 'Twitter API',
      status: 'optional',
      description: 'Twitter/X social media integration',
      required: false
    },
    {
      name: 'LinkedIn API',
      status: 'optional',
      description: 'LinkedIn social media integration',
      required: false
    },
    {
      name: 'Instagram API',
      status: 'optional',
      description: 'Instagram social media integration',
      required: false
    },
    {
      name: 'OpenRouter AI',
      status: 'optional',
      description: 'AI content generation services',
      required: false
    }
  ]

  const getStatusIcon = (status: string, required: boolean) => {
    if (status === 'configured') {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    } else if (required) {
      return <XCircle className="h-4 w-4 text-red-600" />
    } else {
      return <AlertCircle className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: string, required: boolean) => {
    if (status === 'configured') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Configured</Badge>
    } else if (required) {
      return <Badge variant="destructive">Required</Badge>
    } else {
      return <Badge variant="secondary">Optional</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Configuration Status
        </CardTitle>
        <CardDescription>
          Overview of API keys and service configurations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {configs.map((config) => (
            <div key={config.name} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(config.status, config.required)}
                <div>
                  <h4 className="font-medium">{config.name}</h4>
                  <p className="text-sm text-gray-600">{config.description}</p>
                </div>
              </div>
              {getStatusBadge(config.status, config.required)}
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">📝 Configuration Notes</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Only Database and NextAuth are required for basic functionality</li>
            <li>• Social media integrations work independently - configure only what you need</li>
            <li>• Payment features require Stripe configuration</li>
            <li>• AI features require OpenRouter API key</li>
            <li>• The app gracefully handles missing optional configurations</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
