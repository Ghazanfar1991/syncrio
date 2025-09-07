  "use client"
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Link from "next/link";
import { useTheme } from "@/components/providers/theme-provider";
import {
  Zap, CalendarClock, LineChart, ImageIcon, Video, Type,
  ShieldCheck, Sun, Moon, Sparkles, Play, Check, ArrowRight, ChevronLeft, ChevronRight,
  Send, Clock,
} from "lucide-react";
// Local marquee for testimonials with continuous right-to-left animation

// Single-file, production-ready landing page component for "Syncrio      <section id="pricing" className="relative z-10 py-14 bg-gradient-to-b from-transparent via-zinc-50/50 to-transparent dark:via-zinc-900/50">

// — Super modern, elegant, mobile-first design
// — Light/Dark mode toggle (client-side)
// — TailwindCSS utility classes (no external UI deps required)
// — Framer Motion micro-animations
// — Ready to drop into a Next.js `app/page.tsx` or `pages/index.tsx`

// NOTE: Ensure Tailwind and lucide-react are installed in your project.
// npm i framer-motion lucide-react

const features = [
  {
    title: "AI Post Studio",
    desc:
      "Turn ideas into scroll-stopping posts. Generate text, images, or full videos in seconds.",
    icon: Sparkles,
    bullets: ["Brand voice tuning", "Image & video prompts", "Hashtag suggestions"],
  },
  {
    title: "Auto Post & Schedule",
    desc:
      "Queue content to all socials at once. Set times, repeat rules, and best-time auto-schedule.",
    icon: CalendarClock,
    bullets: ["Multi-platform queue", "Approval flows", "Time-zone aware"],
  },
  {
    title: "Deep Analytics",
    desc:
      "Track reach, clicks, and engagement across platforms in one clean dashboard.",
    icon: LineChart,
    bullets: ["Engagement by asset type", "Follower growth", "Post-level insights"],
  },
  {
    title: "Secure by Design",
    desc:
      "Enterprise-grade auth, SSO-ready, and token management so your accounts stay safe.",
    icon: ShieldCheck,
    bullets: ["Granular roles", "Audit logs", "OAuth 2.0"],
  },
];

const tiers = [
  {
    name: "Starter",
    price: "Free",
    tagline: "Perfect for individuals",
    features: [
      "1 Workspace",
      "Up to 3 social profiles",
      "10 AI generations/month",
      "Basic analytics",
    ],
    cta: "Get started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19/mo",
    tagline: "For growing teams",
    features: [
      "Unlimited workspaces",
      "Up to 15 social profiles",
      "Unlimited scheduling",
      "Advanced analytics & exports",
      "Brand voice & style presets",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Business",
    price: "Custom",
    tagline: "Security & scale",
    features: [
      "SSO & SCIM",
      "Priority support",
      "Custom roles & approvals",
      "Onboarding & training",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
];

const faqs = [
  {
    q: "Which platforms are supported?",
    a: "Facebook, LinkedIn, X (Twitter), Instagram, YouTube to start—with more added frequently.",
  },
  {
    q: "Do you support video posts?",
    a: "Yes—generate short-form videos with AI, schedule them, and auto-publish when approved.",
  },
  {
    q: "Can I approve posts before they go live?",
    a: "Absolutely. Use built-in approval flows, role permissions, and activity history.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Pro includes a 14-day free trial—no credit card required to start.",
  },
];



function AuroraGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* softly animated gradient orbs */}
      <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full blur-3xl opacity-40 bg-gradient-to-tr from-fuchsia-500 to-cyan-500 dark:opacity-30" />
      <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-40 bg-gradient-to-tr from-indigo-500 to-emerald-500 dark:opacity-30" />
      <div className="absolute left-1/3 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full blur-3xl opacity-30 bg-gradient-to-tr from-amber-500 to-pink-500 dark:opacity-20" />
    </div>
  );
}

function SectionHeading({ eyebrow, title, children }: any) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow && (
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/60 ring-1 ring-zinc-900/5 px-3 py-1 text-xs tracking-wide text-muted-foreground dark:bg-zinc-900/60 dark:ring-white/10">
          <Sparkles className="h-3.5 w-3.5" />
          {eyebrow}
        </div>
      )}
      <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
        {title}
      </h2>
      {children && (
        <p className="mt-3 text-base text-muted-foreground">
          {children}
        </p>
      )}
    </div>
  );
}

