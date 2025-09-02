"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

export interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export interface SelectContentProps {
  children: React.ReactNode
  className?: string
}

export interface SelectItemProps {
  value: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export interface SelectValueProps {
  placeholder?: string
  className?: string
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ value, onValueChange, children, disabled, className, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [selectedValue, setSelectedValue] = React.useState(value || "")

    const handleSelect = (newValue: string) => {
      setSelectedValue(newValue)
      onValueChange?.(newValue)
      setIsOpen(false)
    }

    React.useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value)
      }
    }, [value])

    return (
      <div
        ref={ref}
        className={cn("relative", className)}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            if (child.type === SelectTrigger) {
              return React.cloneElement(child, {
                onClick: () => !disabled && setIsOpen(!isOpen),
                disabled,
                isOpen,
                selectedValue
              })
            }
            if (child.type === SelectContent && isOpen) {
              return React.cloneElement(child, {
                onSelect: handleSelect,
                selectedValue
              })
            }
          }
          return child
        })}
      </div>
    )
  }
)
Select.displayName = "Select"

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps & {
  onClick?: () => void
  isOpen?: boolean
  selectedValue?: string
}>(
  ({ children, className, disabled, onClick, isOpen, selectedValue, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className={cn(
          "h-4 w-4 opacity-50 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps & {
  onSelect?: (value: string) => void
  selectedValue?: string
}>(
  ({ children, className, onSelect, selectedValue, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "absolute top-full left-0 z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md",
          className
        )}
        {...props}
      >
        <div className="max-h-60 overflow-auto">
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              if (child.type === SelectItem) {
                return React.cloneElement(child, {
                  onSelect: onSelect,
                  isSelected: child.props.value === selectedValue
                })
              }
            }
            return child
          })}
        </div>
      </div>
    )
  }
)
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps & {
  onSelect?: (value: string) => void
  isSelected?: boolean
}>(
  ({ value, children, className, disabled, onSelect, isSelected, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
          isSelected && "bg-accent text-accent-foreground",
          disabled && "pointer-events-none opacity-50",
          className
        )}
        onClick={() => !disabled && onSelect?.(value)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"

const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(({ placeholder, className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn("block truncate", className)}
      {...props}
    >
      {placeholder}
    </span>
  )
})
SelectValue.displayName = "SelectValue"

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue }
