"use client"

import { ReactNode, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTheme } from "@/components/providers/theme-provider"
import { AuroraLogoWithText } from "@/components/ui/aurora-logo"
import { Sidebar } from "./sidebar"
import {
  Bell,
  Search,
  Plus,
  Menu
} from 'lucide-react'

interface UnifiedLayoutProps {
  children: ReactNode
  showNewPostButton?: boolean
  pageTitle?: string
  showConnectedAccounts?: boolean
  showPlanInfo?: boolean
  className?: string
}

export function UnifiedLayout({ 
  children, 
  showNewPostButton = true, 
  pageTitle,
  showConnectedAccounts = true,
  showPlanInfo = true,
  className = ""
}: UnifiedLayoutProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Topbar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/40 dark:bg-black/40 border-b border-black/5 dark:border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <button 
            onClick={() => setCollapsed(s => !s)} 
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/6 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <AuroraLogoWithText size="md" showBadge={true} />

          <div className="ml-6 flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60 w-4 h-4" />
              <input 
                className="w-full rounded-full pl-10 pr-4 py-2 bg-white/60 dark:bg-neutral-800/50 border border-black/5 dark:border-white/6 outline-none placeholder:opacity-60 shadow-sm" 
                placeholder="Search posts, campaigns, assets..." 
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/6 transition">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] px-1 rounded-full">3</span>
            </button>

            {showNewPostButton && (
              <Link 
                href="/create"
                className="px-3 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow transition-colors"
              > 
                <Plus className="w-4 h-4"/> New Post
              </Link>
            )}

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/40 dark:bg-white/8 border border-black/5 dark:border-white/6">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-400 flex items-center justify-center text-white text-sm font-semibold">
                {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || 'U'}
              </div>
              <div className="text-sm">{session?.user?.name || session?.user?.email?.split('@')[0] || 'User'}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-12 gap-6">
        {/* Sidebar */}
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={setCollapsed}
            className={className}
          />

        {/* Main content */}
        <main className={`${collapsed ? 'col-span-12 lg:col-span-11' : 'col-span-12 lg:col-span-10'} space-y-6`}>
          {pageTitle && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
