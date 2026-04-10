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

type SelectContextValue = {
  isOpen: boolean
  selectedValue: string
  selectedLabel?: React.ReactNode
  disabled?: boolean
  toggleOpen: () => void
  selectValue: (value: string) => void
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error("Select components must be used within Select")
  }
  return context
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ value, onValueChange, children, disabled, className, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [selectedValue, setSelectedValue] = React.useState(value || "")
    const containerRef = React.useRef<HTMLDivElement>(null)

    const handleSelect = React.useCallback((newValue: string) => {
      setSelectedValue(newValue)
      onValueChange?.(newValue)
      setIsOpen(false)
    }, [onValueChange])

    const toggleOpen = React.useCallback(() => {
      if (!disabled) {
        setIsOpen((current) => !current)
      }
    }, [disabled])

    React.useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value)
      }
    }, [value])

    // Close on click outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setIsOpen(false)
        }
      }

      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleEscape)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
        document.removeEventListener("keydown", handleEscape)
      }
    }, [])

    const selectedLabel = React.useMemo(() => {
      let label: React.ReactNode | undefined

      React.Children.forEach(children, (child) => {
        if (!React.isValidElement(child)) return
        const childType = child.type as { displayName?: string }
        if (child.type === SelectContent || childType?.displayName === "SelectContent") {
          React.Children.forEach(child.props.children, (itemChild) => {
            if (!React.isValidElement(itemChild)) return
            const itemType = itemChild.type as { displayName?: string }
            if ((itemChild.type === SelectItem || itemType?.displayName === "SelectItem") && itemChild.props.value === selectedValue) {
              label = itemChild.props.children
            }
          })
        }
      })

      return label
    }, [children, selectedValue])

    return (
      <div
        ref={(node) => {
          containerRef.current = node
          if (typeof ref === "function") ref(node)
          else if (ref) ref.current = node
        }}
        className={cn("relative w-full", className)}
        {...props}
      >
        <SelectContext.Provider
          value={{
            isOpen,
            selectedValue,
            selectedLabel,
            disabled,
            toggleOpen,
            selectValue: handleSelect,
          }}
        >
          {children}
        </SelectContext.Provider>
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
  ({ children, className, disabled, ...props }, ref) => {
    const { isOpen, disabled: contextDisabled, toggleOpen } = useSelectContext()

    return (
      <button
        ref={ref}
        type="button"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          toggleOpen()
        }}
        disabled={disabled ?? contextDisabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border border-black/5 dark:border-white/10 bg-secondary/30 dark:bg-neutral-800/50 px-4 py-2 text-sm text-foreground transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        <div className="truncate">{children}</div>
        <ChevronDown className={cn(
          "ml-2 h-4 w-4 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180 text-primary"
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
  ({ children, className, ...props }, ref) => {
    const { isOpen } = useSelectContext()

    if (!isOpen) return null

    return (
      <div
        ref={ref}
        className={cn(
          "absolute top-full left-0 z-[200] mt-1.5 w-full rounded-xl border border-white/30 bg-[var(--sample-create-panel-strong)] p-1.5 text-[rgb(var(--sample-create-text))] shadow-xl shadow-black/10 backdrop-blur-[18px] animate-in fade-in zoom-in-95 duration-200",
          className
        )}
        {...props}
      >
        <div className="max-h-60 overflow-auto scrollbar-hide py-1">
          {children}
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
  ({ value, children, className, disabled, ...props }, ref) => {
    const { selectValue, selectedValue } = useSelectContext()
    const isSelected = value === selectedValue

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2 text-[13px] font-medium transition-colors outline-none",
          isSelected 
            ? "bg-primary/10 text-primary" 
            : "text-[rgb(var(--sample-create-text))] hover:bg-[var(--sample-create-surface)] hover:text-[rgb(var(--sample-create-text))]",
          disabled && "pointer-events-none opacity-50",
          className
        )}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (!disabled) {
            selectValue(value)
          }
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"

const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(({ placeholder, className, ...props }, ref) => {
  const { selectedLabel } = useSelectContext()

  return (
    <span
      ref={ref}
      className={cn("block truncate", className)}
      {...props}
    >
      {selectedLabel || placeholder}
    </span>
  )
})
SelectValue.displayName = "SelectValue"

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue }
