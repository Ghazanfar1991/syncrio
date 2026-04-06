"use client"

import React from "react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Sparkles, MessageSquare } from "lucide-react"

interface PlatformFieldsProps {
  data: any
  onChange: (field: string, value: any) => void
}

export function FacebookFields({ data, onChange }: PlatformFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] font-bold text-gray-700 dark:text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
            <MessageSquare className="h-3 w-3 text-blue-500" />
            Facebook First Comment
          </Label>
          <button className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group uppercase tracking-tight">
            <Sparkles className="h-3 w-3 group-hover:animate-pulse" />
            Generate
          </button>
        </div>
        <Textarea 
          placeholder="Type the Facebook first comment here..."
          value={data.firstComment || ''}
          onChange={(e) => onChange('firstComment', e.target.value)}
          className="min-h-[80px] border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-800/40 rounded-xl focus-visible:ring-blue-500 transition-all text-sm py-2 px-3"
        />
      </div>
    </div>
  )
}
