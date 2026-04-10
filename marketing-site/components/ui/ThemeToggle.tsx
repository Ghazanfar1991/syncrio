"use client";
import React from "react";
import { motion } from "framer-motion";

type Props = {
  className?: string;
};

export default function ThemeToggle({ className = "" }: Props) {
  const [mounted, setMounted] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);

  // Initialize from localStorage or system preference
  React.useEffect(() => {
    const root = document.documentElement;
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialDark = stored ? stored === "dark" : prefersDark;
    setIsDark(initialDark);
    root.classList.toggle("dark", initialDark);
    setMounted(true);

    // Sync when system preference changes
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      const storedTheme = localStorage.getItem("theme");
      if (!storedTheme) {
        setIsDark(e.matches);
        root.classList.toggle("dark", e.matches);
      }
    };
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    const root = document.documentElement;
    root.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      role="switch"
      aria-checked={isDark}
      className={
        "group relative inline-flex h-9 w-16 items-center rounded-full " +
        "bg-gradient-to-r from-zinc-100 to-zinc-200 p-[3px] shadow-sm ring-1 ring-black/10 " +
        "transition-colors duration-300 ease-out hover:shadow " +
        "dark:from-zinc-800 dark:to-zinc-700 dark:ring-white/10 " + className
      }
    >
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.6),transparent_50%)] dark:bg-[radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.08),transparent_50%)]" />

      {/* Track fill */}
      <motion.div
        aria-hidden
        className="absolute inset-[3px] rounded-full bg-white/70 dark:bg-black/40"
        initial={false}
        animate={{ backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.7)" }}
        transition={{ duration: 0.3 }}
      />

      {/* Icons */}
      <div className="relative z-10 flex w-full items-center justify-between px-2">
        <SunIcon className={"h-4 w-4 " + (isDark ? "opacity-40" : "opacity-100 text-amber-500")} />
        <MoonIcon className={"h-4 w-4 " + (isDark ? "opacity-100 text-sky-300" : "opacity-40")} />
      </div>

      {/* Knob */}
      <motion.div
        layout
        className="absolute z-20 h-7 w-7 rounded-full bg-white shadow-md ring-1 ring-black/10 dark:bg-zinc-900 dark:ring-white/10"
        initial={false}
        animate={{ left: isDark ? 34 : 3 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
      >
        {/* Inner sheen */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.9),transparent_40%)] dark:bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08),transparent_50%)]" />
      </motion.div>

      {/* Prevent hydration flicker */}
      {!mounted && (
        <div className="absolute inset-0 rounded-full" />
      )}
    </button>
  );
}

function SunIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 4.5a1 1 0 0 1 1 1V7a1 1 0 1 1-2 0V5.5a1 1 0 0 1 1-1ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7ZM4.5 13a1 1 0 1 1 0-2H6a1 1 0 1 1 0 2H4.5Zm13.5 0a1 1 0 1 1 0-2h1.5a1 1 0 1 1 0 2H18ZM7.05 7.05a1 1 0 0 1 1.41 0l1.06 1.06a1 1 0 1 1-1.41 1.41L7.05 8.46a1 1 0 0 1 0-1.41Zm7.43 7.43a1 1 0 0 1 1.41 0l1.06 1.06a1 1 0 1 1-1.41 1.41l-1.06-1.06a1 1 0 0 1 0-1.41ZM7.05 16.95a1 1 0 0 1 1.41 0l1.06-1.06a1 1 0 1 1 1.41 1.41L9.87 18.36a1 1 0 0 1-1.41 0l-1.41-1.41Zm9.9-9.9a1 1 0 0 1 1.41 0l-1.06 1.06a1 1 0 0 1-1.41-1.41l1.06-1.06Z" />
    </svg>
  );
}

function MoonIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}
