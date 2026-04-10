"use client"

import { useEffect } from "react"
import { SerwistProvider } from "@serwist/next/react"

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        const scriptUrl = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || ""

        if (scriptUrl.includes("/sw.js")) {
          void registration.unregister()
        }
      })
    }).catch(() => {
      // Ignore dev-only cleanup failures.
    })
  }, [])

  if (process.env.NODE_ENV !== "production") {
    return <>{children}</>
  }

  return (
    <SerwistProvider
      swUrl="/sw.js"
      register={true}
      cacheOnNavigation={true}
      disable={false}
    >
      {children}
    </SerwistProvider>
  )
}
