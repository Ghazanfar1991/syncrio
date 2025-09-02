"use client";
import React from "react";

type Media = {
  id?: string | number;
  type: "image" | "video";
  url: string;
  posterUrl?: string;
  alt?: string;
};

type Props = {
  media: Media[] | undefined | null;
  className?: string;
  // Height in px (container is full width of parent)
  height?: number;
  rounded?: string; // tailwind radius, e.g., "rounded-lg"
  onOpen?: (m: { media: Media[]; index: number }) => void;
};

export default function PostMediaPreview({ media, className = "", height = 128, rounded = "rounded-lg", onOpen }: Props) {
  const items = (media ?? []).filter(Boolean);
  const count = items.length;

  if (count === 0) {
    return (
      <div className={`relative w-full bg-zinc-100 dark:bg-zinc-800 ${rounded} ${className}`} style={{ height }} />
    );
  }

  const gridClass = (() => {
    if (count === 1) return "grid-cols-1 grid-rows-1";
    if (count === 2) return "grid-cols-2 grid-rows-1";
    return "grid-cols-2 grid-rows-2"; // 3 or 4+ -> 2x2
  })();

  const visible = count <= 4 ? items : items.slice(0, 4);
  const overflow = count - visible.length;

  return (
    <div className={`relative w-full overflow-hidden ${rounded} ${className}`} style={{ height }}>
      <div className={`grid h-full w-full gap-1 ${gridClass}`}>
        {visible.map((m, i) => (
          <Tile key={(m.id ?? i) + "-tile"} media={m} onClick={() => onOpen?.({ media: items, index: i })} />
        ))}
      </div>

      {overflow > 0 && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-1 bottom-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
            +{overflow}
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ media, onClick }: { media: Media; onClick?: () => void }) {
  const common = "h-full w-full object-cover";
  const isVideo = media.type === "video";
  if (isVideo) {
    // Try to ensure a preview without autoplay noise
    return (
      <div className="relative overflow-hidden rounded-md">
        <video
          className={common}
          src={media.url}
          muted
          playsInline
          preload="metadata"
          onClick={onClick}
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onClick?.()}
        />
        <div className="pointer-events-none absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">Video</div>
      </div>
    );
  }
  return (
    <button type="button" onClick={onClick} className="relative overflow-hidden rounded-md">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={media.url} alt={media.alt ?? "image"} className={common} loading="lazy" />
    </button>
  );
}

