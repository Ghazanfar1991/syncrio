"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"

export interface MiniChartDatum {
  label: string
  value: number
}

interface MiniChartProps {
  data?: MiniChartDatum[]
  suffix?: string
  title?: string
  className?: string
}

const defaultData: MiniChartDatum[] = [
  { label: "Mon", value: 65 },
  { label: "Tue", value: 85 },
  { label: "Wed", value: 45 },
  { label: "Thu", value: 95 },
  { label: "Fri", value: 70 },
  { label: "Sat", value: 55 },
  { label: "Sun", value: 80 },
]

export function MiniChart({
  data = defaultData,
  suffix = "%",
  title = "Activity",
  className,
}: MiniChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [displayValue, setDisplayValue] = useState<number | null>(null)
  const [isHovering, setIsHovering] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const maxValue = useMemo(() => Math.max(...data.map((item) => item.value), 1), [data])

  useEffect(() => {
    if (hoveredIndex !== null) {
      setDisplayValue(data[hoveredIndex]?.value ?? null)
    }
  }, [data, hoveredIndex])

  const handleContainerEnter = () => setIsHovering(true)
  const handleContainerLeave = () => {
    setIsHovering(false)
    setHoveredIndex(null)
    setTimeout(() => setDisplayValue(null), 150)
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleContainerEnter}
      onMouseLeave={handleContainerLeave}
      className={cn(
        "group relative flex w-full max-w-sm flex-col gap-4 rounded-[28px] border border-foreground/[0.06] bg-foreground/[0.02] p-6 backdrop-blur-sm transition-all duration-500 hover:border-foreground/[0.1] hover:bg-foreground/[0.04]",
        className
      )}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
        </div>
        <div className="relative flex h-7 items-center">
          <span
            className={cn(
              "tabular-nums text-lg font-semibold transition-all duration-300 ease-out",
              isHovering && displayValue !== null ? "text-foreground opacity-100" : "text-muted-foreground opacity-50"
            )}
          >
            {displayValue !== null ? displayValue : ""}
            <span
              className={cn(
                "ml-0.5 text-xs font-normal text-muted-foreground transition-opacity duration-300",
                displayValue !== null ? "opacity-100" : "opacity-0"
              )}
            >
              {suffix}
            </span>
          </span>
        </div>
      </div>

      <div className="flex h-24 items-end gap-2">
        {data.map((item, index) => {
          const heightPx = (item.value / maxValue) * 96
          const isHovered = hoveredIndex === index
          const isAnyHovered = hoveredIndex !== null
          const isNeighbor = hoveredIndex !== null && (index === hoveredIndex - 1 || index === hoveredIndex + 1)

          return (
            <div
              key={item.label}
              className="relative flex h-full flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setHoveredIndex(index)}
            >
              <div
                className={cn(
                  "w-full origin-bottom cursor-pointer rounded-full transition-all duration-300 ease-out",
                  isHovered
                    ? "bg-foreground"
                    : isNeighbor
                      ? "bg-foreground/30"
                      : isAnyHovered
                        ? "bg-foreground/10"
                        : "bg-foreground/20 group-hover:bg-foreground/25"
                )}
                style={{
                  height: `${heightPx}px`,
                  transform: isHovered ? "scaleX(1.15) scaleY(1.02)" : isNeighbor ? "scaleX(1.05)" : "scaleX(1)",
                }}
              />
              <span
                className={cn(
                  "mt-2 text-[10px] font-medium transition-all duration-300",
                  isHovered ? "text-foreground" : "text-muted-foreground/60"
                )}
              >
                {item.label.charAt(0)}
              </span>
              <div
                className={cn(
                  "pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background transition-all duration-200",
                  isHovered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                )}
              >
                {item.value}
                {suffix}
              </div>
            </div>
          )
        })}
      </div>

      <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-b from-foreground/[0.02] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    </div>
  )
}
