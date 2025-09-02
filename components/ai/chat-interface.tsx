"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Send, Bot, User, Sparkles, Copy, Share, Calendar } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    platforms?: string[]
    hashtags?: string[]
    contentType?: string
  }
}

interface ChatInterfaceProps {
  onContentGenerated?: (content: string, metadata?: any) => void
}

export function ChatInterface({ onContentGenerated }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI content assistant. I can help you create engaging posts for Twitter, LinkedIn, Instagram, and YouTube. What kind of content would you like to create today?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Call real AI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content
        })
      })

      // Check if response is not ok (e.g., 401, 403, 500)
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to use the AI chat feature.')
        } else if (response.status === 403) {
          throw new Error('You do not have permission to use the AI chat feature.')
        } else {
          throw new Error(`Server error: ${response.status}. Please try again later.`)
        }
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format. Please make sure you are signed in.')
      }

      const data = await response.json()

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.data.content,
          timestamp: new Date(),
          metadata: data.data.metadata
        }

        setMessages(prev => [...prev, assistantMessage])

        if (onContentGenerated && data.data.metadata?.contentType === 'post') {
          onContentGenerated(data.data.content, data.data.metadata)
        }
      } else {
        throw new Error(data.error?.message || 'Failed to get AI response')
      }
    } catch (error) {
      console.error('Failed to get AI response:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error
          ? `I'm sorry, I encountered an error: ${error.message}. Please try again.`
          : "I'm sorry, I'm having trouble connecting to the AI service right now. Please try again later.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          AI Content Assistant
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-purple-600" />
                </div>
              )}
              
              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                <div
                  className={`rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  
                  {message.metadata && (
                    <div className="mt-2 space-y-2">
                      {message.metadata.platforms && (
                        <div className="flex flex-wrap gap-1">
                          {message.metadata.platforms.map((platform: string) => (
                            <Badge key={platform} variant="secondary" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {message.metadata.hashtags && (
                        <div className="flex flex-wrap gap-1">
                          {message.metadata.hashtags.map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {message.role === 'assistant' && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(message.content)}
                            className="h-6 px-2 text-xs"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onContentGenerated?.(message.content, message.metadata)}
                            className="h-6 px-2 text-xs"
                          >
                            <Share className="h-3 w-3 mr-1" />
                            Use
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 mt-1 px-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
              
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-purple-600" />
              </div>
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me to create content for your social media... (e.g., 'Create a LinkedIn post about AI trends')"
              className="flex-1 min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              size="sm"
              className="px-3"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("Create a professional LinkedIn post about the benefits of AI in business")}
              disabled={isLoading}
            >
              LinkedIn Post
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("Write a catchy Twitter thread about productivity tips")}
              disabled={isLoading}
            >
              Twitter Thread
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("Create an engaging Instagram caption for a tech startup")}
              disabled={isLoading}
            >
              Instagram Caption
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Mock AI response generator (replace with actual OpenRouter integration)
function generateMockResponse(userInput: string): { content: string; metadata?: any } {
  const input = userInput.toLowerCase()
  
  if (input.includes('linkedin')) {
    return {
      content: `🚀 The Future of AI in Business is Here

Artificial Intelligence isn't just a buzzword anymore—it's reshaping how we work, think, and innovate. Here's what every business leader should know:

✅ AI increases productivity by up to 40%
✅ Automates repetitive tasks, freeing up creative time
✅ Provides data-driven insights for better decisions
✅ Enhances customer experience through personalization

The companies that embrace AI today will lead tomorrow's market.

What's your experience with AI in your industry? Share your thoughts below! 👇

#AI #Business #Innovation #Productivity #FutureOfWork`,
      metadata: {
        platforms: ['LinkedIn'],
        hashtags: ['#AI', '#Business', '#Innovation', '#Productivity', '#FutureOfWork'],
        contentType: 'post'
      }
    }
  }
  
  if (input.includes('twitter')) {
    return {
      content: `🧵 5 Productivity Tips That Actually Work:

1/ Start with your hardest task when your energy is highest
2/ Use the 2-minute rule: if it takes less than 2 minutes, do it now
3/ Batch similar tasks together to minimize context switching
4/ Take breaks every 90 minutes to maintain focus
5/ End each day by planning tomorrow's top 3 priorities

Which tip resonates most with you? 👇

#Productivity #TimeManagement #WorkSmart`,
      metadata: {
        platforms: ['Twitter'],
        hashtags: ['#Productivity', '#TimeManagement', '#WorkSmart'],
        contentType: 'post'
      }
    }
  }
  
  if (input.includes('instagram')) {
    return {
      content: `Building the future, one line of code at a time 💻✨

There's something magical about turning ideas into reality through technology. Every bug fixed, every feature launched, every user smile—it all starts with a vision and the determination to make it happen.

What's your favorite part about the tech journey? Drop a 🚀 if you're building something amazing!

#TechStartup #Innovation #Coding #Entrepreneurship #BuildInPublic`,
      metadata: {
        platforms: ['Instagram'],
        hashtags: ['#TechStartup', '#Innovation', '#Coding', '#Entrepreneurship', '#BuildInPublic'],
        contentType: 'post'
      }
    }
  }
  
  return {
    content: `I can help you create content for any social media platform! Just tell me:

• Which platform (Twitter, LinkedIn, Instagram, YouTube)
• What topic or theme you want to cover
• The tone you prefer (professional, casual, inspiring, etc.)
• Any specific points you want to include

For example, try asking:
- "Create a LinkedIn post about remote work benefits"
- "Write a Twitter thread about startup lessons"
- "Make an Instagram caption for a product launch"

What would you like to create?`,
    metadata: {
      contentType: 'help'
    }
  }
}
