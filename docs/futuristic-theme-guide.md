# 🚀 Futuristic Dark Mode Theme Guide

## Overview
This guide covers the implementation and usage of a modern, cyberpunk-inspired dark mode theme for your Aurora Social app. The theme features neon accents, futuristic gradients, and high-contrast visual elements.

## 🎨 Color Palette

### Base Backgrounds
- **Primary**: `#181818` - Very dark gray (main background)
- **Secondary**: `#212121` - Dark gray (section backgrounds)
- **Tertiary**: `#2A2A2A` - Medium dark gray (card backgrounds)
- **Card**: `#303030` - Card background with subtle contrast

### Text Colors
- **Primary**: `#FFFFFF` - Pure white (main text)
- **Secondary**: `#A0A0A0` - Neutral gray (secondary text)
- **Muted**: `#6C6C6C` - Dark gray (disabled/low emphasis)

### Neon Accent Colors
- **Green**: `#BFFF00` - Neon lime green (success, progress)
- **Lime**: `#CCFF33` - Bright lime (secondary success)
- **Cyan**: `#33E0FF` - Bright cyan (info, secondary actions)
- **Teal**: `#00C8FF` - Teal blue (secondary info)
- **Purple**: `#AA66FF` - Vivid purple (primary actions)
- **Magenta**: `#FF3385` - Hot magenta (errors, alerts)
- **Yellow**: `#FFB347` - Warm yellow (warnings)
- **Orange**: `#FF884D` - Bright orange (secondary warnings)

## 🛠️ Implementation

### 1. Import CSS
Add the futuristic theme CSS to your main layout or globals.css:

```css
@import './futuristic-dark.css';
```

### 2. Theme Provider
The theme provider automatically applies CSS variables when dark mode is enabled:

```tsx
import { useTheme } from '@/components/providers/theme-provider'

function MyComponent() {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  
  return (
    <div className={dark ? 'futuristic-bg-primary' : 'bg-white'}>
      <h1 className={dark ? 'futuristic-text-primary' : 'text-gray-900'}>
        Futuristic Title
      </h1>
    </div>
  )
}
```

## 🎯 Usage Examples

### Cards & Containers
```tsx
// Basic futuristic card
<div className="futuristic-card futuristic-card-hover p-6">
  <h3 className="futuristic-text-primary text-lg font-bold">Card Title</h3>
  <p className="futuristic-text-secondary">Card content with futuristic styling</p>
</div>

// Glass effect card
<div className="futuristic-glass p-6">
  <h3 className="futuristic-text-primary">Glass Card</h3>
</div>
```

### Buttons
```tsx
// Primary futuristic button
<button className="futuristic-button">
  Primary Action
</button>

// Success button
<button className="futuristic-button futuristic-button-success">
  Success Action
</button>

// Warning button
<button className="futuristic-button futuristic-button-warning">
  Warning Action
</button>
```

### Inputs
```tsx
<input 
  type="text" 
  className="futuristic-input w-full"
  placeholder="Enter text..."
/>
```

### Status Indicators
```tsx
<span className="futuristic-status-success">Active</span>
<span className="futuristic-status-info">Info</span>
<span className="futuristic-status-warning">Warning</span>
<span className="futuristic-status-error">Error</span>
```

### Text Effects
```tsx
// Neon glow text
<h1 className="futuristic-neon-text">Glowing Title</h1>
<h2 className="futuristic-neon-text-cyan">Cyan Glow</h2>
<h3 className="futuristic-neon-text-purple">Purple Glow</h3>

// Text with glow effect
<p className="futuristic-text-glow futuristic-text-green">Glowing green text</p>
```

### Progress & Loading
```tsx
// Progress bar
<div className="futuristic-progress w-full">
  <div className="futuristic-progress-bar" style={{ width: '75%' }}></div>
</div>

// Loading spinner
<div className="futuristic-spinner"></div>

// Shimmer effect
<div className="futuristic-animate-shimmer h-4 bg-gray-300 rounded"></div>
```

### Animations
```tsx
// Floating animation
<div className="futuristic-animate-float">
  Floating content
</div>

// Glow animation
<div className="futuristic-animate-glow">
  Glowing content
</div>

// Pulse animation
<div className="futuristic-animate-pulse">
  Pulsing content
</div>
```

## 🎨 Tailwind CSS Classes

### Background Colors
- `futuristic-bg-primary` - Primary background
- `futuristic-bg-secondary` - Secondary background
- `futuristic-bg-tertiary` - Tertiary background
- `futuristic-bg-card` - Card background

