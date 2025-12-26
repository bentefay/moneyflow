/**
 * Unlock Page
 *
 * Unlock flow for returning users:
 * 1. Show aurora background with unlock circle
 * 2. User enters seed phrase
 * 3. Validate and derive keys
 * 4. Play unlock animation
 * 5. Redirect to dashboard
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuroraBackground, UnlockCircle, UnlockAnimation } from "@/components/features/identity";
import { useIdentity } from "@/hooks";

// ============================================================================
// Component
// ============================================================================

export default function UnlockPage() {
  const router = useRouter();
  const { status, unlock, error, clearError } = useIdentity();

  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  // -------------------------------------------------------------------------
  // Redirect if already unlocked
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (status === "unlocked" && !showAnimation) {
      router.replace("/dashboard");
    }
  }, [status, showAnimation, router]);

  // -------------------------------------------------------------------------
  // Handle unlock
  // -------------------------------------------------------------------------

  const handleUnlock = useCallback(
    async (phrase: string) => {
      setIsUnlocking(true);
      clearError();

      try {
        await unlock(phrase);
        // Start unlock animation
        setShowAnimation(true);
      } catch {
        // Error is handled by useIdentity hook
        setIsUnlocking(false);
      }
    },
    [unlock, clearError]
  );

  // -------------------------------------------------------------------------
  // Handle animation complete
  // -------------------------------------------------------------------------

  const handleAnimationComplete = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <AuroraBackground
      intensity={showAnimation ? 1 : 0.6}
      variant={showAnimation ? "success" : "default"}
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Unlock animation overlay - wraps the unlock circle when animating */}
        {showAnimation ? (
          <UnlockAnimation
            isUnlocking={showAnimation}
            onComplete={handleAnimationComplete}
            stageDurations={{
              fading: 400,
              expanding: 800,
              revealing: 500,
            }}
          >
            <UnlockCircle
              onUnlock={handleUnlock}
              isUnlocking={isUnlocking && !showAnimation}
              error={error}
            />
          </UnlockAnimation>
        ) : (
          <UnlockCircle onUnlock={handleUnlock} isUnlocking={isUnlocking} error={error} />
        )}
      </div>
    </AuroraBackground>
  );
}
