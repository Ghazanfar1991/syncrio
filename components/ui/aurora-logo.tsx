import React from 'react';

interface AuroraLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AuroraLogo({ size = 'md', className = '' }: AuroraLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  return (
    <div className={`relative overflow-hidden rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800 ${sizeClasses[size]} ${className}`}>
      {/* Aurora gradient background */}
      <div className="absolute inset-0 bg-[conic-gradient(var(--tw-gradient-stops))] from-fuchsia-500 via-cyan-400 to-indigo-500" />
      
      {/* Aurora Social "AS" initials */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-white font-bold text-xs tracking-tight">
          {size === 'sm' && 'AS'}
          {size === 'md' && 'AS'}
          {size === 'lg' && 'AS'}
        </div>
      </div>
      
      {/* Subtle glow effect */}
      <div className="absolute inset-0 rounded-xl shadow-lg opacity-20" />
    </div>
  );
}

export function AuroraLogoWithText({ size = 'md', showBadge = true, className = '' }: AuroraLogoProps & { showBadge?: boolean }) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <AuroraLogo size={size} />
      <div className="flex items-center gap-2">
        <span className={`font-semibold tracking-tight ${textSizes[size]}`}>
          Aurora Social
        </span>
        {showBadge && (
          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            AI-powered
          </span>
        )}
      </div>
    </div>
  );
}
