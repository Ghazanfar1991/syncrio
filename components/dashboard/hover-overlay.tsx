import React from 'react';
import { createPortal } from 'react-dom';
import { getPlatformIcon } from './platform-utils';

interface HoverOverlayProps {
  hoveredPost: any | null;
  hoverPosition: { x: number; y: number };
}

export const HoverOverlay: React.FC<HoverOverlayProps> = ({ hoveredPost, hoverPosition }) => {
  if (!hoveredPost || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed z-[1000] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl shadow-2xl p-4 max-w-xs pointer-events-none"
      style={{
        left: hoverPosition.x + 10,
        top: hoverPosition.y - 10,
        transform: 'translateY(-100%)'
      }}
    >
      <div className="space-y-3">
        {/* Header with Platform and Status */}
        <div className="flex items-center gap-2">
          {hoveredPost.platform && getPlatformIcon(hoveredPost.platform)}
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {hoveredPost.platform}
          </span>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            hoveredPost.status === 'PUBLISHED' || hoveredPost.status === 'published'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
          }`}>
            {hoveredPost.status}
          </div>
        </div>
        
        {/* Account Name */}
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {hoveredPost.accountName || 'Account'}
        </div>
        
        {/* Image Section */}
        {hoveredPost.imageUrl && (
          <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-neutral-600 border border-gray-200 dark:border-neutral-500">
            <img 
              src={hoveredPost.imageUrl} 
              alt="Post" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* Content */}
        <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3 leading-relaxed">
          {hoveredPost.content}
        </p>
        
        {/* Time and Status */}
        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
          {hoveredPost.status === 'PUBLISHED' || hoveredPost.status === 'published' 
            ? `Published at ${hoveredPost.time || 'TBD'}`
            : `Scheduled for ${hoveredPost.time || 'TBD'}`
          }
        </div>
      </div>
    </div>,
    document.body
  );
};
