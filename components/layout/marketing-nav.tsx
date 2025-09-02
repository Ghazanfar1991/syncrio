"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { useTheme } from "@/components/providers/theme-provider"
import { LogoMark } from "@/components/layout/logo-mark"

export function MarketingNav() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()

  return (
    <nav className="glass-dark border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href={session ? "/dashboard" : "/"} className="flex items-center space-x-3 group">
            <LogoMark className="w-8 h-8" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              AuroraSocial
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Theme switcher */}
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as any)}
              className="hidden sm:block rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground hover:bg-accent/40"
              aria-label="Select color theme"
            >
              <option value="teal">Teal/Cyan</option>
              <option value="default">Purple/Blue</option>
              <option value="sunset">Sunset</option>
              <option value="lime">Lime</option>
            </select>

            <Link href="/pricing" className="hidden sm:block">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Pricing</Button>
            </Link>
            {session ? (
              <Link href="/dashboard">
                <Button variant="gradient">Open App</Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/signin">
                  <Button variant="outline">Sign In</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button variant="gradient">Start Free Trial</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

