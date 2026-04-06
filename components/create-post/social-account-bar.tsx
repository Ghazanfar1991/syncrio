"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { SocialAccount } from "@/hooks/use-create-post-v2"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { 
  Facebook, 
  Instagram, 
  Linkedin, 
  Youtube,
  Twitter,
  Plus
} from "lucide-react"

const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

interface SocialAccountBarProps {
  accounts: SocialAccount[]
  selectedAccounts: string[]
  onToggleAccount: (accountId: string) => void
  loading?: boolean
}

export function SocialAccountBar({ 
  accounts, 
  selectedAccounts, 
  onToggleAccount,
  loading 
}: SocialAccountBarProps) {
  
  const getPlatformIcon = (platform: string) => {
    const iconClass = "h-2 w-2 text-white"
    switch (platform.toUpperCase()) {
      case 'X':
      case 'TWITTER': return <XLogo className={iconClass} />
      case 'FACEBOOK': return <Facebook className={iconClass} />
      case 'INSTAGRAM': return <Instagram className={iconClass} />
      case 'LINKEDIN': return <Linkedin className={iconClass} />
      case 'YOUTUBE': return <Youtube className={iconClass} />
      default: return null
    }
  }

  const getPlatformBg = (platform: string) => {
    switch (platform.toUpperCase()) {
      case 'X':
      case 'TWITTER': return 'bg-black'
      case 'FACEBOOK': return 'bg-blue-600'
      case 'INSTAGRAM': return 'bg-pink-600'
      case 'LINKEDIN': return 'bg-blue-700'
      case 'YOUTUBE': return 'bg-red-600'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="w-full bg-white dark:bg-neutral-900/50 border-b border-black/5 dark:border-white/5 py-2 px-6 overflow-x-auto no-scrollbar scroll-smooth">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        {/* Placeholder for "Add Account" or selection logic */}
        <button 
          className="h-8 w-8 rounded-full border-2 border-dashed border-gray-200 dark:border-neutral-800 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-500 transition-all shrink-0"
          onClick={() => {}} // Integration page?
        >
          <Plus className="h-4 w-4" />
        </button>

        <div className="h-5 w-[1px] bg-black/5 dark:bg-white/5 mx-1 shrink-0" />

        <div className="flex items-center gap-2">
          {accounts.map((account) => {
            const isSelected = selectedAccounts.includes(account.id)
            return (
              <button
                key={account.id}
                onClick={() => onToggleAccount(account.id)}
                className={cn(
                  "relative p-0.5 rounded-full transition-all duration-300 transform active:scale-90 shrink-0",
                  isSelected 
                    ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-neutral-950" 
                    : "opacity-40 hover:opacity-100 scale-95 hover:scale-100"
                )}
              >
                <Avatar className="h-9 w-9 border-2 border-white dark:border-neutral-900 shadow-sm">
                  <AvatarImage src={account.avatarUrl} alt={account.accountName} />
                  <AvatarFallback className="bg-blue-50 text-blue-600 font-bold text-[10px] uppercase">
                    {(account.displayName || account.platform).substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                
                {/* Platform Badge */}
                <div className={cn(
                  "absolute -right-0.5 -bottom-0.5 h-4 w-4 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-900 shadow-sm",
                  getPlatformBg(account.platform)
                )}>
                  {getPlatformIcon(account.platform)}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
