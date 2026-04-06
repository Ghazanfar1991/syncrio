"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { 
  Sparkles, 
  Image as ImageIcon, 
  Video, 
  Smile, 
  Type, 
  Hash, 
  Link as LinkIcon,
  Maximize2,
  MoreHorizontal,
  Plus,
  Facebook,
  Instagram,
  Linkedin,
  Youtube
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

const XLogo = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    fill="currentColor"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

interface SocialAccount {
  id: string
  platform: string
  accountName: string
  displayName?: string
  username?: string
}

interface MainEditorProps {
  content: string
  onContentChange: (content: string) => void
  selectedAccounts: string[]
  socialAccounts: SocialAccount[]
  onAccountToggle?: (id: string) => void
  onAIPilot: () => void
  activeTab: string
  onTabChange: (tabId: string) => void
  platformFields?: React.ReactNode
  mediaCount?: number
  onMediaClick?: () => void
  onImageUpload?: (files: FileList | File[]) => void
  onVideoUpload?: (file: File) => void
  imageUrls?: string[]
}

export function MainEditor({
  content,
  onContentChange,
  selectedAccounts,
  socialAccounts,
  onAccountToggle,
  onAIPilot,
  activeTab,
  onTabChange,
  platformFields,
  mediaCount = 0,
  onMediaClick,
  onImageUpload,
  onVideoUpload,
  imageUrls = []
}: MainEditorProps) {
  
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const videoInputRef = React.useRef<HTMLInputElement>(null)
  
  const getSelectedAccounts = () => {
    return socialAccounts.filter(acc => selectedAccounts.includes(acc.id))
  }

  const renderPlatformIcon = (platform: string, size = "h-4 w-4") => {
    switch (platform.toUpperCase()) {
      case 'X':
      case 'TWITTER': return <XLogo className={size} />
      case 'FACEBOOK': return <Facebook className={size} />
      case 'INSTAGRAM': return <Instagram className={size} />
      case 'LINKEDIN': return <Linkedin className={size} />
      case 'YOUTUBE': return <Youtube className={size} />
      default: return <span className="text-[10px] font-bold">{platform[0]}</span>
    }
  }

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

  return (
    <Card className="border-black/5 dark:border-white/5 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden min-h-[350px]">
      {/* Editor Tab Header */}
      <div className="flex items-center gap-1 p-1.5 bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => onTabChange('original')}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0",
            activeTab === 'original'
              ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-gray-500 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white"
          )}
        >
          Original Draft
        </button>

        {getSelectedAccounts().map((account) => {
          const isActive = activeTab === account.id
          return (
            <button
              key={account.id}
              onClick={() => onTabChange(account.id)}
              className={cn(
                "relative group h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-300 shrink-0",
                isActive 
                  ? "bg-white dark:bg-neutral-800 shadow-sm border border-black/5 dark:border-white/5" 
                  : "hover:bg-black/5 dark:hover:bg-white/5 opacity-60 hover:opacity-100"
              )}
              title={account.accountName}
            >
              <Avatar className="h-7 w-7 border border-white dark:border-neutral-900 shadow-sm">
                <AvatarImage src={(account as any).avatarUrl} alt={account.accountName} />
                <AvatarFallback className="bg-blue-50 text-blue-600 font-bold text-[8px] uppercase">
                  {(account.displayName || account.platform).substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              
              {/* Platform Badge */}
              <div className={cn(
                "absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full flex items-center justify-center border border-white dark:border-neutral-900 shadow-sm scale-90",
                getPlatformBg(account.platform)
              )}>
                {renderPlatformIcon(account.platform, "h-2 w-2")}
              </div>

              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full shadow-lg" />
              )}
            </button>
          )
        })}
      </div>

      <CardContent className="p-4">
        {activeTab === 'original' ? (
          <div className="space-y-4">
            {/* Original Draft Controls */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Master Content</h3>
              <button 
                onClick={onAIPilot}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors group"
              >
                <Sparkles className="h-3 w-3 animate-pulse group-hover:scale-110 transition-transform" />
                AI Content Pilot
              </button>
            </div>

            {/* Text Editor */}
            <div className="relative">
              <Textarea 
                placeholder="Compose your baseline post content here. Changes here reflect on all selected platforms..."
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                className="min-h-[180px] text-base font-medium leading-relaxed border-none focus-visible:ring-0 bg-transparent p-0 resize-none placeholder:text-gray-300 dark:placeholder:text-neutral-700 custom-scrollbar"
              />
              
              <div className="absolute -bottom-4 right-0 text-[10px] font-mono text-gray-400">
                {content.length} characters
              </div>
            </div>

            {/* Media Gallery */}
            {imageUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
                {imageUrls.map((url, i) => (
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-black/5 dark:border-white/5">
                    <img src={url} alt={`Media ${i}`} className="w-full h-full object-cover" />
                    <button className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      ×
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-black/5 dark:border-white/5 flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-500 transition-all"
                >
                  <Plus className="h-5 w-5 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Add More</span>
                </button>
              </div>
            )}

            {/* Toolbar Area */}
            <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/5 mt-2">
              <div className="flex items-center gap-1">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  multiple 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => e.target.files && onImageUpload?.(e.target.files)}
                />
                <input 
                  type="file" 
                  ref={videoInputRef} 
                  className="hidden" 
                  accept="video/*"
                  onChange={(e) => e.target.files && onVideoUpload?.(e.target.files[0])}
                />
                
                <ToolbarButton 
                  icon={<ImageIcon className="h-4 w-4" />} 
                  label="Images" 
                  onClick={() => fileInputRef.current?.click()}
                />
                <ToolbarButton 
                  icon={<Video className="h-4 w-4" />} 
                  label="Video" 
                  onClick={() => videoInputRef.current?.click()}
                />
                <ToolbarButton icon={<Smile className="h-4 w-4" />} label="Emoji" />
                <ToolbarButton icon={<Maximize2 className="h-4 w-4" />} label="Advanced" />
                <ToolbarButton icon={<LinkIcon className="h-4 w-4" />} label="UTM" />
                <ToolbarButton icon={<Hash className="h-4 w-4" />} label="Hashtags" />
              </div>

              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-500 cursor-pointer transition-colors">
                Link Shortener
                <MoreHorizontal className="h-4 w-4" />
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            {platformFields}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ToolbarButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) {
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-9 w-9 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all"
      title={label}
      onClick={onClick}
    >
      {icon}
    </Button>
  )
}

function FileText(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
    )
}
