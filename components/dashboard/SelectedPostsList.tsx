"use client";
import React from "react";
import PostMediaPreview from "@/components/content/post-media-preview";

export default function SelectedPostsList({ posts, getPlatformIcon, onOpen }: { posts: any[]; getPlatformIcon: (p: string) => React.ReactNode; onOpen: (post: any) => void; }) {
  return (
    <div className="space-y-3">
      {posts.map((post: any, idx: number) => {
        const media: any[] = [];
        if (Array.isArray(post.media)) media.push(...post.media);
        if (Array.isArray((post as any).mediaItems)) media.push(...(post as any).mediaItems);
        if (Array.isArray(post.imageUrls)) media.push(...post.imageUrls.map((u: string) => ({ type: 'image', url: u })));
        if (Array.isArray(post.videoUrls)) media.push(...post.videoUrls.map((u: string) => ({ type: 'video', url: u })));
        if (post.imageUrl) media.push({ type: 'image', url: post.imageUrl });
        if (post.videoUrl) media.push({ type: 'video', url: post.videoUrl });

        const status = post.status?.toUpperCase();
        const isPublished = status === 'PUBLISHED';

        return (
          <div
            key={idx}
            className="p-3 rounded-xl bg-white/60 dark:bg-neutral-800/50 border border-black/5 dark:border-white/10 shadow-sm hover:bg-white/80 dark:hover:bg-neutral-800/70 transition-colors cursor-pointer"
            onClick={() => onOpen(post)}
          >
            <div className="flex items-start gap-4">
              {/* Left: single prominent media preview with rounded corners */}
              <div className="w-[132px] sm:w-[156px] flex-shrink-0">
                {media.length > 0 ? (
                  <LeftPreview media={media as any} />
                ) : (
                  <div className="h-[96px] w-full rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
                )}
              </div>

              {/* Right: meta and text */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  {post.platform && (
                    <div className="grid h-7 w-7 place-items-center rounded-xl bg-zinc-100 ring-1 ring-black/5 dark:bg-zinc-800 dark:ring-white/10">
                      <div className="scale-90">{getPlatformIcon(post.platform)}</div>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-[15px] font-semibold leading-5">
                        {post.accountName || post.platform || 'Account'}
                      </div>
                      <div className={`ml-auto rounded-full px-3 py-1 text-[11px] font-semibold ${isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'} dark:${isPublished ? 'bg-emerald-900/30 text-emerald-300' : 'bg-blue-900/30 text-blue-300'}`}>
                        {isPublished ? 'PUBLISHED' : 'SCHEDULED'}
                      </div>
                    </div>
                    <div className="mt-0.5 text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {(post.time || '').toString()}{post.platform ? ` • ${String(post.platform).toUpperCase()}` : ''}
                    </div>
                  </div>
                </div>
                {post.content && (
                  <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">
                    {post.content}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeftPreview({ media }: { media: { type: 'image' | 'video'; url: string }[] }) {
  const first = media[0];
  const more = media.length - 1;
  const common = "h-[96px] w-full overflow-hidden rounded-2xl relative ring-1 ring-black/5 dark:ring-white/10";
  if (first?.type === 'video') {
    return (
      <div className={common}>
        <video className="h-full w-full object-cover" src={first.url} muted playsInline preload="metadata" />
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-9 w-9 rounded-full bg-white/95 text-black grid place-items-center shadow">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        {more > 0 && (
          <div className="pointer-events-none absolute right-1.5 bottom-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] text-white">+{more}</div>
        )}
      </div>
    );
  }
  return (
    <div className={common}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={first?.url} alt="media" className="h-full w-full object-cover" />
      {more > 0 && (
        <div className="pointer-events-none absolute right-1.5 bottom-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] text-white">+{more}</div>
      )}
    </div>
  );
}
