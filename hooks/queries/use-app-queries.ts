"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchJson } from "@/lib/fetch-json"

type JsonRecord = Record<string, unknown>
type JsonArray = JsonRecord[]
type DashboardPostsResponse = { allPosts: Record<string, JsonArray> }
type DashboardSummaryResponse = JsonRecord
type DashboardInsightsResponse = JsonRecord
type PostsResponse = { posts: JsonArray; pagination: JsonRecord }
type PostAnalyticsResponse = Record<string, JsonArray>

export const appQueryKeys = {
  socialAccounts: ["social-accounts"] as const,
  dashboardStats: ["dashboard-stats"] as const,
  dashboardInsights: ["dashboard-insights"] as const,
  dashboardPosts: (month: number, year: number) => ["dashboard-posts", month, year] as const,
  posts: ["posts"] as const,
  postAnalytics: (idsKey: string) => ["post-analytics", idsKey] as const,
  analyticsOverview: (url: string) => ["analytics-overview", url] as const,
}

export const appQueryOptions = {
  socialAccounts: () => ({
    queryKey: appQueryKeys.socialAccounts,
    queryFn: () => fetchJson<JsonArray>("/api/social/accounts"),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  }),
  dashboardStats: () => ({
    queryKey: appQueryKeys.dashboardStats,
    queryFn: () => fetchJson<DashboardSummaryResponse>("/api/dashboard/stats"),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  }),
  dashboardInsights: () => ({
    queryKey: appQueryKeys.dashboardInsights,
    queryFn: () => fetchJson<DashboardInsightsResponse>("/api/dashboard/insights"),
    staleTime: 2 * 60_000,
    gcTime: 30 * 60_000,
  }),
  dashboardPosts: (month: number, year: number) => ({
    queryKey: appQueryKeys.dashboardPosts(month, year),
    queryFn: () =>
      fetchJson<DashboardPostsResponse>(`/api/dashboard/posts?month=${month}&year=${year}`),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  }),
  posts: () => ({
    queryKey: appQueryKeys.posts,
    queryFn: () => fetchJson<PostsResponse>("/api/posts"),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  }),
  postAnalytics: (postIds: string[]) => {
    const idsKey = [...postIds].sort().join(",")

    return {
      queryKey: appQueryKeys.postAnalytics(idsKey),
      queryFn: () =>
        fetchJson<PostAnalyticsResponse>(
          `/api/posts/analytics?ids=${encodeURIComponent(idsKey)}`
        ),
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
    }
  },
  analyticsOverview: (url: string) => ({
    queryKey: appQueryKeys.analyticsOverview(url),
    queryFn: () => fetchJson<JsonRecord>(url),
    staleTime: 2 * 60_000,
    gcTime: 30 * 60_000,
  }),
}

export function useSocialAccountsQuery(enabled: boolean = true, initialData?: JsonArray) {
  return useQuery({
    ...appQueryOptions.socialAccounts(),
    enabled,
    initialData,
    placeholderData: (previousData) => previousData ?? initialData,
  })
}

export function useDashboardStatsQuery(enabled: boolean = true) {
  return useQuery({
    ...appQueryOptions.dashboardStats(),
    enabled,
    placeholderData: (previousData) => previousData,
  })
}

export function useDashboardInsightsQuery(enabled: boolean = true) {
  return useQuery({
    ...appQueryOptions.dashboardInsights(),
    enabled,
    placeholderData: (previousData) => previousData,
  })
}

export function useDashboardPostsQuery(month: number, year: number, enabled: boolean = true) {
  return useQuery({
    ...appQueryOptions.dashboardPosts(month, year),
    enabled: enabled && Boolean(month) && Boolean(year),
    placeholderData: (previousData) => previousData,
  })
}

export function usePostsQuery(enabled: boolean = true, initialData?: PostsResponse) {
  return useQuery({
    ...appQueryOptions.posts(),
    enabled,
    initialData,
    placeholderData: (previousData) => previousData ?? initialData,
  })
}

export function usePostAnalyticsQuery(postIds: string[], enabled: boolean = true) {
  return useQuery({
    ...appQueryOptions.postAnalytics(postIds),
    enabled: enabled && postIds.length > 0,
    placeholderData: (previousData) => previousData,
  })
}

export function useAnalyticsOverviewQuery(url: string, enabled: boolean = true) {
  return useQuery({
    ...appQueryOptions.analyticsOverview(url),
    enabled,
    placeholderData: (previousData) => previousData,
  })
}
