export type AnalyticsMetricId =
  | 'impressions'
  | 'impressionsUnique'
  | 'views'
  | 'viewsUnique'
  | 'likes'
  | 'comments'
  | 'shares'
  | 'saves'
  | 'followers'
  | 'postCount'
  | 'engagementCount'
  | 'engagementRate'
  | 'following'

export type MetricFormat = 'number' | 'percent'

export interface MetricDefinition {
  id: AnalyticsMetricId
  label: string
  shortLabel: string
  description?: string
  format: MetricFormat
  category: 'reach' | 'engagement' | 'audience' | 'publishing'
  platforms?: string[]
}

export interface MetricValue {
  metricId: AnalyticsMetricId
  value: number | null
  displayValue: string
  available: boolean
  source: 'posts' | 'account' | 'derived'
}

export interface AnalyticsTimelinePoint {
  date: string
  label: string
  metrics: Partial<Record<AnalyticsMetricId, number>>
  postCount: number
}

export interface AnalyticsPostRow {
  id: string
  importedPostId?: string | null
  bundlePostId?: string | null
  socialAccountId?: string | null
  platform: string
  accountId?: string | null
  accountLabel?: string | null
  publishedAt: string | null
  permalink?: string | null
  title: string
  description?: string | null
  thumbnailUrl?: string | null
  contentType?: string | null
  metrics: Partial<Record<AnalyticsMetricId, number>>
  raw?: unknown
}

export interface PlatformCapabilityMap {
  platform: string
  supportedMetricIds: AnalyticsMetricId[]
  hasTimeline: boolean
  hasTopPosts: boolean
  hasFollowers: boolean
  hasDemographics: boolean
  hasTrafficSources: boolean
  hasDeviceTypes: boolean
  hasPostHistory: boolean
  summaryMetricIds: AnalyticsMetricId[]
}

export interface AnalyticsBreakdownRow {
  id: string
  label: string
  platform: string
  accountId?: string | null
  metrics: MetricValue[]
  connected: boolean
  avatarUrl?: string | null
  username?: string | null
}

export interface AnalyticsAdvancedBreakdownItem {
  label: string
  value: number
}

export interface AnalyticsAdvancedInsights {
  demographics?: AnalyticsAdvancedBreakdownItem[]
  trafficSources?: AnalyticsAdvancedBreakdownItem[]
  deviceTypes?: AnalyticsAdvancedBreakdownItem[]
}

export interface AccountAnalyticsVM {
  id: string
  bundleSocialAccountId: string
  platform: string
  label: string
  username?: string | null
  avatarUrl?: string | null
  metrics: MetricValue[]
  capabilities: PlatformCapabilityMap
  latestSyncedAt?: string | null
}

export interface PlatformAnalyticsVM {
  platform: string
  label: string
  metrics: MetricValue[]
  accountCount: number
  connected: boolean
  capabilities: PlatformCapabilityMap
}

export interface AnalyticsDataFreshness {
  lastFetchedAt: string | null
  lastSnapshotAt: string | null
  stale: boolean
  refreshCooldownMinutes: number
  nextRecommendedRefreshAt: string | null
}

export interface AnalyticsSummaryVM {
  title: string
  subtitle: string
  metrics: MetricValue[]
}

export interface AnalyticsOverviewVM {
  summary: AnalyticsSummaryVM
  metricDefinitions: MetricDefinition[]
  platformBreakdown: PlatformAnalyticsVM[]
  accountBreakdown: AccountAnalyticsVM[]
  timeline: AnalyticsTimelinePoint[]
  topPosts: AnalyticsPostRow[]
  capabilities: PlatformCapabilityMap[]
  advancedInsights?: AnalyticsAdvancedInsights
  dataFreshness: AnalyticsDataFreshness
  requiresHistoryImport: boolean
  availablePlatforms: string[]
  selection: {
    platform: string | null
    accountId: string | null
    startDate: string
    endDate: string
    periodLabel: string
  }
}
