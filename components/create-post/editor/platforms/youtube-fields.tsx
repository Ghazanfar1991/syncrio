"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { 
  Youtube, 
  Type, 
  FileText, 
  Lock, 
  Users, 
  Baby, 
  Tags, 
  Layers 
} from "lucide-react"

interface PlatformFieldsProps {
  data: any
  onChange: (field: string, value: any) => void
}

export function YouTubeFields({ data, onChange }: PlatformFieldsProps) {
  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-gray-700 dark:text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
          <Type className="h-3.5 w-3.5 text-red-500" />
          Video Title <span className="text-red-500">*</span>
        </Label>
        <Input 
          placeholder="Enter YouTube video title..."
          value={data.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          className="h-9 border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-800/40 rounded-xl focus-visible:ring-red-500 transition-all font-medium text-sm"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-gray-700 dark:text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
          <FileText className="h-3.5 w-3.5 text-red-500" />
          Description <span className="text-red-500">*</span>
        </Label>
        <Textarea 
          placeholder="Enter YouTube video description..."
          value={data.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          className="min-h-[100px] border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-800/40 rounded-xl focus-visible:ring-red-500 transition-all text-sm py-2 px-3"
        />
      </div>

      {/* Privacy and Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-gray-700 dark:text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
            <Lock className="h-3 w-3 text-red-500" />
            Privacy Status
          </Label>
          <Select 
            value={data.privacyStatus || 'public'} 
            onValueChange={(val) => onChange('privacyStatus', val)}
          >
            <SelectTrigger className="h-9 border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-800/40 rounded-xl focus:ring-red-500 transition-all text-sm outline-none">
              <SelectValue placeholder="Select privacy" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-black/5 dark:border-white/5 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl shadow-2xl z-[100]">
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="unlisted">Unlisted</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-gray-700 dark:text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
            <Layers className="h-3 w-3 text-red-500" />
            Category
          </Label>
          <Select 
            value={data.category || 'Entertainment'} 
            onValueChange={(val) => onChange('category', val)}
          >
            <SelectTrigger className="h-9 border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-800/40 rounded-xl focus:ring-red-500 transition-all text-sm outline-none">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-black/5 dark:border-white/5 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl shadow-2xl z-[100]">
              <SelectItem value="Entertainment">Entertainment</SelectItem>
              <SelectItem value="Education">Education</SelectItem>
              <SelectItem value="Gaming">Gaming</SelectItem>
              <SelectItem value="Music">Music</SelectItem>
              <SelectItem value="Sports">Sports</SelectItem>
              <SelectItem value="Science & Technology">Science & Tech</SelectItem>
              <SelectItem value="News & Politics">News & Politics</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Made For Kids Toggle */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Baby className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <Label className="text-[11px] font-bold text-red-900 dark:text-red-100">Made for Kids?</Label>
            <p className="text-[9px] text-red-700 dark:text-red-300 opacity-80">Required by YouTube COPPA rules.</p>
          </div>
        </div>
        <Switch 
          checked={data.madeForKids || false} 
          onCheckedChange={(checked) => onChange('madeForKids', checked)}
          className="data-[state=checked]:bg-red-500 scale-75"
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-gray-700 dark:text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
          <Tags className="h-3.5 w-3.5 text-red-500" />
          Video Tags
        </Label>
        <Input 
          placeholder="tag1, tag2... (comma separated)"
          value={Array.isArray(data.tags) ? data.tags.join(', ') : ''}
          onChange={(e) => onChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
          className="h-9 border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-800/40 rounded-xl focus-visible:ring-red-500 transition-all text-sm"
        />
      </div>
    </div>
  )
}
