'use client'

import { useState, useRef } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VideoPreviewProps {
  videoUrl: string
  platform: string
  className?: string
  autoPlay?: boolean
  controls?: boolean
  muted?: boolean
  onVideoClick?: (e: React.MouseEvent) => void
}

export function VideoPreview({
  videoUrl,
  platform,
  className = '',
  autoPlay = false,
  controls = true,
  muted = true,
  onVideoClick
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(muted)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      setIsLoading(false)
    }
  }

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const handleVolumeChange = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.volume = value[0]
      setVolume(value[0])
      setIsMuted(value[0] === 0)
    }
  }

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen()
      }
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = videoUrl
    link.download = `video-${platform.toLowerCase()}.mp4`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleError = () => {
    setError('Failed to load video')
    setIsLoading(false)
  }

  const handleVideoClick = (e: React.MouseEvent) => {
    // Prevent event bubbling to parent elements (like modal triggers)
    e.stopPropagation()
    if (onVideoClick) {
      onVideoClick(e)
    } else {
      // Default behavior: toggle play/pause
      togglePlay()
    }
  }

  const handleCanPlay = () => {
    setIsLoading(false)
    setError(null)
  }

  // Platform-specific styling
  const getPlatformStyles = () => {
    switch (platform.toUpperCase()) {
      case 'YOUTUBE':
        return 'aspect-video bg-black' // 16:9 for YouTube
      case 'TIKTOK':
        return 'aspect-[9/16] bg-black max-w-sm mx-auto' // 9:16 for TikTok
      case 'INSTAGRAM':
        return 'aspect-square bg-black max-w-md mx-auto' // 1:1 for Instagram
      case 'TWITTER':
      case 'X':
        return 'aspect-video bg-black max-w-lg' // 16:9 for Twitter
      case 'LINKEDIN':
        return 'aspect-video bg-black' // 16:9 for LinkedIn
      case 'FACEBOOK':
        return 'aspect-video bg-black' // 16:9 for Facebook
      default:
        return 'aspect-video bg-black'
    }
  }

  if (error) {
    return (
      <div className={`${getPlatformStyles()} ${className} flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg`}>
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => window.open(videoUrl, '_blank')}
          >
            Open Video
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${getPlatformStyles()} ${className} relative rounded-lg overflow-hidden group`}
      onClick={handleVideoClick}
    >
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover"
        autoPlay={autoPlay}
        muted={isMuted}
        loop={platform.toUpperCase() === 'TIKTOK'} // Auto-loop for TikTok
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={handleError}
        playsInline
        preload="metadata"
      />

      {/* Play Button Overlay */}
      {!isPlaying && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="lg"
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-black/50 text-white hover:bg-black/70 border-2 border-white/50"
          >
            <Play className="h-8 w-8 ml-1" />
          </Button>
        </div>
      )}

      {/* Custom Controls */}
      {controls && !isLoading && (
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Progress Bar */}
          <div className="px-4 pb-2">
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              step={0.1}
              onChange={(e) => handleSeek([parseFloat(e.target.value)])}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between px-4 pb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>

              <div className="w-20">
                <input
                  type="range"
                  min={0}
                  max={1}
                  value={volume}
                  step={0.1}
                  onChange={(e) => handleVolumeChange([parseFloat(e.target.value)])}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
              </div>

              <span className="text-white text-xs">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="text-white hover:bg-white/20"
              >
                <Download className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Badge */}
      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        {platform.toUpperCase()}
      </div>
    </div>
  )
}
