/**
 * AuroraBackground Component
 *
 * Animated aurora background with multiple rotating oval gradients.
 * Creates organic, flowing aurora effect around the central unlock circle.
 */

"use client";

import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface AuroraBackgroundProps {
	children?: React.ReactNode;
	isAnimating?: boolean;
	intensity?: number;
	variant?: "default" | "success" | "unlocking";
	className?: string;
	containerClassName?: string;
}

// ============================================================================
// Ribbon configurations - deterministic to avoid hydration errors
// ============================================================================

const ribbons = Array.from({ length: 36 }, (_, i) => {
	const isHorizontal = i % 2 === 0;
	// Use simple deterministic math based on index
	const variation = ((i * 7) % 20) / 20; // 0-1 range, deterministic
	const w = isHorizontal ? 35 + variation * 20 : 5 + variation * 6;
	const h = isHorizontal ? 5 + variation * 6 : 35 + variation * 20;

	return {
		w: w * 0.8,
		h: h * 0.8,
		duration: 50 + ((i * 13) % 50), // 50-100 seconds
		breathe: 2 + ((i * 3) % 5), // 2-7 seconds
		delay: -(i / 36) * 17, // Evenly spaced
		opacity: 0.45 + ((i * 11) % 25) / 100, // 0.45-0.7
		reverse: (i * 17) % 3 === 0, // ~1/3 rotate in opposite direction
	};
});

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

	// Colors based on variant - 30 colors for ribbons
	const colors = useMemo(() => {
		const base = (() => {
			switch (variant) {
				case "success":
					return [
						"#22c55e",
						"#10b981",
						"#14b8a6",
						"#06b6d4",
						"#22d3ee",
						"#34d399",
						"#4ade80",
						"#2dd4bf",
						"#a7f3d0",
						"#6ee7b7",
					];
				case "unlocking":
					return [
						"#10b981",
						"#14b8a6",
						"#06b6d4",
						"#22c55e",
						"#0ea5e9",
						"#2dd4bf",
						"#34d399",
						"#22d3ee",
						"#5eead4",
						"#99f6e4",
					];
				default:
					return [
						"#14b8a6",
						"#06b6d4",
						"#10b981",
						"#0ea5e9",
						"#22d3ee",
						"#2dd4bf",
						"#34d399",
						"#0891b2",
						"#5eead4",
						"#67e8f9",
					];
			}
		})();
		// Triple the colors array for 30 ribbons
		return [...base, ...base, ...base];
	}, [variant]);

	// Check for reduced motion preference
	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		if (mediaQuery.matches && containerRef.current) {
			const divs = containerRef.current.querySelectorAll("[data-aurora-oval]");
			divs.forEach((div) => {
				(div as HTMLElement).style.animationPlayState = "paused";
			});
		}
	}, []);

	return (
		<div
			ref={containerRef}
			className={cn("relative min-h-screen w-full overflow-hidden", containerClassName)}
		>
			{/* Base background */}
			<div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900" />

			{/* Aurora ribbons container - reduced blur for distinct bands */}
			<div
				className={cn(
					"pointer-events-none absolute inset-0 flex items-center justify-center",
					className
				)}
				aria-hidden="true"
				style={{ filter: "blur(30px)" }}
			>
				{ribbons.map((ribbon, i) => (
					<div
						key={i}
						data-aurora-oval
						className="absolute"
						style={{
							width: `${Math.round(ribbon.w * 100) / 100}%`,
							height: `${Math.round(ribbon.h * 100) / 100}%`,
							background: `linear-gradient(${ribbon.w > ribbon.h ? "90deg" : "0deg"}, transparent 0%, ${colors[i % colors.length]} 20%, ${colors[i % colors.length]} 80%, transparent 100%)`,
							opacity: ribbon.opacity * intensity,
							animation: isAnimating
								? `${ribbon.reverse ? "aurora-spin-reverse" : "aurora-spin"} ${ribbon.duration}s linear infinite, aurora-breathe ${ribbon.breathe}s ease-in-out infinite`
								: "none",
							animationDelay: `${ribbon.delay}s, ${ribbon.delay * 0.7}s`,
							transformOrigin: "center center",
						}}
					/>
				))}

				{/* Center glow */}
				<div
					className="absolute top-1/2 left-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2"
					style={{
						background: `radial-gradient(circle at center, ${colors[0]}50 0%, transparent 50%)`,
						opacity: intensity * 0.6,
					}}
				/>
			</div>

			{/* Content */}
			<div className="relative z-10">{children}</div>
		</div>
	);
}
