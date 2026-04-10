import { eachDayOfInterval, format, isValid, parseISO } from 'date-fns'

import { supabaseAdmin } from '@/lib/supabase/admin'
import type {
  AccountAnalyticsVM,
  AnalyticsAdvancedBreakdownItem,
  AnalyticsAdvancedInsights,
  AnalyticsDataFreshness,
  AnalyticsMetricId,
  AnalyticsOverviewVM,
  AnalyticsPostRow,
  AnalyticsSummaryVM,
  AnalyticsTimelinePoint,
  MetricDefinition,
  MetricValue,
  PlatformAnalyticsVM,
  PlatformCapabilityMap,
} from '@/types/analytics'

const BUNDLE_API = 'https://api.bundle.social/api/v1'
const CACHE_TTL_MS = 30 * 60 * 1000
const DEFAULT_POST_IMPORT_LIMIT = 60
const DEFAULT_REFRESH_COOLDOWN_MINUTES = 30

const METRIC_DEFINITIONS: MetricDefinition[] = [
  { id: 'impressions', label: 'Impressions', shortLabel: 'Impressions', format: 'number', category: 'reach' },
  { id: 'impressionsUnique', label: 'Unique Impressions', shortLabel: 'Unique', format: 'number', category: 'reach' },
  { id: 'views', label: 'Views', shortLabel: 'Views', format: 'number', category: 'reach' },
  { id: 'viewsUnique', label: 'Unique Views', shortLabel: 'Unique Views', format: 'number', category: 'reach' },
  { id: 'likes', label: 'Likes', shortLabel: 'Likes', format: 'number', category: 'engagement' },
  { id: 'comments', label: 'Comments', shortLabel: 'Comments', format: 'number', category: 'engagement' },
  { id: 'shares', label: 'Shares', shortLabel: 'Shares', format: 'number', category: 'engagement' },
  { id: 'saves', label: 'Saves', shortLabel: 'Saves', format: 'number', category: 'engagement' },
  { id: 'followers', label: 'Followers', shortLabel: 'Followers', format: 'number', category: 'audience' },
  { id: 'following', label: 'Following', shortLabel: 'Following', format: 'number', category: 'audience' },
  { id: 'postCount', label: 'Posts', shortLabel: 'Posts', format: 'number', category: 'publishing' },
  { id: 'engagementCount', label: 'Engagement', shortLabel: 'Engagement', format: 'number', category: 'engagement' },
  { id: 'engagementRate', label: 'Engagement Rate', shortLabel: 'Engagement Rate', format: 'percent', category: 'engagement' },
]

const DEFAULT_CAPABILITY_ORDER: AnalyticsMetricId[] = [
  'impressions',
  'views',
  'likes',
  'comments',
  'shares',
  'saves',
  'followers',
  'postCount',
  'engagementCount',
  'engagementRate',
]

type BundlePlatform =
  | 'BLUESKY'
  | 'FACEBOOK'
  | 'GOOGLE_BUSINESS'
  | 'INSTAGRAM'
  | 'LINKEDIN'
  | 'MASTODON'
  | 'PINTEREST'
  | 'REDDIT'
  | 'THREADS'
  | 'TIKTOK'
  | 'YOUTUBE'

interface ConnectedAccountRow {
  id: string
  account_id: string | null
  platform: string
  bundle_social_account_id: string | null
  display_name: string | null
  username: string | null
  avatar_url: string | null
}

interface AnalyticsCacheRow {
  bundle_social_account_id: string
  data: any
  fetched_at: string
}

interface BundleAccountAnalyticsItem {
  id: string
  socialAccountId: string
  impressions: number
  impressionsUnique: number
  views: number
  viewsUnique: number
  likes: number
  comments: number
  postCount: number
  followers: number
  following: number
  forced: boolean
  createdAt: string | null
  updatedAt: string | null
}

interface BundleAccountAnalyticsResponse {
  socialAccount?: {
    id?: string
    type?: string
    username?: string | null
    displayName?: string | null
    avatarUrl?: string | null
  }
  items?: BundleAccountAnalyticsItem[]
}

interface BundleImportedPostAnalytics {
  id: string
  profilePostId: string
  impressions: number
  impressionsUnique: number
  views: number
  viewsUnique: number
  likes: number
  dislikes: number
  comments: number
  shares: number
  saves: number
  raw?: unknown
  forced: boolean
  createdAt: string | null
  updatedAt: string | null
}