### Text Colors
- `futuristic-text-primary` - Primary text
- `futuristic-text-secondary` - Secondary text
- `futuristic-text-muted` - Muted text
- `futuristic-text-green` - Green accent text
- `futuristic-text-cyan` - Cyan accent text
- `futuristic-text-purple` - Purple accent text
- `futuristic-text-magenta` - Magenta accent text

### Gradients
- `futuristic-gradient-primary` - Purple to cyan
- `futuristic-gradient-secondary` - Green to teal
- `futuristic-gradient-success` - Green to lime
- `futuristic-gradient-warning` - Yellow to orange
- `futuristic-gradient-error` - Magenta to purple

### Shadows
- `futuristic-shadow` - Basic neon shadow
- `futuristic-shadow-lg` - Large neon shadow
- `futuristic-shadow-xl` - Extra large neon shadow
- `futuristic-shadow-green` - Green neon shadow
- `futuristic-shadow-cyan` - Cyan neon shadow
- `futuristic-shadow-purple` - Purple neon shadow
- `futuristic-shadow-magenta` - Magenta neon shadow

## 🔧 Customization

### CSS Variables
You can override any color by modifying the CSS variables:

```css
:root {
  --accent-green: #00FF88; /* Custom green */
  --bg-primary: #0A0A0A;   /* Custom background */
}
```

### Tailwind Config
Extend the Tailwind config with custom colors:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'custom-neon': '#FF00FF',
        'custom-bg': '#1A1A1A',
      }
    }
  }
}
```

## 📱 Responsive Design

### Mobile-First Approach
```tsx
<div className="futuristic-card p-4 sm:p-6 lg:p-8">
  <h2 className="text-lg sm:text-xl lg:text-2xl futuristic-text-primary">
    Responsive Title
  </h2>
</div>
```

### Dark Mode Toggle
```tsx
<button 
  onClick={toggleTheme}
  className="futuristic-button futuristic-button-secondary"
>
  {dark ? '🌞 Light Mode' : '🌙 Dark Mode'}
</button>
```

## 🎭 Component Examples

### Dashboard Card
```tsx
function DashboardCard({ title, value, icon, trend }) {
  return (
    <div className="futuristic-card futuristic-card-hover p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="futuristic-text-secondary text-sm">{title}</div>
        <div className="futuristic-text-cyan">{icon}</div>
      </div>
      <div className="futuristic-text-primary text-2xl font-bold mb-2">
        {value}
      </div>
      <div className={`text-sm ${
        trend > 0 ? 'futuristic-text-green' : 'futuristic-text-magenta'
      }`}>
        {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
      </div>
    </div>
  )
}
```

### Navigation Item
```tsx
function NavItem({ label, icon, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        isActive 
          ? 'futuristic-bg-card futuristic-text-cyan futuristic-shadow-cyan' 
          : 'futuristic-text-secondary hover:futuristic-text-primary hover:futuristic-bg-tertiary'
      }`}
    >
      <div className="text-xl">{icon}</div>
      <span className="font-medium">{label}</span>
    </button>
  )
}
```

### Form Input
```tsx
function FuturisticInput({ label, placeholder, type = 'text' }) {
  return (
    <div className="space-y-2">
      <label className="futuristic-text-primary font-medium">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        className="futuristic-input w-full futuristic-focus-ring"
      />
    </div>
  )
}
```

## 🚀 Best Practices

### 1. Consistent Color Usage
- Use semantic colors for their intended purpose
- Green for success, cyan for info, yellow for warnings, magenta for errors
- Purple as primary brand color

### 2. Accessibility
- Ensure sufficient contrast between text and backgrounds
- Use focus rings for keyboard navigation
- Provide alternative text for visual elements

### 3. Performance
- Use CSS variables for dynamic theming
- Minimize JavaScript-based color changes
- Leverage Tailwind's purge for production builds

### 4. Animation
- Keep animations subtle and purposeful
- Use `prefers-reduced-motion` media query
- Ensure animations don't interfere with usability

## 🔍 Troubleshooting

### Common Issues

1. **Colors not applying**: Ensure CSS variables are properly set in the theme provider
2. **Glow effects missing**: Check that backdrop-filter is supported in your browser
3. **Animations not working**: Verify that animation classes are properly defined

### Browser Support
- Modern browsers (Chrome 88+, Firefox 87+, Safari 14+)
- CSS variables and backdrop-filter support required
- Fallbacks provided for older browsers

## 📚 Additional Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [CSS Custom Properties Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Design System Best Practices](https://www.designsystems.com/)

---

**Happy coding with your futuristic theme! 🚀✨**
