"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { TopRightControls } from '@/components/layout/top-right-controls'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Share2, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Facebook,
  MessageCircle,
  ExternalLink,
  Search,
  Trash2,
  Settings2,
  Cable,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
  ChevronRight
} from 'lucide-react'

interface SocialAccount {
  id: string
  platform: string
  username: string
  displayName: string
  isActive: boolean
  isConnected: boolean
  lastSync?: string
  accountType: 'personal' | 'business' | 'creator'
  permissions: string[]
}

type Platform = "TWITTER" | "LINKEDIN" | "INSTAGRAM" | "YOUTUBE" | "FACEBOOK" | "TELEGRAM";

// Custom X Logo Component
const XLogo = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    fill="currentColor"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const PLATFORM_META: Record<Platform, {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  brand: string;
  gradient: string;
  displayName: string;
}> = {
  TWITTER: { 
    icon: XLogo, 
    brand: "text-neutral-900 dark:text-neutral-100", 
    gradient: "from-neutral-800 to-neutral-900",
    displayName: "X"
  },
  LINKEDIN: { 
    icon: Linkedin, 
    brand: "text-sky-700", 
    gradient: "from-sky-600 to-sky-800",
    displayName: "LinkedIn"
  },
  INSTAGRAM: { 
    icon: Instagram, 
    brand: "text-pink-500", 
    gradient: "from-pink-500 to-purple-600",
    displayName: "Instagram"
  },
  YOUTUBE: { 
    icon: Youtube, 
    brand: "text-red-600", 
    gradient: "from-red-500 to-rose-600",
    displayName: "YouTube"
  },
  FACEBOOK: { 
    icon: Facebook, 
    brand: "text-blue-600", 
    gradient: "from-blue-500 to-blue-700",
    displayName: "Facebook"
  },
  TELEGRAM: { 
    icon: MessageCircle, 
    brand: "text-blue-400", 
    gradient: "from-blue-400 to-blue-600",
    displayName: "Telegram"
  }
};

