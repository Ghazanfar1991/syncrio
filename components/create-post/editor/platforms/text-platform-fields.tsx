"use client"

import React from "react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Type, FileText } from "lucide-react"

interface PlatformFieldsProps {
  platform: string
  data: any
  onChange: (field: string, value: any) => void
}

export function TextPlatformFields({ platform, data, onChange }: PlatformFieldsProps) {
  const getFieldLabels = () => {
    switch (platform) {
      case 'PINTEREST':
        return { content: 'Pin Note', contentField: 'note', hasTitle: false }
      case 'REDDIT':
        return { content: 'Post Text', contentField: 'text', hasTitle: true, titleLabel: 'Post Title' }
      case 'GOOGLE_BUSINESS':
        return { content: 'Update Summary', contentField: 'summary', hasTitle: false }
      case 'DISCORD':
        return { content: 'Message Content', contentField: 'content', hasTitle: false }
      default:
        return { content: 'Post Content', contentField: 'text', hasTitle: false }
    }
  }

  const { content, contentField, hasTitle, titleLabel } = getFieldLabels()

  return (
    <div className="space-y-3">
      {hasTitle && (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-gray-700 dark:text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
            <Type className="h-3 w-3 text-blue-500" />
            {titleLabel || 'Title'} <span className="text-red-500">*</span>
          </Label>
          <Input 
            placeholder={`Enter ${(titleLabel || 'Title').toLowerCase()}...`}
            value={data.title || ''}
            onChange={(e) => onChange('title', e.target.value)}
            className="h-9 border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-800/40 rounded-xl focus-visible:ring-blue-500 transition-all font-medium text-sm"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold text-gray-700 dark:text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
          <FileText className="h-3 w-3 text-blue-500" />
          {content} <span className="text-red-500">*</span>
        </Label>
        <Textarea 
          placeholder={`Enter ${content.toLowerCase()}...`}
          value={data[contentField] || data.text || ''}
          onChange={(e) => onChange(contentField, e.target.value)}
          className="min-h-[120px] border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-800/40 rounded-xl focus-visible:ring-blue-500 transition-all text-sm py-2 px-3"
        />
      </div>
    </div>
  )
}
