"use client"

import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { usePathname, useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { TopRightControls } from "@/components/layout/top-right-controls"
import { usePersistentSidebar } from "@/components/layout/use-persistent-sidebar"
import { AppShellProvider } from "@/components/layout/app-shell-context"
import { AppRouteLoading } from "@/components/layout/app-route-loading"
import { useAuth } from "@/components/providers/auth-provider"
import {
  getWarmRouteOrder,
  prefetchAppRoutes,
  shouldWarmHeavyData,
  shouldWarmSecondaryData,
  warmRouteData,
} from "@/lib/app-warmup"

export function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const { user, loading } = useAuth()
  const userId = user?.id
  const [collapsed, setCollapsed] = usePersistentSidebar()
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(3)
  const showTopRightControls =
    pathname === "/dashboard" || pathname === "/settings"

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/signin")
    }
  }, [loading, router, user])

  useEffect(() => {
    if (loading || !userId) {
      return
    }

    const preferredRoutes = getWarmRouteOrder(pathname)
    const primaryRoutes = preferredRoutes.slice(0, 1)
    const secondaryRoutes = preferredRoutes.slice(1, 3)
    const heavyRoutes = preferredRoutes.slice(3)
    const timeoutIds: number[] = []
    let idleId: number | null = null

    prefetchAppRoutes(router, primaryRoutes)

    const scheduleWarmRoutes = (routes: string[], delay: number) => {
      if (!routes.length || typeof window === "undefined") {
        return
      }

      const timeoutId = window.setTimeout(() => {
        routes.forEach((route) => {
          router.prefetch(route)
          void warmRouteData(queryClient, route).then((results) => {
            results.forEach((result) => {
              if (result.status === "rejected") {
                console.warn(`Background warmup failed for ${route}:`, result.reason)
              }
            })
          })
        })
      }, delay)

      timeoutIds.push(timeoutId)
    }

    const startPrefetch = () => {
      scheduleWarmRoutes(primaryRoutes, 1200)

      if (shouldWarmSecondaryData()) {
        prefetchAppRoutes(router, secondaryRoutes)
        scheduleWarmRoutes(secondaryRoutes, 2800)
      }

      if (shouldWarmHeavyData()) {
        prefetchAppRoutes(router, heavyRoutes)
        scheduleWarmRoutes(heavyRoutes, 5000)
      }
    }

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = (window as Window & {
        requestIdleCallback: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
      }).requestIdleCallback(() => startPrefetch(), { timeout: 600 })
    } else if (typeof window !== "undefined") {
      timeoutId = window.setTimeout(startPrefetch, 120)
    }

    return () => {
      if (
        idleId !== null &&
        typeof window !== "undefined" &&
        "cancelIdleCallback" in window
      ) {
        ;(window as Window & {
          cancelIdleCallback: (handle: number) => void
        }).cancelIdleCallback(idleId)
      }

      if (typeof window !== "undefined") {
        timeoutIds.forEach((timeoutId) => {
          window.clearTimeout(timeoutId)
        })
      }
    }
  }, [loading, pathname, queryClient, router, userId])

  if (loading || !user) {
    return <AppRouteLoading />
  }

  return (
    <AppShellProvider
      value={{
        collapsed,
        setCollapsed,
        unreadNotificationsCount,
        setUnreadNotificationsCount,
      }}
    >
      <div className="relative min-h-screen">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={setCollapsed}
          showPlanInfo={true}
        />
        {showTopRightControls ? (
          <div className="fixed right-3 top-3 z-[70] sm:right-4 sm:top-4">
            <TopRightControls unreadNotificationsCount={unreadNotificationsCount} />
          </div>
        ) : null}
        {children}
      </div>
    </AppShellProvider>
  )
}