export default function IntegrationsPage() {
  const { data: session, status } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [query, setQuery] = useState("")
  const [platformFilter, setPlatformFilter] = useState<Platform | "All">("All")
  const [connectModalOpen, setConnectModalOpen] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  // Facebook Pages selection state
  const [fbPages, setFbPages] = useState<Array<{ id: string; name: string }>>([])
  const [fbPageModalOpen, setFbPageModalOpen] = useState(false)
  const [fbSelectedPageId, setFbSelectedPageId] = useState<string | null>(null)
  const [fbPageLoading, setFbPageLoading] = useState(false)
  const [fbPageError, setFbPageError] = useState<string | null>(null)
  const [fbPendingConnect, setFbPendingConnect] = useState(false)

  // Helper functions for success/error messages
  const getSuccessMessage = (success: string) => {
    const messages: Record<string, string> = {
      'twitter_connected': 'X account connected successfully!',
      'linkedin_connected': 'LinkedIn account connected successfully!',
      'instagram_connected': 'Instagram account connected successfully!',
      'youtube_connected': 'YouTube channel connected successfully!',
      'facebook_connected': 'Facebook page connected successfully!'
    }
    return messages[success] || 'Account connected successfully!'
  }

  const getErrorMessage = (error: string) => {
    const messages: Record<string, string> = {
      'twitter_oauth_failed': 'Failed to connect X account. Please try again.',
      'linkedin_oauth_failed': 'Failed to connect LinkedIn account. Please try again.',
      'instagram_oauth_failed': 'Failed to connect Instagram account. Please try again.',
      'youtube_oauth_failed': 'Failed to connect YouTube channel. Please try again.',
      'facebook_oauth_failed': 'Failed to connect Facebook page. Please try again.',
      'missing_code': 'OAuth authorization failed. Please try again.',
      'unauthorized': 'You must be logged in to connect accounts.',
      'user_not_found': 'User not found. Please try logging in again.',
      'account_limit_reached': 'You have reached your account limit for your current plan.',
      'oauth_callback_failed': 'OAuth callback failed. Please try again.'
    }
    return messages[error] || 'An error occurred. Please try again.'
  }

  useEffect(() => {
    if (session) {
      fetchSocialAccounts()
    }
  }, [session])

  useEffect(() => {
    // Check for success/error messages in URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')
    const errorDetail = urlParams.get('error_detail')
    
    if (success) {
      setMessage({ type: 'success', text: getSuccessMessage(success) })
      if (success === 'facebook_connected') {
        if (session?.user?.id) {
          ;(async () => {
            try {
              const pagesRes = await fetch(`/api/social/facebook/pages?userId=${session.user.id}`)
              const pagesJson = await pagesRes.json()
              if (pagesJson?.success && Array.isArray(pagesJson.data?.pages)) {
                const pages = pagesJson.data.pages
                if (pages.length === 1) {
                  await fetch('/api/social/facebook/select-page', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: session.user.id,
                      pageId: pages[0].id,
                      pageName: pages[0].name,
                    }),
                  })
                } else if (pages.length > 1) {
                  setFbPages(pages.map((p: any) => ({ id: p.id, name: p.name })))
                  setFbSelectedPageId(pages[0].id)
                  setFbPageModalOpen(true)
                }
              }
            } catch (e) {
              console.warn('Auto-select Facebook page skipped:', e)
            } finally {
              // Clear URL and refresh accounts after handling
              window.history.replaceState({}, document.title, window.location.pathname)
              fetchSocialAccounts()
            }
          })()
        } else {
          // Session not ready yet; mark pending and process when session loads
          try { sessionStorage.setItem('fbPendingConnect', '1') } catch {}
          setFbPendingConnect(true)
        }
      } else {
        // Clear URL parameter for other success cases
        window.history.replaceState({}, document.title, window.location.pathname)
        fetchSocialAccounts()
      }
    } else if (error) {
      let text = getErrorMessage(error)
      if (errorDetail) {
        try {
          const decoded = atob(errorDetail)
          if (decoded) text += ` — ${decoded}`
        } catch {}
      }
      setMessage({ type: 'error', text })
      // Clear URL parameter
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [session?.user?.id])

  // Handle pending Facebook connect once session is available
  useEffect(() => {
    const pending = (() => {
      try { return sessionStorage.getItem('fbPendingConnect') === '1' } catch { return fbPendingConnect }
    })()
    if (!pending || !session?.user?.id) return
    ;(async () => {
      try {
        const pagesRes = await fetch(`/api/social/facebook/pages?userId=${session.user.id}`)
        const pagesJson = await pagesRes.json()
        if (pagesJson?.success && Array.isArray(pagesJson.data?.pages)) {
          const pages = pagesJson.data.pages
          if (pages.length === 1) {
            await fetch('/api/social/facebook/select-page', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: session.user.id,
                pageId: pages[0].id,
                pageName: pages[0].name,
              }),
            })
          } else if (pages.length > 1) {
            setFbPages(pages.map((p: any) => ({ id: p.id, name: p.name })))
            setFbSelectedPageId(pages[0].id)
            setFbPageModalOpen(true)
          }
        }
      } catch (e) {
        console.warn('Pending Facebook page selection skipped:', e)
      } finally {
        try { sessionStorage.removeItem('fbPendingConnect') } catch {}
        setFbPendingConnect(false)
        window.history.replaceState({}, document.title, window.location.pathname)
        fetchSocialAccounts()
      }
    })()
  }, [fbPendingConnect, session?.user?.id])

  const fetchSocialAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/social/accounts')
      const result = await response.json()
      
      if (result.success) {
        // Transform the data to match our interface
        const transformedAccounts: SocialAccount[] = result.data.map((acc: any) => ({
          id: acc.id,
          platform: acc.platform,
          username: acc.username || acc.accountName,
          displayName: acc.displayName || acc.accountName,
          isActive: acc.isActive,
          isConnected: acc.isConnected,
          lastSync: acc.lastSync ? formatLastSync(acc.lastSync) : undefined,
          accountType: acc.accountType?.toLowerCase() || 'personal',
          permissions: Array.isArray(acc.permissions) ? acc.permissions : []
        }))
        setAccounts(transformedAccounts)
      } else {
        console.error('Failed to fetch accounts:', result.error)
      }
    } catch (error) {
      console.error('Failed to fetch social accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenFacebookPageSelector = async () => {
    if (!session?.user?.id) {
      setMessage({ type: 'error', text: getErrorMessage('unauthorized') })
      return
    }
    setFbPageError(null)
    setFbPageLoading(true)
    try {
      const res = await fetch(`/api/social/facebook/pages?userId=${session.user.id}`)
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || 'Failed to load Facebook pages')
      }
      const pages = (json.data?.pages || []).map((p: any) => ({ id: p.id, name: p.name }))
      if (pages.length === 0) {
        setMessage({ type: 'error', text: 'No Facebook Pages available for this account.' })
        return
      }
      setFbPages(pages)
      setFbSelectedPageId(pages[0].id)
      setFbPageModalOpen(true)
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to load Facebook pages' })
    } finally {
      setFbPageLoading(false)
    }
  }

  const handleConfirmFacebookPage = async () => {
    if (!session?.user?.id || !fbSelectedPageId) return
    setFbPageLoading(true)
    setFbPageError(null)
    try {
      const selected = fbPages.find((p) => p.id === fbSelectedPageId)
      const res = await fetch('/api/social/facebook/select-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          pageId: fbSelectedPageId,
          pageName: selected?.name,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || 'Failed to save selected Page')
      }
      setFbPageModalOpen(false)
      setMessage({ type: 'success', text: 'Facebook Page selected successfully!' })
      fetchSocialAccounts()
    } catch (e: any) {
      setFbPageError(e?.message || 'Failed to save selected Page')
    } finally {
      setFbPageLoading(false)
    }
  }

  const formatLastSync = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    if (diffInHours < 48) return '1 day ago'
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`
    return `${Math.floor(diffInHours / 168)} weeks ago`
  }

  const filtered = accounts.filter((a) => {
    const matchesText = `${a.displayName} ${a.username}`.toLowerCase().includes(query.toLowerCase());
    const matchesPlatform = platformFilter === "All" || a.platform === platformFilter;
    return matchesText && matchesPlatform;
  });

  const total = accounts.length;
  const active = accounts.filter((a) => a.isActive && a.isConnected).length;
  const connectedPlatforms = new Set(accounts.map((a) => a.platform)).size;

  const handleConnectAccount = async (platform: string) => {
    try {
      const platformLower = platform.toLowerCase()
      let response: Response
      
      console.log(`Attempting to connect ${platform}...`)
      
      // Use the existing OAuth connect endpoints that were working
      switch (platformLower) {
        case 'twitter':
          response = await fetch('/api/social/twitter/connect', { method: 'POST' })
          break
        case 'linkedin':
          response = await fetch('/api/social/linkedin/connect', { method: 'POST' })
          break
        case 'instagram':
          response = await fetch('/api/social/instagram/connect', { method: 'POST' })
          break
        case 'youtube':
          response = await fetch('/api/social/youtube/connect', { method: 'POST' })
          break
        case 'facebook':
          if (!session?.user?.id) {
            setMessage({ type: 'error', text: getErrorMessage('unauthorized') })
            return
          }
          response = await fetch('/api/social/facebook/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: session.user.id })
          })
          break
        default:
          console.error('Unsupported platform:', platform)
          return
      }
      
      console.log(`${platform} response status:`, response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`${platform} error response:`, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      console.log(`${platform} response data:`, data)
      
      if (data.success && data.data.authUrl) {
        console.log(`Redirecting to ${platform} OAuth URL:`, data.data.authUrl)
        // Redirect to the OAuth authorization URL
        window.location.href = data.data.authUrl
      } else {
        throw new Error(data.error?.message || `Failed to get ${platform} OAuth URL`)
      }
    } catch (error) {
      console.error(`Failed to connect ${platform}:`, error)
      setMessage({ type: 'error', text: `Failed to connect ${platform}: ${error instanceof Error ? error.message : 'Unknown error'}` })
    }
  }

  const handleDisconnectAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/social/accounts?id=${accountId}`, {
        method: 'DELETE'
      })
      const result = await response.json()
      
      if (result.success) {
        setAccounts(prev => prev.filter(acc => acc.id !== accountId))
      } else {
        console.error('Failed to disconnect account:', result.error)
      }
    } catch (error) {
      console.error('Failed to disconnect account:', error)
    }
  }

  const handleRefreshAccount = async (accountId: string) => {
    try {
      const response = await fetch('/api/social/accounts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: accountId,
          lastSync: new Date().toISOString()
        })
      })
      const result = await response.json()
      
      if (result.success) {
        // Refresh the accounts list
        fetchSocialAccounts()
      } else {
        console.error('Failed to refresh account:', result.error)
      }
    } catch (error) {
      console.error('Failed to refresh account:', error)
    }
  }

  const toggleActive = (accountId: string) => {
    setAccounts(prev => prev.map(acc => 
      acc.id === accountId ? { ...acc, isActive: !acc.isActive } : acc
    ))
  }

  const openConnectModal = () => {
    setConnectModalOpen(true)
  }

  const handlePlatformSelect = (platform: Platform) => {
    setSelectedPlatform(platform)
    setConnectModalOpen(false)
    handleConnectAccount(platform)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen font-sans bg-gradient-to-br from-white to-slate-50 dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-colors">
        {/* Sidebar */}
        <Sidebar 
          collapsed={collapsed}
          onToggleCollapse={setCollapsed}
          showPlanInfo={true}
        />

        <div className={`max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-6 pt-4 pb-8 ${collapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
          <div className="text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 mx-auto animate-pulse shadow-xl">
              <Share2 className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 border-3 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3 sm:mb-4"></div>
            <p className="text-base sm:text-lg opacity-60 font-medium">Loading integrations...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen font-sans bg-gradient-to-br from-white to-slate-50 dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Sidebar */}
      <Sidebar 
        collapsed={collapsed}
        onToggleCollapse={setCollapsed}
        showPlanInfo={true}
      />

      <div className={`max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-6 pt-4 pb-8 ${collapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
        {/* Main area */}
        <main className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight mb-1">Social Media Integrations</h2>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Connect and manage your social media accounts for seamless content publishing
              </p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <TopRightControls unreadNotificationsCount={3} />
            </div>
          </div>

          {/* Success/Error Messages */}
          {message && (
            <div className={`p-3 sm:p-4 rounded-2xl border border-black/10 dark:border-white/10 ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800' 
                : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm sm:text-base">{message.text}</span>
                <button
                  onClick={() => setMessage(null)}
                  className="text-sm opacity-70 hover:opacity-100 ml-2"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4 sm:space-y-6">
            {/* KPI Row */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <KPICard label="Total Accounts" value={total} />
              <KPICard label="Active" value={active} />
              <KPICard label="Platforms" value={connectedPlatforms} />
              <Button 
                onClick={openConnectModal} 
                className="rounded-3xl h-24 sm:h-20 sm:h-24 bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 transition-all duration-300 text-sm sm:text-base lg:text-lg font-medium shadow-sm hover:shadow-lg transform hover:scale-[1.02] col-span-2 sm:col-span-1"
              >
                <Plus className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 mr-2"/> 
                <span className="hidden sm:inline">Connect Account</span>
                <span className="sm:hidden">Connect</span>
              </Button>
            </section>

            {/* Connected Accounts (Max 2 columns) */}
            <section className="mb-6 sm:mb-8">
              <Card className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-950/40 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <CardHeader className="pb-0">
                  <div className="flex flex-col sm:flex-row sm:flex-wrap -mb-6 sm:-mb-8 items-start sm:items-center justify-between gap-3">
                    <CardTitle className="text-sm sm:text-base">Your Connected Accounts</CardTitle>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-auto">
                        <Input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search name or handle"
                          className="pl-8 sm:pl-9 w-full sm:w-56 rounded-xl text-sm"
                        />
                        <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-neutral-400"/>
                      </div>
                      <select
                        value={platformFilter}
                        onChange={(e) => setPlatformFilter(e.target.value as Platform | "All")}
                        className="text-xs sm:text-sm rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-neutral-900/60 px-2 sm:px-3 py-2 w-full sm:w-auto"
                      >
                        <option value="All">All Platforms</option>
                        {Object.keys(PLATFORM_META).map((p) => (
                          <option key={p} value={p}>{PLATFORM_META[p as Platform].displayName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {filtered.length === 0 ? (
                    <div className="h-20 sm:h-28 grid place-items-center text-xs sm:text-sm text-neutral-500">No accounts match your filters.</div>
                  ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filtered.map((acc) => (
                        <li key={acc.id} className="group rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/50 p-3 sm:p-4">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <BrandChip platform={acc.platform as Platform} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs sm:text-sm font-medium">{acc.displayName}</p>
                              <p className="truncate text-xs text-neutral-500">{acc.username}</p>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Badge variant="secondary" className={`rounded-full text-xs ${acc.isActive && acc.isConnected ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                                {acc.isActive && acc.isConnected ? "Active" : "Paused"}
                              </Badge>
                              <Switch checked={acc.isActive && acc.isConnected} onCheckedChange={() => toggleActive(acc.id)} />
                              <Button variant="ghost" size="icon" onClick={() => handleDisconnectAccount(acc.id)} className="hover:text-red-600 h-8 w-8 sm:h-9 sm:w-9">
                                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4"/>
                              </Button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Platform Grid with main background card and max 2 columns */}
            <section>
              <Card className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-950/40 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500" />
                    Platforms
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Connect and manage your social media platforms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {(Object.keys(PLATFORM_META) as Platform[]).map((p) => (
                      <PlatformCard
                        key={p}
                        platform={p}
                        accounts={accounts.filter((a) => a.platform === p)}
                        onConnect={() => handleConnectAccount(p)}
                        onRemove={handleDisconnectAccount}
                        onToggle={toggleActive}
                      />
                    ))}
                  </div>
                  {/* Facebook Page selector quick action if needed */}
                  {(() => {
                    const fbAccounts = accounts.filter((a) => a.platform === 'FACEBOOK')
                    const hasPage = fbAccounts.some((a) => a.accountType === 'business')
                    const hasUserOnly = fbAccounts.length > 0 && !hasPage
                    if (hasUserOnly) {
                      return (
                        <div className="mt-4">
                          <Button
                            variant="outline"
                            onClick={handleOpenFacebookPageSelector}
                            className="rounded-xl text-xs sm:text-sm"
                          >
                            Select Facebook Page
                          </Button>
                        </div>
                      )
                    }
                    return null
                  })()}
                </CardContent>
              </Card>
            </section>
          </div>
        </main>
      </div>

      {/* Connect Platform Modal */}
      <Dialog open={connectModalOpen} onOpenChange={setConnectModalOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-3xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-950/70 backdrop-blur-2xl mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-xl flex items-center justify-center">
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              </div>
              Connect Social Media Account
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Choose a platform to connect your social media account. This will open the OAuth flow for the selected platform.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {(Object.keys(PLATFORM_META) as Platform[]).map((platform) => (
              <Button
                key={platform}
                variant="outline"
                className="h-16 sm:h-20 flex flex-col items-center justify-center gap-2 rounded-2xl border border-black/10 dark:border-white/10 hover:shadow-lg transition-all"
                onClick={() => handlePlatformSelect(platform)}
              >
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br ${PLATFORM_META[platform].gradient} flex items-center justify-center`}>
                  {(() => {
                    const IconComponent = PLATFORM_META[platform].icon;
                    return <IconComponent className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />;
                  })()}
                </div>
                <span className="text-xs sm:text-sm font-medium">{PLATFORM_META[platform].displayName}</span>
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectModalOpen(false)} className="rounded-xl text-sm sm:text-base">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Facebook Page Selection Modal */}
      <Dialog open={fbPageModalOpen} onOpenChange={setFbPageModalOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-3xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-950/70 backdrop-blur-2xl mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              Select a Facebook Page
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Choose which Page to connect for publishing. You can change this later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-auto">
            {fbPages.map((p) => (
              <label key={p.id} className="flex items-center gap-2 p-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/50 cursor-pointer">
                <input
                  type="radio"
                  name="fbPage"
                  checked={fbSelectedPageId === p.id}
                  onChange={() => setFbSelectedPageId(p.id)}
                />
                <span className="text-sm">{p.name}</span>
              </label>
            ))}
            {fbPageError && (
              <div className="text-xs text-red-600">{fbPageError}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFbPageModalOpen(false)} className="rounded-xl text-sm sm:text-base">
              Cancel
            </Button>
            <Button onClick={handleConfirmFacebookPage} disabled={fbPageLoading || !fbSelectedPageId} className="rounded-xl text-sm sm:text-base">
              {fbPageLoading ? 'Saving…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ----------------------------
// Subcomponents
// ----------------------------

function KPICard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="rounded-3xl border h-24 border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-950/40 backdrop-blur-xl">
      <CardContent className="h-12 sm:h-16 p-3 sm:p-4 ">
        <div className="text-xs text-neutral-500 -mt-3">{label}</div>
        <div className="text-lg sm:text-xl lg:text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function BrandChip({ platform }: { platform: Platform }) {
  const meta = PLATFORM_META[platform];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-xl border border-black/10 dark:border-white/10 px-2 sm:px-3 py-1.5 sm:py-2 bg-white/60 dark:bg-neutral-900/60`}> 
      <span className={`h-5 w-5 sm:h-6 sm:w-6 grid place-items-center rounded-lg text-white bg-gradient-to-br ${meta.gradient}`}>
        <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5"/>
      </span>
      <span className="text-xs font-medium">{meta.displayName}</span>
    </span>
  );
}

function PlatformCard({
  platform,
  accounts,
  onConnect,
  onRemove,
  onToggle,
}: {
  platform: Platform;
  accounts: SocialAccount[];
  onConnect: () => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const meta = PLATFORM_META[platform];
  const Icon = meta.icon;

  return (
    <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-950/40 backdrop-blur-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
      <div className={`h-16 sm:h-20 bg-gradient-to-r ${meta.gradient} opacity-90`} />
      <CardHeader className="-mt-8 sm:-mt-11 relative z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-2xl mt-1 grid place-items-center text-white shadow-lg bg-gradient-to-br ${meta.gradient}`}>
            <Icon className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm sm:text-base -mt-1 text-white truncate">{meta.displayName}</CardTitle>
            <p className="text-xs -mt-1 text-white/90">{accounts.length} account{accounts.length !== 1 && "s"} connected</p>
          </div>
          <Button onClick={onConnect} className="rounded-xl text-white text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1"/> 
            <span className="hidden sm:inline">Connect</span>
            <span className="sm:hidden">+</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4 sm:pb-5">
        {accounts.length === 0 ? (
          <div className="h-20 sm:h-24 grid place-items-center text-xs sm:text-sm text-neutral-500">No accounts yet. Connect your first.</div>
        ) : (
          <ul className="space-y-2 mt-2">
            {accounts.slice(0, 3).map((acc) => (
              <li key={acc.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/50 shadow-sm">
                <div className={`h-6 w-6 sm:h-8 sm:w-8 rounded-xl grid place-items-center text-white bg-gradient-to-br ${meta.gradient}`}>
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4"/>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs sm:text-sm font-medium">{acc.displayName}</p>
                  <p className="truncate text-xs text-neutral-500">{acc.username}</p>
                </div>
                <Badge variant="secondary" className={`rounded-full text-xs ${acc.isActive && acc.isConnected ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                  {acc.isActive && acc.isConnected ? "Active" : "Paused"}
                </Badge>
                <Switch checked={acc.isActive && acc.isConnected} onCheckedChange={() => onToggle(acc.id)} />
                <Button variant="ghost" size="icon" onClick={() => onRemove(acc.id)} className="hover:text-red-600 h-7 w-7 sm:h-8 sm:w-8">
                  <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5"/>
                </Button>
              </li>
            ))}
            {accounts.length > 3 && (
              <div className="text-xs text-neutral-500 px-1">+{accounts.length - 3} more account(s)</div>
            )}
          </ul>
        )}
      </CardContent>
    </div>
  );
}
