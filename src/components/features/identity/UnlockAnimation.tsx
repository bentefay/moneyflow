/**
 * UnlockAnimation Component
 *
 * Orchestrates the unlock animation sequence:
 * 1. Circle fades inner content via mask
 * 2. Aurora ring expands outward from circle
 * 3. Reveals the app behind it
 *
 * Features:
 * - Multi-stage animation timing
 * - Smooth content transition
 * - Callback when animation completes
 * - Can be triggered programmatically
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type UnlockAnimationStage =
	| "idle" // Waiting to start
	| "fading" // Inner circle fading
	| "expanding" // Aurora ring expanding
	| "revealing" // Fade out overlay
	| "complete"; // Animation done

export interface UnlockAnimationProps {
	/** Whether to trigger the animation */
	isUnlocking: boolean;

	/** Called when animation completes */
	onComplete?: () => void;

	/** Duration of each stage in ms */
	stageDurations?: {
		fading?: number;
		expanding?: number;
		revealing?: number;
	};

	/** Children (the unlock circle) */
	children?: React.ReactNode;

	/** Additional className */
	className?: string;
}

// ============================================================================
// Default durations
// ============================================================================

const defaultDurations = {
	fading: 400,
	expanding: 800,
	revealing: 500,
};

// ============================================================================
// Component
// ============================================================================

export function UnlockAnimation({
	isUnlocking,
	onComplete,
	stageDurations = {},
	children,
	className,
}: UnlockAnimationProps) {
	const [stage, setStage] = useState<UnlockAnimationStage>("idle");
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	const durations = {
		...defaultDurations,
		...stageDurations,
	};

	// -------------------------------------------------------------------------
	// Animation sequence
	// -------------------------------------------------------------------------

	const runAnimation = useCallback(() => {
		// Stage 1: Fade inner content
		setStage("fading");

		timeoutRef.current = setTimeout(() => {
			// Stage 2: Expand aurora ring
			setStage("expanding");

			timeoutRef.current = setTimeout(() => {
				// Stage 3: Reveal app
				setStage("revealing");

				timeoutRef.current = setTimeout(() => {
					// Complete
					setStage("complete");
					onComplete?.();
				}, durations.revealing);
			}, durations.expanding);
		}, durations.fading);
	}, [durations, onComplete]);

	// Start animation when isUnlocking becomes true
	useEffect(() => {
		if (isUnlocking && stage === "idle") {
			runAnimation();
		}
	}, [isUnlocking, stage, runAnimation]);

	// Cleanup timeouts
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	// -------------------------------------------------------------------------
	// Stage-based styles
	// -------------------------------------------------------------------------

	const getCircleStyles = () => {
		switch (stage) {
			case "fading":
				return "opacity-70 scale-95";
			case "expanding":
				return "opacity-0 scale-[3]";
			case "revealing":
			case "complete":
				return "opacity-0 scale-[3] pointer-events-none";
			default:
				return "opacity-100 scale-100";
		}
	};

	const getAuroraRingStyles = () => {
		switch (stage) {
			case "expanding":
				return "opacity-100 scale-[2.5]";
			case "revealing":
				return "opacity-0 scale-[3]";
			case "complete":
				return "opacity-0 scale-[3] pointer-events-none";
			default:
				return "opacity-0 scale-100";
		}
	};

	const getOverlayStyles = () => {
		switch (stage) {
			case "revealing":
			case "complete":
				return "opacity-0 pointer-events-none";
			default:
				return "opacity-100";
		}
	};

	// -------------------------------------------------------------------------
	// Render
	// -------------------------------------------------------------------------

	if (stage === "complete") {
		return null;
	}

	return (
		<div
			className={cn(
				"fixed inset-0 z-50 flex items-center justify-center",
				"transition-opacity duration-500",
				getOverlayStyles(),
				className
			)}
		>
			{/* Aurora ring that expands */}
			<div
				className={cn(
					"absolute h-[40rem] w-[40rem] rounded-full",
					"bg-gradient-to-br from-emerald-500/40 via-teal-500/30 to-cyan-500/40",
					"blur-2xl",
					"transition-all ease-out",
					getAuroraRingStyles()
				)}
				style={{
					transitionDuration: `${durations.expanding}ms`,
				}}
				aria-hidden="true"
			/>

			{/* Circle container with content */}
			<div
				className={cn("relative z-10", "transition-all ease-out", getCircleStyles())}
				style={{
					transitionDuration:
						stage === "fading" ? `${durations.fading}ms` : `${durations.expanding}ms`,
				}}
			>
				{children}
			</div>

			{/* Success particles (optional visual flair) */}
			{(stage === "expanding" || stage === "revealing") && (
				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					{Array.from({ length: 12 }).map((_, i) => (
						<div
							key={i}
							className={cn(
								"absolute top-1/2 left-1/2 h-2 w-2 rounded-full",
								"bg-emerald-400/60",
								"animate-[particle-burst_1s_ease-out_forwards]"
							)}
							style={{
								transform: `rotate(${i * 30}deg) translateX(0)`,
								animationDelay: `${i * 50}ms`,
							}}
						/>
					))}
				</div>
			)}
		</div>
	);
}

// Add particle burst keyframes to globals.css if needed:
// @keyframes particle-burst {
//   0% { transform: rotate(var(--angle)) translateX(0); opacity: 1; }
//   100% { transform: rotate(var(--angle)) translateX(200px); opacity: 0; }
// }
