"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface CreatePostLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function CreatePostLayout({
  children,
  sidebar,
  header,
  footer,
  className,
}: CreatePostLayoutProps) {
  return (
    <div className={cn("flex flex-col h-screen bg-[#f8f9fc] dark:bg-neutral-950 overflow-hidden", className)}>
      {/* Header */}
      {header && <div className="z-10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">{header}</div>}

      <div className="flex-1 flex overflow-hidden">
        {/* Main Editor Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 lg:p-4">
          <div className="max-w-4xl mx-auto space-y-4 pb-4">
            {children}
          </div>
        </div>

        {/* Sidebar (Preview / AI Panel) */}
        {sidebar && (
          <div className="hidden lg:block w-[380px] xl:w-[420px] border-l border-black/5 dark:border-white/5 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl overflow-y-auto custom-scrollbar">
            {sidebar}
          </div>
        )}
      </div>

      {/* Footer Area (Floating or Fixed) */}
      {footer && <div className="z-10">{footer}</div>}
    </div>
  )
}
