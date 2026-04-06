"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { 
  Info, 
  Smartphone, 
  Monitor, 
  Tablet,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from "lucide-react"
import { Button } from "@/components/ui/button"
import PostPreview from "@/components/content/PostPreview"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const renderPlatformIcon = (platform: string, size = "h-4 w-4") => {
  switch (platform.toUpperCase()) {
    case 'X':
    case 'TWITTER': return <XLogo className={size} />
    case 'FACEBOOK': return <Facebook className={size} />
    case 'INSTAGRAM': return <Instagram className={size} />
    case 'LINKEDIN': return <Linkedin className={size} />
    case 'YOUTUBE': return <Youtube className={size} />
    default: return null
  }
}

// Re-import icons needed
import { 
  Facebook, 
  Instagram, 
  Linkedin, 
  Youtube,
  Twitter as TwitterIcon
} from "lucide-react"

const getPlatformBg = (platform: string) => {
  const bgColors: Record<string, string> = {
    X: 'bg-black dark:bg-white text-white dark:text-black',
    TWITTER: 'bg-black dark:bg-white text-white dark:text-black',
    LINKEDIN: 'bg-blue-600 text-white',
    INSTAGRAM: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white',
    YOUTUBE: 'bg-red-600 text-white',
    FACEBOOK: 'bg-blue-500 text-white'
  }
  return bgColors[platform] || 'bg-gray-500 text-white'
}

interface PreviewSidebarProps {
  selectedPlatforms: string[]
  activePreviewPlatform: string
  onPreviewPlatformChange: (platform: string) => void
  content: string
  hashtags: string[]
  images?: string[]
  videoUrl?: string
  platformData?: Record<string, any>
  socialAccounts?: any[]
  selectedAccountIds?: string[]
}

export function PreviewSidebar({
  selectedPlatforms,
  activePreviewPlatform,
  onPreviewPlatformChange,
  content,
  hashtags,
  images,
  videoUrl,
  platformData = {},
  socialAccounts = [],
  selectedAccountIds = []
}: PreviewSidebarProps) {
  
  const getSelectedAccounts = () => {
    return socialAccounts.filter(acc => selectedAccountIds.includes(acc.id))
  }
  
  // Get content specifically for the active preview platform if it exists
  const activeAccount = getSelectedAccounts().find(acc => acc.platform === activePreviewPlatform)
  const platformSpecificData = activeAccount ? platformData[activeAccount.id] : null
  
  const platformSpecificContent = platformSpecificData?.content || platformSpecificData?.text || content
  const platformSpecificHashtags = platformSpecificData?.hashtags || hashtags
  const platformSpecificImages = platformSpecificData?.imageUrls || images
  const platformSpecificVideo = platformSpecificData?.videoUrl || videoUrl

  return (
    <div className="flex flex-col h-full">
      {/* Platform Tabs for Preview */}
      <div className="px-2.5 py-2 border-b border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-neutral-500">
            Preview Network
          </h3>
          <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 p-0.5 rounded-md">
            <Button variant="ghost" size="icon" className="h-5 w-5 rounded bg-white dark:bg-neutral-800 shadow-sm p-1">
              <Smartphone className="h-2.5 w-2.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5 rounded text-gray-400 p-1">
              <Monitor className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {getSelectedAccounts().length === 0 ? (
            <p className="text-[9px] text-gray-500 italic font-medium py-1">Select an account to preview</p>
          ) : (
            getSelectedAccounts().map((account) => {
              const isActive = activePreviewPlatform === account.platform
              return (
                <button
                  key={account.id}
                  onClick={() => onPreviewPlatformChange(account.platform)}
                  className={cn(
                    "relative group h-8.5 w-8.5 rounded-lg flex items-center justify-center transition-all duration-300 shrink-0",
                    isActive 
                      ? "bg-white dark:bg-neutral-800 shadow-sm border border-black/5 dark:border-white/5" 
                      : "hover:bg-black/5 dark:hover:bg-white/5 opacity-60 hover:opacity-100"
                  )}
                  title={account.accountName}
                >
                  <Avatar className="h-6.5 w-6.5 border border-white dark:border-neutral-900 shadow-sm">
                    <AvatarImage src={account.avatarUrl} alt={account.accountName} />
                    <AvatarFallback className="bg-blue-50 text-blue-600 font-bold text-[7px] uppercase">
                      {(account.displayName || account.platform).substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Platform Badge */}
                  <div className={cn(
                    "absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full flex items-center justify-center border border-white dark:border-neutral-900 shadow-sm",
                    getPlatformBg(account.platform)
                  )}>
                    {renderPlatformIcon(account.platform, "h-1.5 w-1.5")}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Preview Content Area */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center justify-center bg-gradient-to-b from-transparent to-black/5 dark:to-white/5 custom-scrollbar">
        <div className="w-full max-w-sm animate-in fade-in zoom-in duration-500 scale-95 origin-top">
          {activePreviewPlatform ? (
            <PostPreview 
              platform={activePreviewPlatform}
              text={platformSpecificContent}
              hashtags={platformSpecificHashtags}
              images={platformSpecificImages}
              videoUrl={platformSpecificVideo}
            />
          ) : (
            <div className="text-center space-y-3 opacity-50 py-10">
              <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-neutral-800 mx-auto flex items-center justify-center">
                <Smartphone className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Select platform to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
