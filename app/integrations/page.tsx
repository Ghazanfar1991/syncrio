"use client"

import { useState, useEffect, useCallback } from 'react'
import React from 'react'
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter, useSearchParams } from 'next/navigation'
import { TopRightControls } from '@/components/layout/top-right-controls'
import { Sidebar } from '@/components/layout/sidebar'
import { SUPPORTED_PLATFORMS } from '@/lib/bundle-social'
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
  Share2, Plus, CheckCircle, XCircle, Clock, Twitter, Linkedin, Instagram,
  Youtube, Facebook, MessageCircle, ExternalLink, Search, Trash2, Settings2,
  Cable, LayoutGrid, ShieldCheck, Sparkles, ChevronRight, Music2, AtSign,
  Pin, MessagesSquare, Network, Cloud, Slack, Globe, MessageSquare,
  AlertTriangle, RefreshCw, Loader2, Download, Wifi, WifiOff
} from 'lucide-react'

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface SocialAccount {
  id: string
  platform: string
  username: string
  displayName: string
  avatarUrl?: string
  isActive: boolean
  isConnected: boolean
  needsReauth?: boolean
  disconnectScheduledAt?: string
  lastSync?: string
  accountType: 'personal' | 'business' | 'creator'
  permissions: string[]
  bundleSocialAccountId?: string
  metadata?: {
    requires_channel_selection?: boolean
    available_channels?: Array<{ id: string; name: string }>
  }
}

type Platform = typeof SUPPORTED_PLATFORMS[number]['id']

// ─── Platform metadata ───────────────────────────────────────────────────────

const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

const PLATFORM_META: Record<Platform, {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  brand: string
  gradient: string
  displayName: string
  description: string
}> = {
  TWITTER: { icon: XLogo, brand: "text-neutral-900 dark:text-neutral-100", gradient: "from-neutral-800 to-neutral-900", displayName: "X (Twitter)", description: "Post tweets and threads" },
  LINKEDIN: { icon: Linkedin, brand: "text-sky-700", gradient: "from-sky-600 to-sky-800", displayName: "LinkedIn", description: "Connect professionally" },
  INSTAGRAM: { icon: Instagram, brand: "text-pink-500", gradient: "from-pink-500 to-purple-600", displayName: "Instagram", description: "Share photos & reels" },
  YOUTUBE: { icon: Youtube, brand: "text-red-600", gradient: "from-red-500 to-rose-600", displayName: "YouTube", description: "Publish videos & shorts" },
  FACEBOOK: { icon: Facebook, brand: "text-blue-600", gradient: "from-blue-500 to-blue-700", displayName: "Facebook", description: "Reach your audience" },
  TIKTOK: { icon: Music2, brand: "text-neutral-900", gradient: "from-neutral-800 to-neutral-900", displayName: "TikTok", description: "Share short videos" },
  THREADS: { icon: AtSign, brand: "text-neutral-900", gradient: "from-neutral-700 to-neutral-900", displayName: "Threads", description: "Text-based sharing" },
  PINTEREST: { icon: Pin, brand: "text-red-600", gradient: "from-red-600 to-red-800", displayName: "Pinterest", description: "Visual discovery" },
  REDDIT: { icon: MessagesSquare, brand: "text-orange-600", gradient: "from-orange-500 to-orange-700", displayName: "Reddit", description: "Community discussions" },
  MASTODON: { icon: Network, brand: "text-indigo-600", gradient: "from-indigo-500 to-indigo-700", displayName: "Mastodon", description: "Federated social" },
  BLUESKY: { icon: Cloud, brand: "text-blue-500", gradient: "from-blue-400 to-blue-600", displayName: "Bluesky", description: "Open social network" },
  DISCORD: { icon: MessageSquare, brand: "text-indigo-500", gradient: "from-indigo-400 to-indigo-600", displayName: "Discord", description: "Community servers" },
  SLACK: { icon: Slack, brand: "text-purple-600", gradient: "from-purple-500 to-purple-700", displayName: "Slack", description: "Workspace messaging" },
  GOOGLE_BUSINESS: { icon: Globe, brand: "text-blue-500", gradient: "from-blue-500 to-emerald-500", displayName: "Google Business", description: "Business presence" },
}