interface BundleImportedPost {
  id: string
  socialAccountId: string
  postId?: string | null
  externalId?: string | null
  title?: string | null
  description?: string | null
  smallThumbnail?: string | null
  thumbnail?: string | null
  permalink?: string | null
  extraData?: unknown
  subreddit?: string | null
  publishedAt?: string | null
  type: 'POST' | 'REEL' | 'STORY' | 'VIDEO' | 'IMAGE'
  internal: boolean
  importedAt?: string | null
  createdAt: string | null
  updatedAt: string | null
  analytics: BundleImportedPostAnalytics[]
}

interface BundleImportedPostsResponse {
  posts?: BundleImportedPost[]
}

interface OverviewParams {
  userId: string
  platform?: string | null
  accountId?: string | null
  period?: string | null
  startDate?: string | null
  endDate?: string | null
  force?: boolean
}

interface NormalizedAccountMetrics {
  metrics: Partial<Record<AnalyticsMetricId, number>>
  latestUpdatedAt: string | null
}

interface SelectionRange {
  startDate: string
  endDate: string
  periodLabel: string
  rangeKey: string
}

function formatMetricValue(metricId: AnalyticsMetricId, value: number | null): string {
  if (value === null || Number.isNaN(value)) return 'N/A'
  if (metricId === 'engagementRate') return `${value.toFixed(2)}%`
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`
  return Math.round(value).toLocaleString()
}

function metricValue(metricId: AnalyticsMetricId, value: number | null, source: MetricValue['source']): MetricValue {
  return {
    metricId,
    value,
    displayValue: formatMetricValue(metricId, value),
    available: value !== null,
    source,
  }
}

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function sumMetric(metrics: Array<Partial<Record<AnalyticsMetricId, number>>>, metricId: AnalyticsMetricId): number {
  return metrics.reduce((sum, item) => sum + safeNumber(item[metricId]), 0)
}

function normalizePlatform(platform: string | null | undefined): BundlePlatform | null {
  const normalized = (platform || '').trim().toUpperCase()

  switch (normalized) {
    case 'BLUESKY':
    case 'FACEBOOK':
    case 'GOOGLE_BUSINESS':
    case 'INSTAGRAM':
    case 'LINKEDIN':
    case 'MASTODON':
    case 'PINTEREST':
    case 'REDDIT':
    case 'THREADS':
    case 'TIKTOK':
    case 'YOUTUBE':
      return normalized
    default:
      return null
  }
}

function parseSelectionRange(params: Pick<OverviewParams, 'period' | 'startDate' | 'endDate'>): SelectionRange {
  const today = new Date()
  const end = params.endDate ? parseISO(params.endDate) : today
  const periodDays = Number.parseInt(params.period || '30', 10)
  const start = params.startDate
    ? parseISO(params.startDate)
    : new Date(today.getTime() - (Number.isFinite(periodDays) ? periodDays : 30) * 24 * 60 * 60 * 1000)

  const safeStart = isValid(start) ? start : new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const safeEnd = isValid(end) ? end : today

  return {
    startDate: format(safeStart, 'yyyy-MM-dd'),
    endDate: format(safeEnd, 'yyyy-MM-dd'),
    periodLabel: params.startDate || params.endDate ? 'Custom Range' : `Last ${params.period || '30'} Days`,
    rangeKey: `${format(safeStart, 'yyyy-MM-dd')}:${format(safeEnd, 'yyyy-MM-dd')}`,
  }
}

async function fetchBundle<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

  try {
    const response = await fetch(`${BUNDLE_API}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.BUNDLE_SOCIAL_API_KEY || '',
        ...(init?.headers || {}),
      },
    })

    if (!response.ok) {
      const text = await response.text()
      const error = new Error(`Bundle request failed (${response.status}): ${text}`)
      ;(error as any).status = response.status
      throw error
    }

    return await response.json() as T
  } finally {
    clearTimeout(timeoutId)
  }
}

async function getBundleTeamId(userId: string): Promise<string | null> {
  const { data } = await (supabaseAdmin as any)
    .from('teams')
    .select('bundle_social_team_id')
    .eq('owner_id', userId)
    .maybeSingle()

  return data?.bundle_social_team_id || null
}

async function getConnectedAccounts(userId: string): Promise<ConnectedAccountRow[]> {
  const { data, error } = await (supabaseAdmin as any)
    .from('social_accounts')
    .select('id, account_id, platform, bundle_social_account_id, display_name, username, avatar_url')
    .eq('user_id', userId)
    .eq('is_connected', true)
    .not('bundle_social_account_id', 'is', null)

  if (error) throw error
  return (data || []) as ConnectedAccountRow[]
}

