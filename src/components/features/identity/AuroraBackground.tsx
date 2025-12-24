/**
 * AuroraBackground Component
 *
 * Animated aurora borealis gradient background.
 * Used as the unlock screen background with ethereal, flowing colors.
 *
 * Features:
 * - Multi-layer gradient animation
 * - Smooth color transitions (greens, blues, purples)
 * - Subtle movement that doesn't distract
 * - Respects reduced-motion preferences
 * - Can wrap content or be absolute positioned
 */

"use client";

import { useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface AuroraBackgroundProps {
  /** Children to render on top of the aurora */
  children?: React.ReactNode;

  /** Whether the aurora is actively animating */
  isAnimating?: boolean;

  /** Intensity of the animation (0-1) */
  intensity?: number;

  /** Color scheme variant */
  variant?: "default" | "success" | "unlocking";

  /** Additional className */
  className?: string;

  /** Container className (the wrapper div) */
  containerClassName?: string;
}

// ============================================================================
// Color schemes
// ============================================================================

const colorSchemes = {
  default: {
    // Calm aurora: greens and blues
    colors: [
      "from-emerald-500/30 via-teal-500/20 to-cyan-500/30",
      "from-cyan-500/20 via-blue-500/25 to-indigo-500/20",
      "from-teal-500/25 via-emerald-500/30 to-green-500/20",
    ],
    blurAmount: "blur-3xl",
  },
  success: {
    // Success: brighter greens
    colors: [
      "from-green-400/40 via-emerald-400/35 to-teal-400/40",
      "from-emerald-400/35 via-green-500/40 to-lime-400/30",
      "from-teal-400/30 via-cyan-400/25 to-emerald-400/35",
    ],
    blurAmount: "blur-3xl",
  },
  unlocking: {
    // Unlocking: transitioning to brighter
    colors: [
      "from-emerald-400/35 via-teal-500/30 to-cyan-400/35",
      "from-cyan-400/30 via-blue-400/35 to-indigo-400/30",
      "from-teal-400/35 via-emerald-400/40 to-green-400/35",
    ],
    blurAmount: "blur-2xl",
  },
};

// ============================================================================
// Component
// ============================================================================

export function AuroraBackground({
  children,
  isAnimating = true,
  intensity = 0.7,
  variant = "default",
  className,
  containerClassName,
}: AuroraBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Get color scheme
  const scheme = colorSchemes[variant];

  // Animation duration based on intensity
  const animationDuration = useMemo(() => {
    const base = 20; // seconds
    return base / Math.max(intensity, 0.1);
  }, [intensity]);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches && containerRef.current) {
      // Disable animations for users who prefer reduced motion
      containerRef.current.style.setProperty("--aurora-animation", "none");
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "bg-background relative min-h-screen w-full overflow-hidden",
        containerClassName
      )}
    >
      {/* Aurora layers */}
      <div
        className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
        aria-hidden="true"
      >
        {/* Layer 1: Primary aurora wave */}
        <div
          className={cn(
            "absolute -top-1/4 -left-1/4 h-[150%] w-[150%]",
            "bg-gradient-to-br",
            scheme.colors[0],
            scheme.blurAmount,
            isAnimating && "animate-aurora-1"
          )}
          style={{
            animationDuration: `${animationDuration}s`,
            opacity: intensity,
          }}
        />

        {/* Layer 2: Secondary aurora wave (offset timing) */}
        <div
          className={cn(
            "absolute -top-1/4 -right-1/4 h-[150%] w-[150%]",
            "bg-gradient-to-bl",
            scheme.colors[1],
            scheme.blurAmount,
            isAnimating && "animate-aurora-2"
          )}
          style={{
            animationDuration: `${animationDuration * 1.3}s`,
            opacity: intensity * 0.8,
          }}
        />

        {/* Layer 3: Tertiary aurora wave (different direction) */}
        <div
          className={cn(
            "absolute -bottom-1/4 -left-1/4 h-[150%] w-[150%]",
            "bg-gradient-to-tr",
            scheme.colors[2],
            scheme.blurAmount,
            isAnimating && "animate-aurora-3"
          )}
          style={{
            animationDuration: `${animationDuration * 0.9}s`,
            opacity: intensity * 0.6,
          }}
        />

        {/* Subtle noise overlay for texture */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
