"use client"

import React from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

import { Sidebar } from '@/components/layout/sidebar'
import { TopRightControls } from '@/components/layout/top-right-controls'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Zap, CheckCircle, Settings, Activity } from 'lucide-react'

export default function AppOwnerModelsPage() {
  const { data: session, status } = useSession()

  // Sidebar state synced with other pages
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return JSON.parse(localStorage.getItem('sidebar:collapsed') ?? 'false')
    } catch {
      return false
    }
  })

  const handleToggleCollapse = React.useCallback<React.Dispatch<React.SetStateAction<boolean>>>(
    (next) => {
      setCollapsed((prev) => {
        const value = typeof next === 'function' ? (next as (p: boolean) => boolean)(prev) : next
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('sidebar:collapsed', JSON.stringify(value))
            window.dispatchEvent(new CustomEvent('sidebar:collapsed-change', { detail: value }))
          }
        } catch {}
        return value
      })
    },
    []
  )

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const onCustom = (e: Event) => {
      const ce = e as CustomEvent<boolean>
      if (typeof ce.detail === 'boolean') setCollapsed(ce.detail)
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'sidebar:collapsed' && e.newValue != null) {
        try {
          setCollapsed(JSON.parse(e.newValue))
        } catch {}
      }
    }
    window.addEventListener('sidebar:collapsed-change', onCustom as EventListener)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('sidebar:collapsed-change', onCustom as EventListener)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // Data state for dynamic model registry
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [providers, setProviders] = React.useState<any[]>([])
  const [models, setModels] = React.useState<any[]>([])
  const [assignments, setAssignments] = React.useState<any[]>([])

  const [showAddProvider, setShowAddProvider] = React.useState(false)
  const [showAddModel, setShowAddModel] = React.useState(false)

  const [providerForm, setProviderForm] = React.useState({
    name: '',
    type: 'OPENAI',
    baseUrl: '',
    apiKeyEnvVar: '',
    isActive: true,
  })

  const [modelForm, setModelForm] = React.useState({
    providerId: '',
    name: '',
    modelId: '',
    modality: 'TEXT',
    systemPrompt: '',
    defaultOptions: '', // JSON as string
    capabilities: '', // JSON as string
    isActive: true,
  })

  const fetchRegistry = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/app-owner/models', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to load models: ${res.status}`)
      const data = await res.json()
      setProviders(data.providers ?? [])
      setModels(data.models ?? [])
      setAssignments(data.assignments ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load')
    } finally {
      setIsLoading(false)
    }
  }

  const addProvider = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/app-owner/models', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'provider', ...providerForm }),
      })
      if (!res.ok) throw new Error(await res.text())
      setProviderForm({ name: '', type: 'OPENAI', baseUrl: '', apiKeyEnvVar: '', isActive: true })
      setShowAddProvider(false)
      await fetchRegistry()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to add provider')
    } finally {
      setIsLoading(false)
    }
  }

  const addModel = async () => {
    try {
      setIsLoading(true)
      const payload: any = { action: 'model', ...modelForm }
      if (modelForm.defaultOptions) {
        try { payload.defaultOptions = JSON.parse(modelForm.defaultOptions) } catch {}
      }
      if (modelForm.capabilities) {
        try { payload.capabilities = JSON.parse(modelForm.capabilities) } catch {}
      }
      const res = await fetch('/api/app-owner/models', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      setModelForm({ providerId: '', name: '', modelId: '', modality: 'TEXT', systemPrompt: '', defaultOptions: '', capabilities: '', isActive: true })
      setShowAddModel(false)
      await fetchRegistry()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to add model')
    } finally {
      setIsLoading(false)
    }
  }

  const assignPrimary = async (feature: string, modelId: string) => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/app-owner/models', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'assign', feature, modelId, priority: 0 }),
      })
      if (!res.ok) throw new Error(await res.text())
      await fetchRegistry()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to assign model')
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    // Only fetch when authenticated and authorized
    const isAppOwner = session?.user?.email === 'ghazanfarnaseer91@gmail.com'
    if (status === 'authenticated' && isAppOwner) {
      fetchRegistry()
    }
  }, [status, session?.user?.email])

  // After declaring all hooks, handle gating to keep hook order stable
  const isAppOwner = session?.user?.email === 'ghazanfarnaseer91@gmail.com'
  if (status === 'loading') return <div>Loading...</div>
  if (!session) redirect('/auth/signin')
  if (!isAppOwner) redirect('/dashboard')

  const activeModels = models.filter((m) => m.isActive).length
  const totalModels = models.length
  const uptime = 98.5

  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar collapsed={collapsed} onToggleCollapse={handleToggleCollapse} showPlanInfo={true} />

      <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 ${collapsed ? 'ml-0 md:ml-16' : 'ml-0 md:ml-64'} transition-all duration-300`}>
        <main className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold">AI Models Management</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Configure and monitor platform AI models</p>
            </div>
            <div className="flex items-center gap-4">
              <TopRightControls unreadNotificationsCount={3} />
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Model health, counts, and recent updates</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Refresh
              </Button>
              <Button className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </div>
          </div>

          {/* KPI Grid (dashboard styling) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Active Models</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{activeModels}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-blue-600 dark:text-blue-400">{Math.round((activeModels / totalModels) * 100)}% in use</span>
                    <Progress value={(activeModels / totalModels) * 100} className="flex-1 h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Models</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{totalModels}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                    <span>Configured and available</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Uptime</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{uptime}%</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-4">
                  <Progress value={uptime} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Model Registry */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Models</CardTitle>
                  <CardDescription>Available AI models configured for the app</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowAddProvider((v) => !v)}>Add Provider</Button>
                  <Button onClick={() => setShowAddModel((v) => !v)}>Add Model</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 rounded-lg border border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">{String(error)}</div>
              )}

              {showAddProvider && (
                <div className="mb-6 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input className="px-3 py-2 rounded-md bg-transparent border border-gray-300 dark:border-gray-700" placeholder="Provider name" value={providerForm.name} onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })} />
                    <select className="px-3 py-2 rounded-md bg-transparent border border-gray-300 dark:border-gray-700" value={providerForm.type} onChange={(e) => setProviderForm({ ...providerForm, type: e.target.value })}>
                      {['OPENAI','ANTHROPIC','GOOGLE','STABILITY','OPENROUTER','OLLAMA','CUSTOM'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <input className="px-3 py-2 rounded-md bg-transparent border border-gray-300 dark:border-gray-700" placeholder="Base URL (optional)" value={providerForm.baseUrl} onChange={(e) => setProviderForm({ ...providerForm, baseUrl: e.target.value })} />
                    <input className="px-3 py-2 rounded-md bg-transparent border border-gray-300 dark:border-gray-700" placeholder="API key env var (e.g., OPENAI_API_KEY)" value={providerForm.apiKeyEnvVar} onChange={(e) => setProviderForm({ ...providerForm, apiKeyEnvVar: e.target.value })} />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <label className="text-sm flex items-center gap-2">
                      <input type="checkbox" checked={providerForm.isActive} onChange={(e) => setProviderForm({ ...providerForm, isActive: e.target.checked })} /> Active
                    </label>
                    <Button size="sm" onClick={addProvider} disabled={isLoading}>Save Provider</Button>
                  </div>
                </div>
              )}

              {showAddModel && (
                <div className="mb-6 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select className="px-3 py-2 rounded-md bg-transparent border border-gray-300 dark:border-gray-700" value={modelForm.providerId} onChange={(e) => setModelForm({ ...modelForm, providerId: e.target.value })}>
                      <option value="">Select provider</option>
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                      ))}
                    </select>
                    <input className="px-3 py-2 rounded-md bg-transparent border border-gray-300 dark:border-gray-700" placeholder="Display name" value={modelForm.name} onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })} />
                    <input className="px-3 py-2 rounded-md bg-transparent border border-gray-300 dark:border-gray-700" placeholder="Model ID (e.g., gpt-4o)" value={modelForm.modelId} onChange={(e) => setModelForm({ ...modelForm, modelId: e.target.value })} />
                    <select className="px-3 py-2 rounded-md bg-transparent border border-gray-300 dark:border-gray-700" value={modelForm.modality} onChange={(e) => setModelForm({ ...modelForm, modality: e.target.value })}>
                      {['TEXT','IMAGE','VIDEO','AUDIO','MULTIMODAL'].map((m) => (<option key={m} value={m}>{m}</option>))}
                    </select>
                    <textarea className="px-3 py-2 rounded-md bg-transparent border border-gray-300 dark:border-gray-700 md:col-span-2" placeholder="System prompt (optional)" value={modelForm.systemPrompt} onChange={(e) => setModelForm({ ...modelForm, systemPrompt: e.target.value })} />
                    <textarea className="px-3 py-2 rounded-md bg-transparent border border-gray-300 dark:border-gray-700" placeholder='Default options JSON (e.g., {"temperature":0.7})' value={modelForm.defaultOptions} onChange={(e) => setModelForm({ ...modelForm, defaultOptions: e.target.value })} />
                    <textarea className="px-3 py-2 rounded-md bg-transparent border border-gray-300 dark:border-gray-700" placeholder='Capabilities JSON (e.g., {"styles":["cartoon","photo"]})' value={modelForm.capabilities} onChange={(e) => setModelForm({ ...modelForm, capabilities: e.target.value })} />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <label className="text-sm flex items-center gap-2">
                      <input type="checkbox" checked={modelForm.isActive} onChange={(e) => setModelForm({ ...modelForm, isActive: e.target.checked })} /> Active
                    </label>
                    <Button size="sm" onClick={addModel} disabled={isLoading || !modelForm.providerId || !modelForm.name || !modelForm.modelId}>Save Model</Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {models.map((m) => (
                  <div key={m.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{m.name}</div>
                      <Badge variant="outline" className={m.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                        {m.modality}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">{m.modelId}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Assign defaults per feature */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Default Models</CardTitle>
              <CardDescription>Select primary model per feature (fallbacks optional)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {['CHAT_ASSISTANT','POST_GENERATOR','HASHTAG_GENERATOR','IMAGE_GENERATOR','VIDEO_GENERATOR','SCHEDULER_COPY','SUMMARIZER'].map((feature) => {
                  const assigned = assignments.find((a) => a.feature === feature)
                  const currentId = assigned?.models?.[0]?.model?.id ?? ''
                  const modalityNeeded = feature.includes('IMAGE') ? 'IMAGE' : feature.includes('VIDEO') ? 'VIDEO' : 'TEXT'
                  const candidates = models.filter((m) => m.modality === modalityNeeded && m.isActive)
                  return (
                    <div key={feature} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                      <div className="mb-2 text-sm font-medium">{feature.replaceAll('_',' ')}</div>
                      <select className="w-full px-3 py-2 rounded-md bg-transparent border border-gray-300 dark:border-gray-700" value={currentId} onChange={(e) => assignPrimary(feature, e.target.value)}>
                        <option value="">Select model</option>
                        {candidates.map((m) => (
                          <option key={m.id} value={m.id}>{m.name} ({m.modelId})</option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