function Card({ children, className = "" }: any) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/70 ring-1 ring-black/5 shadow-sm backdrop-blur-md transition-all duration-200 hover:shadow-md hover:bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:ring-white/10 dark:hover:bg-zinc-900/70 ${className}`}
    >
      {/* soft vignette */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background:radial-gradient(900px_200px_at_10%_-20%,rgba(255,255,255,0.8)_0%,rgba(255,255,255,0)_60%)] dark:[background:radial-gradient(900px_200px_at_10%_-20%,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_60%)]" />
      {children}
    </div>
  );
}

// Small animated visuals for feature cards
function BarsViz() {
  // Robust SVG-based bars to ensure consistent rendering across browsers/themes
  const bars = [20, 35, 28, 50]; // heights in SVG units
  return (
    <svg className="mt-5 h-28 w-full" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="barsGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6"/>
          <stop offset="100%" stopColor="#ec4899"/>
        </linearGradient>
      </defs>
      {/* subtle grid */}
      {[10, 25, 40, 55, 70].map((y) => (
        <line key={y} x1="0" x2="120" y1={y} y2={y} className="stroke-black/10 dark:stroke-white/10" strokeWidth="1" />
      ))}
      {bars.map((h, i) => (
        <motion.rect
          key={i}
          x={15 + i * 25}
          width="16"
          rx="3"
          initial={{ height: 0, y: 70, opacity: 0.9 }}
          animate={{ height: h, y: 70 - h, opacity: 1 }}
          transition={{ duration: 0.7, delay: i * 0.15, ease: "easeOut" }}
          fill="url(#barsGrad)"
        />
      ))}
    </svg>
  );
}

function LineViz() {
  return (
    <svg className="mt-5 h-28 w-full" viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee"/>
          <stop offset="100%" stopColor="#6366f1"/>
        </linearGradient>
      </defs>
      <motion.path
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        d="M5 60 C 30 10, 60 70, 90 35 S 155 20, 195 45"
        stroke="url(#lg)" strokeWidth="3" strokeLinecap="round"
      />
      <motion.circle cx="90" cy="35" r="4" fill="#22d3ee" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.6 }} />
      <motion.circle cx="150" cy="25" r="4" fill="#6366f1" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.9 }} />
    </svg>
  );
}

function ScheduleViz() {
  return (
    <div className="mt-5 grid h-28 w-full grid-cols-7 gap-2">
      {[...Array(7)].map((_, day) => (
        <div key={day} className="flex flex-1 items-end gap-1">
          {[...Array(3)].map((__, i) => (
            <motion.div
              key={i}
              initial={{ y: 8, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-20%" }}
              transition={{ duration: 0.4, delay: day * 0.08 + i * 0.04 }}
              className="h-2 w-full rounded-sm bg-emerald-400/80 dark:bg-emerald-500/90"
              style={{ height: `${(i + 1) * 6}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function ShieldPulseViz() {
  return (
    <div className="relative flex h-28 w-full items-center justify-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0.6 }}
        whileInView={{ scale: [0.7, 1.25], opacity: [0.6, 0] }}
        viewport={{ once: false, margin: "-20%" }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        className="absolute h-24 w-24 rounded-full ring-2 ring-emerald-400/40 dark:ring-emerald-400/30"
      />
      <div className="rounded-2xl bg-emerald-500/15 p-3 ring-1 ring-emerald-500/30 backdrop-blur-sm dark:bg-emerald-500/10 dark:ring-emerald-400/30">
        <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
      </div>
    </div>
  );
}
// --- How it works mini previews ---
function StepMockConnect() {
  const brands = ["#1877F2", "#0A66C2", "#000000", "#E4405F", "#FF0000"];
  return (
    <div className="mt-4 rounded-xl bg-white/80 p-3 ring-1 ring-zinc-900/5 backdrop-blur dark:bg-zinc-900/60 dark:ring-white/10">
      <div className="flex items-center justify-between">
        {brands.map((c, i) => (
          <motion.div
            key={i}
            initial={{ y: 8, opacity: 0, scale: 0.9 }}
            whileInView={{ y: 0, opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
            className="relative h-7 w-7 rounded-full shadow-md ring-1 ring-black/5 dark:ring-white/10"
            style={{ backgroundColor: c }}
          >
            <span className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,.6),transparent_40%)]" />
            {i < 2 && (
              <span className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900">
                <Check className="h-2 w-2 text-white" />
              </span>
            )}
          </motion.div>
        ))}
      </div>
      <div className="mt-3 inline-flex items-center gap-2 text-xs">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        <span className="text-muted-foreground">OAuth 2.0 • 60s</span>
      </div>
    </div>
  );
}

function StepMockCompose() {
  return (
    <div className="mt-4 rounded-xl bg-white/80 p-3 ring-1 ring-zinc-900/5 backdrop-blur dark:bg-zinc-900/60 dark:ring-white/10">
      <div className="flex items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-0.5 text-violet-600 ring-1 ring-violet-400/30 dark:text-violet-300">
          <Type className="h-3 w-3" /> Text
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-sky-600 ring-1 ring-sky-400/30 dark:text-sky-300">
          <ImageIcon className="h-3 w-3" /> Image
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-rose-600 ring-1 ring-rose-400/30 dark:text-rose-300">
          <Video className="h-3 w-3" /> Video
        </span>
      </div>
      <div className="mt-2 grid gap-2">
        <div className="h-3 w-3/4 rounded bg-zinc-200/80 dark:bg-zinc-800" />
        <div className="relative h-20 overflow-hidden rounded-xl ring-1 ring-zinc-900/5 dark:ring-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-400/20 via-fuchsia-400/10 to-emerald-400/20" />
          <div className="absolute right-2 bottom-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] text-white">1280×720</div>
        </div>
        <div className="h-3 w-1/2 rounded bg-zinc-200/80 dark:bg-zinc-800" />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 ring-1 ring-emerald-400/30 text-emerald-600 dark:text-emerald-400">#marketing</span>
        <span className="rounded-md bg-sky-500/10 px-2 py-0.5 ring-1 ring-sky-400/30 text-sky-600 dark:text-sky-300">#ai</span>
        <span className="rounded-md bg-fuchsia-500/10 px-2 py-0.5 ring-1 ring-fuchsia-400/30 text-fuchsia-600 dark:text-fuchsia-300">#launch</span>
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 ring-1 ring-emerald-400/30 text-emerald-700 dark:text-emerald-400">
          <Sparkles className="h-3 w-3" /> AI assist
        </span>
      </div>
    </div>
  );
}

