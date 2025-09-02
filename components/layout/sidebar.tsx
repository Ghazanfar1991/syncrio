"use client"

import { useState } from "react"
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

export function Sidebar({ 
  collapsed = false, 
  onToggleCollapse,
  showPlanInfo = true,
  className = ""
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()

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
    if (onToggleCollapse) {
      onToggleCollapse(!collapsed)
    }
  }

  return (
    <aside className={`fixed left-0 top-0 h-screen z-50 ${collapsed ? 'w-17' : 'w-64'} transition-all duration-300 ${className}`}>
      <div className="h-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-r border-black/5 dark:border-white/5 shadow-xl rounded-r-3xl flex flex-col">
        {/* App Logo Section */}
<div className="p-4 border-b border-black/5 dark:border-white/5 hover:bg-black/2 dark:hover:bg-white/3 transition-colors duration-300">
  <div className="flex items-center justify-between">
    <div 
      className={`flex items-center gap-3 ${collapsed && onToggleCollapse ? 'cursor-pointer' : ''}`}
      onClick={collapsed && onToggleCollapse ? handleCollapseToggle : undefined}
      title={collapsed && onToggleCollapse ? "Click to expand sidebar" : undefined}
    >
      <div className={`transition-transform duration-200 ${collapsed && onToggleCollapse ? 'hover:scale-105' : ''}`}>
        <div className="w-12 h-12">
          {/* Replace the "A" with the logo */}
          <img src="/applogo.PNG" alt="App Logo" className="w-full h-full " />
        </div>
      </div>
      {!collapsed && (
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
                  collapsed 
                    ? 'p-1 text-gray-500 hover:text-rose-600 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md' 
                    : 'p-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white shadow-sm'
                }`}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? <ChevronRight className="w-4 h-4 -ml-1.25" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto">
          <nav className={`space-y-2 ${collapsed ? 'p-2' : 'p-3'}`}>
            {/* Navigation Items */}
            {navigationItems.map((item, idx) => (
              <Link
                key={idx}
                href={item.route}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gradient-to-r hover:from-rose-50 hover:to-pink-50 dark:hover:from-rose-900/20 dark:hover:to-pink-900/20 transition-all duration-300 ${
                  collapsed ? 'justify-center px-1' : ''
                } ${
                  pathname === item.route ? 'bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 shadow-md ring-1 ring-rose-300/50 dark:ring-pink-400/30' : ''
                }`}
                title={collapsed ? item.label : undefined}
              >
                <div className={`p-1.5 rounded-md transition-all duration-300 ${
                  pathname === item.route 
                    ? 'bg-gradient-to-br from-rose-200 to-pink-200 dark:from-rose-800/60 dark:to-pink-800/60 text-rose-700 dark:text-rose-200' 
                    : 'bg-white/60 dark:bg-neutral-800/60 hover:bg-gradient-to-br hover:from-rose-50 hover:to-pink-50 dark:hover:from-rose-700/40 dark:hover:to-pink-700/40'
                }`}>
                  {item.icon}
                </div>
                {!collapsed && (
                  <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        {/* Fixed Footer */}
        <div className="border-t border-black/5 dark:border-white/6 p-3">
          {/* Plan Information */}
          {showPlanInfo && !collapsed && (
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
              collapsed ? 'justify-center' : 'justify-center'
            }`}
          >
            <LogOut className="w-3.5 h-3.5 text-red-500"/> 
            {!collapsed && <span className="font-medium text-red-600 dark:text-red-400">Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}