async function getCacheRows(bundleSocialAccountIds: string[]): Promise<Map<string, AnalyticsCacheRow>> {
  if (bundleSocialAccountIds.length === 0) return new Map()

  try {
    const { data } = await (supabaseAdmin as any)
      .from('analytics_cache')
      .select('bundle_social_account_id, data, fetched_at')
      .in('bundle_social_account_id', bundleSocialAccountIds)

    return new Map(((data || []) as AnalyticsCacheRow[]).map((row) => [row.bundle_social_account_id, row]))
  } catch {
    return new Map()
  }
}

async function writeCacheRow(userId: string, account: ConnectedAccountRow, range: SelectionRange, payload: unknown, fetchedAt: string) {
  try {
    await (supabaseAdmin as any)
      .from('analytics_cache')
      .upsert(
        {
          user_id: userId,
          bundle_social_account_id: account.bundle_social_account_id,
          platform: account.platform,
          period: range.rangeKey,
          data: payload,
          fetched_at: fetchedAt,
        },
        { onConflict: 'bundle_social_account_id,period' }
      )
  } catch {
    // optional table in some environments
  }
}

async function persistAccountSnapshot(
  userId: string,
  account: ConnectedAccountRow,
  snapshotDate: string,
  metrics: Partial<Record<AnalyticsMetricId, number>>,
  extra: unknown
) {
  try {
    await (supabaseAdmin as any)
      .from('analytics_account_daily_snapshots')
      .upsert(
        {
          user_id: userId,
          social_account_id: account.id,
          bundle_social_account_id: account.bundle_social_account_id,
          platform: account.platform,
          snapshot_date: snapshotDate,
          metrics,
          extra,
        },
        { onConflict: 'bundle_social_account_id,snapshot_date' }
      )
  } catch {
    // best-effort persistence
  }
}

async function persistPostSnapshots(
  userId: string,
  accountIdByBundleId: Map<string, string>,
  platform: string,
  posts: AnalyticsPostRow[]
) {
  if (posts.length === 0) return

  try {
    await (supabaseAdmin as any)
      .from('analytics_post_snapshots')
      .upsert(
        posts.map((post) => ({
          user_id: userId,
          social_account_id: post.socialAccountId ? accountIdByBundleId.get(post.socialAccountId) : null,
          bundle_social_account_id: post.socialAccountId || null,
          platform,
          imported_post_id: post.importedPostId || null,
          bundle_post_id: post.bundlePostId || null,
          snapshot_date: format(new Date(), 'yyyy-MM-dd'),
          published_at: post.publishedAt,
          post_type: post.contentType,
          metrics: post.metrics,
          content_preview: post.title.slice(0, 500),
          extra: post.raw || null,
        })),
        { onConflict: 'imported_post_id,snapshot_date' }
      )
  } catch {
    // best-effort persistence
  }
}

function isCacheFresh(row: AnalyticsCacheRow | undefined) {
  if (!row?.fetched_at) return false
  return Date.now() - new Date(row.fetched_at).getTime() < CACHE_TTL_MS
}

function latestByUpdatedAt<T extends { updatedAt?: string | null }>(items: T[] | undefined | null): T | null {
  if (!items || items.length === 0) return null

  return [...items].sort((left, right) => {
    const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0
    const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0
    return rightTime - leftTime
  })[0] || null
}

function postMetricsFromAnalytics(item: BundleImportedPostAnalytics | null): Partial<Record<AnalyticsMetricId, number>> {
  if (!item) return {}

  const engagementCount = safeNumber(item.likes) + safeNumber(item.comments) + safeNumber(item.shares) + safeNumber(item.saves)
  const denominator = safeNumber(item.impressions) || safeNumber(item.views)

  return {
    impressions: safeNumber(item.impressions),
    impressionsUnique: safeNumber(item.impressionsUnique),
    views: safeNumber(item.views),
    viewsUnique: safeNumber(item.viewsUnique),
    likes: safeNumber(item.likes),
    comments: safeNumber(item.comments),
    shares: safeNumber(item.shares),
    saves: safeNumber(item.saves),
    engagementCount,
    engagementRate: denominator > 0 ? (engagementCount / denominator) * 100 : 0,
  }
}

function accountMetricsFromItem(item: BundleAccountAnalyticsItem | null): NormalizedAccountMetrics {
  if (!item) return { metrics: {}, latestUpdatedAt: null }

  const engagementCount = safeNumber(item.likes) + safeNumber(item.comments)
  const denominator = safeNumber(item.impressions) || safeNumber(item.views)

  return {
    metrics: {
      impressions: safeNumber(item.impressions),
      impressionsUnique: safeNumber(item.impressionsUnique),
      views: safeNumber(item.views),
      viewsUnique: safeNumber(item.viewsUnique),
      likes: safeNumber(item.likes),
      comments: safeNumber(item.comments),
      postCount: safeNumber(item.postCount),
      followers: safeNumber(item.followers),
      following: safeNumber(item.following),
      engagementCount,
      engagementRate: denominator > 0 ? (engagementCount / denominator) * 100 : 0,
    },
    latestUpdatedAt: item.updatedAt || item.createdAt || null,
  }
}

