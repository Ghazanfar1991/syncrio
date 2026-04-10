"use client"

import dynamic from "next/dynamic"

const CreatePageContent = dynamic(() => import("@/components/pages/create-page"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-slate-50 dark:bg-neutral-950" />,
})

export default function CreatePage() {
  return <CreatePageContent />
}
