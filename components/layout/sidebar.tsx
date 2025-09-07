"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  Home,
  Rocket,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  FileText,
  ChevronLeft,
  ChevronRight,
  Share2
} from 'lucide-react'

interface SidebarProps {
  collapsed?: boolean
  onToggleCollapse?: (collapsed: boolean) => void
  showPlanInfo?: boolean
  className?: string
}

export function Sidebar(props: SidebarProps) {
  const { onToggleCollapse, showPlanInfo = true, className = "" } = props
  const collapsedProp = props.collapsed
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const STORAGE_KEY = "syncrio.sidebar.collapsed"

  // Determine controlled vs uncontrolled: only controlled if prop AND handler provided
  const isControlled = typeof collapsedProp !== "undefined" && typeof onToggleCollapse === "function"
  // Internal state with localStorage persistence (used when uncontrolled)
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const v = window.localStorage.getItem(STORAGE_KEY)
      if (v === "1" || v === "0") return v === "1"
    }
    return collapsedProp ?? false
  })

  // Effective state used for rendering
  const isCollapsed = isControlled ? !!collapsedProp : internalCollapsed

  // Keep localStorage in sync when parent controls the prop
  useEffect(() => {
    if (!isControlled) return
    try { window.localStorage.setItem(STORAGE_KEY, isCollapsed ? "1" : "0") } catch {}
  }, [isCollapsed, isControlled])

  // On mount, if controlled, push stored value to parent so it persists across pages
  useEffect(() => {
    if (!isControlled) return
    try {
      const v = window.localStorage.getItem(STORAGE_KEY)
      if (v === "1" || v === "0") {
        const stored = v === "1"
        if (stored !== isCollapsed) {
          onToggleCollapse?.(stored)
        }
      }
    } catch {}
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Enforce persisted state on every route change as well
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY)
      if (v === "1" || v === "0") {
        const stored = v === "1"
        if (isControlled) onToggleCollapse?.(stored)
        else setInternalCollapsed(stored)
      }
    } catch {}
  }, [pathname, isControlled, onToggleCollapse])

  // Listen for cross-tab changes
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      const next = e.newValue === "1"
      if (isControlled) {
        // Inform parent if provided
        onToggleCollapse?.(next)
      } else {
        setInternalCollapsed(next)
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [isControlled, onToggleCollapse])

  const handleLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  const navigationItems = [
    { label: 'Overview', icon: <Home className="w-5 h-5"/>, route: '/dashboard' },
    { label: 'Create Post', icon: <Rocket className="w-5 h-5"/>, route: '/create' },
    { label: 'Posts', icon: <FileText className="w-5 h-5"/>, route: '/posts' },
    { label: 'Analytics', icon: <BarChart3 className="w-5 h-5"/>, route: '/analytics' },
    { label: 'Calendar', icon: <Calendar className="w-5 h-5"/>, route: '/calendar' },
    { label: 'Integrations', icon: <Share2 className="w-5 h-5"/>, route: '/integrations' },

    // Only show Admin tab for admin users
    ...(session?.user?.email === 'ghazanfarnaseer91@gmail.com' ? [
      { label: 'Admin', icon: <Shield className="w-5 h-5"/>, route: '/app-owner' }
    ] : [])
  ]

  const handleCollapseToggle = () => {
    const next = !isCollapsed
    try { window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0") } catch {}
    onToggleCollapse?.(next)
    if (!isControlled) setInternalCollapsed(next)
  }

  // Explicit widths for reliability across devices (Tailwind may not have w-17)
  const collapsedWidth = 68 // px
  const expandedWidth = 256 // px

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-50 transition-all duration-300 will-change-[width] ${className}`}
      style={{ width: isCollapsed ? collapsedWidth : expandedWidth }}
      aria-expanded={!isCollapsed}
      data-collapsed={isCollapsed ? "true" : "false"}
    >
      <div className="h-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-r border-black/5 dark:border-white/5 shadow-xl rounded-r-3xl flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {/* App Logo Section */}
<div className="p-4 border-b border-black/5 dark:border-white/5 hover:bg-black/2 dark:hover:bg-white/3 transition-colors duration-300">
  <div className="flex items-center justify-between">
    <div 
      className={`flex items-center gap-3 ${isCollapsed ? 'cursor-pointer' : ''}`}
      onClick={isCollapsed ? handleCollapseToggle : undefined}
      title={isCollapsed ? "Click to expand sidebar" : undefined}
    >
      <div className={`transition-transform duration-200 ${isCollapsed && onToggleCollapse ? 'hover:scale-105' : ''}`}>
        <div className="w-12 h-12">
          {/* Replace the "A" with the logo */}
          <img src="/applogo.PNG" alt="App Logo" className="w-full h-full " />
        </div>
      </div>
      {!isCollapsed && (
        <div>
                  <div className="text-lg font-bold text-black dark:text-white">
                    Syncrio
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Your AI Powered Social Amplifier</div>
                </div>
              )}
            </div>
            {onToggleCollapse && (
              <button
                onClick={handleCollapseToggle}
                className={`transition-all duration-300 ${
                  isCollapsed 
                    ? 'p-1 text-gray-500 hover:text-rose-600 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md' 
                    : 'p-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white shadow-sm'
                }`}
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4 -ml-1.25" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto">
          <nav className={`space-y-2 ${isCollapsed ? 'p-2' : 'p-3'}`}>
            {/* Navigation Items */}
            {navigationItems.map((item, idx) => (
              <Link
                key={idx}
                href={item.route}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gradient-to-r hover:from-rose-50 hover:to-pink-50 dark:hover:from-rose-900/20 dark:hover:to-pink-900/20 transition-all duration-300 ${
                  isCollapsed ? 'justify-center px-1' : ''
                } ${
                  pathname === item.route ? 'bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 shadow-md ring-1 ring-rose-300/50 dark:ring-pink-400/30' : ''
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className={`p-1.5 rounded-md transition-all duration-300 ${
                  pathname === item.route 
                    ? 'bg-gradient-to-br from-rose-200 to-pink-200 dark:from-rose-800/60 dark:to-pink-800/60 text-rose-700 dark:text-rose-200' 
                    : 'bg-white/60 dark:bg-neutral-800/60 hover:bg-gradient-to-br hover:from-rose-50 hover:to-pink-50 dark:hover:from-rose-700/40 dark:hover:to-pink-700/40'
                }`}>
                  {item.icon}
                </div>
                {!isCollapsed && (
                  <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        {/* Fixed Footer */}
        <div className="border-t border-black/5 dark:border-white/6 p-3">
          {/* Plan Information */}
          {showPlanInfo && !isCollapsed && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium">Plan</div>
                <div className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-800/30 text-amber-800 dark:text-amber-200 font-medium">Pro</div>
              </div>
              <button className="w-full px-3 py-2.5 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 transition-all duration-300 text-xs font-medium shadow-sm hover:shadow-lg transform hover:scale-[1.02]">
                Upgrade
              </button>
            </div>
          )}

          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            className={`w-full px-3 py-2.5 rounded-lg border border-black/10 dark:border-white/10 text-xs hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-neutral-800/50 dark:hover:to-neutral-700/50 transition-all duration-300 flex items-center gap-2 ${
              isCollapsed ? 'justify-center' : 'justify-center'
            }`}
          >
            <LogOut className="w-3.5 h-3.5 text-red-500"/> 
            {!isCollapsed && <span className="font-medium text-red-600 dark:text-red-400">Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}