function buildCapability(
  platform: string,
  metrics: Partial<Record<AnalyticsMetricId, number>>,
  advanced: AnalyticsAdvancedInsights | undefined,
  hasHistory: boolean
): PlatformCapabilityMap {
  const supportedMetricIds = DEFAULT_CAPABILITY_ORDER.filter((metricId) => {
    if (metricId === 'engagementRate') return true
    return safeNumber(metrics[metricId]) > 0
  })

  const summaryMetricIds = (supportedMetricIds.length > 0
    ? supportedMetricIds.filter((metricId) =>
        ['impressions', 'views', 'likes', 'comments', 'shares', 'saves', 'followers', 'engagementCount', 'engagementRate', 'postCount'].includes(metricId)
      )
    : ['engagementCount', 'engagementRate', 'postCount']) as AnalyticsMetricId[]

  const finalSummaryMetricIds = summaryMetricIds.slice(0, 6)
  if (!finalSummaryMetricIds.includes('engagementRate')) {
    finalSummaryMetricIds[finalSummaryMetricIds.length - 1] = 'engagementRate'
  }

  return {
    platform,
    supportedMetricIds: supportedMetricIds.length > 0 ? supportedMetricIds : ['engagementCount', 'engagementRate', 'postCount'],
    hasTimeline: hasHistory,
    hasTopPosts: hasHistory,
    hasFollowers: safeNumber(metrics.followers) > 0,
    hasDemographics: Boolean(advanced?.demographics?.length),
    hasTrafficSources: Boolean(advanced?.trafficSources?.length),
    hasDeviceTypes: Boolean(advanced?.deviceTypes?.length),
    hasPostHistory: hasHistory,
    summaryMetricIds: [...new Set(finalSummaryMetricIds)],
  }
}

function titleFromPost(post: BundleImportedPost): string {
  return post.title || post.description || post.externalId || 'Untitled post'
}

function filterPostsInRange(posts: BundleImportedPost[], range: SelectionRange): BundleImportedPost[] {
  return posts.filter((post) => {
    const publishedAt = post.publishedAt || post.createdAt
    if (!publishedAt) return false
    const day = format(new Date(publishedAt), 'yyyy-MM-dd')
    return day >= range.startDate && day <= range.endDate
  })
}

function aggregatePostRows(posts: BundleImportedPost[], accountLabels: Map<string, string>, platform: string): AnalyticsPostRow[] {
  return posts
    .map((post) => {
      const analytics = latestByUpdatedAt(post.analytics)
      return {
        id: `${platform}:${post.id}`,
        importedPostId: post.id,
        bundlePostId: post.postId || null,
        socialAccountId: post.socialAccountId,
        platform,
        accountLabel: accountLabels.get(post.socialAccountId) || null,
        publishedAt: post.publishedAt || post.createdAt,
        permalink: post.permalink || undefined,
        title: titleFromPost(post),
        description: post.description || null,
        thumbnailUrl: post.thumbnail || post.smallThumbnail || null,
        contentType: post.type || null,
        metrics: postMetricsFromAnalytics(analytics),
        raw: analytics?.raw,
      } satisfies AnalyticsPostRow
    })
    .sort((left, right) => safeNumber(right.metrics.engagementCount) - safeNumber(left.metrics.engagementCount))
}

function buildTimeline(posts: AnalyticsPostRow[], range: SelectionRange): AnalyticsTimelinePoint[] {
  const dayMap = new Map<string, AnalyticsTimelinePoint>()

  for (const day of eachDayOfInterval({
    start: new Date(`${range.startDate}T00:00:00`),
    end: new Date(`${range.endDate}T00:00:00`),
  })) {
    const key = format(day, 'yyyy-MM-dd')
    dayMap.set(key, {
      date: key,
      label: format(day, 'MMM d'),
      metrics: { impressions: 0, views: 0, likes: 0, comments: 0, shares: 0, engagementCount: 0 },
      postCount: 0,
    })
  }

  for (const post of posts) {
    if (!post.publishedAt) continue
    const key = format(new Date(post.publishedAt), 'yyyy-MM-dd')
    const current = dayMap.get(key)
    if (!current) continue

    current.postCount += 1
    current.metrics.impressions = safeNumber(current.metrics.impressions) + safeNumber(post.metrics.impressions)
    current.metrics.views = safeNumber(current.metrics.views) + safeNumber(post.metrics.views)
    current.metrics.likes = safeNumber(current.metrics.likes) + safeNumber(post.metrics.likes)
    current.metrics.comments = safeNumber(current.metrics.comments) + safeNumber(post.metrics.comments)
    current.metrics.shares = safeNumber(current.metrics.shares) + safeNumber(post.metrics.shares)
    current.metrics.engagementCount = safeNumber(current.metrics.engagementCount) + safeNumber(post.metrics.engagementCount)
  }

  return [...dayMap.values()]
}

