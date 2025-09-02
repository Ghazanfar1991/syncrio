"use client"

import { useState, useRef, KeyboardEvent } from 'react'
import { X, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HashtagInputProps {
  value: string[]
  onChange: (hashtags: string[]) => void
  placeholder?: string
  className?: string
  maxTags?: number
  disabled?: boolean
}

export function HashtagInput({
  value = [],
  onChange,
  placeholder = "Add hashtags...",
  className,
  maxTags = 30,
  disabled = false
}: HashtagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [isInputFocused, setIsInputFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault()
      addHashtag()
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      // Remove last hashtag when backspace is pressed on empty input
      const newHashtags = [...value]
      newHashtags.pop()
      onChange(newHashtags)
    }
  }

  const addHashtag = () => {
    if (!inputValue.trim()) return
    
    let hashtag = inputValue.trim()
    
    // Remove # if user typed it
    if (hashtag.startsWith('#')) {
      hashtag = hashtag.slice(1)
    }
    
    // Don't add empty or duplicate hashtags
    if (hashtag && !value.includes(hashtag) && value.length < maxTags) {
      onChange([...value, hashtag])
    }
    
    setInputValue('')
  }

  const removeHashtag = (indexToRemove: number) => {
    if (disabled) return
    const newHashtags = value.filter((_, index) => index !== indexToRemove)
    onChange(newHashtags)
  }

  const handleContainerClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div
      className={cn(
        "min-h-[42px] w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm transition-colors",
        "focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200 dark:focus-within:ring-blue-800",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      onClick={handleContainerClick}
    >
      <div className="flex flex-wrap gap-2">
        {/* Hashtag Bubbles */}
        {value.map((hashtag, index) => (
          <div
            key={index}
            className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 transition-colors hover:bg-blue-200 dark:hover:bg-blue-900/50"
          >
            <Hash className="h-3 w-3" />
            <span>{hashtag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeHashtag(index)
                }}
                className="ml-1 rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        
        {/* Input Field */}
        {!disabled && value.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => {
              setIsInputFocused(false)
              addHashtag() // Add hashtag when input loses focus
            }}
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] bg-transparent border-none outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        )}
      </div>
      
      {/* Helper Text */}
      {(isInputFocused || value.length > 0) && (
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Press Enter, Space, or Comma to add hashtags</span>
          <span>{value.length}/{maxTags}</span>
        </div>
      )}
    </div>
  )
}
