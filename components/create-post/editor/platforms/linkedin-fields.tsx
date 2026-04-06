"use client"

import React from "react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Linkedin, Sparkles, Target, Users } from "lucide-react"

interface PlatformFieldsProps {
  data: any
  onChange: (field: string, value: any) => void
}

export function LinkedInFields({ data, onChange }: PlatformFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] font-bold text-gray-700 dark:text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
            <Linkedin className="h-3 w-3 text-blue-600" />
            LinkedIn Post <span className="text-red-500">*</span>
          </Label>
          <button className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group uppercase tracking-tight">
            <Sparkles className="h-3 w-3 group-hover:animate-pulse" />
            Professional
          </button>
        </div>
        <Textarea 
          placeholder="Share professional insights..."
          value={data.text || ''}
          onChange={(e) => onChange('text', e.target.value)}
          className="min-h-[100px] border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-800/40 rounded-xl focus-visible:ring-blue-600 transition-all text-sm py-2 px-3"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 group cursor-pointer hover:bg-blue-100/50 transition-colors">
          <Target className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          <div className="text-left">
            <p className="text-[10px] font-bold text-blue-900 dark:text-blue-100 uppercase tracking-tight">Visibility</p>
            <p className="text-[9px] text-blue-700 dark:text-blue-300 opacity-80">Anyone on LinkedIn</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30 group cursor-pointer hover:bg-green-100/50 transition-colors">
          <Users className="h-3.5 w-3.5 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
          <div className="text-left">
            <p className="text-[10px] font-bold text-green-900 dark:text-green-100 uppercase tracking-tight">Comments</p>
            <p className="text-[9px] text-green-700 dark:text-green-300 opacity-80">Enable engagement</p>
          </div>
        </div>
      </div>
    </div>
  )
}
