"use client"

import React, { useState, useEffect } from "react"
import { CreatePostLayout } from "@/components/create-post/layout/create-post-layout"
import { CreatePostHeader } from "@/components/create-post/header/create-post-header"
import { MainEditor } from "@/components/create-post/editor/main-editor"
import { PreviewSidebar } from "@/components/create-post/preview/preview-sidebar"
import { PlatformFieldsContainer } from "@/components/create-post/editor/platform-fields-container"
import { Sidebar } from "@/components/layout/sidebar"
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import { useCreatePost } from "@/hooks/use-create-post-v2"
import { SocialAccountBar } from "@/components/create-post/social-account-bar"
import { Button } from "@/components/ui/button"
import { 
  Save, 
  Send, 
  Calendar, 
  ChevronDown,
  Sparkles,
  Loader2,
  Plus
} from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export default function CreatePostPage() {
  const { user: session, loading: sessionLoading } = useAuth()
  const router = useRouter()
  
  const {
    socialAccounts,
    loadingAccounts,
    creationState,
    setCreationState,
    manualState,
    setManualState,
    showScheduleModal,
    setShowScheduleModal,
    isPublishing,
    setIsPublishing,
    autoSaveStatus,
    isSavingDrafts,
    handleSocialAccountToggle,
    handleGeneralContentChange,
    handleAccountContentChange,
    handleImageUpload,
    generateContent
  } = useCreatePost()

  const [activePreviewPlatform, setActivePreviewPlatform] = useState<string>("")
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false
    try { return JSON.parse(localStorage.getItem("sidebar:collapsed") ?? "false") }
    catch { return false }
  })

  React.useEffect(() => {
    localStorage.setItem("sidebar:collapsed", JSON.stringify(collapsed))
  }, [collapsed])

  // Update active preview platform when accounts change
  React.useEffect(() => {
    if (creationState.selectedAccounts.length > 0 && !activePreviewPlatform) {
      const firstAccount = socialAccounts.find(a => a.id === creationState.selectedAccounts[0])
      if (firstAccount) setActivePreviewPlatform(firstAccount.platform)
    }
  }, [creationState.selectedAccounts, socialAccounts, activePreviewPlatform])

  // Update active preview platform when editor tab changes
  useEffect(() => {
    if (manualState.selectedTab !== 'original') {
      const account = socialAccounts.find(a => a.id === manualState.selectedTab)
      if (account) setActivePreviewPlatform(account.platform)
    }
  }, [manualState.selectedTab, socialAccounts])

  const selectedPlatforms = Array.from(new Set(
    socialAccounts
      .filter((acc: any) => creationState.selectedAccounts.includes(acc.id))
      .map((acc: any) => acc.platform)
  ))

  const handleTabChange = (tab: 'create' | 'drafts' | 'feed') => {
    console.log("Switching to tab:", tab)
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] dark:bg-neutral-950 transition-colors">
      <Sidebar collapsed={collapsed} onToggleCollapse={setCollapsed} showPlanInfo={true} />
      
      <div className={cn(
        "transition-all duration-300 min-h-screen flex flex-col",
        collapsed ? "ml-16" : "ml-64"
      )}>
        <CreatePostHeader 
          activeTab="create" 
          onTabChange={handleTabChange}
          onBulkImport={() => console.log("Bulk import")}
        />

        <SocialAccountBar 
          accounts={socialAccounts}
          selectedAccounts={creationState.selectedAccounts}
          onToggleAccount={handleSocialAccountToggle}
          loading={loadingAccounts}
        />
        
        <CreatePostLayout
          sidebar={
            <PreviewSidebar 
              selectedPlatforms={selectedPlatforms as string[]}
              activePreviewPlatform={getActivePreviewPlatform(activePreviewPlatform, selectedPlatforms as string[])}
              onPreviewPlatformChange={setActivePreviewPlatform}
              content={manualState.generalContent}
              hashtags={[]} 
              images={[]} 
              platformData={manualState.accountContent}
              socialAccounts={socialAccounts}
              selectedAccountIds={creationState.selectedAccounts}
            />
          }
          footer={
            <div className="h-14 px-6 border-t border-black/5 dark:border-white/5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-tight">
                    {autoSaveStatus === 'saving' ? 'Saving...' : 'Autosaved'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg border-black/10 dark:border-white/10 font-bold gap-1.5 text-xs">
                      <Save className="h-3.5 w-3.5" />
                      Draft
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl min-w-[180px]">
                    <DropdownMenuItem className="py-2 px-3 flex items-center gap-2 cursor-pointer text-xs font-semibold">
                      <Save className="h-3.5 w-3.5" />
                      Save as Template
                    </DropdownMenuItem>
                    <DropdownMenuItem className="py-2 px-3 flex items-center gap-2 cursor-pointer text-xs font-semibold text-blue-600 dark:text-blue-400">
                      <Sparkles className="h-3.5 w-3.5" />
                      Save & Duplicate
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 text-xs shadow-md shadow-blue-600/20">
                      {isPublishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
                      Schedule
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl min-w-[200px]">
                    <DropdownMenuItem className="py-2 px-3 flex items-center justify-between font-bold cursor-pointer text-xs">
                      Publish Now
                      <Send className="h-3.5 w-3.5 text-blue-500" />
                    </DropdownMenuItem>
                    <DropdownMenuItem className="py-2 px-3 flex items-center justify-between font-bold cursor-pointer text-xs text-amber-600 dark:text-amber-400">
                      Optimal Timing
                      <Sparkles className="h-3.5 w-3.5" />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          }
        >
          <div className="space-y-4 pb-4">
            {/* Main Editor Card with Tabs */}
            <MainEditor 
              content={manualState.generalContent}
              onContentChange={handleGeneralContentChange}
              selectedAccounts={creationState.selectedAccounts}
              socialAccounts={socialAccounts}
              onAIPilot={generateContent}
              activeTab={manualState.selectedTab}
              onTabChange={(tabId) => setManualState(prev => ({ ...prev, selectedTab: tabId }))}
              onImageUpload={(files) => handleImageUpload(manualState.selectedTab as any, files)}
              imageUrls={manualState.selectedTab === 'original' ? manualState.generalImageUrls : manualState.accountContent[manualState.selectedTab]?.imageUrls}
              platformFields={
                manualState.selectedTab !== 'original' && (
                  <PlatformFieldsContainer 
                    platform={socialAccounts.find(a => a.id === manualState.selectedTab)?.platform || ""}
                    data={manualState.accountContent[manualState.selectedTab] || {}}
                    onChange={(field, value) => handleAccountContentChange(manualState.selectedTab, field, value)}
                  />
                )
              }
            />

            {/* Empty state if no account is selected */}
            {creationState.selectedAccounts.length === 0 && (
              <div className="p-6 text-center border-2 border-dashed border-black/5 dark:border-white/5 rounded-[24px] bg-black/[0.01] dark:bg-white/[0.01]">
                 <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                 </div>
                 <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 uppercase tracking-tight">Select account</h3>
                 <p className="text-xs text-gray-500 dark:text-neutral-400 max-w-[200px] mx-auto leading-relaxed">
                   Choose a social network from the bar above to start building your post.
                 </p>
              </div>
            )}
          </div>
        </CreatePostLayout>
      </div>
    </div>
  )
}

function getActivePreviewPlatform(active: string, selectedPlatforms: string[]) {
    if (selectedPlatforms.length === 0) return ""
    if (selectedPlatforms.includes(active)) return active
    return selectedPlatforms[0]
}

function getActiveAccountId(platform: string, selectedAccountIds: string[], socialAccounts: any[]) {
    const account = socialAccounts.find(acc => selectedAccountIds.includes(acc.id) && acc.platform === platform)
    return account ? account.id : ""
}