function extractAdvancedInsights(raw: unknown): AnalyticsAdvancedInsights | undefined {
  if (!raw || typeof raw !== 'object') return undefined

  const collect = (value: unknown, keyMatcher: (key: string) => boolean): AnalyticsAdvancedBreakdownItem[] => {
    const items: AnalyticsAdvancedBreakdownItem[] = []
    const seen = new Set<unknown>()

    const visit = (node: unknown, keyHint?: string) => {
      if (!node || typeof node !== 'object' || seen.has(node)) return
      seen.add(node)

      if (Array.isArray(node) && keyHint && keyMatcher(keyHint)) {
        for (const entry of node) {
          if (!entry || typeof entry !== 'object') continue
          const objectEntry = entry as Record<string, unknown>
          const label = String(objectEntry.label ?? objectEntry.name ?? objectEntry.source ?? objectEntry.device ?? objectEntry.ageGroup ?? objectEntry.gender ?? '')
          const numeric = Object.values(objectEntry).find((candidate) => typeof candidate === 'number') as number | undefined
          if (label && numeric !== undefined) {
            items.push({ label, value: numeric })
          }
        }
        return
      }

      for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
        visit(child, key)
      }
    }

    visit(value)
    return items.slice(0, 8)
  }

  const includesAny = (key: string, fragments: string[]) => fragments.some((fragment) => key.toLowerCase().includes(fragment))
  const demographics = collect(raw, (key) => includesAny(key, ['demograph', 'gender', 'age']))
  const trafficSources = collect(raw, (key) => includesAny(key, ['traffic', 'source', 'referrer']))
  const deviceTypes = collect(raw, (key) => includesAny(key, ['device']))

  const result: AnalyticsAdvancedInsights = {}
  if (demographics.length) result.demographics = demographics
  if (trafficSources.length) result.trafficSources = trafficSources
  if (deviceTypes.length) result.deviceTypes = deviceTypes
  return Object.keys(result).length ? result : undefined
}

function buildSummary(
  title: string,
  subtitle: string,
  metricIds: AnalyticsMetricId[],
  postMetrics: Partial<Record<AnalyticsMetricId, number>>,
  accountMetrics?: Partial<Record<AnalyticsMetricId, number>>
): AnalyticsSummaryVM {
  return {
    title,
    subtitle,
    metrics: metricIds.map((metricId) => {
      const postValue = postMetrics[metricId]
      const accountValue = accountMetrics?.[metricId]
      const source = postValue !== undefined ? 'posts' : accountValue !== undefined ? 'account' : 'derived'
      return metricValue(metricId, postValue ?? accountValue ?? null, source)
    }),
  }
}

function aggregateMetrics(metricsList: Array<Partial<Record<AnalyticsMetricId, number>>>): Partial<Record<AnalyticsMetricId, number>> {
  const aggregated: Partial<Record<AnalyticsMetricId, number>> = {}

  for (const metricId of DEFAULT_CAPABILITY_ORDER) {
    if (metricId === 'engagementRate') continue
    const total = sumMetric(metricsList, metricId)
    if (total > 0) aggregated[metricId] = total
  }

  const denominator = safeNumber(aggregated.impressions) || safeNumber(aggregated.views)
  if (denominator > 0) {
    aggregated.engagementRate = (safeNumber(aggregated.engagementCount) / denominator) * 100
  } else if ((aggregated.engagementCount || 0) > 0) {
    aggregated.engagementRate = 0
  }

  return aggregated
}

async function fetchPlatformAccountAnalytics(teamId: string, platform: BundlePlatform): Promise<{ normalized: BundleAccountAnalyticsResponse | null; raw: any | null }> {
  try {
    const [normalized, raw] = await Promise.all([
      fetchBundle<BundleAccountAnalyticsResponse>(`/analytics/social-account?teamId=${teamId}&platformType=${platform}`),
      fetchBundle<any>(`/analytics/social-account/raw?teamId=${teamId}&platformType=${platform}`),
    ])

    return { normalized, raw }
  } catch (error) {
    console.warn(`Failed to fetch ${platform} account analytics:`, error)
    return { normalized: null, raw: null }
  }
}

