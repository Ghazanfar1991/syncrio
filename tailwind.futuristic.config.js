/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Futuristic Dark Mode Color Palette
        futuristic: {
          // Base Backgrounds
          'bg-primary': '#181818',      // Very dark gray
          'bg-secondary': '#212121',    // Dark gray
          'bg-tertiary': '#2A2A2A',    // Medium dark gray
          'bg-card': '#303030',        // Card background
          
          // Text Colors
          'text-primary': '#FFFFFF',    // Pure white
          'text-secondary': '#A0A0A0',  // Neutral gray
          'text-muted': '#6C6C6C',     // Dark gray (disabled)
          
          // Neon Accent Colors
          'accent-green': '#BFFF00',   // Neon lime green
          'accent-lime': '#CCFF33',    // Bright lime
          'accent-cyan': '#33E0FF',    // Bright cyan
          'accent-teal': '#00C8FF',    // Teal blue
          'accent-purple': '#AA66FF',  // Vivid purple
          'accent-magenta': '#FF3385', // Hot magenta
          'accent-yellow': '#FFB347',  // Warm yellow
          'accent-orange': '#FF884D',  // Bright orange
          
          // Semantic Colors
          'success': '#BFFF00',        // Neon green for success
          'info': '#33E0FF',           // Cyan for info
          'warning': '#FFB347',        // Yellow for warnings
          'error': '#FF3385',          // Magenta for errors
          'primary': '#AA66FF',        // Purple as primary
          'secondary': '#00C8FF',      // Teal as secondary
        },
        
        // CSS Custom Properties (for dynamic theming)
        'bg-primary': 'var(--bg-primary, #181818)',
        'bg-secondary': 'var(--bg-secondary, #212121)',
        'bg-tertiary': 'var(--bg-tertiary, #2A2A2A)',
        'bg-card': 'var(--bg-card, #303030)',
        'text-primary': 'var(--text-primary, #FFFFFF)',
        'text-secondary': 'var(--text-secondary, #A0A0A0)',
        'text-muted': 'var(--text-muted, #6C6C6C)',
        'accent-green': 'var(--accent-green, #BFFF00)',
        'accent-lime': 'var(--accent-lime, #CCFF33)',
        'accent-cyan': 'var(--accent-cyan, #33E0FF)',
        'accent-teal': 'var(--accent-teal, #00C8FF)',
        'accent-purple': 'var(--accent-purple, #AA66FF)',
        'accent-magenta': 'var(--accent-magenta, #FF3385)',
        'accent-yellow': 'var(--accent-yellow, #FFB347)',
        'accent-orange': 'var(--accent-orange, #FF884D)',
      },
      
      // Futuristic Gradients
      backgroundImage: {
        'futuristic-primary': 'linear-gradient(135deg, #AA66FF 0%, #33E0FF 100%)',
        'futuristic-secondary': 'linear-gradient(135deg, #BFFF00 0%, #00C8FF 100%)',
        'futuristic-success': 'linear-gradient(135deg, #BFFF00 0%, #CCFF33 100%)',
        'futuristic-warning': 'linear-gradient(135deg, #FFB347 0%, #FF884D 100%)',
        'futuristic-error': 'linear-gradient(135deg, #FF3385 0%, #AA66FF 100%)',
        'futuristic-card': 'linear-gradient(135deg, #303030 0%, #2A2A2A 100%)',
        'futuristic-glow': 'radial-gradient(circle at 50% 50%, rgba(187, 255, 0, 0.1) 0%, transparent 70%)',
      },
      
      // Futuristic Shadows
      boxShadow: {
        'futuristic': '0 0 20px rgba(187, 255, 0, 0.3)',
        'futuristic-lg': '0 0 30px rgba(187, 255, 0, 4)',
        'futuristic-xl': '0 0 40px rgba(187, 255, 0, 0.5)',
        'futuristic-green': '0 0 20px rgba(187, 255, 0, 0.4)',
        'futuristic-cyan': '0 0 20px rgba(51, 224, 255, 0.4)',
        'futuristic-purple': '0 0 20px rgba(170, 102, 255, 0.4)',
        'futuristic-magenta': '0 0 20px rgba(255, 51, 133, 0.4)',
        'futuristic-card': '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'futuristic-inset': 'inset 0 2px 4px rgba(0, 0, 0, 0.6)',
      },
      
      // Futuristic Animations
      animation: {
        'futuristic-pulse': 'futuristic-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'futuristic-glow': 'futuristic-glow 3s ease-in-out infinite alternate',
        'futuristic-float': 'futuristic-float 6s ease-in-out infinite',
        'futuristic-shimmer': 'futuristic-shimmer 2s linear infinite',
      },
      
      keyframes: {
        'futuristic-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'futuristic-glow': {
          '0%': { boxShadow: '0 0 20px rgba(187, 255, 0, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(187, 255, 0, 0.6)' },
        },
        'futuristic-float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'futuristic-shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      
      // Futuristic Border Radius
      borderRadius: {
        'futuristic': '12px',
        'futuristic-lg': '16px',
        'futuristic-xl': '20px',
      },
      
      // Futuristic Spacing
      spacing: {
        'futuristic': '1.5rem',
        'futuristic-lg': '2rem',
        'futuristic-xl': '3rem',
      },
    },
  },
  plugins: [
    // Custom plugin for futuristic utilities
    function({ addUtilities, theme }) {
      const futuristicUtilities = {
        '.futuristic-text-glow': {
          textShadow: '0 0 10px currentColor',
        },
        '.futuristic-border-glow': {
          border: '1px solid',
          borderColor: 'currentColor',
          boxShadow: '0 0 10px currentColor',
        },
        '.futuristic-card': {
          backgroundColor: theme('colors.futuristic.bg-card'),
          borderRadius: theme('borderRadius.futuristic'),
          boxShadow: theme('boxShadow.futuristic-card'),
          border: '1px solid rgba(255, 255, 255, 0.05)',
        },
        '.futuristic-button': {
          background: theme('backgroundImage.futuristic-primary'),
          borderRadius: '9999px',
          padding: '0.75rem 1.5rem',
          color: theme('colors.futuristic.text-primary'),
          fontWeight: '600',
          transition: 'all 0.3s ease',
          boxShadow: theme('boxShadow.futuristic'),
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme('boxShadow.futuristic-lg'),
          },
        },
        '.futuristic-input': {
          backgroundColor: theme('colors.futuristic.bg-tertiary'),
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: theme('borderRadius.futuristic'),
          color: theme('colors.futuristic.text-primary'),
          padding: '0.75rem 1rem',
          '&:focus': {
            outline: 'none',
            borderColor: theme('colors.futuristic.accent-cyan'),
            boxShadow: `0 0 0 3px ${theme('colors.futuristic.accent-cyan')}20`,
          },
        },
      }
      addUtilities(futuristicUtilities)
    }
  ],
}
