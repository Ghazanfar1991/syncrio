"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { 
  Linkedin, 
  Link as LinkIcon, 
  Type, 
  AlertCircle, 
  Info,
  Globe,
  Settings2,
  FileText
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface LinkedInFieldsProps {
  data: any
  onChange: (field: string, value: any) => void
}

export function LinkedInFields({ data, onChange }: LinkedInFieldsProps) {
  const hasMedia = (data.imageUrls && data.imageUrls.length > 0) || data.videoUrl
  const hasLink = !!data.linkedinLink

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Article / Link Preview Section */}
      <div className="space-y-3 p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <Label className="text-[11px] font-bold text-blue-900 dark:text-blue-100 uppercase tracking-wider">Link Preview</Label>
          </div>
          {hasLink && (
            <Badge variant="outline" className="text-[9px] font-bold uppercase bg-blue-100/50 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700">
              Article Mode
            </Badge>
          )}
        </div>

        <div className="space-y-1.5">
          <Input
            placeholder="https://example.com/your-article"
            value={data.linkedinLink || ""}
            onChange={(e) => onChange('linkedinLink', e.target.value)}
            className="h-9 text-sm bg-white dark:bg-neutral-900 border-black/5 dark:border-white/5 focus-visible:ring-blue-600 transition-all"
          />
          <p className="text-[9px] text-blue-700/70 dark:text-blue-300/60 leading-tight flex items-center gap-1">
            <Info className="h-2.5 w-2.5" />
            Bundle.social will automatically scrape Open Graph metadata for the preview.
          </p>
        </div>

        {/* Conflict Warning */}
        {hasMedia && hasLink && (
          <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 flex gap-2 animate-in slide-in-from-top-2">
            <AlertCircle className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-orange-800 dark:text-orange-300 leading-tight">
              <strong>Notice:</strong> LinkedIn gives precedence to uploaded media. Your images/videos will be shown instead of the link preview.
            </p>
          </div>
        )}
      </div>

      {/* Media Title & Metadata */}
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-gray-700 dark:text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
            <FileText className="h-3 w-3 text-blue-600" />
            Media / Article Title
          </Label>
          <Input
            placeholder="Headline for your video or article..."
            value={data.linkedinMediaTitle || ""}
            onChange={(e) => onChange('linkedinMediaTitle', e.target.value)}
            maxLength={200}
            className="h-9 text-sm bg-white/40 dark:bg-neutral-800/40 border-black/5 dark:border-white/5 focus-visible:ring-blue-600"
          />
          <div className="flex justify-between items-center px-1">
            <p className="text-[9px] text-gray-400">Used as the title for uploaded documents or article fragments.</p>
            <span className="text-[9px] font-bold text-gray-400 uppercase">{(data.linkedinMediaTitle || "").length}/200</span>
          </div>
        </div>
      </div>

      {/* Footer Info / Perks */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="flex items-start gap-2 p-2 rounded-xl bg-gray-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5">
           <Globe className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
           <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-gray-700 dark:text-neutral-300 uppercase tracking-tight">Visibility</p>
              <p className="text-[9px] text-gray-500 leading-tight">Anyone on LinkedIn Network</p>
           </div>
        </div>
        <div className="flex items-start gap-2 p-2 rounded-xl bg-gray-50 dark:bg-neutral-900 border border-black/5 dark:border-white/5">
           <Settings2 className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
           <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-gray-700 dark:text-neutral-300 uppercase tracking-tight">Capabilities</p>
              <p className="text-[9px] text-gray-500 leading-tight">Supports PDFs & GIFs</p>
           </div>
        </div>
      </div>
    </div>
  )
}
