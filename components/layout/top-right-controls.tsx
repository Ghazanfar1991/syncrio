"use client"

import { useState, useRef, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useTheme } from "@/components/providers/theme-provider"
import { Bell, Sun, Moon, Settings, LogOut, ChevronDown, MoreVertical } from "lucide-react"
import Link from "next/link"
import ThemeToggle from "@/components/ui/ThemeToggle";

interface TopRightControlsProps {
  unreadNotificationsCount?: number
  className?: string
}

export function TopRightControls({ 
  unreadNotificationsCount = 0,
  className = ""
}: TopRightControlsProps) {
  const { data: session } = useSession()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <div className={className}>
      {/* Desktop / tablet controls */}
      <div className="hidden md:flex items-center gap-3">
        {/* Theme Toggle */}
        <ThemeToggle className="h-6 w-16" />

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/6 transition-colors" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] px-1 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/40 dark:bg-white/8 border border-black/5 dark:border-white/6 hover:bg-white/60 dark:hover:bg-white/12 transition-colors cursor-pointer"
            aria-expanded={isProfileMenuOpen}
            aria-haspopup="menu"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-400 flex items-center justify-center text-white text-sm font-semibold">
              {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || 'U'}
            </div>
            <div className="text-sm hidden sm:block">{session?.user?.name || session?.user?.email?.split('@')[0] || 'User'}</div>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isProfileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-black/5 dark:border-white/10 backdrop-blur-xl z-50">
              <div className="p-2 space-y-1">
                {/* Settings */}
                <Link
                  href="/settings"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700/50 transition-colors text-sm"
                >
                  <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">Settings</span>
                </Link>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm text-left"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span className="text-red-600 dark:text-red-400">Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile controls: collapse to 3-dots menu */}
      <div className="relative md:hidden" ref={mobileMenuRef}>
        <button
          onClick={() => setIsMobileMenuOpen((v) => !v)}
          className="relative grid h-9 w-9 place-items-center rounded-full border border-black/5 dark:border-white/10 bg-white/60 dark:bg-neutral-800/60 backdrop-blur hover:bg-white/80 dark:hover:bg-neutral-700/60 transition-colors"
          aria-label="Open menu"
          aria-expanded={isMobileMenuOpen}
          aria-haspopup="menu"
        >
          <MoreVertical className="h-5 w-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-500" />
          )}
        </button>

        {isMobileMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-black/5 dark:border-white/10 bg-white/90 dark:bg-neutral-900/90 backdrop-blur shadow-lg z-50">
            <div className="p-2 space-y-1">
              {/* Theme inline toggle */}
              <div className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800/60">
                <div className="flex items-center gap-3">
                  {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  <span className="text-sm">Theme</span>
                </div>
                <ThemeToggle className="h-6 w-12" />
              </div>

              {/* Notifications summary */}
              <button className="flex items-center w-full gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800/60 text-left">
                <Bell className="w-4 h-4" />
                <span className="text-sm">Notifications</span>
                {unreadNotificationsCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center rounded-full bg-rose-500 px-2 text-[11px] text-white h-5 min-w-[20px]">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Settings */}
              <Link
                href="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center w-full gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800/60 text-sm"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center w-full gap-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm text-left"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span className="text-red-600 dark:text-red-400">Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
