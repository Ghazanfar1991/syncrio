"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Home, Settings, BarChart3, MessageSquare, Sparkles, LogOut, User, ChevronDown } from 'lucide-react'
import { useState } from 'react'

const navigationItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/create', label: 'Create Content', icon: Sparkles },
  { href: '/posts', label: 'Posts', icon: MessageSquare },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  return (
    <nav className="glass border-b border-border/50 sticky top-0 z-50 backdrop-blur-xl">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            href={session ? "/dashboard" : "/"}
            className="flex items-center space-x-3 group"
          >
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              ConversAI Social
            </span>
          </Link>

          {session ? (
            <div className="flex items-center space-x-1">
              {/* Navigation Items */}
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-modern'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden md:inline">{item.label}</span>
                  </Link>
                )
              })}

              {/* User Menu */}
              <div className="relative ml-6">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="hidden md:inline max-w-32 truncate">
                    {session.user?.name || session.user?.email?.split('@')[0]}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 glass rounded-xl shadow-modern-lg border border-border/50 py-2 animate-scale-in">
                    <div className="px-4 py-2 border-b border-border/50">
                      <p className="text-sm font-medium text-foreground">
                        {session.user?.name || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {session.user?.email}
                      </p>
                    </div>

                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        signOut()
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link href="/pricing" className="hidden sm:block">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  Pricing
                </Button>
              </Link>
              <Link href="/auth/signin">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="gradient-primary text-white border-0 shadow-modern hover:shadow-modern-lg">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
