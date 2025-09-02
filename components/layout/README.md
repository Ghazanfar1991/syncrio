# Layout Components

This directory contains the layout components for the social-bot application. We've recently consolidated and improved the layout system to eliminate redundancy and provide a consistent user experience.

## Components Overview

### 1. `sidebar.tsx` - Universal Sidebar Component
A reusable sidebar component that can be used across all pages with the following features:

**Features:**
- Navigation items (Overview, Create Post, Posts, Analytics, Calendar, Settings, Admin)
- Universal theme switching (light/dark mode) that affects the entire app
- Connected accounts section (configurable)
- Plan information section (configurable)
- Collapsible state with smooth animations
- Logout functionality
- Responsive design

**Props:**
```typescript
interface SidebarProps {
  collapsed?: boolean                    // Whether sidebar is collapsed
  onToggleCollapse?: (collapsed: boolean) => void  // Callback for collapse toggle
  showConnectedAccounts?: boolean       // Show/hide connected accounts section
  showPlanInfo?: boolean               // Show/hide plan information section
  className?: string                   // Additional CSS classes
}
```

**Usage:**
```tsx
import { Sidebar } from "@/components/layout/sidebar"

<Sidebar 
  collapsed={collapsed}
  onToggleCollapse={setCollapsed}
  showConnectedAccounts={true}
  showPlanInfo={true}
/>
```

### 2. `unified-layout.tsx` - Complete Layout Wrapper
A comprehensive layout component that includes both the topbar and sidebar:

**Features:**
- Top navigation bar with logo, search, notifications, and user menu
- Integrated sidebar with collapse toggle
- New post button (configurable)
- Page title support
- Responsive grid layout

**Props:**
```typescript
interface UnifiedLayoutProps {
  children: ReactNode
  showNewPostButton?: boolean          // Show/hide new post button
  pageTitle?: string                   // Optional page title
  showConnectedAccounts?: boolean      // Pass through to sidebar
  showPlanInfo?: boolean              // Pass through to sidebar
  className?: string                   // Additional CSS classes
}
```

**Usage:**
```tsx
import { UnifiedLayout } from "@/components/layout/unified-layout"

<UnifiedLayout 
  pageTitle="Dashboard"
  showNewPostButton={true}
  showConnectedAccounts={true}
  showPlanInfo={true}
>
  {/* Your page content */}
</UnifiedLayout>
```

### 3. `top-right-controls.tsx` - Universal Top-Right Controls
A reusable component for the top-right corner of any page with essential controls:

**Features:**
- Theme toggle button (light/dark mode)
- Notifications button with unread count
- Profile view with user avatar and name
- Universal theme switching that affects the entire app
- Responsive design

**Props:**
```typescript
interface TopRightControlsProps {
  unreadNotificationsCount?: number   // Number of unread notifications
  className?: string                   // Additional CSS classes
}
```

**Usage:**
```tsx
import { TopRightControls } from "@/components/layout/top-right-controls"

<TopRightControls unreadNotificationsCount={3} />
```

## Migration Guide

### Replacing Old Layout Components

**Before (Dashboard page):**
```tsx
// Old inline sidebar implementation
<aside className={`${collapsed ? 'col-span-12 lg:col-span-1' : 'col-span-12 lg:col-span-2'} transition-all duration-300`}>
  {/* Complex sidebar code */}
</aside>

// Old topbar with theme toggle, notifications, and profile
<header className="sticky top-0 z-40 backdrop-blur-md bg-white/40 dark:bg-black/40 border-b border-black/5 dark:border-white/5">
  {/* Complex topbar code */}
</header>
```

**After:**
```tsx
// New reusable sidebar (if needed)
<Sidebar 
  collapsed={collapsed}
  onToggleCollapse={setCollapsed}
  showConnectedAccounts={true}
  showPlanInfo={true}
/>

// New top-right controls component
<TopRightControls unreadNotificationsCount={unreadNotificationsCount} />
```

### Replacing Old Layout Wrappers

**Before:**
```tsx
import { ConsistentLayout } from "@/components/layout/consistent-layout"

<ConsistentLayout>
  {/* Content */}
</ConsistentLayout>
```

**After:**
```tsx
import { UnifiedLayout } from "@/components/layout/unified-layout"

<UnifiedLayout pageTitle="Your Page Title">
  {/* Content */}
</UnifiedLayout>
```

## Theme System

The sidebar component includes universal theme switching that affects the entire application. The theme state is managed by the `ThemeProvider` and persists across page refreshes.

**Key Benefits:**
- Consistent theme across all pages
- No need to implement theme switching in individual components
- Theme state persists in localStorage
- Smooth transitions between themes

## Redundant Components (Deprecated)

The following components are now redundant and should be replaced:

1. **`consistent-layout.tsx`** - Replaced by `unified-layout.tsx`
2. **`app-shell.tsx`** - Functionality merged into `unified-layout.tsx`
3. **`navigation.tsx`** - Top navigation merged into `unified-layout.tsx`

## Best Practices

1. **Use `Sidebar`** when you need just the sidebar functionality
2. **Use `UnifiedLayout`** when you need a complete page layout
3. **Customize sidebar sections** using the boolean props
4. **Handle collapse state** in your page component if you need custom behavior
5. **Theme switching** is automatically handled by the sidebar

## Example Implementation

Here's a complete example of how to use the new layout system:

```tsx
"use client"

import { useState } from "react"
import { UnifiedLayout } from "@/components/layout/unified-layout"
import { TopRightControls } from "@/components/layout/top-right-controls"

export default function ExamplePage() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <UnifiedLayout 
      pageTitle="Example Page"
      showNewPostButton={true}
      showConnectedAccounts={true}
      showPlanInfo={true}
    >
      <div className="space-y-6">
        <h2>Your Page Content</h2>
        <p>This page now has a consistent layout with the sidebar!</p>
      </div>
    </UnifiedLayout>
  )
}

// Or for a simpler page without the full layout wrapper:
export default function SimplePage() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Simple Page</h1>
        <TopRightControls unreadNotificationsCount={5} />
      </div>
      <div className="space-y-6">
        <p>Your content here...</p>
      </div>
    </div>
  )
}
```

## Benefits of the New System

1. **Consistency** - All pages now have the same layout structure
2. **Maintainability** - Single source of truth for layout logic
3. **Reusability** - Components can be used across different pages
4. **Performance** - Reduced bundle size by eliminating duplicate code
5. **User Experience** - Consistent navigation and theme switching across the app
