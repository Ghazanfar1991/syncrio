"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, Repeat2, Share2, ThumbsUp, MoreHorizontal, Bookmark, Send } from "lucide-react";
import { VideoPreview } from "@/components/video-preview";

interface PostPreviewProps {
  platform: string;
  text: string;
  image?: string;
  images?: string[];
  videoUrl?: string;
  videos?: string[];
  hashtags: string[];
  onVideoClick?: (e: React.MouseEvent) => void;
  includeImages?: boolean;
  includeVideo?: boolean;
}

export default function PostPreview({ platform, text, image, images, videoUrl, videos, hashtags, onVideoClick, includeImages = true, includeVideo = true }: PostPreviewProps) {
  const { data: session } = useSession();
  
  // Get user display name and username
  const getUserDisplayName = () => {
    if (session?.user?.name) {
      return session.user.name;
    }
    if (session?.user?.email) {
      return session.user.email.split('@')[0];
    }
    return 'User';
  };
  
  const getUserUsername = () => {
    if (session?.user?.email) {
      return session.user.email.split('@')[0];
    }
    return 'user';
  };

  // Function to render images with scrollable functionality
  const renderImages = () => {
    // Don't render images if includeImages is false
    if (!includeImages) return null;

    const imageArray = images && images.length > 0 ? images : (image ? [image] : []);

    // Debug logging
    console.log('PostPreview renderImages:', { images, image, imageArray, imageArrayLength: imageArray.length, includeImages });

    if (imageArray.length === 0) return null;

    // Single image - full width display
    if (imageArray.length === 1) {
      return (
        <div className="mt-3 max-h-64 overflow-hidden">
          <img
            src={imageArray[0]}
            className="w-full h-60 object-contain rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            alt="Post content"
            onError={(e) => {
              console.error('Image failed to load:', imageArray[0])
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      );
    }

    // Multiple images - horizontal scrollable gallery
    return (
      <div className="mt-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {imageArray.map((img, index) => (
            <div key={index} className="flex-shrink-0">
              <img
                src={img}
                className="h-48 w-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                alt={`Post content ${index + 1}`}
                onError={(e) => {
                  console.error('Image failed to load:', img)
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          ))}
        </div>
        {imageArray.length > 3 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
            Scroll to see all {imageArray.length} images →
          </p>
        )}
      </div>
    );
  };

  // Function to render videos with platform-specific styling
  const renderVideos = () => {
    // Don't render videos if includeVideo is false
    if (!includeVideo) return null;

    const videoArray = videos && videos.length > 0 ? videos : (videoUrl ? [videoUrl] : []);

    // Debug logging
    console.log('PostPreview renderVideos:', {
      videos,
      videoUrl,
      videoArray,
      videoArrayLength: videoArray.length,
      includeVideo,
      platform
    });

    if (videoArray.length === 0) return null;

    // Filter out any null/undefined/empty values
    const validVideos = videoArray.filter(video => video && video.trim() !== '');

    if (validVideos.length === 0) return null;

    // For now, show only the first video (most platforms support single video)
    const firstVideo = validVideos[0];

    return (
      <div className="mt-3">
        <div className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
          {/* Use VideoPreview component for enhanced functionality */}
          <VideoPreview
            videoUrl={firstVideo}
            platform={platform}
            className="w-full aspect-video"
            autoPlay={false}
            controls={true}
            muted={true}
            onVideoClick={onVideoClick}
          />
        </div>
        {validVideos.length > 1 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
            +{validVideos.length - 1} more video{validVideos.length > 2 ? 's' : ''}
          </p>
        )}
      </div>
    );
  };

  const renderFacebook = () => (
    <Card className="w-full bg-white/80 dark:bg-neutral-800/80 shadow-lg rounded-2xl border border-black/10 dark:border-white/10 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">f</span>
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-900 dark:text-white">{getUserDisplayName()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">2 hrs ago</p>
        </div>
      </div>
      <CardContent className="p-0">
        <p className="text-sm text-gray-900 dark:text-white mb-3 leading-relaxed">{text}</p>
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {hashtags.map((tag, i) => (
              <span key={i} className="text-blue-600 dark:text-blue-400 text-sm font-medium">#{tag}</span>
            ))}
          </div>
        )}
        {renderImages()}
        {renderVideos()}

        {/* Facebook-style engagement bar */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1">
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <ThumbsUp className="w-2 h-2 text-white" />
              </div>
              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <Heart className="w-2 h-2 text-white fill-white" />
              </div>
            </div>
            <span className="ml-1">120</span>
          </div>
          <div className="flex gap-3">
            <span>45 Comments</span>
            <span>10 Shares</span>
          </div>
        </div>

        {/* Facebook-style action buttons */}
        <div className="flex justify-around pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400">
            <ThumbsUp className="w-4 h-4" />
            <span className="text-sm font-medium">Like</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400">
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Comment</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400">
            <Share2 className="w-4 h-4" />
            <span className="text-sm font-medium">Share</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );

  const renderTwitter = () => (
    <Card className="w-full bg-white/80 dark:bg-neutral-800/80 shadow-lg rounded-2xl border border-black/10 dark:border-white/10 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">𝕏</span>
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-900 dark:text-white">{getUserDisplayName()} <span className="text-gray-500 dark:text-gray-400">@{getUserUsername()}</span></p>
          <p className="text-xs text-gray-500 dark:text-gray-400">1h</p>
        </div>
      </div>
      <CardContent className="p-0">
        <p className="text-sm mb-3 leading-relaxed text-gray-900 dark:text-white">
          {text.split(" ").map((word, i) =>
            word.startsWith("#") ? <span key={i} className="text-blue-500 dark:text-blue-400 font-medium">{word} </span> : word + " "
          )}
        </p>
        {renderImages()}
        {renderVideos()}

        {/* Twitter/X-style action buttons */}
        <div className="flex justify-between items-center mt-4 pt-3 max-w-md">
          <button className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors group">
            <div className="p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
              <MessageCircle className="w-4 h-4" />
            </div>
            <span className="text-sm">23</span>
          </button>

          <button className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-green-500 transition-colors group">
            <div className="p-2 rounded-full group-hover:bg-green-50 dark:group-hover:bg-green-900/20 transition-colors">
              <Repeat2 className="w-4 h-4" />
            </div>
            <span className="text-sm">45</span>
          </button>

          <button className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors group">
            <div className="p-2 rounded-full group-hover:bg-red-50 dark:group-hover:bg-red-900/20 transition-colors">
              <Heart className="w-4 h-4" />
            </div>
            <span className="text-sm">230</span>
          </button>

          <button className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors group">
            <div className="p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
              <Share2 className="w-4 h-4" />
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );

  const renderLinkedIn = () => (
    <Card className="w-full bg-white/80 dark:bg-neutral-800/80 shadow-lg rounded-2xl border border-black/10 dark:border-white/10 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">in</span>
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-900 dark:text-white">{getUserDisplayName()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Professional</p>
        </div>
      </div>
      <CardContent className="p-0">
        <p className="text-sm text-gray-900 dark:text-white mb-3 leading-relaxed">{text}</p>
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {hashtags.map((tag, i) => (
              <span key={i} className="text-blue-600 dark:text-blue-400 text-sm font-medium">#{tag}</span>
            ))}
          </div>
        )}
        {renderImages()}
        {renderVideos()}

        {/* LinkedIn-style engagement summary */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1">
              <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                <ThumbsUp className="w-2 h-2 text-white" />
              </div>
              <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">👏</span>
              </div>
              <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">💡</span>
              </div>
            </div>
            <span className="ml-1">230</span>
          </div>
          <div className="flex gap-3">
            <span>18 comments</span>
            <span>5 reposts</span>
          </div>
        </div>

        {/* LinkedIn-style action buttons */}
        <div className="flex justify-around pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-600 dark:text-gray-400">
            <ThumbsUp className="w-4 h-4" />
            <span className="text-sm font-medium">Like</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-600 dark:text-gray-400">
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Comment</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-600 dark:text-gray-400">
            <Repeat2 className="w-4 h-4" />
            <span className="text-sm font-medium">Repost</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-600 dark:text-gray-400">
            <Send className="w-4 h-4" />
            <span className="text-sm font-medium">Send</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );

  const renderInstagram = () => (
    <Card className="w-full bg-white/80 dark:bg-neutral-800/80 shadow-lg rounded-2xl border border-black/10 dark:border-white/10 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">📷</span>
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-900 dark:text-white">{getUserDisplayName()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">@{getUserUsername()}</p>
        </div>
      </div>
      <CardContent className="p-0">
        <p className="text-sm text-gray-900 dark:text-white mb-3 leading-relaxed">{text}</p>
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {hashtags.map((tag, i) => (
              <span key={i} className="text-blue-600 dark:text-blue-400 text-sm font-medium">#{tag}</span>
            ))}
          </div>
        )}
        {renderImages()}
        {renderVideos()}

        {/* Instagram-style action buttons */}
        <div className="flex justify-between items-center mt-3">
          <div className="flex items-center gap-4">
            <button className="text-gray-800 dark:text-gray-200 hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
              <Heart className="w-6 h-6" />
            </button>
            <button className="text-gray-800 dark:text-gray-200 hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
              <MessageCircle className="w-6 h-6" />
            </button>
            <button className="text-gray-800 dark:text-gray-200 hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
              <Send className="w-6 h-6" />
            </button>
          </div>
          <button className="text-gray-800 dark:text-gray-200 hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
            <Bookmark className="w-6 h-6" />
          </button>
        </div>

        {/* Instagram-style engagement info */}
        <div className="mt-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">1,234 likes</p>
          <div className="mt-1">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{getUserDisplayName()}</span>
            <span className="text-sm text-gray-900 dark:text-white ml-2">{text}</span>
          </div>
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {hashtags.map((tag, i) => (
                <span key={i} className="text-blue-600 dark:text-blue-400 text-sm">#{tag}</span>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">View all 89 comments</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">2 HOURS AGO</p>
        </div>
      </CardContent>
    </Card>
  );

  const renderYouTube = () => (
    <Card className="w-full bg-white/80 dark:bg-neutral-800/80 shadow-lg rounded-2xl border border-black/10 dark:border-white/10 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center text-white font-semibold text-sm">
          YT
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-900 dark:text-white">{getUserDisplayName()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">@{getUserUsername()}</p>
        </div>
      </div>
      <CardContent className="p-0">
        <p className="text-sm text-gray-900 dark:text-white mb-3 leading-relaxed">{text}</p>
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {hashtags.map((tag, i) => (
              <span key={i} className="text-blue-600 dark:text-blue-400 text-sm font-medium">#{tag}</span>
            ))}
          </div>
        )}
        {renderImages()}
        {renderVideos()}
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <span>👍 890</span>
          <span>67 Comments • 12 Shares</span>
        </div>
      </CardContent>
    </Card>
  );

  if (platform === "FACEBOOK" || platform === "Facebook") return renderFacebook();
  if (platform === "TWITTER" || platform === "Twitter" || platform === "X") return renderTwitter();
  if (platform === "LINKEDIN" || platform === "LinkedIn") return renderLinkedIn();
  if (platform === "INSTAGRAM" || platform === "Instagram") return renderInstagram();
  if (platform === "YOUTUBE" || platform === "YouTube") return renderYouTube();

  return <p className="text-center text-gray-400">Select a platform to preview</p>;
}
