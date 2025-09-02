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
import { useToast } from '@/hooks/use-toast'

interface GeneratedContent {
  platform: string
  content: string
  hashtags: string[]
  imagePrompt?: string
  imageUrl?: string
  images?: string[] // Array of image URLs for multiple images
  videoUrl?: string
  videos?: string[] // Array of video URLs for multiple videos
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
  postId?: string // Add postId to avoid race condition
  onSave: (updatedContent: GeneratedContent) => Promise<void>
  onRegenerateContent: () => Promise<void>
  onRegenerateImage: () => Promise<void>
}

export function AdvancedEditModal({ 
  isOpen, 
  onClose, 
  content, 
  postId,
  onSave, 
  onRegenerateContent, 
  onRegenerateImage 
}: AdvancedEditModalProps) {
  const [editedContent, setEditedContent] = useState('')
  const [editedHashtags, setEditedHashtags] = useState<string[]>([])
  const [newHashtag, setNewHashtag] = useState('')
  const [isRegeneratingContent, setIsRegeneratingContent] = useState(false)
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploadedVideos, setUploadedVideos] = useState<string[]>([])
  const [showImages, setShowImages] = useState(true)
  const [showVideos, setShowVideos] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Initialize state when content changes
  useEffect(() => {
    if (content) {
      setEditedContent(content.content || '')
      // Ensure hashtags is always an array
      setEditedHashtags(Array.isArray(content.hashtags) ? content.hashtags : [])
      
      // Combine images from both imageUrl and images columns
      const allImages: string[] = []
      
      // Add imageUrl if it exists (first image)
      if (content.imageUrl) {
        allImages.push(content.imageUrl)
      }
      
      // Add images from images field if it exists
      if (content.images && Array.isArray(content.images)) {
        allImages.push(...content.images)
      } else if (content.images && typeof content.images === 'string') {
        try {
          const parsedImages = JSON.parse(content.images)
          if (Array.isArray(parsedImages)) {
            allImages.push(...parsedImages)
          }
        } catch (error) {
          console.warn('Failed to parse images field:', error)
        }
      }
      
      // Remove duplicates and set
      const uniqueImages = [...new Set(allImages)]
      setUploadedImages(uniqueImages)

      // Combine videos from both videoUrl and videos columns
      const allVideos: string[] = []

      // Add videoUrl if it exists (first video) - this is the main video from R2 upload
      if (content.videoUrl && content.videoUrl.trim() !== '') {
        allVideos.push(content.videoUrl)
      }

      // Add videos from videos field if it exists (array of video URLs)
      if (content.videos && Array.isArray(content.videos)) {
        // Filter out empty strings and add valid URLs
        const validVideos = content.videos.filter(video => video && typeof video === 'string' && video.trim() !== '')
        allVideos.push(...validVideos)
      } else if (content.videos && typeof content.videos === 'string') {
        try {
          const parsedVideos = JSON.parse(content.videos)
          if (Array.isArray(parsedVideos)) {
            const validVideos = parsedVideos.filter(video => video && typeof video === 'string' && video.trim() !== '')
            allVideos.push(...validVideos)
          }
        } catch (error) {
          console.warn('Failed to parse videos field:', error)
          // If it's a single video URL string, add it directly (guard type)
          const videosVal: unknown = (content as any).videos
          if (typeof videosVal === 'string' && videosVal.trim() !== '') {
            allVideos.push(videosVal)
          } else if (Array.isArray(videosVal)) {
            allVideos.push(...(videosVal as string[]).filter(Boolean))
          }
        }
      }

      // Check if there's a video File object that needs to be converted (fallback for incomplete uploads)
      if (allVideos.length === 0 && (content as any).video && (content as any).video instanceof File) {
        const videoUrl = URL.createObjectURL((content as any).video)
        allVideos.push(videoUrl)
      }

      // Remove duplicates and empty strings
      const uniqueVideos = [...new Set(allVideos)].filter(video => video && video.trim() !== '')
      setUploadedVideos(uniqueVideos)

      console.log('Advanced Edit Modal initialized with videos:', {
        videoUrl: content.videoUrl,
        videos: content.videos,
        uploadedVideos: uniqueVideos.length
      })
    }
  }, [content])

  const handleSave = async () => {
    if (!content) return

    console.log('🔄 handleSave called in Advanced Edit Modal')
    console.log('📝 Current content:', content)
    console.log('📝 Edited content:', editedContent)
    console.log('📝 Edited hashtags:', editedHashtags)
    console.log('📝 Uploaded images:', uploadedImages)
    console.log('📝 Uploaded videos:', uploadedVideos)

    setIsSaving(true)
    
    try {
      // Ensure hashtags is always an array
      const safeHashtags = Array.isArray(editedHashtags) ? editedHashtags : []

      // Create updated content with all images and videos
      const updatedContent: GeneratedContent = {
        ...content,
        content: editedContent,
        hashtags: safeHashtags,
        images: uploadedImages, // Store all images in images field
        imageUrl: uploadedImages.length > 0 ? uploadedImages[0] : undefined, // Keep first image in imageUrl for backward compatibility
        videos: uploadedVideos, // Store all videos in videos field
        videoUrl: uploadedVideos.length > 0 ? uploadedVideos[0] : undefined // Keep first video in videoUrl for backward compatibility
      }

      console.log('📤 Calling onSave with updated content:', updatedContent)
      console.log('📤 onSave function type:', typeof onSave)
      console.log('📤 onSave function:', onSave)

      await onSave(updatedContent)
      
      console.log('✅ onSave completed successfully')
      
      // Show success toast only after successful database save
      toast({
        title: "Changes Saved",
        description: "Your post has been updated successfully!",
        variant: "success",
      })
      
      // Close modal only after successful save
      onClose()
    } catch (error) {
      console.error('❌ Failed to save changes:', error)
      
      // Show error toast
      toast({
        title: "Save Failed",
        description: "Failed to save your changes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
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
      toast({
        title: "Too Many Images",
        description: `You can only upload up to ${maxImages} images for ${platform}. Current: ${currentImageCount}, Attempting: ${files.length}`,
        variant: "destructive",
      })
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
    
    // No toast message here - user needs to save to persist changes
  }

  const handleRegenerateContent = async () => {
    setIsRegeneratingContent(true)
    try {
      await onRegenerateContent()
      // No toast message here - user needs to save to persist changes
      // Toast will only appear after successful database save
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to regenerate content. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRegeneratingContent(false)
    }
  }

  const handleRegenerateImage = async () => {
    setIsRegeneratingImage(true)
    try {
      await onRegenerateImage()
      // No toast message here - user needs to save to persist changes
      // Toast will only appear after successful database save
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to regenerate image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRegeneratingImage(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
    // No toast message here - user needs to save to persist changes
    // Toast will only appear after successful database save
  }

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const platform = content?.platform || 'TWITTER'
    const maxVideos = getMaxVideosForPlatform()
    const currentVideoCount = uploadedVideos.length

    if (currentVideoCount + files.length > maxVideos) {
      toast({
        title: "Too Many Videos",
        description: `You can only upload up to ${maxVideos} video${maxVideos > 1 ? 's' : ''} for ${platform}. Current: ${currentVideoCount}, Attempting: ${files.length}`,
        variant: "destructive",
      })
      return
    }

    Array.from(files).forEach(file => {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a valid video file.",
          variant: "destructive",
        })
        return
      }

      // Validate file size (platform specific)
      const maxSize = getMaxVideoSizeForPlatform()
      if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024))
        toast({
          title: "File Too Large",
          description: `Video must be under ${maxSizeMB}MB for ${platform}. Current file: ${Math.round(file.size / (1024 * 1024))}MB`,
          variant: "destructive",
        })
        return
      }

      const videoUrl = URL.createObjectURL(file)
      setUploadedVideos(prev => [...prev, videoUrl])
    })
  }

  const handleRemoveVideo = (index: number) => {
    setUploadedVideos(prev => prev.filter((_, i) => i !== index))
    // No toast message here - user needs to save to persist changes
  }

  const getMaxImagesForPlatform = () => {
    const platform = content?.platform || 'TWITTER'
    return PLATFORM_IMAGE_LIMITS[platform] || 4
  }

  const getMaxVideosForPlatform = () => {
    const platform = content?.platform || 'TWITTER'
    // Most platforms support 1 video, except for some that support multiple
    switch (platform) {
      case 'TWITTER':
      case 'X':
      case 'LINKEDIN':
      case 'INSTAGRAM':
      case 'FACEBOOK':
      case 'YOUTUBE':
      case 'TIKTOK':
        return 1 // Most platforms support single video
      default:
        return 1
    }
  }

  const getMaxVideoSizeForPlatform = () => {
    const platform = content?.platform || 'TWITTER'
    switch (platform) {
      case 'TWITTER':
      case 'X':
        return 512 * 1024 * 1024 // 512MB
      case 'LINKEDIN':
        return 5 * 1024 * 1024 * 1024 // 5GB
      case 'INSTAGRAM':
      case 'FACEBOOK':
        return 4 * 1024 * 1024 * 1024 // 4GB
      case 'YOUTUBE':
        return 128 * 1024 * 1024 * 1024 // 128GB
      case 'TIKTOK':
        return 500 * 1024 * 1024 // 500MB
      default:
        return 500 * 1024 * 1024 // 500MB default
    }
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
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-2xl rounded-3xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0">
        <DialogHeader className="sticky top-0 z-20 bg-white/70 dark:bg-neutral-900/70 p-6 -mt-2 rounded-t-3xl border-b border-black/5 dark:border-white/5 backdrop-blur-xl">
          <div className="flex items-center gap-2 -mb-2 -mt-2">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner border border-black/10 dark:border-white/10 bg-gradient-to-br from-white/70 to-white/30 dark:from-neutral-800/60 dark:to-neutral-900/30` }>
              {getPlatformImage(content.platform)}
            </div>
            <div>
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                Edit {content.platform === 'TWITTER' ? 'X' : content.platform} Post
              </DialogTitle>
              <DialogDescription className="text-sm opacity-70 -mt-0.5">
                Fine-tune your content, manage hashtags, and update images for this post.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-8 px-6">
          {/* Left Column - Content Editing */}
          <div className="space-y-6">
            {/* Content Section */}
            <div className="rounded-3xl p-5 -mt-8 bg-white/70 dark:bg-neutral-900/70 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-xl transition-colors">
              <div className="flex items-center justify-between mb-4">
                <Label htmlFor="content" className="text-base font-semibold flex items-center gap-2">
                  <Edit className="h-5 w-5 text-rose-500" aria-hidden="true" />
                  Post Content
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateContent}
                  disabled={isRegeneratingContent}
                  title="Regenerate content with AI"
                  aria-label="Regenerate content"
                  className="flex items-center gap-2 bg-rose-50/70 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/70 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 shadow-sm hover:shadow transition-all rounded-xl"
                >
                  {isRegeneratingContent ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  )}
                  Regenerate Content
                </Button>
              </div>
              <Textarea
                id="content"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[200px] resize-none border border-black/10 dark:border-white/10 focus:border-rose-500 focus:ring-2 focus:ring-rose-200/60 dark:focus:ring-rose-800/60 rounded-2xl transition-all duration-300 text-base bg-white/60 dark:bg-neutral-800/40 focus:bg-white/80 dark:focus:bg-neutral-800/60 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                placeholder="Edit your post content..."
                aria-label="Post content"
              />
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs opacity-70">
                  Character count: <span className="font-semibold">{editedContent?.length || 0}</span>
                </div>
                <div className="text-xs opacity-70">
                  Platform: <span className="font-semibold">{content.platform === 'TWITTER' ? 'X' : content.platform}</span>
                </div>
              </div>
            </div>

            {/* Hashtags Section */}
            <div className="rounded-3xl p-6 bg-white/70 -mt-2 dark:bg-neutral-900/70 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-xl">
              <Label className="text-base font-semibold flex items-center gap-2 mb-4">
                <Hash className="h-5 w-5 text-rose-500" aria-hidden="true" />
                Hashtags
              </Label>
              <div className="bg-gradient-to-r from-rose-50/80 to-pink-100/60 dark:from-rose-900/20 dark:to-rose-900/10 rounded-2xl p-4 border border-rose-200/70 dark:border-rose-800/60 min-h-[60px]">
                {Array.isArray(editedHashtags) && editedHashtags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {editedHashtags.map((hashtag, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="flex items-center gap-2 bg-white/80 dark:bg-rose-800/60 text-rose-800 dark:text-rose-100 border border-rose-300/60 dark:border-rose-700/60 hover:bg-white dark:hover:bg-rose-800 px-3 py-1 rounded-full shadow-sm transition-colors"
                      >
                        {hashtag}
                        <button
                          type="button"
                          className="h-3 w-3 cursor-pointer hover:text-red-600 transition-colors duration-200"
                          aria-hidden={true}
                          onClick={() => handleRemoveHashtag(hashtag)}
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </button>
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
                  aria-label="Add hashtag"
                  className="flex-1 border border-black/10 dark:border-white/10 focus:border-rose-500 focus:ring-2 focus:ring-rose-200/60 dark:focus:ring-rose-800/60 rounded-xl transition-all duration-300 bg-white/60 dark:bg-neutral-800/40 focus:bg-white/80 dark:focus:bg-neutral-800/60"
                />
                <Button 
                  onClick={handleAddHashtag} 
                  size="sm"
                  title="Add hashtag"
                  className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white px-6 py-2 rounded-xl shadow-md hover:shadow-lg transition-shadow"
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Image Section */}
            <div className="rounded-3xl p-6 -mb-8 -mt-2 bg-white/70 dark:bg-neutral-900/70 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm font-semibold flex items-center gap-3 p-1">
                  <ImageIcon className="h-8 w-8 text-rose-500" aria-hidden="true" />
                  Images ({uploadedImages.length}/{getMaxImagesForPlatform()})
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0">
                    <button
                      onClick={() => setShowImages(!showImages)}
                      role="switch"
                      aria-checked={showImages}
                      aria-label="Toggle image visibility in preview"
                      className={`relative inline-flex h-6 -ml-8 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-opacity-50 ${
                        showImages ? "bg-rose-700" : "bg-gray-400 dark:bg-neutral-500"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          showImages ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                      <span className="sr-only">{showImages ? 'Hide images' : 'Show images'}</span>
                    </button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadedImages.length >= getMaxImagesForPlatform()}
                    title="Upload images"
                    aria-label="Upload images"
                    className="flex items-center gap-2 bg-rose-50/70 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/70 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 disabled:opacity-50 rounded-xl shadow-sm hover:shadow"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    Upload Images
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateImage}
                    disabled={isRegeneratingImage}
                    title="Regenerate image with AI"
                    aria-label="Regenerate image"
                    className="flex items-center gap-1 bg-rose-50/70 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/70 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 rounded-xl shadow-sm hover:shadow"
                  >
                    {isRegeneratingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Wand2 className="h-4 w-4" aria-hidden="true" />
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
                <div className="bg-white/60 dark:bg-neutral-800/40 rounded-2xl p-4 border border-black/10 dark:border-white/10 shadow-sm">
                  <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                    {uploadedImages.map((imageUrl, index) => (
                      <div key={index} className="group relative aspect-square bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                        <img
                          src={imageUrl}
                          alt={`Post image ${index + 1}`}
                          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 bg-rose-500/90 hover:bg-rose-600 text-white shadow-lg z-10 rounded-full h-7 w-7 p-0"
                          onClick={() => handleRemoveImage(index)}
                          title={`Remove image ${index + 1}`}
                          aria-label={`Remove image ${index + 1}`}
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] tracking-wide text-white">
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
                <div className="border-2 border-dashed border-black/20 dark:border-white/20 rounded-2xl p-12 text-center bg-white/50 dark:bg-neutral-800/40">
                  <ImageIcon className="h-16 w-16 opacity-40 mx-auto mb-4" aria-hidden="true" />
                  <p className="text-lg font-medium mb-1">No images selected</p>
                  <p className="text-sm opacity-70">Upload images or generate one with AI (Max: {getMaxImagesForPlatform()})</p>
                </div>
              )}
            </div>

            {/* Video Section */}
            <div className="rounded-3xl p-6 -mb-8 -mt-2 bg-white/70 dark:bg-neutral-900/70 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm font-semibold flex items-center gap-3 p-1">
                  <Upload className="h-8 w-8 text-blue-500" aria-hidden="true" />
                  Videos ({uploadedVideos.length}/{getMaxVideosForPlatform()})
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0">
                    <button
                      onClick={() => setShowVideos(!showVideos)}
                      role="switch"
                      aria-checked={showVideos}
                      aria-label="Toggle video visibility in preview"
                      className={`relative inline-flex h-6 -ml-8 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
                        showVideos ? "bg-blue-700" : "bg-gray-400 dark:bg-neutral-500"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          showVideos ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                      <span className="sr-only">{showVideos ? 'Hide videos' : 'Show videos'}</span>
                    </button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={uploadedVideos.length >= getMaxVideosForPlatform()}
                    title="Upload video"
                    aria-label="Upload video"
                    className="flex items-center gap-2 bg-blue-50/70 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/70 dark:border-blue-800/60 hover:border-blue-400/70 dark:hover:border-blue-600/70 text-blue-700 dark:text-blue-300 disabled:opacity-50 rounded-xl shadow-sm hover:shadow"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    Upload Video
                  </Button>
                </div>
              </div>

              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
              />

              {showVideos && uploadedVideos.length > 0 && (
                <div className="bg-white/60 dark:bg-neutral-800/40 rounded-2xl p-4 border border-black/10 dark:border-white/10 shadow-sm">
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {uploadedVideos.map((videoUrl, index) => (
                      <div key={index} className="group relative bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                        <video
                          src={videoUrl}
                          className="w-full h-48 object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                          controls
                          preload="metadata"
                          playsInline
                          muted
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-600 text-white shadow-lg z-10 rounded-full h-8 w-8 p-0"
                          onClick={() => handleRemoveVideo(index)}
                          title={`Remove video ${index + 1}`}
                          aria-label={`Remove video ${index + 1}`}
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] tracking-wide text-white">
                          Video {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 text-center">
                    {uploadedVideos.length} of {getMaxVideosForPlatform()} video{getMaxVideosForPlatform() > 1 ? 's' : ''} uploaded
                  </div>
                </div>
              )}

              {uploadedVideos.length === 0 && (
                <div className="border-2 border-dashed border-black/20 dark:border-white/20 rounded-2xl p-12 text-center bg-white/50 dark:bg-neutral-800/40">
                  <Upload className="h-16 w-16 opacity-40 mx-auto mb-4" aria-hidden="true" />
                  <p className="text-lg font-medium mb-1">No videos selected</p>
                  <p className="text-sm opacity-70">Upload videos for your post (Max: {getMaxVideosForPlatform()})</p>

                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <div>Max size: {Math.round(getMaxVideoSizeForPlatform() / (1024 * 1024))}MB for {content?.platform || 'this platform'}</div>
                    <div className="flex items-center gap-1">
                      <span>Requirements:</span>
                      {content?.platform === 'TWITTER' || content?.platform === 'X' ? (
                        <span>MP4/MOV, max 2:20 duration</span>
                      ) : content?.platform === 'LINKEDIN' ? (
                        <span>MP4/MOV/AVI, max 10 min duration</span>
                      ) : content?.platform === 'INSTAGRAM' ? (
                        <span>MP4/MOV, max 60 min duration</span>
                      ) : content?.platform === 'FACEBOOK' ? (
                        <span>MP4/MOV/AVI, max 4 hours duration</span>
                      ) : content?.platform === 'YOUTUBE' ? (
                        <span>MP4/MOV/AVI, max 12 hours duration</span>
                      ) : content?.platform === 'TIKTOK' ? (
                        <span>MP4/MOV/AVI, max 10 min duration</span>
                      ) : (
                        <span>Check platform requirements</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Live Preview */}
          <div className="space-y-6">
            {/* Preview Header */}
            <div className="rounded-3xl p-4 -mt-8 bg-gradient-to-br from-white/80 to-white/50 dark:from-neutral-900/70 dark:to-neutral-900/40 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-xl">
              <div className="flex items-center gap-1">
              <Badge variant="secondary" className="h-15 w-15 -mt-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-800/60 shadow-sm">
                  {getPlatformImage(content.platform)}
                </Badge>
                <h3 className="text-lg mb-4 -mt-3 font-semibold tracking-tight">Live Preview</h3>
              </div>
              <p className="text-xs opacity-70 ml-16 -mt-7">
                See how your post will look on {content.platform === 'TWITTER' ? 'X' : content.platform}
              </p>
            </div>



            {/* Post Preview */}
            <div className="rounded-3xl p-6 -mt-2 bg-white/70 dark:bg-neutral-900/70 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-xl">
              <PostPreview
                platform={content.platform}
                text={editedContent}
                image={showImages && uploadedImages.length > 0 ? uploadedImages[0] : undefined}
                images={showImages && uploadedImages.length > 0 ? uploadedImages : undefined}
                videoUrl={showVideos && uploadedVideos.length > 0 ? uploadedVideos[0] : undefined}
                videos={showVideos && uploadedVideos.length > 0 ? uploadedVideos : undefined}
                hashtags={editedHashtags}
                includeImages={showImages}
                includeVideo={showVideos}
                onVideoClick={(e) => {
                  // Allow video interaction in preview without closing modal
                  e.stopPropagation()
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="bg-white/70 dark:bg-neutral-900/70 p-6 -mb-8 rounded-b-3xl border-t border-black/5 dark:border-white/5 backdrop-blur-xl">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isSaving}
            title="Cancel"
            className="border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:bg-black/5 dark:hover:bg-white/10 px-8 py-3 text-base transition-all duration-300 rounded-xl"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            title="Save changes"
            className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-pink-700 hover:from-rose-700 hover:to-pink-800 text-white px-8 py-3 text-base shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" aria-hidden="true" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
