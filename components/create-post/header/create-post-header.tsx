"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { HelpCircle, Video, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CreatePostHeaderProps {
  activeTab: "create" | "drafts" | "feed"
  onTabChange: (tab: "create" | "drafts" | "feed") => void
  onClose?: () => void
  onBulkImport?: () => void
}

export function CreatePostHeader({
  activeTab,
  onTabChange,
  onClose,
  onBulkImport,
}: CreatePostHeaderProps) {
  return (
    <header className="flex h-[60px] items-center justify-between border-b border-border px-4 pr-[176px] md:px-5 md:pr-[300px] lg:pr-[360px]">
      <nav className="flex items-center gap-4 md:gap-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative pb-3 text-[14px] md:text-[16px] font-medium text-muted-foreground transition-colors",
              activeTab === tab.id ? "text-foreground" : "hover:text-foreground"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[4px] rounded-full bg-amber-400" />
            )}
          </button>
        ))}
      </nav>

    </header>
  )
}

const tabs = [
  { id: "create" as const, label: "Create Post" },
  { id: "drafts" as const, label: "Drafts" },
  { id: "feed" as const, label: "Feed Content" },
]
