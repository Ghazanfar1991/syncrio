"use client"

import { ReactNode, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useTheme } from "@/components/providers/theme-provider"
import { AuroraLogoWithText } from "@/components/ui/aurora-logo"
import {
  Home,
  Rocket,
  Calendar,
  BarChart3,
  Settings,
  Bell,
  Search,
  Sun,
  Moon,
  Plus,
  Twitter,
  Facebook,
  Linkedin,
  Youtube,
  Instagram,
  Menu,
  LogOut,
  FileText
} from 'lucide-react'



interface ConsistentLayoutProps {
  children: ReactNode
  showNewPostButton?: boolean
  pageTitle?: string
}

export function ConsistentLayout({ children, showNewPostButton = true, pageTitle }: ConsistentLayoutProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  const navigationItems = [
    { label: 'Overview', icon: <Home className="w-5 h-5"/>, route: '/dashboard' },
    { label: 'Create Post', icon: <Rocket className="w-5 h-5"/>, route: '/create' },
    { label: 'Posts', icon: <FileText className="w-5 h-5"/>, route: '/posts' },
    { label: 'Analytics', icon: <BarChart3 className="w-5 h-5"/>, route: '/analytics' },
    { label: 'Calendar', icon: <Calendar className="w-5 h-5"/>, route: '/calendar' },
    { label: 'Settings', icon: <Settings className="w-5 h-5"/>, route: '/settings' }
  ]

  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Topbar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/40 dark:bg-black/40 border-b border-black/5 dark:border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <button onClick={() => setCollapsed(s => !s)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/6 transition">
            <Menu className="w-5 h-5" />
          </button>
          <AuroraLogoWithText size="md" showBadge={true} />

          <div className="ml-6 flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60 w-4 h-4" />
              <input className="w-full rounded-full pl-10 pr-4 py-2 bg-white/60 dark:bg-neutral-800/50 border border-black/5 dark:border-white/6 outline-none placeholder:opacity-60 shadow-sm" placeholder="Search posts, campaigns, assets..." />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/6 transition">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] px-1 rounded-full">3</span>
            </button>

            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/6 transition">
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {showNewPostButton && (
              <Link 
                href="/create"
                className="px-3 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow"
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
        <aside className={`${collapsed ? 'col-span-12 lg:col-span-1' : 'col-span-12 lg:col-span-2'} transition-all duration-300`}>
          <div className={`sticky top-20 space-y-4`}>
            <nav className={`rounded-3xl p-3 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm ${collapsed ? 'p-2' : 'p-3'}`}>
              {navigationItems.map((it, idx) => (
                <Link
                  key={idx}
                  href={it.route}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-white/6 transition text-sm ${collapsed ? 'justify-center px-2' : ''} ${pathname === it.route ? 'bg-indigo-50 dark:bg-white/6' : ''}`}
                  title={collapsed ? it.label : undefined}
                >
                  <div className="p-2 rounded-lg bg-white/50 dark:bg-neutral-800/40">{it.icon}</div>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{it.label}</span>
                      <div className="text-xs opacity-60">{pathname === it.route ? 'Active' : ''}</div>
                    </>
                  )}
                </Link>
              ))}

              {!collapsed && (
                <>
                  <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/6">
                    <div className="text-xs opacity-70 px-1">Connected Accounts</div>
                    <div className="mt-2 grid grid-cols-1 gap-2">
                      <button className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/6 transition">
                        <div className="flex items-center gap-2"><Twitter className="w-4 h-4"/> X (3)</div>
                        <div className="text-xs opacity-60">Pages</div>
                      </button>

                      <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/6 transition">
                        <div className="flex items-center gap-2"><Facebook className="w-4 h-4"/> Facebook</div>
                        <div className="text-xs opacity-60">1</div>
                      </button>

                      <button className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/6 transition">
                        <div className="flex items-center gap-2"><Linkedin className="w-4 h-4"/> LinkedIn (2)</div>
                        <div className="text-xs opacity-60">Pages</div>
                      </button>
                    </div>

                    <Link 
                      href="/settings"
                      className="w-full mt-3 px-3 py-2 rounded-xl border border-dashed border-black/6 dark:border-white/6 text-sm block text-center"
                    >
                      Connect more
                    </Link>
                  </div>

                  <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/6 flex items-center justify-between">
                    <div className="text-sm">Plan</div>
                    <div className="text-xs px-2 py-1 rounded bg-amber-100 dark:bg-amber-800/30">Pro</div>
                  </div>

                  <button className="w-full mt-3 px-3 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700">Upgrade</button>

                  <button onClick={handleLogout} className="w-full mt-2 px-3 py-2 rounded-xl border text-sm hover:bg-black/5 dark:hover:bg-white/6 transition flex items-center gap-2 justify-center">
                    <LogOut className="w-4 h-4"/> Logout
                  </button>
                </>
              )}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="col-span-12 lg:col-span-7 space-y-6">
          {pageTitle && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
            </div>
          )}
          {children}
        </main>

        {/* Right sidebar - only show on dashboard */}
        {pathname === '/dashboard' && (
          <aside className="col-span-12 lg:col-span-3 space-y-4">
            {/* Right sidebar content will be handled by individual pages */}
          </aside>
        )}
      </div>
    </div>
  )
}