// ─── Error message map from Bundle callbacks ─────────────────────────────────
const BUNDLE_ERROR_MESSAGES: Record<string, string> = {
  'twitter-not-enough-permissions': 'Twitter/X requires additional permissions. Please try again and grant all requested access.',
  'pinterest-not-enough-permissions': 'Pinterest requires additional permissions. Please try again.',
  'tiktok-not-enough-permissions': 'TikTok requires additional permissions. Please try again.',
  'facebook-not-enough-pages': 'No Facebook Pages found. Please create a Facebook Page first.',
  'facebook-not-enough-permissions': 'Facebook requires additional permissions. Please try again.',
  'instagram-not-enough-accounts': 'No Instagram accounts found. Make sure your account is an Instagram Business or Creator account.',
  'instagram-not-enough-permissions': 'Instagram requires additional permissions. Please try again.',
  'linkedin-not-enough-channels': 'No LinkedIn Company Pages found. Please create a Company Page first.',
  'linkedin-not-enough-permissions': 'LinkedIn requires additional permissions. Please try again.',
  'youtube-not-enough-channels': 'No YouTube channels found. Please create a YouTube channel first.',
  'youtube-not-enough-permissions': 'YouTube requires additional permissions. Please try again.',
  'reddit-not-enough-permissions': 'Reddit requires additional permissions. Please try again.',
  'discord-not-enough-servers': 'No Discord servers found where you have permission.',
  'discord-not-enough-permissions': 'Discord requires additional permissions.',
  'slack-not-enough-workspaces': 'No Slack workspaces found.',
  'slack-not-enough-permissions': 'Slack requires additional permissions.',
  'threads-not-enough-permissions': 'Threads requires additional permissions.',
  'mastodon-not-enough-permissions': 'Mastodon requires additional permissions.',
  'bluesky-not-enough-permissions': 'Bluesky requires additional permissions.',
  'not-enough-permissions': 'Insufficient permissions. Please try again and grant all requested access.',
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { user: session, loading: sessionLoading } = useAuth()
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [connectingPlatform, setConnectingPlatform] = useState<Platform | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const [query, setQuery] = useState("")
  const [platformFilter, setPlatformFilter] = useState<Platform | "All">("All")
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false
    try { return JSON.parse(localStorage.getItem("sidebar:collapsed") ?? "false") }
    catch { return false }
  })

  // Import states
  const [importingPlatform, setImportingPlatform] = useState<Platform | null>(null)
  const [importStatus, setImportStatus] = useState<Record<string, string>>({})

  const searchParams = useSearchParams()
  const router = useRouter()

  React.useEffect(() => {
    localStorage.setItem("sidebar:collapsed", JSON.stringify(collapsed))
  }, [collapsed])

  // ── Fetch accounts from Supabase ──────────────────────────────────────────
  const fetchSocialAccounts = useCallback(async () => {
    if (!session) return
    try {
      setLoading(true)
      const response = await fetch('/api/social/accounts')
      const result = await response.json()

      if (result.success) {
        const transformed: SocialAccount[] = result.data.map((acc: any) => ({
          id: acc.id,
          platform: acc.platform,
          username: acc.username || acc.account_name,
          displayName: acc.display_name || acc.account_name,
          avatarUrl: acc.avatar_url,
          isActive: acc.is_active,
          isConnected: acc.is_connected,
          needsReauth: acc.needs_reauth || false,
          disconnectScheduledAt: acc.disconnect_scheduled_at,
          lastSync: acc.updated_at ? formatLastSync(acc.updated_at) : undefined,
          accountType: (acc.account_type || 'personal').toLowerCase(),
          permissions: Array.isArray(acc.permissions) ? acc.permissions : [],
          bundleSocialAccountId: acc.bundle_social_account_id,
          metadata: acc.metadata || {},
        }))
        setAccounts(transformed)
      }
    } catch (error) {
      console.error('Failed to fetch social accounts:', error)
    } finally {
      setLoading(false)
    }
  }, [session])

  // ── Sync from Bundle (called on ?sync=true return) ────────────────────────
  const handleSync = useCallback(async () => {
    if (!session) return
    try {
      setSyncLoading(true)
      const res = await fetch('/api/social/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: `✅ ${data.message || 'Accounts synced successfully!'}` })
        await fetchSocialAccounts()
      } else {
        setMessage({ type: 'error', text: data.error || 'Sync failed. Please try again.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Sync failed. Please try again.' })
    } finally {
      setSyncLoading(false)
      // Clean URL
      router.replace('/integrations')
    }
  }, [session, fetchSocialAccounts, router])

  // ── On mount: check for sync=true or error params ─────────────────────────
  useEffect(() => {
    if (!session) return

    const sync = searchParams.get('sync')
    const errorParam = searchParams.get('error') || searchParams.get('message')

    if (sync === 'true') {
      // Small delay to let Bundle finish on their end
      const t = setTimeout(() => handleSync(), 1500)
      return () => clearTimeout(t)
    }

    if (errorParam && BUNDLE_ERROR_MESSAGES[errorParam]) {
      setMessage({ type: 'error', text: BUNDLE_ERROR_MESSAGES[errorParam] })
      router.replace('/integrations')
    }

    fetchSocialAccounts()
  }, [session, searchParams])

  // ── Connect: directly open Bundle portal for a specific platform ──────────
  const handleConnectAccount = async (platform: Platform) => {
    try {
      setConnectingPlatform(platform)
      const response = await fetch('/api/social/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', platform }),
      })
      const data = await response.json()

      if (data.success && data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to get portal link')
      }
    } catch (error) {
      console.error('Connect failed:', error)
      setMessage({ type: 'error', text: `Failed to connect to ${PLATFORM_META[platform]?.displayName || platform}. Please try again.` })
      setConnectingPlatform(null)
    }
  }

  // ── Disconnect ────────────────────────────────────────────────────────────
  const handleDisconnect = async (accountId: string) => {
    try {
      const response = await fetch(`/api/social/accounts?id=${accountId}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        setAccounts(prev => prev.filter(a => a.id !== accountId))
        setMessage({ type: 'success', text: 'Account disconnected.' })
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to disconnect.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to disconnect account. Please try again.' })
    }
  }

  // ── Toggle active state ───────────────────────────────────────────────────
  const handleToggleActive = async (accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
    if (!account) return
    const newActive = !account.isActive
    setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, isActive: newActive } : a))
    try {
      await fetch('/api/social/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: accountId, is_active: newActive }),
      })
    } catch {
      // Revert on error
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, isActive: !newActive } : a))
    }
  }

  // ── Import post history ───────────────────────────────────────────────────
  const handleImportHistory = async (platform: Platform) => {
    try {
      setImportingPlatform(platform)
      setImportStatus(prev => ({ ...prev, [platform]: 'PENDING' }))
      const res = await fetch('/api/social/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, count: 50, withAnalytics: true }),
      })
      const data = await res.json()
      if (data.success) {
        setImportStatus(prev => ({ ...prev, [platform]: data.status || 'PENDING' }))
        setMessage({ type: 'success', text: `Import started for ${PLATFORM_META[platform]?.displayName}. Check back soon.` })
      } else {
        setImportStatus(prev => ({ ...prev, [platform]: 'FAILED' }))
        setMessage({ type: 'error', text: data.error || 'Import failed.' })
      }
    } catch {
      setImportStatus(prev => ({ ...prev, [platform]: 'FAILED' }))
      setMessage({ type: 'error', text: 'Import failed. Please try again.' })
    } finally {
      setImportingPlatform(null)
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const filtered = accounts.filter(a => {
    const matchesText = `${a.displayName} ${a.username}`.toLowerCase().includes(query.toLowerCase())
    const matchesPlatform = platformFilter === "All" || a.platform === platformFilter
    return matchesText && matchesPlatform
  })

  const totalAccounts = accounts.length
  const activeAccounts = accounts.filter(a => a.isActive && a.isConnected).length
  const connectedPlatforms = new Set(accounts.filter(a => a.isConnected).map(a => a.platform)).size
  const needsReauthCount = accounts.filter(a => a.needsReauth).length

  // ── Loading / auth guard ──────────────────────────────────────────────────
  if (sessionLoading) {
    return (
      <div className="min-h-screen font-sans bg-gradient-to-br from-white to-slate-50 dark:from-neutral-950 dark:to-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-2xl flex items-center justify-center mb-6 mx-auto animate-pulse shadow-xl">
            <Share2 className="h-8 w-8 text-white" />
          </div>
          <div className="w-10 h-10 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-base opacity-60 font-medium">Loading integrations…</p>
        </div>
      </div>
    )
  }

  if (!session && !sessionLoading) {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="min-h-screen font-sans bg-gradient-to-br from-white to-slate-50 dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar collapsed={collapsed} onToggleCollapse={setCollapsed} showPlanInfo={true} />

      <div className={`max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-6 pt-4 pb-8 ${collapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
        <main className="space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight mb-1">Social Media Integrations</h2>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                Connect and manage all your social media accounts
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncLoading}
                className="rounded-xl text-xs gap-1.5"
              >
                {syncLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {syncLoading ? 'Syncing…' : 'Sync Accounts'}
              </Button>
              <TopRightControls unreadNotificationsCount={needsReauthCount} />
            </div>
          </div>

          {/* Reconnect warning banner */}
          {needsReauthCount > 0 && (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {needsReauthCount} account{needsReauthCount > 1 ? 's need' : ' needs'} reconnection
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  Platform access was revoked remotely. Reconnect to continue publishing.
                </p>
              </div>
            </div>
          )}

          {/* Message Banner */}
          {message && (
            <div className={`p-4 rounded-2xl border ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                : message.type === 'warning'
                ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200 border-amber-200 dark:border-amber-800'
                : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm">{message.text}</span>
                <button onClick={() => setMessage(null)} className="text-sm opacity-70 hover:opacity-100 ml-4">✕</button>
              </div>
            </div>
          )}

          {/* Sync overlay */}
          {syncLoading && (
            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-4 flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
              <span className="text-sm text-indigo-800 dark:text-indigo-200 font-medium">Syncing connected accounts from Bundle.social…</span>
            </div>
          )}

          {/* KPI Row */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPICard label="Total Accounts" value={totalAccounts} icon={<Cable className="h-4 w-4" />} color="indigo" />
            <KPICard label="Active" value={activeAccounts} icon={<CheckCircle className="h-4 w-4" />} color="emerald" />
            <KPICard label="Platforms" value={connectedPlatforms} icon={<LayoutGrid className="h-4 w-4" />} color="purple" />
            <KPICard label="Need Reauth" value={needsReauthCount} icon={<AlertTriangle className="h-4 w-4" />} color={needsReauthCount > 0 ? "amber" : "slate"} />
          </section>

          {/* Connected Accounts list */}
          {accounts.some(a => a.isConnected) && (
            <section>
              <Card className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-950/40 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <CardHeader className="pb-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-emerald-500" />
                      Connected Accounts
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-auto">
                        <Input
                          value={query}
                          onChange={e => setQuery(e.target.value)}
                          placeholder="Search…"
                          className="pl-8 w-full sm:w-52 rounded-xl text-sm"
                        />
                        <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      </div>
                      <select
                        value={platformFilter}
                        onChange={e => setPlatformFilter(e.target.value as Platform | "All")}
                        className="text-xs sm:text-sm rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-neutral-900/60 px-3 py-2 w-full sm:w-auto"
                      >
                        <option value="All">All Platforms</option>
                        {Object.keys(PLATFORM_META).map(p => (
                          <option key={p} value={p}>{PLATFORM_META[p as Platform].displayName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {filtered.length === 0 ? (
                    <div className="h-24 grid place-items-center text-sm text-neutral-500">No accounts match your filters.</div>
                  ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filtered.map(acc => (
                        <ConnectedAccountRow
                          key={acc.id}
                          account={acc}
                          onDisconnect={handleDisconnect}
                          onToggle={handleToggleActive}
                          onReconnect={() => handleConnectAccount(acc.platform as Platform)}
                        />
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Platform Grid */}
          <section>
            <Card className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-950/40 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
              <CardHeader className="pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-indigo-500" />
                  All Platforms
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Click <strong>Connect</strong> on any platform to link your account directly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(Object.keys(PLATFORM_META) as Platform[]).map(p => (
                    <PlatformCard
                      key={p}
                      platform={p}
                      accounts={accounts.filter(a => a.platform === p)}
                      isConnecting={connectingPlatform === p}
                      isImporting={importingPlatform === p}
                      importStatus={importStatus[p]}
                      onConnect={() => handleConnectAccount(p)}
                      onRemove={handleDisconnect}
                      onToggle={handleToggleActive}
                      onImportHistory={() => handleImportHistory(p)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

type ColorKey = 'indigo' | 'emerald' | 'purple' | 'amber' | 'slate'
const colorMap: Record<ColorKey, string> = {
  indigo: 'text-indigo-600 dark:text-indigo-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  purple: 'text-purple-600 dark:text-purple-400',
  amber: 'text-amber-600 dark:text-amber-400',
  slate: 'text-slate-400 dark:text-slate-500',
}

function KPICard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: ColorKey }) {
  return (
    <Card className="rounded-3xl border h-24 border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-950/40 backdrop-blur-xl">
      <CardContent className="p-4 flex flex-col justify-between h-full">
        <div className={`${colorMap[color]}`}>{icon}</div>
        <div>
          <div className="text-xl sm:text-2xl font-bold">{value}</div>
          <div className="text-xs text-neutral-500">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function BrandChip({ platform }: { platform: Platform }) {
  const meta = PLATFORM_META[platform]
  const Icon = meta.icon
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 px-2.5 py-2 bg-white/60 dark:bg-neutral-900/60">
      <span className={`h-5 w-5 grid place-items-center rounded-lg text-white bg-gradient-to-br ${meta.gradient}`}>
        <Icon className="h-3 w-3" />
      </span>
      <span className="text-xs font-medium">{meta.displayName}</span>
    </span>
  )
}

function ConnectedAccountRow({
  account,
  onDisconnect,
  onToggle,
  onReconnect,
}: {
  account: SocialAccount
  onDisconnect: (id: string) => void
  onToggle: (id: string) => void
  onReconnect: () => void
}) {
  const platform = account.platform as Platform
  const meta = PLATFORM_META[platform] || PLATFORM_META.TWITTER

  return (
    <li className="group rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/50 p-3">
      <div className="flex items-center gap-3">
        {account.avatarUrl ? (
          <img src={account.avatarUrl} alt={account.displayName} className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
        ) : (
          <BrandChip platform={platform} />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium flex items-center gap-1.5">
            {account.displayName}
            {account.needsReauth && (
              <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400 font-normal">
                <AlertTriangle className="h-3 w-3" /> Reconnect
              </span>
            )}
          </p>
          <p className="truncate text-xs text-neutral-500">{account.username || meta.displayName}</p>
        </div>
        <div className="flex items-center gap-1">
          {account.needsReauth ? (
            <Button size="sm" onClick={onReconnect} className="h-7 px-2 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 text-white">
              Reconnect
            </Button>
          ) : (
            <>
              <Badge variant="secondary" className={`rounded-full text-xs ${account.isActive && account.isConnected ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"}`}>
                {account.isActive && account.isConnected ? "Active" : "Paused"}
              </Badge>
              <Switch checked={account.isActive && account.isConnected} onCheckedChange={() => onToggle(account.id)} />
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => onDisconnect(account.id)} className="hover:text-red-600 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </li>
  )
}

function PlatformCard({
  platform,
  accounts,
  isConnecting,
  isImporting,
  importStatus,
  onConnect,
  onRemove,
  onToggle,
  onImportHistory,
}: {
  platform: Platform
  accounts: SocialAccount[]
  isConnecting: boolean
  isImporting: boolean
  importStatus?: string
  onConnect: () => void
  onRemove: (id: string) => void
  onToggle: (id: string) => void
  onImportHistory: () => void
}) {
  const meta = PLATFORM_META[platform]
  const Icon = meta.icon
  const connectedAccounts = accounts.filter(a => a.isConnected)
  const reauthAccounts = accounts.filter(a => a.needsReauth)

  const getImportBadge = () => {
    if (!importStatus) return null
    const map: Record<string, { label: string; cls: string }> = {
      PENDING: { label: 'Import pending…', cls: 'text-amber-600' },
      FETCHING_POSTS: { label: 'Fetching posts…', cls: 'text-blue-600' },
      COMPLETED: { label: 'Import done ✓', cls: 'text-emerald-600' },
      FAILED: { label: 'Import failed', cls: 'text-red-600' },
      RATE_LIMITED: { label: 'Rate limited', cls: 'text-orange-600' },
    }
    const info = map[importStatus]
    if (!info) return null
    return <span className={`text-xs ${info.cls}`}>{info.label}</span>
  }

  return (
    <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-950/40 backdrop-blur-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-shadow">
      {/* Gradient header */}
      <div className={`h-14 bg-gradient-to-r ${meta.gradient} opacity-90 relative`}>
        {reauthAccounts.length > 0 && (
          <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-white text-xs font-bold">
            !
          </span>
        )}
      </div>

      <CardHeader className="-mt-9 relative z-10 pb-2">
        <div className="flex items-center gap-3">
          <div className={`h-11 w-11 rounded-2xl mt-1 grid place-items-center text-white shadow-lg bg-gradient-to-br ${meta.gradient}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm text-white truncate">{meta.displayName}</CardTitle>
            <p className="text-xs text-white/80 mt-0.5">{meta.description}</p>
          </div>
          <Button
            onClick={onConnect}
            disabled={isConnecting}
            className="rounded-xl text-white text-xs h-8 px-3 bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-sm"
          >
            {isConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            {isConnecting ? 'Opening…' : 'Connect'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-4">
        {connectedAccounts.length === 0 ? (
          <div className="h-16 grid place-items-center">
            <p className="text-xs text-neutral-500">No accounts connected yet</p>
          </div>
        ) : (
          <ul className="space-y-2 mt-2">
            {connectedAccounts.slice(0, 3).map(acc => (
              <li key={acc.id} className="flex items-center gap-2 p-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/50">
                {acc.avatarUrl
                  ? <img src={acc.avatarUrl} alt={acc.displayName} className="h-7 w-7 rounded-full object-cover flex-shrink-0" />
                  : <div className={`h-7 w-7 rounded-lg grid place-items-center text-white bg-gradient-to-br ${meta.gradient} flex-shrink-0`}><Icon className="h-3.5 w-3.5" /></div>
                }
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{acc.displayName}</p>
                  {acc.needsReauth && <p className="text-xs text-amber-600 flex items-center gap-0.5"><AlertTriangle className="h-2.5 w-2.5" /> Needs reconnection</p>}
                </div>
                <Badge variant="secondary" className={`rounded-full text-xs ${acc.isActive && acc.isConnected ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"}`}>
                  {acc.isActive && acc.isConnected ? "Active" : "Paused"}
                </Badge>
                <Switch checked={acc.isActive && acc.isConnected} onCheckedChange={() => onToggle(acc.id)} />
                <Button variant="ghost" size="icon" onClick={() => onRemove(acc.id)} className="hover:text-red-600 h-7 w-7">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </li>
            ))}
            {connectedAccounts.length > 3 && (
              <p className="text-xs text-neutral-500 px-1">+{connectedAccounts.length - 3} more</p>
            )}
          </ul>
        )}

        {/* Import history row */}
        {connectedAccounts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getImportBadge()}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onImportHistory}
              disabled={isImporting || importStatus === 'PENDING' || importStatus === 'FETCHING_POSTS'}
              className="h-7 text-xs gap-1 rounded-lg"
            >
              {isImporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              Import Past Posts
            </Button>
          </div>
        )}
      </CardContent>
    </div>
  )
}

function formatLastSync(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  if (diffInHours < 1) return 'Just now'
  if (diffInHours < 24) return `${diffInHours}h ago`
  if (diffInHours < 48) return '1 day ago'
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`
  return `${Math.floor(diffInHours / 168)} weeks ago`
}
