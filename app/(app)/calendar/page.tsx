"use client"

import dynamic from "next/dynamic"

const CalendarPageContent = dynamic(() => import("@/components/pages/calendar-page"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-slate-50 dark:bg-neutral-950" />,
})

export default function CalendarPage() {
  return <CalendarPageContent />
}
