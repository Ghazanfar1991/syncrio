"use client"

import { useEffect, useState } from 'react'

interface HydrationSafeProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function HydrationSafe({ children, fallback }: HydrationSafeProps) {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Show fallback or nothing during hydration to prevent mismatches
  if (!isHydrated) {
    return fallback ? <>{fallback}</> : null
  }

  return <>{children}</>
}
