"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { 
  Instagram, 
  Users, 
  MapPin, 
  Image as ImageIcon, 
  Film, 
  Clock, 
  Tag as TagIcon,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  X,
  Maximize2,
  Crop as CropIcon,
  Sparkles
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface InstagramFieldsProps {
  data: any
  onChange: (field: string, value: any) => void
}

export function InstagramFields({ data, onChange }: InstagramFieldsProps) {
  const [newCollaborator, setNewCollaborator] = useState("")

  const type = data.instagramType || "POST"
  const collaborators = data.collaborators || []

  const handleAddCollaborator = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newCollaborator.trim()) {
      e.preventDefault()
      const cleanName = newCollaborator.trim().replace(/^@/, '').toLowerCase()
      if (!collaborators.includes(cleanName) && collaborators.length < 3) {
        onChange('collaborators', [...collaborators, cleanName])
        setNewCollaborator("")
      }
    }
  }

  const removeCollaborator = (name: string) => {
    onChange('collaborators', collaborators.filter((c: string) => c !== name))
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Post Type Selector */}
      <div className="grid grid-cols-3 gap-2 p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5">
        {[
          { id: 'POST', label: 'Feed', icon: ImageIcon },
          { id: 'REEL', label: 'Reel', icon: Film },
          { id: 'STORY', label: 'Story', icon: Clock }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => onChange('instagramType', t.id)}
            className={cn(
              "flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all text-[11px] font-bold uppercase tracking-wider",
              type === t.id 
                ? "bg-white dark:bg-neutral-800 shadow-sm text-pink-600 dark:text-pink-400" 
                : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Conditional Fields based on Type */}
      <div className="space-y-4">
        {/* Aspect Ratio Correction (Only for POST) */}
        {type === 'POST' && (
          <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-50/50 to-orange-50/50 dark:from-pink-900/10 dark:to-orange-900/10 border border-pink-100/50 dark:border-pink-800/20 space-y-3">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Maximize2 className="h-3.5 w-3.5 text-pink-500" />
                  <Label className="text-[11px] font-bold text-pink-900/80 dark:text-pink-100/80 uppercase tracking-wider">Image Scaling</Label>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-pink-400 font-medium">9:16 / 4:5 optimized</span>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    onChange('autoFitImage', !data.autoFitImage)
                    if (!data.autoFitImage) onChange('autoCropImage', false)
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all",
                    data.autoFitImage 
                      ? "bg-white dark:bg-neutral-800 border-pink-500 shadow-sm" 
                      : "bg-white/40 dark:bg-neutral-900/40 border-black/5 dark:border-white/5 opacity-60"
                  )}
                >
                  <div className={cn("w-full h-12 border-2 border-dashed rounded flex items-center justify-center", data.autoFitImage ? "border-pink-200" : "border-gray-200")}>
                     <div className="w-6 h-6 bg-pink-500/20 rounded-sm" />
                  </div>
                  <span className="text-[10px] font-bold uppercase">Auto-Fit</span>
                </button>

                <button
                  onClick={() => {
                    onChange('autoCropImage', !data.autoCropImage)
                    if (!data.autoCropImage) onChange('autoFitImage', false)
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all",
                    data.autoCropImage 
                      ? "bg-white dark:bg-neutral-800 border-pink-500 shadow-sm" 
                      : "bg-white/40 dark:bg-neutral-900/40 border-black/5 dark:border-white/5 opacity-60"
                  )}
                >
                  <div className={cn("w-full h-12 border-2 border-dashed rounded flex items-center justify-center", data.autoCropImage ? "border-pink-200" : "border-gray-200")}>
                     <CropIcon className="h-5 w-5 text-pink-500/40" />
                  </div>
                  <span className="text-[10px] font-bold uppercase">Auto-Crop</span>
                </button>
             </div>
          </div>
        )}

        {/* Collaborators (Not for Stories) */}
        {type !== 'STORY' && (
          <div className="space-y-2 p-3 rounded-2xl bg-white/40 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold text-gray-700 dark:text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
                <Users className="h-3 w-3 text-pink-500" />
                Collaborators ({collaborators.length}/3)
              </Label>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {collaborators.map((c: string) => (
                <Badge key={c} variant="secondary" className="bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 border-pink-100 dark:border-pink-800/30 gap-1 pr-1">
                  @{c}
                  <button onClick={() => removeCollaborator(c)} className="hover:text-pink-900 dark:hover:text-pink-100">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Type username and press Enter..."
              value={newCollaborator}
              onChange={(e) => setNewCollaborator(e.target.value)}
              onKeyDown={handleAddCollaborator}
              disabled={collaborators.length >= 3}
              className="h-8 text-xs bg-white/50 dark:bg-neutral-900/50 border-black/5 dark:border-white/5"
            />
          </div>
        )}

        {/* Common Fields: Location & Alt Text */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {type !== 'STORY' && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-gray-700 dark:text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
                <MapPin className="h-3 w-3 text-pink-500" />
                Location ID
              </Label>
              <Input 
                value={data.locationId || ""} 
                onChange={(e) => onChange('locationId', e.target.value)}
                placeholder="e.g. 123456789"
                className="h-9 text-sm bg-white/40 dark:bg-neutral-800/40 border-black/5 dark:border-white/5"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-gray-700 dark:text-neutral-300 flex items-center gap-2 uppercase tracking-wider">
              <Plus className="h-3 w-3 text-pink-500" />
              Alt Text (Images)
            </Label>
            <Input 
              value={data.altText || ""} 
              onChange={(e) => onChange('altText', e.target.value)}
              placeholder="Describe your image..."
              className="h-9 text-sm bg-white/40 dark:bg-neutral-800/40 border-black/5 dark:border-white/5"
            />
          </div>
        </div>

        {/* Reel Specific: Trial Params & Share to Feed */}
        {type === 'REEL' && (
          <div className="space-y-3 p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                 <Label className="text-[11px] font-bold text-gray-700 dark:text-neutral-300 uppercase tracking-wider">Share to Feed</Label>
                 <p className="text-[9px] text-gray-500">Enable to show Reel on your profile grid.</p>
              </div>
              <Switch 
                checked={data.shareToFeed ?? true} 
                onCheckedChange={(val) => onChange('shareToFeed', val)} 
              />
            </div>

            <div className="pt-2 border-t border-black/5 dark:border-white/5">
               <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  <Label className="text-[11px] font-bold text-gray-700 dark:text-neutral-300 uppercase tracking-wider tracking-widest">Trial Reel Settings</Label>
               </div>
               <Select 
                 value={data.trialParams?.graduationStrategy || "MANUAL"} 
                 onValueChange={(val) => onChange('trialParams', { ...data.trialParams, graduationStrategy: val })}
               >
                 <SelectTrigger className="h-8 text-xs bg-white/40 dark:bg-neutral-800/40 border-black/5 dark:border-white/5">
                   <SelectValue placeholder="Graduation Strategy" />
                 </SelectTrigger>
                 <SelectContent className="z-[100]">
                   <SelectItem value="MANUAL">Manual Graduation</SelectItem>
                   <SelectItem value="SS_PERFORMANCE">Performance-based</SelectItem>
                 </SelectContent>
               </Select>
               <p className="text-[9px] text-gray-400 mt-1.5 px-1 leading-tight">
                 Trial reels are shown to non-followers first. Requires 1,000+ followers for best results.
               </p>
            </div>
          </div>
        )}
      </div>

      {/* Warning/Compliance Banner */}
      {type === 'STORY' && (
         <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 flex gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-orange-800 dark:text-orange-300 leading-tight">
              Stories expire after 24 hours. Tagging and shared-to-feed are not available for this format.
            </p>
         </div>
      )}
    </div>
  )
}
