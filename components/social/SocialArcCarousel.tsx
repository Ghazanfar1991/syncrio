"use client";
import React from "react";

type ArcCarouselProps = {
  children: React.ReactNode;
  // Milliseconds the center card stays before shifting
  pauseMs?: number;
  // Milliseconds for each move transition
  transitionMs?: number;
  // Pixel radius of the arc path (desktop baseline)
  radius?: number;
  // Max number of visible cards (odd number recommended)
  visible?: number;
  // Optional className for the outer wrapper
  className?: string;
};

// Utility to rotate an array by n positions
function rotate<T>(arr: T[], n: number): T[] {
  const len = arr.length;
  if (len === 0) return arr;
  const k = ((n % len) + len) % len;
  return arr.slice(k).concat(arr.slice(0, k));
}

export default function SocialArcCarousel({
  children,
  pauseMs = 1000,
  transitionMs = 600,
  radius = 140,
  visible = 5,
  className = "",
}: ArcCarouselProps) {
  const items = React.Children.toArray(children);
  const count = items.length;

  // Nothing to animate with fewer than 2 items
  if (count <= 1) {
    return <div className={className}>{children}</div>;
  }

  const [offset, setOffset] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  // Track container width to derive responsive geometry
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerW, setContainerW] = React.useState(0);
  React.useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerW(entry.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Auto-advance with a center pause, pausable
  React.useEffect(() => {
    if (paused) return;
    let timer: number | undefined;
    const totalDelay = transitionMs + pauseMs; // movement + center pause
    timer = window.setTimeout(() => {
      setOffset((prev) => prev + 1);
    }, totalDelay);
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [offset, transitionMs, pauseMs, paused]);

  // Responsive derived values
  const clamp = (min: number, val: number, max: number) => Math.max(min, Math.min(val, max));
  const effVisibleBase = React.useMemo(() => {
    if (containerW < 360) return Math.min(3, count);
    if (containerW < 640) return Math.min(5, count);
    return Math.min(visible, count);
  }, [containerW, count, visible]);
  const visBase = Math.max(3, effVisibleBase);
  const vis = visBase % 2 === 0 ? visBase - 1 : visBase;
  const midIndex = Math.floor(vis / 2);

  const effRadius = React.useMemo(() => {
    if (containerW < 360) return Math.max(70, Math.round(radius * 0.6));
    if (containerW < 640) return Math.max(100, Math.round(radius * 0.85));
    return radius;
  }, [containerW, radius]);
  const stageHeight = React.useMemo(() => {
    const base = Math.round(effRadius * 1.6);
    if (containerW < 360) return clamp(180, base, 240);
    if (containerW < 640) return clamp(220, base, 280);
    return clamp(260, Math.round(effRadius * 1.8), 340);
  }, [containerW, effRadius]);

  // Angles for visible slots across an arc (in degrees), left to right
  const angles = React.useMemo(() => {
    // Map indices 0..vis-1 to range [-1, 1]
    const arr: number[] = [];
    for (let i = 0; i < vis; i++) {
      const t = (i - midIndex) / midIndex; // -1..1
      // Gentle curve: theta = t * 25 deg
      const theta = t * 25;
      arr.push(theta);
    }
    return arr;
  }, [vis, midIndex]);

  // Determine slice of items to render and their positions
  const rotated = rotate(items, offset);
  const visibleItems = rotated.slice(0, vis);

  // Touch gestures to manually advance
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
      // swipe right -> previous, swipe left -> next
      setOffset((prev) => prev + (dx < 0 ? 1 : -1));
    }
  };

  return (
    <div
      ref={containerRef}
      className={"relative w-full overflow-hidden min-h-[200px] sm:min-h-[240px] " + className}
      style={{ height: stageHeight }}
      role="region"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {visibleItems.map((node, i) => {
          // Convert angle to position along an arc
          const thetaRad = (angles[i] * Math.PI) / 180;
          const x = Math.cos(thetaRad) * effRadius;
          const y = -Math.sin(thetaRad) * effRadius; // negative to arc upward

          // Scale and zIndex based on proximity to center
          const distFromMid = Math.abs(i - midIndex);
          const scale = 1 - distFromMid * 0.08;
          const zIndex = 100 - distFromMid;
          const opacity = 1 - distFromMid * 0.08;

          const style: React.CSSProperties = {
            transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
            transition: `transform ${transitionMs}ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity ${transitionMs}ms ease`,
            opacity,
            zIndex,
            position: "absolute",
            willChange: "transform, opacity",
          };

          return (
            <div key={(node as any)?.key ?? i} style={style}>
              <div className="pointer-events-auto">{node}</div>
            </div>
          );
        })}
      </div>

      {/* Optional: subtle ground shadow to enhance arc perception */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-4/5 md:w-3/5 h-5 md:h-6 rounded-full bg-black/10 blur-xl" />
    </div>
  );
}