async function fetchImportedPosts(teamId: string, platform: BundlePlatform): Promise<BundleImportedPost[]> {
  try {
    const result = await fetchBundle<BundleImportedPostsResponse>(
      `/post-history-import/posts?teamId=${teamId}&socialAccountType=${platform}&limit=${DEFAULT_POST_IMPORT_LIMIT}`
    )
    return result.posts || []
  } catch (error) {
    console.warn(`Failed to fetch imported posts for ${platform}:`, error)
    return []
  }
}

function getAccountItemForLocalAccount(
  account: ConnectedAccountRow,
  platformAccounts: ConnectedAccountRow[],
  normalized: BundleAccountAnalyticsResponse | null
): BundleAccountAnalyticsItem | null {
  const items = normalized?.items || []
  const bundleId = account.bundle_social_account_id
  const directMatch = items.find((item) => item.socialAccountId === bundleId)
  if (directMatch) return directMatch
  if (items.length === 1 && platformAccounts.length === 1) return items[0]
  if (normalized?.socialAccount?.id && normalized.socialAccount.id === bundleId && items.length > 0) return items[0]
  return null
}

export async function getAnalyticsOverview(params: OverviewParams): Promise<AnalyticsOverviewVM> {
  const range = parseSelectionRange(params)
  const bundleTeamId = await getBundleTeamId(params.userId)

  if (!bundleTeamId) {
    return {
      summary: buildSummary('Analytics', 'Connect a Bundle Social team to view analytics.', ['engagementCount', 'postCount'], {}),
      metricDefinitions: METRIC_DEFINITIONS,
      platformBreakdown: [],
      accountBreakdown: [],
      timeline: [],
      topPosts: [],
      capabilities: [],
      dataFreshness: {
        lastFetchedAt: null,
        lastSnapshotAt: null,
        stale: true,
        refreshCooldownMinutes: DEFAULT_REFRESH_COOLDOWN_MINUTES,
        nextRecommendedRefreshAt: null,
      },
      requiresHistoryImport: true,
      availablePlatforms: [],
      selection: {
        platform: params.platform || null,
        accountId: params.accountId || null,
        startDate: range.startDate,
        endDate: range.endDate,
        periodLabel: range.periodLabel,
      },
    }
  }

  const connectedAccounts = await getConnectedAccounts(params.userId)
  const selectedAccounts = connectedAccounts.filter((account) => {
    const matchesPlatform = !params.platform || account.platform === params.platform
    const matchesAccount = !params.accountId || account.id === params.accountId || account.account_id === params.accountId
    return matchesPlatform && matchesAccount
  })

  const availablePlatforms = [...new Set(connectedAccounts.map((account) => account.platform))].sort()

  if (selectedAccounts.length === 0) {
    return {
      summary: buildSummary('No analytics yet', 'Connect an account or change your filters to see analytics.', ['engagementCount', 'postCount'], {}),
      metricDefinitions: METRIC_DEFINITIONS,
      platformBreakdown: [],
      accountBreakdown: [],
      timeline: [],
      topPosts: [],
      capabilities: [],
      dataFreshness: {
        lastFetchedAt: null,
        lastSnapshotAt: null,
        stale: true,
        refreshCooldownMinutes: DEFAULT_REFRESH_COOLDOWN_MINUTES,
        nextRecommendedRefreshAt: null,
      },
      requiresHistoryImport: true,
      availablePlatforms,
      selection: {
        platform: params.platform || null,
        accountId: params.accountId || null,
        startDate: range.startDate,
        endDate: range.endDate,
        periodLabel: range.periodLabel,
      },
    }
  }

  const accountIdByBundleId = new Map(selectedAccounts.map((account) => [account.bundle_social_account_id as string, account.id]))
  const accountLabelByBundleId = new Map(
    selectedAccounts.map((account) => [account.bundle_social_account_id as string, account.display_name || account.username || account.account_id || account.platform])
  )
  const selectedBundleIds = selectedAccounts.map((account) => account.bundle_social_account_id!).filter(Boolean)
  const cacheRows = await getCacheRows(selectedBundleIds)
  const selectedPlatforms = [...new Set(selectedAccounts.map((account) => normalizePlatform(account.platform)).filter(Boolean))] as BundlePlatform[]

  const platformRemoteData = new Map<string, { normalized: BundleAccountAnalyticsResponse | null; raw: any | null; importedPosts: BundleImportedPost[] }>()

  // Optimization: Identify platforms that actually need a refresh
  const platformsToFetch = selectedPlatforms.filter(platform => {
    if (params.force) return true
    const platformAccounts = selectedAccounts.filter(a => normalizePlatform(a.platform) === platform)
    return platformAccounts.some(account => {
      const cacheRow = cacheRows.get(account.bundle_social_account_id!)
      return !isCacheFresh(cacheRow)
    })
  })

  if (platformsToFetch.length > 0) {
    await Promise.all(
      platformsToFetch.map(async (platform) => {
        const [analyticsData, importedPosts] = await Promise.all([
          fetchPlatformAccountAnalytics(bundleTeamId, platform),
          fetchImportedPosts(bundleTeamId, platform),
        ])

        platformRemoteData.set(platform, {
          normalized: analyticsData.normalized,
          raw: analyticsData.raw,
          importedPosts,
        })
      })
    )
  }

  const accountBreakdown: AccountAnalyticsVM[] = []
  const platformBreakdownMap = new Map<string, PlatformAnalyticsVM>()
  const allTopPosts: AnalyticsPostRow[] = []
  const summaryMetricsByAccount: Array<Partial<Record<AnalyticsMetricId, number>>> = []
  const accountMetricsByAccount: Array<Partial<Record<AnalyticsMetricId, number>>> = []
  const lastFetchedAtCandidates: string[] = []
  const lastSnapshotAtCandidates: string[] = []
  const advancedInsightsByPlatform = new Map<string, AnalyticsAdvancedInsights>()
  let requiresHistoryImport = false

  for (const account of selectedAccounts) {
    const platform = normalizePlatform(account.platform)
    if (!platform || !account.bundle_social_account_id) continue

    const cacheRow = cacheRows.get(account.bundle_social_account_id)
    const remoteData = platformRemoteData.get(platform)
    const platformAccounts = selectedAccounts.filter((item) => item.platform === account.platform)
    const accountItem = getAccountItemForLocalAccount(account, platformAccounts, remoteData?.normalized || null)
    const normalizedAccount = accountMetricsFromItem(accountItem)
    const importedPosts = filterPostsInRange(
      (remoteData?.importedPosts || []).filter((post) => post.socialAccountId === account.bundle_social_account_id),
      range
    )
    const topPosts = aggregatePostRows(importedPosts, accountLabelByBundleId, account.platform)
    const postMetrics = aggregateMetrics(topPosts.map((post) => post.metrics))
    const mergedMetrics: Partial<Record<AnalyticsMetricId, number>> = {
      ...normalizedAccount.metrics,
      ...postMetrics,
      followers: normalizedAccount.metrics.followers,
      following: normalizedAccount.metrics.following,
    }

    const advancedInsights = extractAdvancedInsights(remoteData?.raw)
    if (advancedInsights) {
      advancedInsightsByPlatform.set(account.platform, advancedInsights)
    }

    const capability = buildCapability(account.platform, mergedMetrics, advancedInsights, importedPosts.length > 0)
    const metricIds = capability.supportedMetricIds
    const metricValues = metricIds.map((metricId) =>
      metricValue(metricId, mergedMetrics[metricId] ?? null, postMetrics[metricId] !== undefined ? 'posts' : 'account')
    )

    accountBreakdown.push({
      id: account.id,
      bundleSocialAccountId: account.bundle_social_account_id,
      platform: account.platform,
      label: account.display_name || account.username || account.account_id || account.platform,
      username: account.username,
      avatarUrl: account.avatar_url,
      metrics: metricValues,
      capabilities: capability,
      latestSyncedAt: normalizedAccount.latestUpdatedAt || cacheRow?.fetched_at || null,
    })

    summaryMetricsByAccount.push(postMetrics)
    accountMetricsByAccount.push(normalizedAccount.metrics)
    allTopPosts.push(...topPosts.map((post) => ({ ...post, accountId: account.id })))

    if (cacheRow?.fetched_at) lastFetchedAtCandidates.push(cacheRow.fetched_at)
    if (normalizedAccount.latestUpdatedAt) lastSnapshotAtCandidates.push(normalizedAccount.latestUpdatedAt)

    if (!isCacheFresh(cacheRow) || params.force) {
      const fetchedAt = new Date().toISOString()
      const snapshotDate = format(new Date(), 'yyyy-MM-dd')
      await writeCacheRow(params.userId, account, range, { mergedMetrics, advancedInsights }, fetchedAt)
      await persistAccountSnapshot(params.userId, account, snapshotDate, mergedMetrics, advancedInsights)
    }

    await persistPostSnapshots(params.userId, accountIdByBundleId, account.platform, topPosts.slice(0, 25))

    const existingPlatformBreakdown = platformBreakdownMap.get(account.platform)
    if (!existingPlatformBreakdown) {
      platformBreakdownMap.set(account.platform, {
        platform: account.platform,
        label: account.platform,
        metrics: metricValues,
        accountCount: 1,
        connected: true,
        capabilities: capability,
      })
    } else {
      existingPlatformBreakdown.accountCount += 1
      const aggregatedPlatformMetrics = aggregateMetrics([
        ...existingPlatformBreakdown.metrics.map((metric) => ({ [metric.metricId]: metric.value || 0 })),
        mergedMetrics,
      ])
      existingPlatformBreakdown.metrics = existingPlatformBreakdown.capabilities.supportedMetricIds.map((metricId) =>
        metricValue(metricId, aggregatedPlatformMetrics[metricId] ?? null, aggregatedPlatformMetrics[metricId] !== undefined ? 'posts' : 'account')
      )
    }

    if (importedPosts.length === 0) requiresHistoryImport = true
  }

  const combinedSummaryMetrics = aggregateMetrics(summaryMetricsByAccount)
  const combinedAccountMetrics = aggregateMetrics(accountMetricsByAccount)
  const mergedSummaryMetricIds = ['impressions', 'views', 'likes', 'comments', 'shares', 'saves', 'engagementCount', 'engagementRate', 'followers', 'postCount']
    .filter((metricId) => combinedSummaryMetrics[metricId as AnalyticsMetricId] !== undefined || combinedAccountMetrics[metricId as AnalyticsMetricId] !== undefined)
    .slice(0, 6) as AnalyticsMetricId[]

  const summary = buildSummary(
    params.platform ? `${params.platform} Analytics` : 'Analytics Dashboard',
    `${range.periodLabel} across ${selectedAccounts.length} account${selectedAccounts.length === 1 ? '' : 's'}`,
    mergedSummaryMetricIds.length > 0 ? mergedSummaryMetricIds : ['engagementCount', 'engagementRate', 'postCount'],
    combinedSummaryMetrics,
    combinedAccountMetrics
  )

  const topPosts = allTopPosts
    .sort((left, right) => safeNumber(right.metrics.engagementCount) - safeNumber(left.metrics.engagementCount))
    .slice(0, 20)

  const timeline = buildTimeline(topPosts, range)
  const advancedInsights = (() => {
    const result: AnalyticsAdvancedInsights = {}
    for (const insights of advancedInsightsByPlatform.values()) {
      if (!result.demographics && insights.demographics?.length) result.demographics = insights.demographics
      if (!result.trafficSources && insights.trafficSources?.length) result.trafficSources = insights.trafficSources
      if (!result.deviceTypes && insights.deviceTypes?.length) result.deviceTypes = insights.deviceTypes
    }
    return Object.keys(result).length ? result : undefined
  })()

  const newestFetchedAt = [...lastFetchedAtCandidates].sort().at(-1) || null
  const newestSnapshotAt = [...lastSnapshotAtCandidates].sort().at(-1) || null
  const dataFreshness: AnalyticsDataFreshness = {
    lastFetchedAt: newestFetchedAt,
    lastSnapshotAt: newestSnapshotAt,
    stale: !newestFetchedAt || !isCacheFresh({ bundle_social_account_id: '', data: null, fetched_at: newestFetchedAt }),
    refreshCooldownMinutes: DEFAULT_REFRESH_COOLDOWN_MINUTES,
    nextRecommendedRefreshAt: newestFetchedAt
      ? new Date(new Date(newestFetchedAt).getTime() + DEFAULT_REFRESH_COOLDOWN_MINUTES * 60 * 1000).toISOString()
      : null,
  }

  return {
    summary,
    metricDefinitions: METRIC_DEFINITIONS,
    platformBreakdown: [...platformBreakdownMap.values()],
    accountBreakdown,
    timeline,
    topPosts,
    capabilities: [...new Map(accountBreakdown.map((account) => [account.platform, account.capabilities])).values()],
    advancedInsights,
    dataFreshness,
    requiresHistoryImport,
    availablePlatforms,
    selection: {
      platform: params.platform || null,
      accountId: params.accountId || null,
      startDate: range.startDate,
      endDate: range.endDate,
      periodLabel: range.periodLabel,
    },
  }
}

export async function invalidateAnalyticsCacheForUser(userId: string, bundleSocialAccountIds: string[]) {
  try {
    let query = (supabaseAdmin as any).from('analytics_cache').delete().eq('user_id', userId)
    if (bundleSocialAccountIds.length > 0) {
      query = query.in('bundle_social_account_id', bundleSocialAccountIds)
    }
    await query
  } catch {
    // optional table in some environments
  }
}

export const __analyticsTestUtils = {
  accountMetricsFromItem,
  aggregateMetrics,
  aggregatePostRows,
  buildCapability,
  buildTimeline,
  extractAdvancedInsights,
  filterPostsInRange,
  parseSelectionRange,
  postMetricsFromAnalytics,
}
