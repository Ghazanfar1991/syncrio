"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import {
  BarChart3,
  Calendar,
  ChevronRight,
  Eye,
  Globe2,
  Heart,
  Instagram,
  Linkedin,
  MessageCircle,
  RefreshCw,
  Share2,
  TrendingUp,
  Users,
  Youtube,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { useAnalyticsOverviewQuery, useSocialAccountsQuery } from "@/hooks/queries/use-app-queries"
import type { AnalyticsMetricId, AnalyticsOverviewVM, AnalyticsPostRow, MetricValue } from "@/types/analytics"

interface AnalyticsOverviewProps {
  period: string
  dateRange: { startDate: string; endDate: string }
  isCustomDateRange: boolean
  onPeriodChange: (newPeriod: string) => void
  onCustomDateChange: (field: "startDate" | "endDate", value: string) => void
  onApplyCustomDateRange: () => void
  lockedPlatform?: string
  initialSocialAccounts?: any[]
}

type SocialAccountOption = {
  id: string
  accountId?: string
  platform: string
  displayName?: string
  username?: string
  accountName?: string
}

const metricLabelMap: Record<AnalyticsMetricId, string> = {
  impressions: "Impressions",
  impressionsUnique: "Unique Impressions",
  views: "Views",
  viewsUnique: "Unique Views",
  likes: "Likes",
  comments: "Comments",
  shares: "Shares",
  saves: "Saves",
  followers: "Followers",
  following: "Following",
  postCount: "Posts",
  engagementCount: "Engagement",
  engagementRate: "Engagement Rate",
}

const palette = ["#f43f5e", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#06b6d4"]

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function iconForPlatform(platform: string) {
  switch (platform) {
    case "INSTAGRAM":
      return <Instagram className="h-5 w-5 text-white" />
    case "LINKEDIN":
      return <Linkedin className="h-5 w-5 text-white" />
    case "YOUTUBE":
      return <Youtube className="h-5 w-5 text-white" />
    case "TWITTER":
    case "X":
      return <XLogo className="h-5 w-5 text-white" />
    default:
      return <Globe2 className="h-5 w-5 text-white" />
  }
}

function gradientForPlatform(platform: string) {
  switch (platform) {
    case "INSTAGRAM":
      return "from-pink-500 to-purple-600"
    case "LINKEDIN":
      return "from-sky-600 to-blue-800"
    case "YOUTUBE":
      return "from-red-500 to-rose-600"
    case "TWITTER":
    case "X":
      return "from-slate-700 to-slate-900"
    case "FACEBOOK":
      return "from-blue-500 to-blue-700"
    default:
      return "from-gray-500 to-gray-700"
  }
}

function formatMetricNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "0"
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString()
}

function findMetric(metrics: MetricValue[], id: AnalyticsMetricId) {
  return metrics.find((metric) => metric.metricId === id && metric.available)
}

function metricValue(metrics: MetricValue[], id: AnalyticsMetricId) {
  return findMetric(metrics, id)?.value || 0
}

function metricDisplay(metric?: MetricValue) {
  if (!metric) return "0"
  return metric.displayValue || formatMetricNumber(metric.value)
}

