"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { 
  Plus, 
  Search, 
  HelpCircle, 
  Video, 
  X, 
  ChevronDown,
  LayoutGrid,
  FileText,
  Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface CreatePostHeaderProps {
  activeTab: 'create' | 'drafts' | 'feed'
  onTabChange: (tab: 'create' | 'drafts' | 'feed') => void
  onClose?: () => void
  onBulkImport?: () => void
}

export function CreatePostHeader({
  activeTab,
  onTabChange,
  onClose,
  onBulkImport
}: CreatePostHeaderProps) {
  return (
    <header className="h-14 px-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as any)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 relative group",
                activeTab === tab.id
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              )}
            >
              <div className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </div>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 h-8 w-8 rounded-lg">
          <HelpCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 h-8 w-8 rounded-lg">
          <Video className="h-4 w-4" />
        </Button>
        
        <div className="w-[1px] h-5 bg-black/10 dark:bg-white/10 mx-1" />

        <Button 
          variant="outline" 
          size="sm"
          onClick={onBulkImport}
          className="h-8 border-blue-600/20 dark:border-blue-400/20 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg px-3 gap-1.5 transition-all font-bold text-xs"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Bulk Import
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 h-8 w-8 rounded-lg"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}

const tabs = [
  { id: 'create', label: 'Create Post', icon: <Plus className="h-4 w-4" /> },
  { id: 'drafts', label: 'Drafts', icon: <FileText className="h-4 w-4" /> },
  { id: 'feed', label: 'Feed Content', icon: <Calendar className="h-4 w-4" /> },
]
