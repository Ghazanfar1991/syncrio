"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Edit, 
  RefreshCw, 
  Upload, 
  X, 
  Loader2, 
  Image as ImageIcon,
  Wand2,
  Save,
  Hash,
  Eye,
  EyeOff
} from 'lucide-react'
import PostPreview from './PostPreview'

interface GeneratedContent {
  platform: string
  content: string
  hashtags: string[]
  imagePrompt?: string
  imageUrl?: string
  images?: string[] // Array of image URLs for multiple images
}

// Platform-specific image limits
const PLATFORM_IMAGE_LIMITS: Record<string, number> = {
  TWITTER: 4,
  X: 4,
  FACEBOOK: 10,
  INSTAGRAM: 10,
  LINKEDIN: 9,
  YOUTUBE: 1
}

interface AdvancedEditModalProps {
  isOpen: boolean
  onClose: () => void
  content: GeneratedContent | null
  onSave: (updatedContent: GeneratedContent) => void
  onRegenerateContent: () => void
  onRegenerateImage: () => void
}

export function AdvancedEditModal({ 
  isOpen, 
  onClose, 
  content, 
  onSave, 
  onRegenerateContent, 
  onRegenerateImage 
}: AdvancedEditModalProps) {
  const [editedContent, setEditedContent] = useState('')
  const [editedHashtags, setEditedHashtags] = useState<string[]>([])
  const [newHashtag, setNewHashtag] = useState('')
  const [isRegeneratingContent, setIsRegeneratingContent] = useState(false)
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [showImages, setShowImages] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize state when content changes
  useEffect(() => {
    if (content) {
      setEditedContent(content.content)
      // Ensure hashtags is always an array
      setEditedHashtags(Array.isArray(content.hashtags) ? content.hashtags : [])
      // Initialize with existing images or empty array
      const initialImages = content.images || (content.imageUrl ? [content.imageUrl] : [])
      setUploadedImages(initialImages)
      
      console.log('Advanced Edit Modal initialized with:', {
        content,
        initialImages,
        showImages: true
      })
    }
  }, [content])

  const handleSave = () => {
    if (!content) return

    // Ensure hashtags is always an array
    const safeHashtags = Array.isArray(editedHashtags) ? editedHashtags : []

    const updatedContent: GeneratedContent = {
      ...content,
      content: editedContent,
      hashtags: safeHashtags,
      images: uploadedImages,
      imageUrl: uploadedImages.length > 0 ? uploadedImages[0] : undefined // Keep for backward compatibility
    }

    onSave(updatedContent)
    onClose()
  }

  const handleAddHashtag = () => {
    if (newHashtag.trim() && Array.isArray(editedHashtags) && !editedHashtags.includes(newHashtag.trim())) {
      const hashtag = newHashtag.startsWith('#') ? newHashtag : `#${newHashtag}`
      setEditedHashtags([...editedHashtags, hashtag])
      setNewHashtag('')
    }
  }

  const handleRemoveHashtag = (hashtag: string) => {
    if (Array.isArray(editedHashtags)) {
      setEditedHashtags(editedHashtags.filter(h => h !== hashtag))
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const platform = content?.platform || 'TWITTER'
    const maxImages = PLATFORM_IMAGE_LIMITS[platform] || 4
    const currentImageCount = uploadedImages.length

    if (currentImageCount + files.length > maxImages) {
      alert(`You can only upload up to ${maxImages} images for ${platform}. Current: ${currentImageCount}, Attempting: ${files.length}`)
      return
    }

    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        setUploadedImages(prev => [...prev, imageUrl])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRegenerateContent = async () => {
    setIsRegeneratingContent(true)
    try {
      await onRegenerateContent()
    } finally {
      setIsRegeneratingContent(false)
    }
  }

  const handleRegenerateImage = async () => {
    setIsRegeneratingImage(true)
    try {
      await onRegenerateImage()
    } finally {
      setIsRegeneratingImage(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const getMaxImagesForPlatform = () => {
    const platform = content?.platform || 'TWITTER'
    return PLATFORM_IMAGE_LIMITS[platform] || 4
  }

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      TWITTER: '/x.png',
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

  const getPlatformImage = (platform: string) => {
    const iconPath = getPlatformIcon(platform)
    return (
      <img 
        src={iconPath} 
        alt={platform} 
        className="w-8 h-8 object-contain"
      />
    )
  }

  const getPlatformGradient = (platform: string) => {
    const gradients: Record<string, string> = {
      TWITTER: 'from-blue-500 to-blue-600',
      LINKEDIN: 'from-blue-600 to-blue-800',
      INSTAGRAM: 'from-pink-500 to-purple-600',
      YOUTUBE: 'from-red-500 to-red-600'
    }
    return gradients[platform] || 'from-gray-500 to-gray-600'
  }

  if (!content) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-2xl">
        <DialogHeader className="bg-white/60 dark:bg-neutral-900/60 p-6 rounded-t-xl border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 bg-gradient-to-br from-indigo-600 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg`}>
              {getPlatformImage(content.platform)}
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">
                Edit {content.platform === 'TWITTER' ? 'X' : content.platform} Post
              </DialogTitle>
              <DialogDescription className="text-lg opacity-60 mt-1">
                Fine-tune your content, manage hashtags, and update images for this post.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-8 px-6">
          {/* Left Column - Content Editing */}
          <div className="space-y-6">
            {/* Content Section */}
            <div className="rounded-3xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <Label htmlFor="content" className="text-lg font-semibold flex items-center gap-2">
                  <Edit className="h-5 w-5 text-indigo-600" />
                  Post Content
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateContent}
                  disabled={isRegeneratingContent}
                  className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border-indigo-300 dark:border-indigo-700 hover:border-indigo-400 dark:hover:border-indigo-600 text-indigo-700 dark:text-indigo-300"
                >
                  {isRegeneratingContent ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Regenerate Content
                </Button>
              </div>
              <Textarea
                id="content"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[180px] resize-none border border-black/10 dark:border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 rounded-xl transition-all duration-300 text-base bg-white/40 dark:bg-neutral-800/30 focus:bg-white/60 dark:focus:bg-neutral-800/50"
                placeholder="Edit your post content..."
              />
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm opacity-60">
                  Character count: <span className="font-semibold">{editedContent.length}</span>
                </div>
                <div className="text-sm opacity-60">
                  Platform: <span className="font-semibold">{content.platform === 'TWITTER' ? 'X' : content.platform}</span>
                </div>
              </div>
            </div>

            {/* Hashtags Section */}
            <div className="rounded-3xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">
              <Label className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Hash className="h-5 w-5 text-indigo-600" />
                Hashtags
              </Label>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800 min-h-[60px]">
                {Array.isArray(editedHashtags) && editedHashtags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {editedHashtags.map((hashtag, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="flex items-center gap-2 bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700 hover:bg-indigo-200 dark:hover:bg-indigo-700 px-3 py-1"
                      >
                        {hashtag}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-red-600 transition-colors duration-200"
                          onClick={() => handleRemoveHashtag(hashtag)}
                        />
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="opacity-60 text-center py-2">No hashtags added yet</p>
                )}
              </div>
              <div className="flex gap-3 mt-4">
                <Input
                  value={newHashtag}
                  onChange={(e) => setNewHashtag(e.target.value)}
                  placeholder="Add hashtag (e.g., #AI, #Tech, #Innovation)"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddHashtag()}
                  className="flex-1 border border-black/10 dark:border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 rounded-lg transition-all duration-300 bg-white/40 dark:bg-neutral-800/30 focus:bg-white/60 dark:focus:bg-neutral-800/50"
                />
                <Button 
                  onClick={handleAddHashtag} 
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2"
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Image Section */}
            <div className="rounded-3xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-md font-semibold flex items-center gap-2">
                  <ImageIcon className="h-10 w-10 text-indigo-600" />
                  Images ({uploadedImages.length}/{getMaxImagesForPlatform()})
                </Label>
                <div className="flex items-center gap-2">
  <div className="flex items-center gap-0">
    <button
      onClick={() => setShowImages(!showImages)}
      className={`relative inline-flex h-6 -ml-8 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 ${
        showImages ? "bg-indigo-700" : "bg-gray-400 dark:bg-neutral-500"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
          showImages ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadedImages.length >= getMaxImagesForPlatform()}
                    className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border-indigo-300 dark:border-indigo-700 hover:border-indigo-400 dark:hover:border-indigo-600 text-indigo-700 dark:text-indigo-300 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Images
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateImage}
                    disabled={isRegeneratingImage}
                    className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 border-green-300 dark:border-green-700 hover:border-green-400 dark:hover:border-green-600 text-green-700 dark:text-green-300"
                  >
                    {isRegeneratingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    Regenerate Image
                  </Button>
                </div>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              
              {showImages && uploadedImages.length > 0 && (
                <div className="bg-white/40 dark:bg-neutral-800/30 rounded-xl p-4 border border-black/10 dark:border-white/10 shadow-sm">
                  <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                    {uploadedImages.map((imageUrl, index) => (
                      <div key={index} className="relative aspect-square bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <img
                          src={imageUrl}
                          alt={`Post image ${index + 1}`}
                          className="w-full h-full object-contain"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white shadow-lg z-10"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 text-center">
                    {uploadedImages.length} of {getMaxImagesForPlatform()} images uploaded
                  </div>
                </div>
              )}
              
              {uploadedImages.length === 0 && (
                <div className="border-2 border-dashed border-black/20 dark:border-white/20 rounded-xl p-12 text-center bg-white/40 dark:bg-neutral-800/30">
                  <ImageIcon className="h-16 w-16 opacity-40 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-1">No images selected</p>
                  <p className="text-sm opacity-60">Upload images or generate one with AI (Max: {getMaxImagesForPlatform()})</p>
                  <div className="mt-2 text-xs opacity-50">
                    Debug: showImages={showImages.toString()}, uploadedImages.length={uploadedImages.length}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Live Preview */}
          <div className="space-y-6">
            {/* Preview Header */}
            <div className="rounded-3xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold">Live Preview</h3>
                <Badge variant="secondary" className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                  {content.platform === 'TWITTER' ? 'X' : content.platform}
                </Badge>
              </div>
              <p className="text-sm opacity-60 mb-4">
                See how your post will look on {content.platform === 'TWITTER' ? 'X' : content.platform}
              </p>
            </div>

            {/* Post Preview */}
            <div className="rounded-3xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-sm">
              <PostPreview
                platform={content.platform}
                text={editedContent}
                image={showImages && uploadedImages.length > 0 ? uploadedImages[0] : undefined}
                images={showImages && uploadedImages.length > 0 ? uploadedImages : undefined}
                hashtags={editedHashtags}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="bg-white/60 dark:bg-neutral-900/60 p-6 rounded-b-xl border-t border-black/5 dark:border-white/5">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:bg-black/5 dark:hover:bg-white/6 px-8 py-3 text-base transition-all duration-300"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-8 py-3 text-base shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
          >
            <Save className="h-5 w-5" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
