"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { 
  FacebookFields, 
  YouTubeFields, 
  TikTokFields, 
  XFields, 
  LinkedInFields, 
  TextPlatformFields,
  InstagramFields
} from "./platforms"
import { Card, CardContent } from "@/components/ui/card"
import { Info } from "lucide-react"

interface PlatformFieldsContainerProps {
  platform: string
  data: any
  onChange: (field: string, value: any) => void
  isGeneral?: boolean
}

export function PlatformFieldsContainer({
  platform,
  data,
  onChange,
  isGeneral = false
}: PlatformFieldsContainerProps) {
  
  if (isGeneral) {
    return (
      <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100">General Content</h4>
            <p className="text-[11px] text-blue-700 dark:text-blue-300 opacity-80 leading-relaxed mt-0.5">
              Changes apply to all platforms. Use individual tabs below to fine-tune.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const renderPlatformFields = () => {
    switch (platform) {
      case 'FACEBOOK':
        return <FacebookFields data={data} onChange={onChange} />
      case 'YOUTUBE':
        return <YouTubeFields data={data} onChange={onChange} />
      case 'TIKTOK':
        return <TikTokFields data={data} onChange={onChange} />
      case 'TWITTER':
      case 'X':
        return <XFields data={data} onChange={onChange} />
      case 'LINKEDIN':
        return <LinkedInFields data={data} onChange={onChange} />
      case 'INSTAGRAM':
        return <InstagramFields data={data} onChange={onChange} />
      case 'THREADS':
      case 'PINTEREST':
      case 'REDDIT':
      case 'MASTODON':
      case 'BLUESKY':
      case 'DISCORD':
      case 'SLACK':
      case 'GOOGLE_BUSINESS':
        return <TextPlatformFields platform={platform} data={data} onChange={onChange} />
      default:
        return (
          <div className="p-4 text-center text-gray-500 text-sm">
            No specific fields for {platform}. Standard content will be used.
          </div>
        )
    }
  }

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2 mb-0.5">
        <div className="h-1 w-1 rounded-full bg-blue-500" />
        <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-neutral-500">
          {platform} Specific Options
        </h3>
      </div>
      {renderPlatformFields()}
    </div>
  )
}
