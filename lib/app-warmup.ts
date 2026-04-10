"use client"

import type { QueryClient } from "@tanstack/react-query"
import { appQueryOptions } from "@/hooks/queries/use-app-queries"

export const APP_ROUTES = [
  "/dashboard",
  "/posts",
  "/calendar",
  "/analytics",
  "/integrations",
  "/create",
] as const

type AppRoute = (typeof APP_ROUTES)[number]

interface RouterPrefetcher {
  prefetch: (href: string) => void | Promise<void>
}

interface NetworkInformationLike {
  effectiveType?: string
  saveData?: boolean
}

function getCurrentMonthYear() {
  const currentDate = new Date()

  return {
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
  }
}

export function prefetchAppRoutes(
  router: RouterPrefetcher,
  routes: readonly string[] = APP_ROUTES
) {
  routes.forEach((route) => {
    router.prefetch(route)
  })
}

function getConnectionInfo(): NetworkInformationLike | null {
  if (typeof navigator === "undefined") {
    return null
  }

  return ((navigator as Navigator & { connection?: NetworkInformationLike }).connection || null)
}

export function shouldWarmSecondaryData() {
  const connection = getConnectionInfo()

  if (!connection) {
    return true
  }

  if (connection.saveData) {
    return false
  }

  return connection.effectiveType !== "slow-2g" && connection.effectiveType !== "2g"
}

export function shouldWarmHeavyData() {
  const connection = getConnectionInfo()

  if (!connection) {
    return true
  }

  if (connection.saveData) {
    return false
  }

  return connection.effectiveType === "4g"
}

export function getRouteWarmJobs(queryClient: QueryClient, route: string) {
  const { month, year } = getCurrentMonthYear()

  const jobsByRoute: Partial<Record<string, Promise<unknown>[]>> = {
    "/dashboard": [
      queryClient.prefetchQuery(appQueryOptions.socialAccounts()),
      queryClient.prefetchQuery(appQueryOptions.dashboardStats()),
      queryClient.prefetchQuery(appQueryOptions.dashboardPosts(month, year)),
    ],
    "/calendar": [
      queryClient.prefetchQuery(appQueryOptions.dashboardPosts(month, year)),
    ],
    "/posts": [
      queryClient.prefetchQuery(appQueryOptions.posts()),
    ],
    "/analytics": [
      queryClient.prefetchQuery(
        appQueryOptions.analyticsOverview("/api/analytics/overview?period=30")
      ),
    ],
    "/integrations": [
      queryClient.prefetchQuery(appQueryOptions.socialAccounts()),
    ],
    "/create": [
      queryClient.prefetchQuery(appQueryOptions.socialAccounts()),
    ],
  }

  return jobsByRoute[route] || []
}

export async function warmRouteData(queryClient: QueryClient, route: string) {
  return Promise.allSettled(getRouteWarmJobs(queryClient, route))
}

export function getWarmRouteOrder(currentRoute: string): AppRoute[] {
  const routePriorityByCurrentRoute: Partial<Record<string, AppRoute[]>> = {
    "/dashboard": ["/create", "/calendar", "/integrations", "/posts", "/analytics"],
    "/create": ["/dashboard", "/integrations", "/calendar", "/posts", "/analytics"],
    "/posts": ["/dashboard", "/calendar", "/create", "/integrations", "/analytics"],
    "/calendar": ["/dashboard", "/create", "/integrations", "/posts", "/analytics"],
    "/integrations": ["/create", "/dashboard", "/calendar", "/posts", "/analytics"],
    "/analytics": ["/dashboard", "/posts", "/create", "/calendar", "/integrations"],
  }

  const preferredRoutes = routePriorityByCurrentRoute[currentRoute]

  if (preferredRoutes) {
    return preferredRoutes
  }

  return [...APP_ROUTES]
}

export async function warmCriticalAppData(queryClient: QueryClient) {
  const { month, year } = getCurrentMonthYear()

  return Promise.allSettled([
    queryClient.prefetchQuery(appQueryOptions.socialAccounts()),
    queryClient.prefetchQuery(appQueryOptions.dashboardStats()),
    queryClient.prefetchQuery(appQueryOptions.dashboardPosts(month, year)),
    queryClient.prefetchQuery(appQueryOptions.posts()),
  ])
}

export async function warmAppData(
  queryClient: QueryClient,
  options?: { includeAnalytics?: boolean }
) {
  const results = await warmCriticalAppData(queryClient)

  if (options?.includeAnalytics) {
    try {
      await queryClient.prefetchQuery(
        appQueryOptions.analyticsOverview("/api/analytics/overview?period=30")
      )
    } catch (error) {
      return [...results, { status: "rejected", reason: error } as const]
    }
  }

  return results
}

export async function warmAppExperience(
  router: RouterPrefetcher,
  queryClient: QueryClient,
  options?: { includeAnalytics?: boolean }
) {
  prefetchAppRoutes(router)
  return warmAppData(queryClient, options)
}
