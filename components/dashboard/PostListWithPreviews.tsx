"use client";
import React from "react";
import PostMediaPreview from "@/components/content/post-media-preview";

export type SimplePost = {
  id: string | number;
  title?: string;
  text?: string;
  // Accept a variety of incoming shapes; normalize via selector
  media?: Array<
    | { type: "image" | "video"; url: string; id?: string | number }
    | { kind: "image" | "video"; src: string; id?: string | number }
    | { contentType: string; url: string; id?: string | number }
  >;
};

type Props = {
  posts: SimplePost[];
  onOpen?: (post: SimplePost) => void; // open view-only modal
  className?: string;
};

export default function PostListWithPreviews({ posts, onOpen, className = "" }: Props) {
  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {posts.map((p) => {
        const media = normalizeMedia(p.media);
        return (
          <div key={p.id} className="rounded-xl ring-1 ring-zinc-900/5 bg-white/80 dark:bg-zinc-900/60 dark:ring-white/10 p-3">
            <PostMediaPreview
              media={media}
              height={128}
              onOpen={() => onOpen?.(p)}
              className="mb-2"
            />
            {p.title && <div className="truncate text-sm font-medium">{p.title}</div>}
            {p.text && <div className="line-clamp-2 text-xs text-muted-foreground">{p.text}</div>}
          </div>
        );
      })}
    </div>
  );
}

function normalizeMedia(src: SimplePost["media"]): { type: "image" | "video"; url: string; id?: string | number }[] {
  if (!src) return [];
  return src
    .map((m: any) => {
      if (!m) return null;
      if (m.type === "image" || m.type === "video") return { type: m.type, url: m.url, id: m.id };
      if (m.kind === "image" || m.kind === "video") return { type: m.kind, url: m.src, id: m.id } as any;
      if (typeof m.contentType === "string" && m.url) {
        const ct = m.contentType.toLowerCase();
        const type = ct.includes("video") ? "video" : "image";
        return { type, url: m.url, id: m.id } as const;
      }
      if (typeof m === "string") {
        const isVideo = /\.(mp4|webm|ogg)(\?|#|$)/i.test(m);
        return { type: isVideo ? "video" : "image", url: m } as const;
      }
      return null;
    })
    .filter(Boolean) as any;
}

