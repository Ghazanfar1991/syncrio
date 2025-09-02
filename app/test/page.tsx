"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function TestPage() {
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const testDbConnection = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/test/db')
      const data = await response.json()
      setResult({ type: 'db', data })
    } catch (error) {
      setResult({ type: 'db', error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setIsLoading(false)
    }
  }

  const testRegistration = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/test/register', {
        method: 'POST'
      })
      const data = await response.json()
      setResult({ type: 'register', data })
    } catch (error) {
      setResult({ type: 'register', error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setIsLoading(false)
    }
  }

  const testRealRegistration = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'realtest@example.com',
          name: 'Real Test User',
          password: 'password123'
        })
      })
      const data = await response.json()
      setResult({ type: 'real_register', data })
    } catch (error) {
      setResult({ type: 'real_register', error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">ConversAI Social - Test Page</h1>
      
      <div className="space-y-4 mb-8">
        <Button onClick={testDbConnection} disabled={isLoading}>
          Test Database Connection
        </Button>
        
        <Button onClick={testRegistration} disabled={isLoading}>
          Test Registration (Simple)
        </Button>
        
        <Button onClick={testRealRegistration} disabled={isLoading}>
          Test Real Registration API
        </Button>
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Testing...</p>
        </div>
      )}

      {result && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Test Result ({result.type}):</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Quick Access</h3>
        <div className="space-y-2">
          <p className="text-sm text-blue-800">
            • <a href="http://localhost:5555" target="_blank" className="underline">Prisma Studio</a> - View database
          </p>
          <p className="text-sm text-blue-800">
            • <a href="/auth/signup" className="underline">Sign Up Page</a> - Test registration form
          </p>
          <p className="text-sm text-blue-800">
            • <a href="/dashboard" className="underline">Dashboard</a> - Main app (requires login)
          </p>
        </div>
      </div>
    </div>
  )
}
