"use client"

import React from "react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Type, Sparkles, Hash } from "lucide-react"

interface PlatformFieldsProps {
  data: any
  onChange: (field: string, value: any) => void
}

export function XFields({ data, onChange }: PlatformFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] font-bold text-gray-700 dark:text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
            <Type className="h-3 w-3 text-black dark:text-white" />
            X (Twitter) Content <span className="text-red-500">*</span>
          </Label>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-gray-400">
              {data.text?.length || 0}/280
            </span>
            <button className="text-[10px] font-bold text-blue-400 hover:text-blue-500 flex items-center gap-1 group uppercase tracking-tight">
              <Sparkles className="h-3 w-3 group-hover:animate-pulse" />
              Shorten
            </button>
          </div>
        </div>
        <Textarea 
          placeholder="What's happening?"
          value={data.text || ''}
          onChange={(e) => onChange('text', e.target.value)}
          className="min-h-[100px] border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-800/40 rounded-xl focus-visible:ring-black dark:focus-visible:ring-white transition-all text-sm py-2 px-3"
        />
      </div>

      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
        <Hash className="h-3.5 w-3.5 text-gray-400" />
        <p className="text-[9px] font-medium text-gray-500 dark:text-neutral-400 leading-tight">
          X automatically converts URLs. We recommend using 1-2 hashtags for maximum reach.
        </p>
      </div>
    </div>
  )
}
