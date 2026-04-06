"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Sparkles, 
  Type, 
  Lock, 
  Music, 
  Wand2, 
  Share2 
} from "lucide-react"

interface PlatformFieldsProps {
  data: any
  onChange: (field: string, value: any) => void
}

export function TikTokFields({ data, onChange }: PlatformFieldsProps) {
  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold text-gray-700 dark:text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
          <Type className="h-3 w-3 text-black dark:text-white" />
          TikTok Title (Optional)
        </Label>
        <Input 
          placeholder="Enter title..."
          value={data.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          className="h-9 border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-800/40 rounded-xl focus-visible:ring-black dark:focus-visible:ring-white transition-all font-medium text-sm px-3"
        />
      </div>

      {/* Caption/Description */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] font-bold text-gray-700 dark:text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
            <Share2 className="h-3 w-3 text-black dark:text-white" />
            TikTok Caption <span className="text-red-500">*</span>
          </Label>
          <button className="text-[10px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 group uppercase tracking-tight">
            <Sparkles className="h-3 w-3 group-hover:animate-pulse" />
            Optimize
          </button>
        </div>
        <Textarea 
          placeholder="TikTok caption... (Max 2200 chars)"
          value={data.text || ''}
          onChange={(e) => onChange('text', e.target.value)}
          className="min-h-[100px] border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-800/40 rounded-xl focus-visible:ring-black dark:focus-visible:ring-white transition-all text-sm py-2 px-3"
        />
      </div>

      {/* Privacy and Sounds */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-gray-700 dark:text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
            <Lock className="h-3 w-3 text-black dark:text-white" />
            Privacy
          </Label>
          <Select 
            value={data.privacy || 'PUBLIC_TO_EVERYONE'} 
            onValueChange={(val) => onChange('privacy', val)}
          >
            <SelectTrigger className="h-9 border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-800/40 rounded-xl focus:ring-black dark:focus:ring-white transition-all text-sm">
              <SelectValue placeholder="Select privacy..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-black/5 dark:border-white/5 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl">
              <SelectItem value="PUBLIC_TO_EVERYONE">Everyone</SelectItem>
              <SelectItem value="MUTUAL_FOLLOW_FRIENDS">Friends</SelectItem>
              <SelectItem value="SELF_ONLY">Only Me</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-gray-700 dark:text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
            <Music className="h-3 w-3 text-black dark:text-white" />
            Sound / Music
          </Label>
          <Input 
            placeholder="Sound ID..."
            value={data.sounds || ''}
            onChange={(e) => onChange('sounds', e.target.value)}
            className="h-9 border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-800/40 rounded-xl focus-visible:ring-black dark:focus-visible:ring-white transition-all text-sm px-3"
          />
        </div>
      </div>

      {/* Effects */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold text-gray-700 dark:text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
          <Wand2 className="h-3 w-3 text-black dark:text-white" />
          Filter / Effect
        </Label>
        <Input 
          placeholder="Filter name or ID..."
          value={data.effects && data.effects.length > 0 ? data.effects[0] : ''}
          onChange={(e) => onChange('effects', [e.target.value])}
          className="h-9 border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-800/40 rounded-xl focus-visible:ring-black dark:focus-visible:ring-white transition-all text-sm px-3"
        />
      </div>
    </div>
  )
}
