"use client";
import React from "react";
import { motion, useReducedMotion } from "framer-motion";

type Props = {
  className?: string;
  height?: number; // canvas inner height in px
  speed?: number; // base seconds per loop
};

const shadow = "shadow-[0_10px_60px_rgba(0,0,0,0.18)]";

function InstagramPost({ user = "@studio", img = "https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?q=80&w=1200&auto=format&fit=crop" }) {
  return (
    <div className={`w-[220px] rounded-xl overflow-hidden bg-white dark:bg-zinc-900 ring-1 ring-black/5 dark:ring-white/10 ${shadow}`}>
      <div className="flex items-center gap-2 p-2.5">
        <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-400" />
        <div className="text-xs font-medium">{user}</div>
      </div>
      <div className="h-[180px] bg-zinc-100 dark:bg-zinc-800">
        <img src={img} alt="post" className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="p-2.5 text-[11px] text-zinc-600 dark:text-zinc-400">❤️ 1.2k • 💬 98</div>
    </div>
  );
}

function XPost({ user = "@brand", text = "Launching something new. Stay tuned ✨", avatarColor = "#111" }) {
  return (
    <div className={`w-[260px] rounded-xl bg-white dark:bg-zinc-900 ring-1 ring-black/5 dark:ring-white/10 p-3 ${shadow}`}>
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-full" style={{ background: avatarColor }} />
        <div className="text-xs font-medium">{user}</div>
        <div className="ml-auto text-[10px] text-zinc-500">2m</div>
      </div>
      <div className="mt-2 text-[12px] leading-snug">{text}</div>
      <div className="mt-2 flex gap-4 text-[11px] text-zinc-500">
        <span>❤ 540</span>
        <span>↩ 120</span>
        <span>↗ 36</span>
      </div>
    </div>
  );
}

function LinkedInPost({ user = "Studio, Inc.", text = "We’re hiring designers and devs. Join us.", badge = "Promoted" }) {
  return (
    <div className={`w-[280px] rounded-xl bg-white dark:bg-zinc-900 ring-1 ring-black/5 dark:ring-white/10 p-3 ${shadow}`}>
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded bg-[#0A66C2]" />
        <div className="text-xs font-semibold">{user}</div>
        <div className="ml-auto text-[10px] text-[#0A66C2] bg-[#0A66C2]/10 rounded px-1.5 py-0.5">{badge}</div>
      </div>
      <div className="mt-2 text-[12px] leading-snug">{text}</div>
      <div className="mt-2 h-[90px] rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700" />
      <div className="mt-2 flex gap-4 text-[11px] text-zinc-500">
        <span>👍 940</span>
        <span>💬 87</span>
        <span>↪ 12</span>
      </div>
    </div>
  );
}

function YouTubeCard({ title = "How we plan content", duration = "6:21" }) {
  return (
    <div className={`w-[280px] rounded-xl overflow-hidden bg-white dark:bg-zinc-900 ring-1 ring-black/5 dark:ring-white/10 ${shadow}`}>
      <div className="relative h-[150px] bg-zinc-200 dark:bg-zinc-800">
        <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white">{duration}</div>
        <div className="absolute inset-0 grid place-items-center text-[#FF0000]">
          <svg viewBox="0 0 24 24" className="h-8 w-8 fill-current"><path d="M23.5 6.2s-.2-1.6-.8-2.3c-.8-.8-1.7-.8-2.1-.9C17.7 2.7 12 2.7 12 2.7h0s-5.7 0-8.6.3c-.4 0-1.3 0-2.1.9C.7 4.6.5 6.2.5 6.2S.3 8.1.3 9.9v1.8c0 1.8.2 3.7.2 3.7s.2 1.6.8 2.3c.8.8 1.9.8 2.4.9 1.7.2 7.1.3 8.3.3 0 0 5.7 0 8.6-.3.4-.1 1.3-.1 2.1-.9.6-.7.8-2.3.8-2.3s.2-1.8.2-3.7V9.9c0-1.8-.2-3.7-.2-3.7zM9.9 12.7V7.9l5.7 2.4-5.7 2.4z"/></svg>
        </div>
      </div>
      <div className="p-2.5">
        <div className="line-clamp-1 text-[12px] font-medium">{title}</div>
        <div className="mt-1 text-[11px] text-zinc-500">1.1k views • 1d ago</div>
      </div>
    </div>
  );
}

function TikTokPost({ user = "@studio", text = "Behind the scenes", color = "#111" }) {
  return (
    <div className={`w-[220px] rounded-xl overflow-hidden bg-black text-white ring-1 ring-white/10 ${shadow}`}>
      <div className="p-2.5 text-[11px] opacity-80">{user}</div>
      <div className="h-[180px] relative" style={{ background: color }}>
        <div className="absolute inset-0 grid place-items-center text-white/90 text-[12px]">Reel</div>
      </div>
      <div className="p-2.5 text-[12px]">{text}</div>
    </div>
  );
}

function Column({ children, duration = 18, height = 420 }: { children: React.ReactNode; duration?: number; height?: number }) {
  const reduced = useReducedMotion();
  // Duplicate content for seamless loop
  return (
    <div className="relative w-fit">
      <div className="[mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] overflow-hidden" style={{ height }}>
        <div className="relative" style={{ height: height * 2 }}>
          <motion.div
            style={{ position: "absolute", inset: 0 }}
            animate={reduced ? {} : { y: [0, -height] }}
            transition={reduced ? {} : { duration, ease: "linear", repeat: Infinity }}
          >
            <div className="flex flex-col gap-4">{children}</div>
          </motion.div>
          <motion.div
            style={{ position: "absolute", inset: 0 }}
            animate={reduced ? {} : { y: [height, 0] }}
            transition={reduced ? {} : { duration, ease: "linear", repeat: Infinity }}
          >
            <div className="flex flex-col gap-4">{children}</div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function SocialMockPreview({ className = "", height = 420, speed = 18 }: Props) {
  return (
    <div className={`relative w-full rounded-3xl p-4 sm:p-6 ${className}`}>
      {/* Canvas background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 ring-1 ring-zinc-900/10 dark:ring-white/10">
        {/* Luxury glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[280px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-r from-fuchsia-400/20 via-sky-400/20 to-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.5),transparent_50%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.2),transparent_40%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.05),transparent_50%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.03),transparent_40%)]" />

        {/* Scrolling columns */}
        <div className="relative z-10 mx-auto flex w-full max-w-6xl items-start justify-center gap-4 px-2 py-6 sm:gap-6 sm:px-6">
          <Column duration={speed * 1.0} height={height}>
            <InstagramPost />
            <InstagramPost img="https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=1200&auto=format&fit=crop" />
            <InstagramPost img="https://images.unsplash.com/photo-1510519138101-570d1dca3d66?q=80&w=1200&auto=format&fit=crop" />
          </Column>
          <Column duration={speed * 0.9} height={height}>
            <XPost />
            <XPost text="Shipping weekly. Ask us anything." avatarColor="#0f172a" />
            <XPost text="Tips for consistent posting across channels." avatarColor="#111827" />
          </Column>
          <Column duration={speed * 1.1} height={height}>
            <LinkedInPost />
            <LinkedInPost text="New case study: 5x engagement with smarter scheduling." />
            <LinkedInPost badge="Update" text="Webinar: Multi-channel content strategy." />
          </Column>
          <Column duration={speed * 0.85} height={height}>
            <YouTubeCard />
            <YouTubeCard title="Batch create content for the month" duration="8:02" />
            <TikTokPost />
          </Column>
        </div>

        {/* Frame */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/5 dark:ring-white/10" />
      </div>
    </div>
  );
}

