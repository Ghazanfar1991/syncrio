"use client"

import { ReactNode, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/providers/theme-provider"
import { LogoMark } from "@/components/layout/logo-mark"
import { Home, Settings, BarChart3, MessageSquare, Sparkles, LogOut, User, ChevronDown } from 'lucide-react'

const navigationItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/create', label: 'Create', icon: Sparkles },
  { href: '/posts', label: 'Posts', icon: MessageSquare },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export function AppShell({ children, title, subtitle }: { children: ReactNode, title?: string, subtitle?: string }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-aurora bg-noise">
      {/* Topbar */}
      <nav className="sticky top-0 z-50">
        <div className="absolute inset-0 bg-background/50 backdrop-blur-xl border-b border-white/10" />
        <div className="container mx-auto px-6 py-3 relative">
          <div className="flex items-center justify-between">
            <Link 
              href="/dashboard" 
              className="flex items-center space-x-3 group relative"
            >
              <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur" />
              <LogoMark className="w-10 h-10 relative transform group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent relative">
                AuroraSocial
              </span>
            </Link>

            {session ? (
              <div className="flex items-center space-x-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                        isActive
                          ? 'bg-primary/10 text-primary shadow-modern'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isActive ? 'opacity-100' : ''}`} />
                      <div className={`relative flex items-center gap-2 ${isActive ? 'transform scale-105' : ''}`}>
                        <Icon className={`h-4 w-4 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-primary' : ''}`} />
                        <span className="hidden md:inline relative">
                          {item.label}
                          {isActive && (
                            <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary/50 rounded-full" />
                          )}
                        </span>
                      </div>
                    </Link>
                  )
                })}

                {/* User Menu */}
                <div className="relative ml-6">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="group relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300"
                  >
                    <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/50 rounded-xl transition-colors duration-300" />
                    <div className="relative flex items-center gap-2">
                      <div className="w-9 h-9 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center transform group-hover:scale-105 group-hover:rotate-3 transition-all duration-300 shadow-glow">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <span className="hidden md:inline max-w-32 truncate">
                        {session.user?.name || session.user?.email?.split('@')[0]}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-background/80 backdrop-blur-xl rounded-xl shadow-modern-lg border border-white/20 py-2 animate-scale-in">
                      <div className="px-4 py-3 border-b border-white/10">
                        <p className="text-sm font-medium text-foreground mb-1">
                          {session.user?.name || 'User'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {session.user?.email}
                        </p>
                      </div>

                      <Link
                        href="/settings"
                        className="group flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-all duration-300"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-accent/50 flex items-center justify-center transform group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
                          <Settings className="h-4 w-4 group-hover:text-primary transition-colors duration-300" />
                        </div>
                        <span>Settings</span>
                      </Link>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false)
                          signOut()
                        }}
                        className="group flex items-center gap-3 w-full px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-all duration-300"
                      >
                        <div className="w-8 h-8 rounded-lg bg-accent/50 flex items-center justify-center transform group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
                          <LogOut className="h-4 w-4 group-hover:text-destructive transition-colors duration-300" />
                        </div>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/pricing" className="hidden sm:block">
                  <Button 
                    variant="ghost" 
                    className="px-4 py-2 hover:bg-accent/50 transition-colors duration-300"
                  >
                    Pricing
                  </Button>
                </Link>
                <Link href="/auth/signin">
                  <Button 
                    variant="outline" 
                    className="px-4 py-2 border-white/20 hover:border-white/40 hover:bg-white/5 transition-all duration-300"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button 
                    variant="gradient" 
                    className="px-4 py-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-glow hover:shadow-glow-lg transition-all duration-300"
                  >
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {(title || subtitle) && (
          <div className="mb-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

