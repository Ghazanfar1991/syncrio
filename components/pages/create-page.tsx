"use client"

import { usePersistentSidebar } from "@/components/layout/use-persistent-sidebar"
import { CreatePostHeader } from "@/components/create-post/header/create-post-header"
import { BundleComposer } from "@/components/create-post/bundle-composer"
import { cn } from "@/lib/utils"

export default function CreatePostPage() {
  const [collapsed] = usePersistentSidebar()

  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 px-2 pb-4 pt-6 transition-[margin] duration-300 md:px-3 md:pb-6 md:pt-7",
        collapsed ? "md:ml-[68px]" : "md:ml-64"
      )}
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="rounded-[28px] border border-black/5 dark:border-white/5 bg-white/70 dark:bg-neutral-900/70 shadow-xl backdrop-blur-xl">
          <CreatePostHeader activeTab="create" onTabChange={() => undefined} onBulkImport={() => undefined} />
          <BundleComposer />
        </div>
      </div>
    </div>
  )
}
