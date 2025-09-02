"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useTheme } from '@/components/providers/theme-provider'
import { AuroraLogoWithText } from '@/components/ui/aurora-logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  TestTube,
  TrendingUp,
  DollarSign,
  Zap,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  Home,
  Rocket,
  FileText,
  Calendar,
  ArrowLeft,
  Users,
  Server,
  Activity,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'

interface AIModel {
  id: string
  name: string
  provider: 'openrouter' | 'openai' | 'anthropic'
  model: string
  purpose: 'content_generation' | 'hashtag_generation' | 'image_generation' | 'chat'
  maxTokens: number
  temperature: number
  costPer1kTokens: number
  isActive: boolean
  isDefault: boolean
  performance: {
    accuracy: number
    speed: number
    reliability: number
  }
  createdAt: string
  updatedAt: string
}

interface ModelFormData {
  name: string
  provider: string
  model: string
  purpose: string
  maxTokens: number
  temperature: number
  costPer1kTokens: number
  isActive: boolean
  isDefault: boolean
  performance: {
    accuracy: number
    speed: number
    reliability: number
  }
}

export default function AppOwnerAIModelsPage() {
  const { data: session, status } = useSession()
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  const [collapsed, setCollapsed] = useState(false)
  const [models, setModels] = useState<AIModel[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingModel, setEditingModel] = useState<AIModel | null>(null)
  const [formData, setFormData] = useState<ModelFormData>({
    name: '',
    provider: 'openai',
    model: '',
    purpose: 'content_generation',
    maxTokens: 1000,
    temperature: 0.7,
    costPer1kTokens: 0,
    isActive: true,
    isDefault: false,
    performance: { accuracy: 80, speed: 80, reliability: 80 }
  })

  useEffect(() => {
    if (session) {
      fetchModels()
    }
  }, [session])

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session) {
    redirect('/auth/signin')
  }

  // Check if user is app owner (hardcoded for simplicity)
  const isAppOwner = session?.user?.email === 'ghazanfarnaseer91@gmail.com'

  if (!isAppOwner) {
    redirect('/dashboard')
  }

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/app-owner/ai-models')
      if (response.ok) {
        const data = await response.json()
        setModels(data.data.models)
      }
    } catch (error) {
      console.error('Failed to fetch models:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.name.trim() || !formData.model.trim()) {
      alert('Please fill in all required fields')
      return
    }
    
    try {
      const url = editingModel 
        ? `/api/app-owner/ai-models/${editingModel.id}`
        : '/api/app-owner/ai-models'
      
      const method = editingModel ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchModels()
        resetForm()
        setShowAddForm(false)
        setEditingModel(null)
        alert(editingModel ? 'Model updated successfully!' : 'Model added successfully!')
      } else {
        const errorData = await response.json()
        alert(`Failed to save model: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to save model:', error)
      alert('Failed to save model. Please try again.')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      provider: 'openai',
      model: '',
      purpose: 'content_generation',
      maxTokens: 1000,
      temperature: 0.7,
      costPer1kTokens: 0,
      isActive: true,
      isDefault: false,
      performance: { accuracy: 80, speed: 80, reliability: 80 }
    })
  }

  const editModel = (model: AIModel) => {
    setEditingModel(model)
    setFormData({
      name: model.name,
      provider: model.provider,
      model: model.model,
      purpose: model.purpose,
      maxTokens: model.maxTokens,
      temperature: model.temperature,
      costPer1kTokens: model.costPer1kTokens,
      isActive: model.isActive,
      isDefault: model.isDefault,
      performance: model.performance
    })
    setShowAddForm(true)
  }

  const testModel = async (modelId: string) => {
    try {
      const response = await fetch(`/api/app-owner/ai-models/${modelId}/test`, {
        method: 'POST'
      })
      
      if (response.ok) {
        alert('Model test successful!')
      } else {
        alert('Model test failed!')
      }
    } catch (error) {
      console.error('Model test failed:', error)
      alert('Model test failed!')
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai': return '🤖'
      case 'anthropic': return '🧠'
      case 'openrouter': return '🔗'
      default: return '📱'
    }
  }

  const getPurposeColor = (purpose: string) => {
    switch (purpose) {
      case 'content_generation': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'hashtag_generation': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'image_generation': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'chat': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 80) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Topbar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/40 dark:bg-black/40 border-b border-black/5 dark:border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <button onClick={() => setCollapsed(s => !s)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/6 transition">
            <Menu className="w-5 h-5" />
          </button>
          <AuroraLogoWithText size="md" showBadge={true} />

          <div className="ml-6 flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60 w-4 h-4" />
              <input className="w-full rounded-full pl-10 pr-4 py-2 bg-white/60 dark:bg-neutral-800/50 border border-black/5 dark:border-white/6 outline-none placeholder:opacity-60 shadow-sm" placeholder="Search AI models, providers, purposes..." />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/6 transition">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] px-1 rounded-full">3</span>
            </button>

            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/6 transition">
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/40 dark:bg-white/8 border border-black/5 dark:border-white/6">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-400 flex items-center justify-center text-white text-sm font-semibold">
                {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || 'A'}
              </div>
              <div className="text-sm">{session?.user?.name || session?.user?.email?.split('@')[0] || 'Admin'}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className={`${collapsed ? 'col-span-12 lg:col-span-1' : 'col-span-12 lg:col-span-2'} transition-all duration-300`}>
          <div className={`sticky top-20 space-y-4`}>
            <nav className={`rounded-3xl p-3 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm ${collapsed ? 'p-2' : 'p-3'}`}>
              {[
                {label:'Overview', icon:<Home className="w-5 h-5"/>, route: '/dashboard'},
                {label:'Create Post', icon:<Rocket className="w-5 h-5"/>, route: '/create'},
                {label:'Posts', icon:<FileText className="w-5 h-5"/>, route: '/posts'},
                {label:'Analytics', icon:<BarChart3 className="w-5 h-5"/>, route: '/analytics'},
                {label:'Calendar', icon:<Calendar className="w-5 h-5"/>, route: '/calendar'},
                {label:'Settings', icon:<Settings className="w-5 h-5"/>, route: '/settings'}
              ].map((it, idx)=> (
                <Link
                  key={idx}
                  href={it.route}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-white/6 transition text-sm ${collapsed ? 'justify-center px-2' : ''}`}
                  title={collapsed ? it.label : undefined}
                >
                  <div className="p-2 rounded-lg bg-white/50 dark:bg-neutral-800/40">{it.icon}</div>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{it.label}</span>
                    </>
                  )}
                </Link>
              ))}

              {/* App Owner Section */}
              <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/6">
                <div className="text-xs opacity-70 px-1 mb-3">App Owner</div>
                {[
                  {label:'Dashboard', icon:<Shield className="w-5 h-5"/>, route: '/app-owner'},
                  {label:'AI Models', icon:<Zap className="w-5 h-5"/>, route: '/app-owner/ai-models'},
                  {label:'User Management', icon:<Users className="w-5 h-5"/>, route: '/app-owner/users'},
                  {label:'System Health', icon:<Server className="w-5 h-5"/>, route: '/app-owner/health'},
                  {label:'Billing', icon:<DollarSign className="w-5 h-5"/>, route: '/app-owner/billing'}
                ].map((it, idx)=> (
                  <Link
                    key={idx}
                    href={it.route}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-white/6 transition text-sm ${collapsed ? 'justify-center px-2' : ''} ${it.route === '/app-owner/ai-models' ? 'bg-indigo-50 dark:bg-white/6' : ''}`}
                    title={collapsed ? it.label : undefined}
                  >
                    <div className="p-2 rounded-lg bg-white/50 dark:bg-neutral-800/40">{it.icon}</div>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{it.label}</span>
                        <div className="text-xs opacity-60">{it.route === '/app-owner/ai-models' ? 'Active' : ''}</div>
                      </>
                    )}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </aside>

        {/* Main content - FULL WIDTH */}
        <main className={`${collapsed ? 'col-span-12 lg:col-span-11' : 'col-span-12 lg:col-span-10'} space-y-6`}>
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/app-owner">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">AI Models Management</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Configure and manage AI models for different purposes
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  resetForm()
                  setEditingModel(null)
                  setShowAddForm(true)
                }}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Model
              </Button>
            </div>

                                      {/* Add/Edit Model Form */}
              {showAddForm && (
                <Card className="relative z-40 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
                 <CardHeader className="relative">
                   <div className="flex items-center justify-between">
                     <div>
                       <CardTitle className="text-xl">
                         {editingModel ? 'Edit AI Model' : 'Add New AI Model'}
                       </CardTitle>
                       <CardDescription>
                         Configure a new AI model for your application
                       </CardDescription>
                     </div>
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => {
                         setShowAddForm(false)
                         setEditingModel(null)
                         resetForm()
                       }}
                       className="h-8 w-8 p-0"
                     >
                       <XCircle className="h-4 w-4" />
                     </Button>
                   </div>
                 </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="name">Model Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Claude 3.5 Sonnet"
                          required
                          className="bg-white/60 dark:bg-neutral-800/50 border-blue-200 dark:border-blue-700"
                        />
                      </div>

                                                                     <div>
                          <Label htmlFor="provider">Provider</Label>
                          <Select
                            value={formData.provider}
                            onValueChange={(value) => setFormData({ ...formData, provider: value })}
                          >
                            <SelectTrigger className="bg-white/60 dark:bg-neutral-800/50 border-blue-200 dark:border-blue-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-50">
                              <SelectItem value="openai">OpenAI</SelectItem>
                              <SelectItem value="anthropic">Anthropic</SelectItem>
                              <SelectItem value="openrouter">OpenRouter</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                                             <div>
                         <Label htmlFor="model">Model Identifier</Label>
                         <Input
                           id="model"
                           value={formData.model}
                           onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                           placeholder="e.g., anthropic/claude-3.5-sonnet"
                           required
                           className="bg-white/60 dark:bg-neutral-800/50 border-blue-200 dark:border-blue-700"
                         />
                         <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                           Format: provider/model-name (e.g., openai/gpt-4, anthropic/claude-3.5-sonnet)
                         </p>
                       </div>

                                                                     <div>
                          <Label htmlFor="purpose">Purpose</Label>
                          <Select
                            value={formData.purpose}
                            onValueChange={(value) => setFormData({ ...formData, purpose: value })}
                          >
                            <SelectTrigger className="bg-white/60 dark:bg-neutral-800/50 border-blue-200 dark:border-blue-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-50">
                              <SelectItem value="content_generation">Content Generation</SelectItem>
                              <SelectItem value="hashtag_generation">Hashtag Generation</SelectItem>
                              <SelectItem value="image_generation">Image Generation</SelectItem>
                              <SelectItem value="chat">Chat</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                      <div>
                        <Label htmlFor="maxTokens">Max Tokens</Label>
                        <Input
                          id="maxTokens"
                          type="number"
                          value={formData.maxTokens}
                          onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                          min="1"
                          max="4000"
                          className="bg-white/60 dark:bg-neutral-800/50 border-blue-200 dark:border-blue-700"
                        />
                      </div>

                      <div>
                        <Label htmlFor="temperature">Temperature</Label>
                        <Input
                          id="temperature"
                          type="number"
                          step="0.1"
                          value={formData.temperature}
                          onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                          min="0"
                          max="2"
                          className="bg-white/60 dark:bg-neutral-800/50 border-blue-200 dark:border-blue-700"
                        />
                      </div>

                      <div>
                        <Label htmlFor="costPer1kTokens">Cost per 1K Tokens ($)</Label>
                        <Input
                          id="costPer1kTokens"
                          type="number"
                          step="0.001"
                          value={formData.costPer1kTokens}
                          onChange={(e) => setFormData({ ...formData, costPer1kTokens: parseFloat(e.target.value) })}
                          min="0"
                          className="bg-white/60 dark:bg-neutral-800/50 border-blue-200 dark:border-blue-700"
                        />
                      </div>
                    </div>

                                         {/* Performance Settings */}
                     <div>
                       <Label className="text-base font-medium">Performance Metrics</Label>
                       <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                         Rate the model's performance on a scale of 0-100
                       </p>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                         <div>
                           <Label htmlFor="accuracy">Accuracy (0-100)</Label>
                           <Input
                             id="accuracy"
                             type="number"
                             value={formData.performance.accuracy}
                             onChange={(e) => setFormData({
                               ...formData,
                               performance: { ...formData.performance, accuracy: parseInt(e.target.value) || 0 }
                             })}
                             min="0"
                             max="100"
                             className="bg-white/60 dark:bg-neutral-800/50 border-blue-200 dark:border-blue-700"
                           />
                         </div>
                         <div>
                           <Label htmlFor="speed">Speed (0-100)</Label>
                           <Input
                             id="speed"
                             type="number"
                             value={formData.performance.speed}
                             onChange={(e) => setFormData({
                               ...formData,
                               performance: { ...formData.performance, speed: parseInt(e.target.value) || 0 }
                             })}
                             min="0"
                             max="100"
                             className="bg-white/60 dark:bg-neutral-800/50 border-blue-200 dark:border-blue-700"
                           />
                         </div>
                         <div>
                           <Label htmlFor="reliability">Reliability (0-100)</Label>
                           <Input
                             id="reliability"
                             type="number"
                             value={formData.performance.reliability}
                             onChange={(e) => setFormData({
                               ...formData,
                               performance: { ...formData.performance, reliability: parseInt(e.target.value) || 0 }
                             })}
                             min="0"
                             max="100"
                             className="bg-white/60 dark:bg-neutral-800/50 border-blue-200 dark:border-blue-700"
                           />
                         </div>
                       </div>
                     </div>

                                         {/* Toggles */}
                     <div className="bg-white/40 dark:bg-neutral-800/40 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                       <Label className="text-base font-medium mb-3 block">Model Settings</Label>
                       <div className="flex items-center gap-8">
                         <div className="flex items-center space-x-3">
                           <Switch
                             id="isActive"
                             checked={formData.isActive}
                             onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                           />
                           <Label htmlFor="isActive" className="text-sm font-medium">
                             Active Model
                           </Label>
                         </div>
                         <div className="flex items-center space-x-3">
                           <Switch
                             id="isDefault"
                             checked={formData.isDefault}
                             onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                           />
                           <Label htmlFor="isDefault" className="text-sm font-medium">
                             Default for Purpose
                           </Label>
                         </div>
                       </div>
                     </div>

                                         {/* Form Actions */}
                     <div className="flex items-center gap-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                       <Button type="submit" className="bg-blue-600 hover:bg-blue-700 px-6">
                         {editingModel ? 'Update Model' : 'Add Model'}
                       </Button>
                       <Button
                         type="button"
                         variant="outline"
                         onClick={() => {
                           setShowAddForm(false)
                           setEditingModel(null)
                           resetForm()
                         }}
                         className="px-6"
                       >
                         Cancel
                       </Button>
                     </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Models Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading AI models...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {models.map((model) => (
                  <Card key={model.id} className="relative hover:shadow-lg transition-all duration-300 border-0 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{getProviderIcon(model.provider)}</div>
                          <div>
                            <CardTitle className="text-lg">{model.name}</CardTitle>
                            <CardDescription className="text-sm">{model.model}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {model.isDefault && (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              Default
                            </Badge>
                          )}
                          <Badge
                            variant={model.isActive ? "default" : "secondary"}
                            className={`text-xs ${model.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'}`}
                          >
                            {model.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                      
                      <Badge className={`${getPurposeColor(model.purpose)} text-xs`}>
                        {model.purpose.replace('_', ' ')}
                      </Badge>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-4">
                        {/* Model Settings */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Max Tokens:</span>
                            <span className="ml-2 font-medium">{model.maxTokens}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Temperature:</span>
                            <span className="ml-2 font-medium">{model.temperature}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Cost/1K:</span>
                            <span className="ml-2 font-medium">${model.costPer1kTokens.toFixed(4)}</span>
                          </div>
                        </div>

                        {/* Performance Metrics */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Performance</Label>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Accuracy</span>
                              <span className={`text-sm font-medium ${getPerformanceColor(model.performance.accuracy)}`}>
                                {model.performance.accuracy}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Speed</span>
                              <span className={`text-sm font-medium ${getPerformanceColor(model.performance.speed)}`}>
                                {model.performance.speed}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Reliability</span>
                              <span className={`text-sm font-medium ${getPerformanceColor(model.performance.reliability)}`}>
                                {model.performance.reliability}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => editModel(model)}
                            className="flex-1 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testModel(model.id)}
                            className="flex-1 hover:bg-green-50 dark:hover:bg-green-900/20"
                          >
                            <TestTube className="w-4 h-4 mr-2" />
                            Test
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!loading && models.length === 0 && (
              <div className="text-center py-12">
                <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No AI models configured
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Get started by adding your first AI model configuration.
                </p>
                <Button onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Model
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
