'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SliderProps {
  value: number[]
  onValueChange?: (value: number[]) => void
  max?: number
  min?: number
  step?: number
  className?: string
  disabled?: boolean
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ value, onValueChange, max = 100, min = 0, step = 1, className, disabled = false, ...props }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false)
    const sliderRef = React.useRef<HTMLDivElement>(null)

    const currentValue = value[0] || 0
    const percentage = ((currentValue - min) / (max - min)) * 100

    const handleMouseDown = (event: React.MouseEvent) => {
      if (disabled) return
      setIsDragging(true)
      updateValue(event)
    }

    const handleMouseMove = React.useCallback(
      (event: MouseEvent) => {
        if (!isDragging || disabled) return
        updateValue(event)
      },
      [isDragging, disabled]
    )

    const handleMouseUp = React.useCallback(() => {
      setIsDragging(false)
    }, [])

    const updateValue = (event: MouseEvent | React.MouseEvent) => {
      if (!sliderRef.current || disabled) return

      const rect = sliderRef.current.getBoundingClientRect()
      const clickX = event.clientX - rect.left
      const newPercentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100))
      const newValue = min + (newPercentage / 100) * (max - min)
      
      // Round to nearest step
      const steppedValue = Math.round(newValue / step) * step
      const clampedValue = Math.max(min, Math.min(max, steppedValue))
      
      onValueChange?.([clampedValue])
    }

    React.useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        return () => {
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
        }
      }
    }, [isDragging, handleMouseMove, handleMouseUp])

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex w-full touch-none select-none items-center',
          className
        )}
        {...props}
      >
        <div
          ref={sliderRef}
          className={cn(
            'relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onMouseDown={handleMouseDown}
        >
          {/* Progress bar */}
          <div
            className="absolute h-full bg-blue-600 dark:bg-blue-500 transition-all"
            style={{ width: `${percentage}%` }}
          />
          
          {/* Thumb */}
          <div
            className={cn(
              'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white border-2 border-blue-600 dark:border-blue-500 shadow-md transition-all',
              isDragging && 'scale-110',
              disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105'
            )}
            style={{ left: `calc(${percentage}% - 8px)` }}
          />
        </div>
      </div>
    )
  }
)

Slider.displayName = 'Slider'

export { Slider }