function DateRangeDropdown({
  isOpen,
  onClose,
  dateRange,
  onDateChange,
  onApply,
}: {
  isOpen: boolean
  onClose: () => void
  dateRange: { startDate: string; endDate: string }
  onDateChange: (field: "startDate" | "endDate", value: string) => void
  onApply: () => void
}) {
  const [localDateRange, setLocalDateRange] = useState(dateRange)

  useEffect(() => {
    setLocalDateRange(dateRange)
  }, [dateRange])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-2 w-80">
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Custom Date Range</h3>
            <p className="text-xs text-muted-foreground">Select start and end dates</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={localDateRange.startDate}
              onChange={(event) => setLocalDateRange((current) => ({ ...current, startDate: event.target.value }))}
              className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs outline-none dark:border-white/10 dark:bg-neutral-800"
            />
            <input
              type="date"
              value={localDateRange.endDate}
              onChange={(event) => setLocalDateRange((current) => ({ ...current, endDate: event.target.value }))}
              className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs outline-none dark:border-white/10 dark:bg-neutral-800"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={onClose} className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-xs dark:border-white/10">
              Cancel
            </button>
            <button
              onClick={() => {
                onDateChange("startDate", localDateRange.startDate)
                onDateChange("endDate", localDateRange.endDate)
                onApply()
                onClose()
              }}
              className="flex-1 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-2 text-xs text-white"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function PostDrawer({ post, onClose }: { post: AnalyticsPostRow | null; onClose: () => void }) {
  return (
    <div className={`fixed inset-0 z-[60] ${post ? "" : "pointer-events-none"}`}>
      <div className={`absolute inset-0 bg-black/40 transition-opacity ${post ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div className={`absolute right-0 top-0 h-full w-full max-w-xl transform border-l border-black/10 bg-white shadow-2xl transition-transform dark:border-white/10 dark:bg-neutral-900 ${post ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-black/10 px-5 dark:border-white/10">
          <div className="truncate pr-4 font-semibold">{post?.title || "Post details"}</div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/5">
            <ChevronRight className="rotate-180" />
          </button>
        </div>
        <div className="h-[calc(100%-4rem)] space-y-4 overflow-y-auto p-5">
          {post ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{post.platform}</span>
                <span>&bull;</span>
                <span>{post.publishedAt ? format(new Date(post.publishedAt), "MMM dd, yyyy") : "Unknown date"}</span>
              </div>
              {post.thumbnailUrl ? <img src={post.thumbnailUrl} alt={post.title} className="w-full rounded-2xl border border-black/5 object-cover dark:border-white/5" /> : null}
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(post.metrics).map(([metricId, value]) => (
                  <div key={metricId} className="rounded-xl border border-black/5 bg-white/60 p-3 dark:border-white/5 dark:bg-neutral-800/40">
                    <div className="text-xs text-muted-foreground">{metricLabelMap[metricId as AnalyticsMetricId] || metricId}</div>
                    <div className="mt-1 font-semibold">{typeof value === "number" ? formatMetricNumber(value) : "0"}</div>
                  </div>
                ))}
              </div>
              {post.description ? <div className="rounded-2xl border border-black/5 bg-white/60 p-4 text-sm dark:border-white/5 dark:bg-neutral-800/40">{post.description}</div> : null}
              {post.permalink ? <Link href={post.permalink} target="_blank" className="inline-flex text-sm font-medium text-rose-600">View original</Link> : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function AnalyticsOverview({
  period,
  dateRange,
  isCustomDateRange,
  onPeriodChange,
  onCustomDateChange,
  onApplyCustomDateRange,
  lockedPlatform,
  initialSocialAccounts,
}: AnalyticsOverviewProps) {
  const [selectedPlatform, setSelectedPlatform] = useState(lockedPlatform || "all")
  const [selectedAccount, setSelectedAccount] = useState("all")
  const [selectedPost, setSelectedPost] = useState<AnalyticsPostRow | null>(null)
  const [showDateModal, setShowDateModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const socialAccountsQuery = useSocialAccountsQuery(true, initialSocialAccounts)

  useEffect(() => {
    if (lockedPlatform) setSelectedPlatform(lockedPlatform)
  }, [lockedPlatform])

  const accounts = useMemo(() => {
    const raw = Array.isArray(socialAccountsQuery.data) ? (socialAccountsQuery.data as SocialAccountOption[]) : []
    return raw.filter((account) => !lockedPlatform || account.platform === lockedPlatform)
  }, [lockedPlatform, socialAccountsQuery.data])

  const uniquePlatforms = useMemo(() => {
    return Array.from(new Set(accounts.map((account) => account.platform).filter(Boolean)))
  }, [accounts])

  const queryUrl = useMemo(() => {
    const base = lockedPlatform ? `/api/analytics/platform/${lockedPlatform}` : "/api/analytics/overview"
    const params = new URLSearchParams()
    if (isCustomDateRange) {
      params.set("startDate", dateRange.startDate)
      params.set("endDate", dateRange.endDate)
    } else {
      params.set("period", period)
    }
    if (!lockedPlatform && selectedPlatform !== "all") params.set("platform", selectedPlatform)
    if (selectedAccount !== "all") params.set("accountId", selectedAccount)
    return `${base}?${params.toString()}`
  }, [dateRange.endDate, dateRange.startDate, isCustomDateRange, lockedPlatform, period, selectedAccount, selectedPlatform])

  const analyticsQuery = useAnalyticsOverviewQuery(queryUrl, Boolean(queryUrl))
  const data = analyticsQuery.data as AnalyticsOverviewVM | undefined

  const accountOptions = useMemo(
    () => accounts.filter((account) => selectedPlatform === "all" || account.platform === selectedPlatform),
    [accounts, selectedPlatform]
  )

  useEffect(() => {
    if (selectedAccount === "all") return
    const exists = accountOptions.some((account) => account.id === selectedAccount || account.accountId === selectedAccount)
    if (!exists) setSelectedAccount("all")
  }, [accountOptions, selectedAccount])

  const selectedAccountLabel = useMemo(() => {
    const account = accountOptions.find((item) => item.id === selectedAccount || item.accountId === selectedAccount)
    return account?.displayName || account?.username || account?.accountName || "Selected account"
  }, [accountOptions, selectedAccount])

  if (analyticsQuery.isLoading && !data) {
    return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">{[...Array(4)].map((_, index) => <div key={index} className="h-32 rounded-3xl border border-black/5 bg-white/60 shadow-lg dark:border-white/5 dark:bg-neutral-900/60" />)}</div>
  }

  if (analyticsQuery.error) {
    return <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">{analyticsQuery.error instanceof Error ? analyticsQuery.error.message : "Analytics failed to load"}</div>
  }

  if (!data) {
    return <div className="rounded-3xl border border-black/5 bg-white/60 p-8 text-center text-sm text-muted-foreground shadow-lg dark:border-white/5 dark:bg-neutral-900/60">No analytics data available yet.</div>
  }

  const summaryMetrics = data.summary.metrics || []
  const topPosts = data.topPosts || []
  const platformBreakdown = data.platformBreakdown || []
  const accountBreakdown = data.accountBreakdown || []
  const availableMetrics = summaryMetrics.filter((metric) => metric.available)

  const totalPostsMetric = findMetric(summaryMetrics, "postCount")
  const impressionsMetric = findMetric(summaryMetrics, "impressions") || findMetric(summaryMetrics, "views")
  const likesMetric = findMetric(summaryMetrics, "likes")
  const commentsMetric = findMetric(summaryMetrics, "comments")
  const sharesMetric = findMetric(summaryMetrics, "shares")
  const engagementRateMetric = findMetric(summaryMetrics, "engagementRate")
  const followersMetric = findMetric(summaryMetrics, "followers")
  const totalEngagement = (likesMetric?.value || 0) + (commentsMetric?.value || 0) + (sharesMetric?.value || 0)

  const timelineData = (data.timeline || []).map((point) => ({
    label: point.label,
    primary: Number(point.metrics.impressions || point.metrics.views || 0),
    engagement: Number(point.metrics.engagementCount || 0),
    posts: Number(point.postCount || point.metrics.postCount || 0),
  }))

  const platformCards = (lockedPlatform ? [lockedPlatform] : uniquePlatforms).map((platform) => {
    const platformAccounts = accounts.filter((account) => account.platform === platform)
    const breakdown = platformBreakdown.find((item) => item.platform === platform)
    return {
      platform,
      platformAccounts,
      posts: metricValue(breakdown?.metrics || [], "postCount"),
      reach: metricValue(breakdown?.metrics || [], "impressions") || metricValue(breakdown?.metrics || [], "views"),
      engagementRate: metricValue(breakdown?.metrics || [], "engagementRate"),
    }
  })

  const shareData = platformBreakdown
    .map((platform, index) => ({
      name: platform.platform,
      value: metricValue(platform.metrics, "impressions") || metricValue(platform.metrics, "views") || metricValue(platform.metrics, "engagementCount"),
      color: palette[index % palette.length],
    }))
    .filter((item) => item.value > 0)

  const hasTraffic = Boolean(data.advancedInsights?.trafficSources?.length)
  const hasDevices = Boolean(data.advancedInsights?.deviceTypes?.length)
  const hasDemographics = Boolean(data.advancedInsights?.demographics?.length)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const response = await fetch("/api/analytics/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: lockedPlatform || (selectedPlatform !== "all" ? selectedPlatform : undefined),
          accountId: selectedAccount !== "all" ? selectedAccount : undefined,
          scope: "all",
        }),
      })
      if (!response.ok) throw new Error("Refresh failed")
      await analyticsQuery.refetch()
    } catch (error) {
      console.error(error)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      {data.requiresHistoryImport ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold">Post history sync is needed for richer timelines</div>
              <div className="text-sm opacity-80">Account analytics is available, but post-level sections improve once imported history has synced.</div>
            </div>
            <button onClick={handleRefresh} className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2 text-sm font-medium text-white">
              Refresh Analytics
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-black/5 bg-white/60 p-6 shadow-lg dark:border-white/5 dark:bg-neutral-900/60">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-bold">Connected Platforms</h3>
            <p className="text-sm text-muted-foreground">Select a platform and account scope to shape the analytics view.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{dateRange.startDate ? format(new Date(dateRange.startDate), "MMM dd") : "Unknown"} - {dateRange.endDate ? format(new Date(dateRange.endDate), "MMM dd") : "Unknown"}</span>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-black/10 bg-white/70 p-1 dark:border-white/10 dark:bg-neutral-800/40">
              {["7", "30", "90"].map((days) => (
                <button
                  key={days}
                  onClick={() => onPeriodChange(days)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${period === days && !isCustomDateRange ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white" : "text-slate-600 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/5"}`}
                >
                  {days}d
                </button>
              ))}
              <div className="relative">
                <button
                  onClick={() => setShowDateModal(true)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${isCustomDateRange || showDateModal ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white" : "text-slate-600 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/5"}`}
                >
                  Custom
                </button>
                <DateRangeDropdown
                  isOpen={showDateModal}
                  onClose={() => setShowDateModal(false)}
                  dateRange={dateRange}
                  onDateChange={onCustomDateChange}
                  onApply={onApplyCustomDateRange}
                />
              </div>
            </div>
            <button onClick={handleRefresh} disabled={refreshing} className="rounded-xl border border-black/10 p-2 transition hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-4 pb-3">
            {!lockedPlatform ? (
              <button
                onClick={() => {
                  setSelectedPlatform("all")
                  setSelectedAccount("all")
                }}
                className={`min-w-[240px] rounded-xl border p-4 text-left transition ${selectedPlatform === "all" ? "border-rose-400 bg-rose-50 shadow-lg shadow-rose-500/10 dark:bg-rose-900/20" : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"}`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                    <Globe2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">All Platforms</div>
                    <div className="text-xs text-muted-foreground">Combined analytics</div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Posts</span><span className="font-semibold">{metricDisplay(totalPostsMetric)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Reach</span><span className="font-semibold">{metricDisplay(impressionsMetric)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Engagement</span><span className="font-semibold">{formatMetricNumber(totalEngagement)}</span></div>
                </div>
              </button>
            ) : null}

            {platformCards.map((card) => {
              const selected = selectedPlatform === card.platform
              return (
                <button
                  key={card.platform}
                  onClick={() => {
                    setSelectedPlatform(card.platform)
                    setSelectedAccount("all")
                  }}
                  className={`min-w-[240px] rounded-xl border p-4 text-left transition ${selected ? "border-rose-400 bg-rose-50 shadow-lg shadow-rose-500/10 dark:bg-rose-900/20" : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"}`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${gradientForPlatform(card.platform)}`}>{iconForPlatform(card.platform)}</div>
                    <div>
                      <div className="font-semibold">{card.platform === "TWITTER" ? "X" : card.platform}</div>
                      <div className="text-xs text-muted-foreground">{card.platformAccounts.length} account{card.platformAccounts.length === 1 ? "" : "s"}</div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <select
                      value={selected ? selectedAccount : "all"}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => {
                        event.stopPropagation()
                        setSelectedPlatform(card.platform)
                        setSelectedAccount(event.target.value)
                      }}
                      className="w-full rounded-lg border border-black/10 bg-white/80 px-2 py-1.5 text-xs outline-none dark:border-white/10 dark:bg-neutral-800/40"
                    >
                      <option value="all">All Accounts ({card.platformAccounts.length})</option>
                      {card.platformAccounts.map((account) => {
                        const value = account.accountId || account.id
                        return <option key={value} value={value}>{account.displayName || account.username || account.accountName || account.platform}</option>
                      })}
                    </select>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Posts</span><span className="font-semibold">{formatMetricNumber(card.posts)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Reach</span><span className="font-semibold">{formatMetricNumber(card.reach)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Engagement</span><span className="font-semibold">{card.engagementRate.toFixed(2)}%</span></div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Posts", value: metricDisplay(totalPostsMetric), meta: "Published content", icon: BarChart3, gradient: "linear-gradient(135deg,#f43f5e,#ec4899)", iconColor: "text-rose-600" },
          { label: impressionsMetric?.metricId === "views" ? "Total Views" : "Total Impressions", value: metricDisplay(impressionsMetric), meta: "Content reach", icon: Eye, gradient: "linear-gradient(135deg,#10b981,#06b6d4)", iconColor: "text-emerald-600" },
          { label: "Total Engagement", value: formatMetricNumber(totalEngagement), meta: "Likes, comments, shares", icon: Heart, gradient: "linear-gradient(135deg,#f59e0b,#f97316)", iconColor: "text-orange-600" },
          { label: followersMetric ? "Followers / Rate" : "Engagement Rate", value: metricDisplay(engagementRateMetric), meta: followersMetric ? `Followers: ${metricDisplay(followersMetric)}` : "Average rate", icon: followersMetric ? Users : TrendingUp, gradient: "linear-gradient(135deg,#8b5cf6,#ec4899)", iconColor: "text-purple-600" },
        ].map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="relative overflow-hidden rounded-3xl border border-black/5 bg-white/60 p-5 shadow-lg transition-transform hover:-translate-y-1 dark:border-white/5 dark:bg-neutral-900/60">
              <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full opacity-20" style={{ background: card.gradient }} />
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="text-xs opacity-70">{card.label}</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">{card.value}</div>
                  <div className="mt-1 text-xs opacity-60">{card.meta}</div>
                </div>
                <div className="rounded-lg bg-black/5 p-2 dark:bg-white/10">
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-black/5 bg-white/60 p-5 shadow-lg dark:border-white/5 dark:bg-neutral-900/60">
          <div className="mb-4">
            <h3 className="text-base font-semibold">Top Performing Posts</h3>
            <p className="text-xs text-muted-foreground">
              Real Bundle-backed post metrics
              {selectedPlatform !== "all" ? ` from ${selectedPlatform}` : ""}
              {selectedAccount !== "all" && selectedPlatform !== "all" ? ` (${selectedAccountLabel})` : ""}
            </p>
          </div>
          <div className="max-h-96 space-y-3 overflow-y-auto pr-2">
            {topPosts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-black/10 p-5 text-sm text-muted-foreground dark:border-white/10">
                No imported posts matched this selection yet.
              </div>
            ) : null}
            {topPosts.map((post) => (
              <div key={post.id} onClick={() => setSelectedPost(post)} className="cursor-pointer rounded-xl border border-black/5 p-4 transition hover:bg-black/[0.03] hover:shadow-sm dark:border-white/5 dark:hover:bg-white/[0.03]">
                <div className="flex items-start gap-3">
                  {post.thumbnailUrl ? (
                    <img src={post.thumbnailUrl} alt={post.title} className="h-12 w-16 flex-shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500 dark:bg-neutral-800 dark:text-slate-400">No img</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="mb-2 line-clamp-2 text-sm font-medium">{post.title}</h4>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {Object.entries(post.metrics).filter(([, value]) => typeof value === "number" && Number(value) > 0).slice(0, 4).map(([metricId, value]) => (
                        <span key={`${post.id}-${metricId}`} className="flex items-center gap-1">
                          {metricId === "likes" ? <Heart className="h-3 w-3" /> : metricId === "comments" ? <MessageCircle className="h-3 w-3" /> : metricId === "shares" ? <Share2 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          <span>{formatMetricNumber(Number(value))}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradientForPlatform(post.platform)}`}>
                    {iconForPlatform(post.platform)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white/60 p-5 shadow-lg dark:border-white/5 dark:bg-neutral-900/60">
          <div className="mb-4">
            <h3 className="text-base font-semibold">Daily Performance</h3>
            <p className="text-xs text-muted-foreground">Reach, engagement, and post activity over time.</p>
          </div>
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.05} />
                <XAxis dataKey="label" stroke="currentColor" opacity={0.5} />
                <YAxis stroke="currentColor" opacity={0.5} />
                <Tooltip contentStyle={{ backgroundColor: "rgba(255,255,255,0.98)", border: "none", borderRadius: "16px", boxShadow: "0 20px 40px -10px rgba(0,0,0,0.15)" }} />
                <Line type="monotone" dataKey="primary" stroke="#f43f5e" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="engagement" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="posts" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="rounded-xl border border-dashed border-black/10 p-5 text-sm text-muted-foreground dark:border-white/10">Timeline data is not available for this selection yet.</div>
          )}
        </div>
      </div>

      {selectedPlatform === "all" && platformBreakdown.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-black/5 bg-white/60 p-5 shadow-lg dark:border-white/5 dark:bg-neutral-900/60">
            <div className="mb-4">
              <h3 className="text-base font-semibold">Platform Performance</h3>
              <p className="text-xs text-muted-foreground">Compare connected platforms using supported live metrics.</p>
            </div>
            <div className="space-y-3">
              {platformBreakdown.map((platform) => {
                const reach = metricValue(platform.metrics, "impressions") || metricValue(platform.metrics, "views")
                const rate = metricValue(platform.metrics, "engagementRate")
                return (
                  <div key={platform.platform} className="rounded-xl border border-black/5 bg-white/50 p-4 dark:border-white/5 dark:bg-neutral-800/30">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${gradientForPlatform(platform.platform)}`}>{iconForPlatform(platform.platform)}</div>
                        <div>
                          <div className="font-medium">{platform.platform}</div>
                          <div className="text-xs text-muted-foreground">{platform.accountCount} account{platform.accountCount === 1 ? "" : "s"}</div>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-semibold">{rate.toFixed(2)}%</div>
                        <div className="text-xs text-muted-foreground">engagement</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Reach</span>
                      <span className="font-semibold">{formatMetricNumber(reach)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-black/5 bg-white/60 p-5 shadow-lg dark:border-white/5 dark:bg-neutral-900/60">
            <div className="mb-4">
              <h3 className="text-base font-semibold">Reach Share</h3>
              <p className="text-xs text-muted-foreground">How selected reach or view volume is distributed across platforms.</p>
            </div>
            {shareData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={shareData} cx="50%" cy="50%" innerRadius={55} outerRadius={92} paddingAngle={3} dataKey="value">
                    {shareData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "rgba(255,255,255,0.98)", border: "none", borderRadius: "16px", boxShadow: "0 20px 40px -10px rgba(0,0,0,0.15)" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="rounded-xl border border-dashed border-black/10 p-5 text-sm text-muted-foreground dark:border-white/10">Platform comparison needs active metrics from at least one connected platform.</div>
            )}
          </div>
        </div>
      ) : null}

      {accountBreakdown.length > 0 ? (
        <div className="rounded-3xl border border-black/5 bg-white/60 p-5 shadow-lg dark:border-white/5 dark:bg-neutral-900/60">
          <div className="mb-4">
            <h3 className="text-base font-semibold">Account Breakdown</h3>
            <p className="text-xs text-muted-foreground">The strongest live metrics for each connected account in scope.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {accountBreakdown.map((account) => (
              <div key={account.id} className="rounded-xl border border-black/5 bg-white/50 p-4 dark:border-white/5 dark:bg-neutral-800/30">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{account.label}</div>
                    <div className="truncate text-xs text-muted-foreground">{account.platform}{account.username ? ` • @${account.username}` : ""}</div>
                  </div>
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradientForPlatform(account.platform)}`}>
                    {iconForPlatform(account.platform)}
                  </div>
                </div>
                <div className="space-y-2">
                  {account.metrics.filter((metric) => metric.available).slice(0, 4).map((metric) => (
                    <div key={`${account.id}-${metric.metricId}`} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{metricLabelMap[metric.metricId]}</span>
                      <span className="font-semibold">{metric.displayValue}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {hasTraffic || hasDevices || hasDemographics ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {hasTraffic ? (
            <div className="rounded-3xl border border-black/5 bg-white/60 p-5 shadow-lg dark:border-white/5 dark:bg-neutral-900/60">
              <div className="mb-4">
                <h3 className="text-base font-semibold">Traffic Sources</h3>
                <p className="text-xs text-muted-foreground">Shown only when Bundle exposes source-level traffic data.</p>
              </div>
              <div className="space-y-3">
                {data.advancedInsights?.trafficSources?.map((item, index) => {
                  const max = Math.max(...(data.advancedInsights?.trafficSources || []).map((entry) => entry.value), 1)
                  return (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span>{item.label}</span>
                        <span className="font-semibold">{formatMetricNumber(item.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 dark:bg-neutral-700">
                        <div className="h-2 rounded-full" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: palette[index % palette.length] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {hasDevices ? (
            <div className="rounded-3xl border border-black/5 bg-white/60 p-5 shadow-lg dark:border-white/5 dark:bg-neutral-900/60">
              <div className="mb-4">
                <h3 className="text-base font-semibold">Device Types</h3>
                <p className="text-xs text-muted-foreground">Device distribution when the selected platform provides it.</p>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.advancedInsights?.deviceTypes || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.05} />
                  <XAxis type="number" stroke="currentColor" opacity={0.5} />
                  <YAxis type="category" dataKey="label" stroke="currentColor" opacity={0.5} width={90} />
                  <Tooltip contentStyle={{ backgroundColor: "rgba(255,255,255,0.98)", border: "none", borderRadius: "16px", boxShadow: "0 20px 40px -10px rgba(0,0,0,0.15)" }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}

          {hasDemographics ? (
            <div className="rounded-3xl border border-black/5 bg-white/60 p-5 shadow-lg dark:border-white/5 dark:bg-neutral-900/60">
              <div className="mb-4">
                <h3 className="text-base font-semibold">Audience Segments</h3>
                <p className="text-xs text-muted-foreground">Demographic slices from Bundle when available.</p>
              </div>
              <div className="space-y-3">
                {data.advancedInsights?.demographics?.map((item, index) => {
                  const max = Math.max(...(data.advancedInsights?.demographics || []).map((entry) => entry.value), 1)
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.label}</span>
                        <span className="font-semibold">{formatMetricNumber(item.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 dark:bg-neutral-700">
                        <div className="h-2 rounded-full" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: palette[index % palette.length] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {availableMetrics.length > 0 ? (
        <div className="rounded-3xl border border-black/5 bg-white/60 p-5 shadow-lg dark:border-white/5 dark:bg-neutral-900/60">
          <div className="mb-4">
            <h3 className="text-base font-semibold">All Available Metrics</h3>
            <p className="text-xs text-muted-foreground">Only metrics Bundle actually returns for the current scope.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {availableMetrics.map((metric) => (
              <div key={metric.metricId} className="rounded-xl border border-black/5 bg-white/50 p-4 dark:border-white/5 dark:bg-neutral-800/30">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">{metricLabelMap[metric.metricId]}</div>
                    <div className="mt-1 text-xl font-semibold">{metric.displayValue}</div>
                  </div>
                  <div className="rounded-lg bg-black/5 p-2 text-rose-500 dark:bg-white/10">
                    {metric.metricId === "likes" ? <Heart className="h-4 w-4" /> : metric.metricId === "comments" ? <MessageCircle className="h-4 w-4" /> : metric.metricId === "shares" ? <Share2 className="h-4 w-4" /> : metric.metricId === "followers" ? <Users className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <PostDrawer post={selectedPost} onClose={() => setSelectedPost(null)} />
    </div>
  )
}
