"use client";
import React from "react";

type ArcCarouselProps = {
  children: React.ReactNode;
  // Milliseconds the center card stays before shifting
  pauseMs?: number;
  // Milliseconds for each move transition
  transitionMs?: number;
  // Pixel radius of the arc path
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

  // Constrain visible to an odd number between 3 and count
  const visBase = Math.max(3, Math.min(visible, count));
  const vis = visBase % 2 === 0 ? visBase - 1 : visBase;
  const midIndex = Math.floor(vis / 2);

  const [offset, setOffset] = React.useState(0);
  const [animating, setAnimating] = React.useState(true);

  // Auto-advance with a center pause
  React.useEffect(() => {
    let timer: number | undefined;
    function scheduleNext() {
      // Wait for the movement to complete plus the center pause
      const totalDelay = transitionMs + pauseMs;
      timer = window.setTimeout(() => {
        setAnimating(true);
        setOffset((prev) => prev + 1);
      }, totalDelay);
    }
    scheduleNext();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [offset, transitionMs, pauseMs]);

  // Angles for visible slots across an arc (in degrees), left to right
  // Wider at edges, higher near the center for a smooth arc shape
  const angles = React.useMemo(() => {
    // Map indices 0..vis-1 to range [-1, 1]
    const arr: number[] = [];
    for (let i = 0; i < vis; i++) {
      const t = (i - midIndex) / midIndex; // -1..1
      // Convert to angle: more curve at edges, max at center
      // Use a gentle curve: theta = t * 25 deg
      const theta = t * 25;
      arr.push(theta);
    }
    return arr;
  }, [vis, midIndex]);

  // Determine slice of items to render and their positions
  const rotated = rotate(items, offset);
  const visibleItems = rotated.slice(0, vis);

  return (
    <div className={"relative w-full h-[300px] overflow-hidden " + className}>
      <div className="absolute inset-0 flex items-center justify-center">
        {visibleItems.map((node, i) => {
          // Convert angle to position along an arc
          const thetaRad = (angles[i] * Math.PI) / 180;
          const x = Math.cos(thetaRad) * radius;
          const y = -Math.sin(thetaRad) * radius; // negative to arc upward

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
              <div className="pointer-events-auto">
                {node}
              </div>
            </div>
          );
        })}
      </div>

      {/* Optional: subtle ground shadow to enhance arc perception */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/5 h-6 rounded-full bg-black/10 blur-xl" />
    </div>
  );
}

