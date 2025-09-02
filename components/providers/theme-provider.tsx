"use client"

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage immediately
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme') as Theme
      
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme)
        // Apply theme immediately to prevent flash
        const root = document.documentElement
        if (savedTheme === 'dark') {
          root.classList.add('dark')
          // Apply futuristic dark mode CSS variables
          root.style.setProperty('--bg-primary', '#181818')
          root.style.setProperty('--bg-secondary', '#212121')
          root.style.setProperty('--bg-tertiary', '#2A2A2A')
          root.style.setProperty('--bg-card', '#303030')
          root.style.setProperty('--text-primary', '#FFFFFF')
          root.style.setProperty('--text-secondary', '#A0A0A0')
          root.style.setProperty('--text-muted', '#6C6C6C')
          root.style.setProperty('--accent-green', '#BFFF00')
          root.style.setProperty('--accent-cyan', '#33E0FF')
          root.style.setProperty('--accent-purple', '#AA66FF')
          root.style.setProperty('--accent-magenta', '#FF3385')
          root.style.setProperty('--accent-yellow', '#FFB347')
          root.style.setProperty('--accent-orange', '#FF884D')
          root.style.setProperty('--accent-lime', '#CCFF33')
          root.style.setProperty('--accent-teal', '#00C8FF')
        } else {
          root.classList.remove('dark')
          // Remove futuristic dark mode CSS variables
          root.style.removeProperty('--bg-primary')
          root.style.removeProperty('--bg-secondary')
          root.style.removeProperty('--bg-tertiary')
          root.style.removeProperty('--bg-card')
          root.style.removeProperty('--text-primary')
          root.style.removeProperty('--text-secondary')
          root.style.removeProperty('--text-muted')
          root.style.removeProperty('--accent-green')
          root.style.removeProperty('--accent-cyan')
          root.style.removeProperty('--accent-purple')
          root.style.removeProperty('--accent-magenta')
          root.style.removeProperty('--accent-yellow')
          root.style.removeProperty('--accent-orange')
          root.style.removeProperty('--accent-lime')
          root.style.removeProperty('--accent-teal')
        }
      } else {
        // Set default theme
        localStorage.setItem('theme', 'light')
        setTheme('light')
        document.documentElement.classList.remove('dark')
      }
    } catch (error) {
      console.error('Error initializing theme:', error)
      // Fallback to light mode
      setTheme('light')
      document.documentElement.classList.remove('dark')
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      // Update document class and localStorage
      const root = document.documentElement
      
      if (theme === 'dark') {
        root.classList.add('dark')
        // Apply futuristic dark mode CSS variables
        root.style.setProperty('--bg-primary', '#181818')
        root.style.setProperty('--bg-secondary', '#212121')
        root.style.setProperty('--bg-tertiary', '#2A2A2A')
        root.style.setProperty('--bg-card', '#303030')
        root.style.setProperty('--text-primary', '#FFFFFF')
        root.style.setProperty('--text-secondary', '#A0A0A0')
        root.style.setProperty('--text-muted', '#6C6C6C')
        root.style.setProperty('--accent-green', '#BFFF00')
        root.style.setProperty('--accent-cyan', '#33E0FF')
        root.style.setProperty('--accent-purple', '#AA66FF')
        root.style.setProperty('--accent-magenta', '#FF3385')
        root.style.setProperty('--accent-yellow', '#FFB347')
        root.style.setProperty('--accent-orange', '#FF884D')
        root.style.setProperty('--accent-lime', '#CCFF33')
        root.style.setProperty('--accent-teal', '#00C8FF')
      } else {
        root.classList.remove('dark')
        // Remove futuristic dark mode CSS variables
        root.style.removeProperty('--bg-primary')
        root.style.removeProperty('--bg-secondary')
        root.style.removeProperty('--bg-tertiary')
        root.style.removeProperty('--bg-card')
        root.style.removeProperty('--text-primary')
        root.style.removeProperty('--text-secondary')
        root.style.removeProperty('--text-muted')
        root.style.removeProperty('--accent-green')
        root.style.removeProperty('--accent-cyan')
        root.style.removeProperty('--accent-purple')
        root.style.removeProperty('--accent-magenta')
        root.style.removeProperty('--accent-yellow')
        root.style.removeProperty('--accent-orange')
        root.style.removeProperty('--accent-lime')
        root.style.removeProperty('--accent-teal')
      }
      localStorage.setItem('theme', theme)
    }
  }, [theme, mounted])



  // Listen for storage changes to sync theme across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) {
        const newTheme = e.newValue as Theme
        if (newTheme !== theme) {
          setTheme(newTheme)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [theme])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return <div className="min-h-screen bg-white dark:bg-neutral-950" />
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