function StepMockSchedule() {
  const times = ["9:00", "11:30", "1:00", "2:30", "4:00"];
  const pick = 2;
  return (
    <div className="mt-4 rounded-xl bg-white/80 p-3 ring-1 ring-zinc-900/5 backdrop-blur dark:bg-zinc-900/60 dark:ring-white/10">
      <div className="flex flex-wrap gap-2">
        {times.map((t, i) => (
          <motion.span
            key={t}
            className={`rounded-lg px-2 py-1 text-xs ring-1 ${i === pick ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400" : "text-muted-foreground ring-zinc-900/5 dark:ring-white/10"}`}
            initial={{ y: 6, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
          >
            {t}
          </motion.span>
        ))}
      </div>
      <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <motion.span
          className="absolute left-0 top-0 h-full w-1/2 rounded-full bg-gradient-to-r from-emerald-400 via-fuchsia-400 to-sky-400"
          initial={{ x: "-50%" }}
          whileInView={{ x: "50%" }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <motion.span
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-emerald-500 shadow ring-2 ring-white dark:ring-zinc-900"
          initial={{ left: "20%" }}
          whileInView={{ left: "60%" }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </div>
      <div className="mt-3 inline-flex items-center gap-2 text-xs">
        <CalendarClock className="h-3.5 w-3.5" /> AI suggested time
      </div>
    </div>
  );
}

function StepMockAnalytics() {
  return (
    <div className="mt-4 rounded-xl bg-white/80 p-3 ring-1 ring-zinc-900/5 backdrop-blur dark:bg-zinc-900/60 dark:ring-white/10">
      <svg viewBox="0 0 200 70" className="h-20 w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="howLine" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(99,102,241,0.25)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0.0)" />
          </linearGradient>
        </defs>
        <motion.path
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 1, ease: "easeOut" }}
          d="M5 50 C 35 15, 65 60, 95 30 S 155 15, 195 40"
          stroke="url(#howLine)" strokeWidth="3" strokeLinecap="round"
        />
        <path d="M5 50 C 35 15, 65 60, 95 30 S 155 15, 195 40 L195 70 L5 70 Z" fill="url(#areaFill)" />
        <circle cx="95" cy="30" r="2" fill="#a78bfa" />
        <circle cx="155" cy="15" r="2" fill="#34d399" />
      </svg>
      <div className="-mt-1 text-xs text-muted-foreground">Engagement trending up</div>
    </div>
  );
}


function FeatureCard({ feature }: any) {
  const Icon = feature.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6 h-full">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border p-2 bg-white/70 dark:bg-zinc-950/40 dark:border-zinc-800">
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold">{feature.title}</h3>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{feature.desc}</p>

        <div className="mt-2">
          {feature.title === "AI Post Studio" ? (
            <BarsViz />
          ) : feature.title === "Auto Post & Schedule" ? (
            <ScheduleViz />
          ) : feature.title === "Deep Analytics" ? (
            <LineViz />
          ) : feature.title === "Secure by Design" ? (
            <ShieldPulseViz />
          ) : (
            <BarsViz />
          )}
        </div>

        <ul className="mt-4 space-y-2 text-sm">
          {feature.bullets.map((b: string) => (
            <li key={b} className="flex items-center gap-2">
              <Check className="h-4 w-4" /> {b}
            </li>
          ))}
        </ul>
      </Card>
    </motion.div>
  );
}

function CTAButton({ children, variant = "primary" as "primary" | "ghost", className = "" }: { children: React.ReactNode; variant?: "primary" | "ghost"; className?: string; }) {
  const base =
    "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const styles =
    variant === "primary"
      ? "bg-black text-white hover:bg-black/90 focus:ring-black dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white"
      : "ring-1 ring-zinc-900/5 text-foreground hover:bg-zinc-100/80 dark:ring-white/10 dark:hover:bg-zinc-800/60";
  return (
    <button className={`${base} ${styles} ${className}`}>{children}</button>
  );
}


function IntegrationsCarousel() {
  // Determine dark mode via root class; keep in sync with ThemeToggle
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setDark(root.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (!localStorage.getItem("theme")) update();
    };
    media.addEventListener?.("change", onChange);
    return () => {
      obs.disconnect();
      media.removeEventListener?.("change", onChange);
    };
  }, []);

  // Inline LinkedIn fallback to avoid occasional CDN hiccups
  const LinkedInSVG = ({ className = "h-9 w-9 sm:h-10 sm:w-10" }: { className?: string }) => (
    <svg role="img" viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <title>LinkedIn</title>
      <path fill="#0A66C2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.024-3.037-1.852-3.037-1.853 0-2.136 1.446-2.136 2.941v5.665H9.352V9h3.414v1.561h.049c.476-.9 1.637-1.852 3.368-1.852 3.602 0 4.267 2.369 4.267 5.455v6.288zM5.337 7.433c-1.144 0-2.069-.927-2.069-2.069 0-1.144.925-2.069 2.069-2.069 1.143 0 2.069.925 2.069 2.069 0 1.142-.926 2.069-2.069 2.069zM6.785 20.452H3.89V9h2.896v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.226.792 24 1.771 24h20.451C23.2 24 24 23.226 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );

  // Brand SVGs via Simple Icons CDN (actual logos as SVG). Colors are brand hex.
  const items = [
    { name: "Facebook", slug: "facebook", color: "1877F2", darkColor: "9bbcf7" },
    { name: "LinkedIn", slug: "linkedin", color: "0A66C2", darkColor: "66a0e4" },
    { name: "X (Twitter)", slug: "x", color: "000000", darkColor: "ffffff" },
    { name: "Instagram", slug: "instagram", color: "E4405F", darkColor: "f28aa0" },
    { name: "YouTube", slug: "youtube", color: "FF0000", darkColor: "ff6666" },
    { name: "TikTok", slug: "tiktok", color: "000000", darkColor: "ffffff" },
  ];
  const loop = [...items, ...items, ...items];

  const [centerIdx, setCenterIdx] = useState(Math.floor(loop.length / 2));
  const [paused, setPaused] = useState(false);

  // Stage sizing based on container width
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [stageW, setStageW] = useState(0);
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setStageW(entry.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);
  const clamp = (min: number, val: number, max: number) => Math.max(min, Math.min(val, max));
  // Responsive geometry
  const isXS = stageW < 370;
  const isSM = stageW >= 370 && stageW < 520;
  const visibleCount = isXS ? 3 : isSM ? 5 : 5; // use odd on desktop for true center
  const oddCount = visibleCount % 2 === 0 ? visibleCount + 1 : visibleCount; // ensure a center
  const half = Math.floor(oddCount / 2);
  const cardSize = Math.round(clamp(64, stageW * 0.18, 112));
  const spacing = Math.round(clamp(64, stageW * 0.22, 124));
  const arcHeight = Math.round(clamp(28, stageW * 0.12, 56));
  const stageHeight = Math.round(clamp(150, cardSize * 2.0, 260));

  // Timing controls: smooth move + 1s pause on center
  const transitionMs = 600; // movement duration
  const pauseMs = 1000;     // center hold duration

  // Smooth auto-advance right-to-left; pause on hover/touch
  useEffect(() => {
    if (paused) return;
    const period = transitionMs + pauseMs; // move time + center pause
    const id = setInterval(() => {
      setCenterIdx((i) => (i + 1) % loop.length);
    }, period);
    return () => clearInterval(id);
  }, [paused, loop.length, transitionMs, pauseMs]);

  // Single row only — arrange cards on a clean arc
  const getVisible = () => {
    const arr: any[] = [];
    for (let o = -half; o <= half; o++) {
      const idx = (centerIdx + o + loop.length) % loop.length;
      // Preserve a stable identity per source index for smooth motion
      arr.push({ ...loop[idx], srcIdx: idx });
    }
    return arr.map((item, i) => ({ ...item, o: i - half, key: `one-${i}-${item.slug}` }));
  };

  const row = getVisible();
  const center = row[half];

  const next = () => setCenterIdx((i) => (i + 1) % loop.length);
  const prev = () => setCenterIdx((i) => (i - 1 + loop.length) % loop.length);

  const maxTilt = 10;   // max degrees of outward tilt
  const minScale = 0.86; // scale at the far edges
  const centerPopScale = 1.06; // quick pop when a card becomes center
  const centerPopLift = 6;     // extra upward lift for the center card

  // Local logo image with fallback to initial letter when CDN hiccups
  const LogoImg = ({ slug, color, name }: { slug: string; color: string; name: string }) => {
    const [errored, setErrored] = useState(false);
    if (slug === 'linkedin') {
      return <LinkedInSVG className="h-9 w-9 sm:h-10 sm:w-10 drop-shadow-sm" />;
    }
    if (errored) {
      return (
        <div
          aria-label={name}
          className="grid h-9 w-9 place-items-center rounded-md sm:h-10 sm:w-10"
          style={{ background: `#${color}20`, color: `#${color}` }}
        >
          <span className="text-sm font-semibold leading-none sm:text-base">
            {name.charAt(0)}
          </span>
        </div>
      );
    }
    return (
      <img
        alt={name}
        src={`https://cdn.simpleicons.org/${slug}/${color}`}
        className="h-9 w-9 sm:h-10 sm:w-10 drop-shadow-sm"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setErrored(true)}
      />
    );
  };

  // Touch pause + swipe-to-advance
  const touchStartX = React.useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    const end = e.changedTouches[0].clientX;
    touchStartX.current = null;
    setPaused(false);
    if (start == null) return;
    const dx = end - start;
    const threshold = 30;
    if (Math.abs(dx) > threshold) {
      if (dx < 0) next(); else prev();
    }
  };

  return (
    <div
      className="mx-auto w-full max-w-4xl select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      ref={containerRef}
    >
      <div className="relative">
        {/* Controls */}
        <div className="pointer-events-auto absolute -left-4 top-1/2 -translate-y-1/2 sm:-left-8 hidden sm:block">
          <button onClick={prev} aria-label="Previous" className="rounded-full bg-white/80 p-2 shadow ring-1 ring-zinc-900/5 hover:bg-white dark:bg-zinc-900/70 dark:ring-white/10">
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="pointer-events-auto absolute -right-4 top-1/2 -translate-y-1/2 sm:-right-8 hidden sm:block">
          <button onClick={next} aria-label="Next" className="rounded-full bg-white/80 p-2 shadow ring-1 ring-zinc-900/5 hover:bg-white dark:bg-zinc-900/70 dark:ring-white/10">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Arc-aligned stage with absolute positioning for smooth motion */}
        <div className="relative" style={{ height: stageHeight }}>
          {row.map((item, i) => {
            // If requested even visibleCount, drop the far-left tile so we still render an odd count with a center
            const shouldDropLeft = oddCount !== visibleCount;
            if (shouldDropLeft && i === 0) return null;
            const offset = i - half; // -half..half, left to right
            const d = Math.abs(offset);
            // Parabolic arc for vertical position
            let y = -arcHeight * (1 - Math.pow(d / (half + 0.5), 2));
            // Horizontal spacing to move across the stage (right -> left)
            const xShift = row.length === 7 ? -spacing / 2 : 0; // center 6-visible layout
            const x = offset * spacing + xShift;
            const rotate = offset * (maxTilt / half);
            const scale = 1 - (1 - minScale) * (d / (half + 0.5));
            const opacity = 1 - 0.1 * d;
            const isCenter = d === 0;
            const zIndex = 100 - d;

            if (isCenter) {
              y -= centerPopLift;
            }

            const logoColor = dark ? item.darkColor : item.color;

            return (
              <motion.div
                key={item.srcIdx ?? item.key}
                initial={{ x, y, opacity: 1 }}
                animate={{ x, y, rotate, scale, opacity }}
                transition={{ type: "tween", ease: [0.22, 0.61, 0.36, 1], duration: transitionMs / 1000 }}
                className="group absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white/80 shadow-sm ring-1 ring-zinc-900/5 backdrop-blur grid place-items-center dark:bg-zinc-900/60 dark:ring-white/10"
                style={{ zIndex, boxShadow: isCenter ? "0 10px 30px rgba(0,0,0,0.08)" : "0 6px 16px rgba(0,0,0,0.04)", width: cardSize, height: cardSize }}
              >
                {isCenter ? (
                  <motion.div
                    key={`pulse-${centerIdx}`}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, centerPopScale, 1] }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  >
                    <LogoImg slug={item.slug} color={logoColor} name={item.name} />
                  </motion.div>
                ) : (
                  <div>
                    <LogoImg slug={item.slug} color={logoColor} name={item.name} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Label below the arc, centered */}
        <div className="-mt-10 text-center">
          <motion.div
            key={center.name + centerIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="text-base font-semibold sm:text-lg"
          >
            {center.name}
          </motion.div>
          <div className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">Connect in seconds</div>
        </div>

        {/* Label moved above the arc, so removed from here */}
      </div>
    </div>
  );
}

function Badge({ children }: any) {
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
      {children}
    </span>
  );
}

// Continuous marquee (right -> left) for testimonials with improved card UI
function TestimonialsMarquee({
  testimonials,
  speed = 20,
}: {
  testimonials: Array<{
    author: { name: string; handle?: string; avatar?: string };
    text: string;
    href?: string;
  }>;
  speed?: number; // seconds to traverse half-length
}) {
  const loop = [...testimonials, ...testimonials];
  return (
    <div className="relative overflow-hidden">
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white to-transparent dark:from-zinc-900" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent dark:from-zinc-900" />

      <motion.div
        className="flex w-max gap-3 sm:gap-5 [will-change:transform]"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: speed, ease: "linear", repeat: Infinity }}
      >
        {loop.map((t, i) => (
          <a
            key={`${t.author.name}-${i}`}
            href={t.href || undefined}
            target={t.href ? "_blank" : undefined}
            rel={t.href ? "noreferrer" : undefined}
            className="min-w-[220px] sm:min-w-[260px] md:min-w-[300px] lg:min-w-[320px] max-w-[360px]"
          >
            <div className="h-full rounded-2xl border border-zinc-200/70 bg-white/80 p-4 sm:p-5 ring-1 ring-black/5 shadow-sm backdrop-blur-md transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800/70 dark:bg-zinc-900/60 dark:ring-white/10">
              <div className="flex items-center gap-3">
                <img
                  src={t.author.avatar || "/avatar-fallback.png"}
                  alt={t.author.name}
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-white dark:ring-zinc-800"
                  loading="lazy"
                  decoding="async"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{t.author.name}</div>
                  {t.author.handle && (
                    <div className="text-xs text-muted-foreground truncate">{t.author.handle}</div>
                  )}
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                <span className="mr-1 text-zinc-400">“</span>
                {t.text}
                <span className="ml-1 text-zinc-400">”</span>
              </p>
            </div>
          </a>
        ))}
      </motion.div>
    </div>
  );
}

