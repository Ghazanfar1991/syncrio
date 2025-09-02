"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {AdvancedEditModal} from './advanced-edit-modal'
import PostPreview from './PostPreview'
import { Edit, RefreshCw, Eye, Image as ImageIcon, Hash, Calendar, Users } from 'lucide-react'

interface GeneratedContent {
  platform: string
  content: string
  hashtags: string[]
  imagePrompt?: string
  imageUrl?: string
  images?: string[] // Array of image URLs for multiple images
  videoUrl?: string // Single video URL
  videos?: string[] // Array of video URLs for multiple videos
}

interface ContentPreviewProps {
  content: GeneratedContent
  index: number
  onEdit: (index: number, updatedContent: GeneratedContent) => void
  onRegenerate: (index: number) => void
  onRegenerateImage?: (index: number) => void
}

export function ContentPreview({ content, index, onEdit, onRegenerate, onRegenerateImage }: ContentPreviewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(content.content)
  const [showAdvancedEdit, setShowAdvancedEdit] = useState(false)
  const [showImage, setShowImage] = useState(true)

  const handleSaveEdit = () => {
    const updatedContent = { ...content, content: editedContent }
    onEdit(index, updatedContent)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditedContent(content.content)
    setIsEditing(false)
  }

  const handleAdvancedEdit = async (updatedContent: GeneratedContent) => {
    onEdit(index, updatedContent)
  }

  const handleRegenerateContent = async () => {
    onRegenerate(index)
  }

  const handleRegenerateImage = async () => {
    if (onRegenerateImage) {
      onRegenerateImage(index)
    }
  }

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      X: '/x.png',
      TWITTER: '/x.png', // Legacy support
      LINKEDIN: '/linkdin.png',
      INSTAGRAM: '/insta.png',
      YOUTUBE: '/youtube.png',
      FACEBOOK: '/facebook.png',
      TIKTOK: '/tiktok.png',
      WHATSAPP: '/whatsapp.png',
      TELEGRAM: '/telegram.png',
      THREADS: '/threads.png'
    }
    return icons[platform] || '/globe.svg'
  }

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      X: 'border-gray-800 bg-gradient-to-br from-gray-50 to-gray-100',
      TWITTER: 'border-gray-800 bg-gradient-to-br from-gray-50 to-gray-100', // Legacy support
      LINKEDIN: 'border-blue-700 bg-gradient-to-br from-blue-50 to-blue-100',
      INSTAGRAM: 'border-pink-500 bg-gradient-to-br from-pink-50 to-pink-100',
      YOUTUBE: 'border-red-500 bg-gradient-to-br from-red-50 to-red-100'
    }
    return colors[platform] || 'border-gray-500 bg-gradient-to-br from-gray-50 to-gray-100'
  }

  const getPlatformGradient = (platform: string) => {
    const gradients: Record<string, string> = {
      X: 'from-gray-800 to-black',
      TWITTER: 'from-gray-800 to-black', // Legacy support
      LINKEDIN: 'from-blue-600 to-blue-800',
      INSTAGRAM: 'from-pink-500 to-purple-600',
      YOUTUBE: 'from-red-500 to-red-600'
    }
    return gradients[platform] || 'from-gray-500 to-gray-600'
  }

  return (
    <Card className="rounded-3xl border border-black/10 dark:border-white/10 w-full content-card-fixed flex flex-col shadow-lg hover:shadow-xl transition-all duration-300 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm">
      <CardHeader className="pb-4 flex-shrink-0 bg-white/40 dark:bg-neutral-800/30 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center justify-between -mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12  rounded-xl flex items-center justify-center overflow-hidden">
              <img 
                src={getPlatformIcon(content.platform)} 
                alt={content.platform} 
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">
                {content.platform}
              </CardTitle>
              <p className="text-sm opacity-60">Post Preview</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedEdit(true)}
              className="flex items-center gap-2 bg-white/60 dark:bg-neutral-800/60 hover:bg-white/80 dark:hover:bg-neutral-800/80 border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 shadow-sm"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRegenerate(index)}
              className="flex items-center gap-2 bg-white/60 dark:bg-neutral-800/60 hover:bg-white/80 dark:hover:bg-neutral-800/80 border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 shadow-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 overflow-hidden flex flex-col -mt-4 p-4 pb-3">
        {/* Platform-specific authentic preview */}
        <div className="bg-white/40 dark:bg-neutral-800/30 rounded-xl p-3 pb-4 border border-black/10 dark:border-white/10 shadow-sm flex-1 overflow-hidden flex flex-col">
          <div className="h-full">
            <div className="flex-1 overflow-hidden flex flex-col min-w-0">
              {/* Content */}
              {isEditing ? (
                <div className="space-y-2 flex-1 flex flex-col">
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="min-h-[120px] resize-none flex-1 border border-black/10 dark:border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 rounded-xl transition-all duration-300 bg-white/40 dark:bg-neutral-800/30 focus:bg-white/60 dark:focus:bg-neutral-800/50"
                    placeholder="Edit your post content..."
                  />
                  <div className="flex gap-3 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2"
                    >
                      Save Changes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 px-4 py-2"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto max-h-[600px] pr-2 pb-6 custom-scrollbar" style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent',
                  scrollBehavior: 'smooth'
                }}>
                  {/* Authentic Platform Preview */}
                  <PostPreview
                    platform={content.platform}
                    text={content.content}
                    hashtags={content.hashtags}
                    image={content.imageUrl}
                  />

                  {/* Image regeneration button if image exists */}
                  {content.imageUrl && onRegenerateImage && (
                    <div className="mt-3 flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRegenerateImage(index)}
                        className="bg-white/90 hover:bg-white text-gray-800 border-gray-300 shadow-lg"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate Image
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Platform-specific metadata */}
        <div className="bg-white/40 dark:bg-neutral-800/30 rounded-xl p-4 border border-black/10 dark:border-white/10 space-y-3 flex-shrink-0">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 opacity-60" />
              <span className="opacity-60">Platform:</span>
              <span className="font-semibold">{content.platform}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 opacity-60" />
              <span className="opacity-60">Characters:</span>
              <span className="font-semibold">{content.content.length}</span>
            </div>
          </div>
          
          {content.imagePrompt && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-2 mb-1">
                <ImageIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-200">Image Prompt</span>
              </div>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">{content.imagePrompt}</p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Advanced Edit Modal */}
      <AdvancedEditModal
        isOpen={showAdvancedEdit}
        onClose={() => setShowAdvancedEdit(false)}
        content={content}
        onSave={handleAdvancedEdit}
        onRegenerateContent={handleRegenerateContent}
        onRegenerateImage={handleRegenerateImage}
      />
    </Card>
  )
}