export default function AuroraLanding() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';

  const [aiGenerating, setAiGenerating] = useState(false);
  const triggerAIGenerate = () => {
    if (aiGenerating) return;
    setAiGenerating(true);
    setTimeout(() => setAiGenerating(false), 2200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-rose-50 to-pink-50 text-zinc-900 antialiased dark:from-zinc-950 dark:to-black dark:text-zinc-100">
      <div className="pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <AuroraGlow />

      {/* Nav */}
      <header className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:py-4 md:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-lg ring-1 ring-zinc-200 dark:ring-zinc-800">
                {/* Logo Image */}
                <img src="/applogo.PNG" alt="Syncrio Logo" className="w-full h-full object-contain" loading="lazy" decoding="async" />
              </div>
              <div className="min-w-0">
                <span className="block truncate text-base sm:text-lg font-semibold tracking-tight">Syncrio</span>
                <div className="truncate text-xs sm:text-sm text-zinc-500">Your AI Powered Social Amplifier</div>
              </div>
            </div>

            <div className="hidden items-center gap-6 md:flex">
              <a className="text-sm text-muted-foreground hover:text-foreground" href="#features">Features</a>
              <a className="text-sm text-muted-foreground hover:text-foreground" href="#how">How it works</a>
              <a className="text-sm text-muted-foreground hover:text-foreground" href="#pricing">Pricing</a>
              <a className="text-sm text-muted-foreground hover:text-foreground" href="#faq">FAQ</a>
            </div>

            <div className="flex items-center gap-2 justify-between w-full sm:w-auto">
              <ThemeToggle className="h-8 w-12 sm:w-16" />

              <Link href="/auth/signin">
                <CTAButton variant="ghost" className="hidden sm:inline-flex">Sign in</CTAButton>
              </Link>

              <Link href="/auth/signup">
                <CTAButton className="px-3 py-1.5 sm:px-4 sm:py-2">
                  <span className="sm:hidden">Start</span>
                  <span className="hidden sm:inline">Get started</span>
                </CTAButton>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 md:px-6 md:pb-20 md:pt-14">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-3xl sm:text-4xl md:text-6xl font-semibold leading-tight"
              >
                Create, schedule & grow with <span className="bg-gradient-to-r from-rose-500 via-purple-600 to-pink-600 bg-clip-text text-transparent">Syncrio</span>
              </motion.h1>
              <p className="mt-4 text-base text-muted-foreground md:text-lg">
                Connect Facebook, LinkedIn, X Youtube, Instagram and more. Use AI to craft posts, images, or videos—then auto-post, schedule, and track engagement in one elegant dashboard.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row ">
                <Link href="/auth/signup">
                  <CTAButton>
                    Start free trial <ArrowRight className="ml-2 h-4 w-4 " />
                  </CTAButton>
                </Link>
                <CTAButton variant="ghost">
                  Watch demo <Play className="ml-2 h-4 w-4" />
                </CTAButton>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <div className="inline-flex items-center gap-2 rounded-xl bg-white/60 ring-1 ring-zinc-900/5 px-3 py-1 dark:bg-zinc-900/60 dark:ring-white/10">
                  <Clock className="h-3.5 w-3.5" /> 14‑day free trial
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl bg-white/60 ring-1 ring-zinc-900/5 px-3 py-1 dark:bg-zinc-900/60 dark:ring-white/10">
                  <ShieldCheck className="h-3.5 w-3.5" /> OAuth 2.0
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl bg-white/60 ring-1 ring-zinc-900/5 px-3 py-1 dark:bg-zinc-900/60 dark:ring-white/10">
                  <Send className="h-3.5 w-3.5" /> Auto‑post & approvals
                </div>
              </div>
            </div>

            {/* Mocked preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.01, rotate: 0.2 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="relative mx-auto max-w-md overflow-hidden p-4 sm:p-5 shadow-2xl">
                {/* decorative orbs */}
                <div aria-hidden className="pointer-events-none absolute -top-10 -left-12 h-28 w-28 rounded-full bg-gradient-to-tr from-fuchsia-500/25 to-cyan-500/25 blur-2xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-12 -right-10 h-32 w-32 rounded-full bg-gradient-to-tr from-indigo-500/25 to-emerald-500/25 blur-2xl" />

                <div className="relative rounded-xl bg-white/80 p-3 shadow-sm ring-1 ring-zinc-900/5 backdrop-blur dark:bg-zinc-900/70 dark:ring-white/10">
                  {/* header */}
                  <div className="flex items-center justify-between">
                    <div className="h-2 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                      <span className="h-2 w-2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                      <span className="h-2 w-2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                    </div>
                  </div>

                  {/* type chips */}
                  <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                    <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-0.5 text-violet-600 ring-1 ring-violet-400/30 dark:text-violet-300">
                      <Type className="h-3 w-3" /> Text
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-sky-600 ring-1 ring-sky-400/30 dark:text-sky-300">
                      <ImageIcon className="h-3 w-3" /> Image
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-rose-600 ring-1 ring-rose-400/30 dark:text-rose-300">
                      <Video className="h-3 w-3" /> Video
                    </span>
                    {/* AI generate button */}
                    <motion.button
                      onClick={triggerAIGenerate}
                      whileTap={{ scale: 0.98 }}
                      whileHover={{ y: -1 }}
                      className="ml-auto inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-400/30 dark:text-emerald-300"
                    >
                      <Sparkles className="h-3 w-3" /> {aiGenerating ? "Generating…" : "Generate with AI"}
                    </motion.button>
                  </div>

                  {/* connected dots */}
                  <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                    <span className="text-muted-foreground">Connected:</span>
                    <span style={{ backgroundColor: "#1877F2" }} className="h-2.5 w-2.5 rounded-full ring-2 ring-white/80 dark:ring-zinc-900" />
                    <span style={{ backgroundColor: "#0A66C2" }} className="h-2.5 w-2.5 rounded-full ring-2 ring-white/80 dark:ring-zinc-900" />
                    <span style={{ backgroundColor: "#000000" }} className="h-2.5 w-2.5 rounded-full ring-2 ring-white/80 dark:ring-zinc-900" />
                  </div>

                  <div className="mt-2 grid gap-3">
                    {/* top-of-page theme toggle moved to header; removed fixed instance */}

                    {/* text lines */}
                    <div className="space-y-1.5">
                      <div className="h-3 w-3/5 rounded bg-zinc-200/90 dark:bg-zinc-800" />
                      <div className="h-3 w-2/3 rounded bg-zinc-200/70 dark:bg-zinc-800" />
                    </div>

                    {/* image canvas with animated gradient border */}
                    <div className="relative rounded-xl p-[1px] bg-gradient-to-r from-violet-400/60 via-fuchsia-400/60 to-sky-400/60">
                      <div className="relative h-28 w-full overflow-hidden rounded-[10px] ring-1 ring-zinc-900/5 dark:ring-white/10">
                        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/25 via-fuchsia-500/15 to-emerald-400/25" />
                        <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.7)_1px,transparent_1.2px)] [background-size:16px_16px]" />

                        {/* AI generating overlay */}
                        {aiGenerating && (
                          <div className="absolute inset-0 grid place-items-center bg-white/60 backdrop-blur-sm dark:bg-zinc-900/60">
                            <motion.div
                              className="h-10 w-10 rounded-full border-2 border-fuchsia-400/70 border-t-transparent"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            <span className="absolute bottom-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white">Generating…</span>
                          </div>
                        )}

                        <motion.span
                          className="absolute inset-y-0 -left-1/3 w-1/3 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,.5),transparent)]"
                          initial={{ x: "-100%" }}
                          animate={{ x: "200%" }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <span className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white">AI</span>
                        <span className="absolute right-2 bottom-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white">1280×720</span>
                      </div>
                    </div>

                    {/* video timeline */}
                    <div className="relative h-10 w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                      <svg viewBox="0 0 200 40" className="absolute inset-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="wave" x1="0" x2="200" y1="0" y2="0" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#a78bfa" />
                            <stop offset="100%" stopColor="#38bdf8" />
                          </linearGradient>
                        </defs>
                        <motion.path
                          d="M0 20 Q 10 5 20 20 T 40 20 T 60 20 T 80 20 T 100 20 T 120 20 T 140 20 T 160 20 T 180 20 T 200 20"
                          stroke="url(#wave)" strokeWidth="2" strokeLinecap="round" fill="none" strokeDasharray="4 6"
                          animate={{ strokeDashoffset: -20 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        />
                      </svg>
                      <motion.span
                        className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-violet-400 shadow ring-2 ring-white dark:ring-zinc-900"
                        initial={{ left: "10%" }}
                        animate={{ left: "70%" }}
                        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                      />
                    </div>

                    {/* footer */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="h-3 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
                      <div className="flex gap-2">
                        <button className="rounded-lg ring-1 ring-zinc-900/5 px-3 py-1 text-xs dark:ring-white/10">Draft</button>
                        <button className="rounded-lg bg-black px-3 py-1 text-xs text-white dark:bg-white dark:text-black">Schedule</button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Integrations */}
          <div className="mt-14">
            <p className="mb-10 text-center text-xl sm:text-2xl font-bold uppercase tracking-wider text-muted-foreground">
              Connect your social accounts
            </p>
            <div className="mx-auto max-w-5xl pt-2">
              <IntegrationsCarousel />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 -mt-8 bg-gradient-to-b from-transparent via-zinc-50/50 to-transparent dark:via-zinc-900/50">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading eyebrow="Features" title="Everything you need to grow">
            Craft content with AI, schedule across platforms, and understand what performs—without the busywork.
          </SectionHeading>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
            {features.map((f) => (
              <FeatureCard key={f.title} feature={f} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 py-14">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading eyebrow="Workflow" title="How it works — a quick preview" />

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-4 sm:gap-6">
            {[{
              icon: Zap, title: "Connect accounts", desc: "Link Facebook, LinkedIn, X, Instagram, YouTube in seconds.", preview: <StepMockConnect />,
            }, {
              icon: Sparkles, title: "Compose with AI", desc: "Write or generate posts, add images or short videos.", preview: <StepMockCompose />,
            }, {
              icon: CalendarClock, title: "Schedule (AI times)", desc: "Pick a slot or accept AI’s best time.", preview: <StepMockSchedule />,
            }, {
              icon: LineChart, title: "See analytics", desc: "Track reach, clicks and engagement in one place.", preview: <StepMockAnalytics />,
            }].map(({ icon: Icon, title, desc, preview }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
              >
                <Card className="h-full p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl p-2 bg-gradient-to-br from-white to-zinc-50 shadow-sm transition-all duration-200 group-hover:shadow-md dark:from-zinc-800 dark:to-zinc-900">
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-zinc-700 dark:text-zinc-300" />
                    </div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{desc}</p>
                  {preview}
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      

      {/* Testimonials */}
      <section className="relative z-10 py-5 mb-10">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-4">
            <SectionHeading eyebrow="Loved by creators" title="What teams say">
              Real feedback from teams using Syncrio to create, schedule, and grow faster.
            </SectionHeading>
          </div>
          <div className="mt-0 mb-0">
            {/* Continuous right-to-left marquee with improved cards */}
            <TestimonialsMarquee
              testimonials={[
                {
                  author: {
                    name: "Emma Thompson",
                    handle: "@emmaai",
                    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
                  },
                  text:
                    "Using this AI platform has transformed how we handle data analysis. The speed and accuracy are unprecedented.",
                  href: "https://twitter.com/emmaai",
                },
                {
                  author: {
                    name: "David Park",
                    handle: "@davidtech",
                    avatar:
                      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
                  },
                  text:
                    "The API integration is flawless. We've reduced our development time by 60% since implementing this solution.",
                  href: "https://twitter.com/davidtech",
                },
                {
                  author: {
                    name: "Sofia Rodriguez",
                    handle: "@sofiaml",
                    avatar:
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
                  },
                  text:
                    "Finally, an AI tool that actually understands context! The accuracy in natural language processing is impressive.",
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 -mt-10  dark:border-zinc-900">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading eyebrow="Pricing" title="Flexible plans for every stage">
            Start free, upgrade when you’re ready. Cancel anytime.
          </SectionHeading>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3 sm:gap-6">
            {tiers.map((t) => (
              <Card
                key={t.name}
                className={`p-4 sm:p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${
                  t.highlighted ? "ring-2 ring-rose-400/50 dark:ring-rose-500/40" : ""
                }`}
              >
                {/* top accent bar */}
                <div
                  className={`h-1 rounded-full ${
                    t.highlighted
                      ? "bg-gradient-to-r from-rose-500 to-pink-500"
                      : "bg-gradient-to-r from-zinc-200/70 to-zinc-100/50 dark:from-zinc-800/50 dark:to-zinc-700/40"
                  }`}
                />
                <div className="mt-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{t.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
                  </div>
                  {t.highlighted && <Badge>Most popular</Badge>}
                </div>
                <div className="mt-5 text-3xl font-semibold">{t.price}</div>
                <ul className="mt-5 space-y-2 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" /> {f}
                    </li>
                  ))}
                </ul>
                <CTAButton className={`mt-6 w-full ${t.highlighted ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600" : ""}`}>
                  {t.cta}
                </CTAButton>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative mt-10 z-10 bg-gradient-to-b from-transparent via-zinc-50/50 to-transparent dark:via-zinc-900/50">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <SectionHeading eyebrow="FAQ" title="Common questions" />
          <div className="mt-10 divide-y divide-zinc-100/30 rounded-2xl bg-white/70 shadow-sm backdrop-blur-md transition-all duration-200 hover:shadow-md dark:divide-zinc-800/30 dark:bg-zinc-900/60">
            {faqs.map((item, idx) => (
              <details key={idx} className="group px-6 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between">
                  <span className="text-sm font-medium">{item.q}</span>
                  <span className="ml-4 rounded-full border p-1 text-xs opacity-70 transition group-open:rotate-45 dark:border-zinc-800">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="relative z-10 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center md:px-6">
          <h3 className="text-xl sm:text-2xl font-semibold md:text-3xl">Ready to grow your social presence?</h3>
          <p className="mt-3 text-sm text-muted-foreground">
            Start creating with AI, schedule across platforms, and track results in minutes.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/auth/signup">
              <CTAButton>Start free trial</CTAButton>
            </Link>
            <CTAButton variant="ghost">Book a demo</CTAButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-10 text-sm bg-gradient-to-b from-transparent to-zinc-50/50 dark:to-zinc-900/50">
<div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-2 md:px-6">
  <div>
    <div className="flex items-center gap-3">
      {/* Logo Image instead of gradient background */}
      <div className="relative h-7 w-7 sm:h-8 sm:w-8 overflow-hidden rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
        <img src="/applogo.png" alt="Syncrio Logo" className="w-full h-full object-contain" loading="lazy" decoding="async" />
      </div>
      <span className="text-lg font-semibold tracking-tight">
        Syncrio
      </span>
    </div>
            <p className="mt-3 max-w-md text-muted-foreground">
              © {new Date().getFullYear()} Syncrio Labs, Inc. All rights reserved.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div>
              <div className="mb-2 font-medium">Product</div>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
                <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
              </ul>
            </div>
            <div>
              <div className="mb-2 font-medium">Company</div>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Careers</a></li>
                <li><a href="#" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>
            <div>
              <div className="mb-2 font-medium">Legal</div>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms</a></li>
                <li><a href="#" className="hover:text-foreground">Security</a></li>
              </ul>
            </div>
            <div>
              <div className="mb-2 font-medium">Resources</div>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Docs</a></li>
                <li><a href="#" className="hover:text-foreground">Guides</a></li>
                <li><a href="#" className="hover:text-foreground">Status</a></li>
              </ul>
            </div>
          </div>
    </div>
      </footer>
    </div>
    </div>
  );
}
