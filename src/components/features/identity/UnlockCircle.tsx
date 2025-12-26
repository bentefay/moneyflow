/**
 * UnlockCircle Component
 *
 * Centered circular unlock interface.
 * Contains the seed phrase input, instructions, and unlock button.
 *
 * Features:
 * - Circular container with glassmorphism effect
 * - Compact seed phrase input inside
 * - Clear unlock instructions
 * - Loading state during verification
 * - Error display for invalid phrases
 */

"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import { SeedPhraseInput } from "./SeedPhraseInput";
import { Loader2, Lock, Unlock } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface UnlockError {
  message: string;
  details?: string;
}

export interface UnlockCircleProps {
  /** Called when unlock is attempted with a valid phrase */
  onUnlock: (phrase: string) => Promise<void>;

  /** Whether unlock is currently in progress */
  isUnlocking?: boolean;

  /** Error to display */
  error?: UnlockError | null;

  /** Additional className for the circle */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function UnlockCircle({
  onUnlock,
  isUnlocking = false,
  error = null,
  className,
}: UnlockCircleProps) {
  const [phrase, setPhrase] = useState("");
  const [isValid, setIsValid] = useState(false);

  // -------------------------------------------------------------------------
  // Handle phrase changes
  // -------------------------------------------------------------------------

  const handlePhraseChange = useCallback((newPhrase: string) => {
    setPhrase(newPhrase);
  }, []);

  const handlePhraseComplete = useCallback((validPhrase: string) => {
    setPhrase(validPhrase);
    setIsValid(true);
  }, []);

  // Reset validity when phrase changes to invalid
  const handleChange = useCallback(
    (newPhrase: string) => {
      handlePhraseChange(newPhrase);
      // Reset valid state when user modifies phrase
      setIsValid(false);
    },
    [handlePhraseChange]
  );

  // -------------------------------------------------------------------------
  // Handle unlock
  // -------------------------------------------------------------------------

  const handleUnlock = useCallback(async () => {
    if (!isValid || isUnlocking) return;
    await onUnlock(phrase);
  }, [isValid, isUnlocking, onUnlock, phrase]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className={cn(
        // Circular shape with max size
        "relative flex max-h-[90vh] max-w-[90vw] flex-col items-center justify-center",
        "aspect-square w-full max-w-xl",
        // Glassmorphism effect
        "bg-background/90 rounded-full border border-white/10 backdrop-blur-xl",
        // Shadow for depth
        "shadow-2xl shadow-black/20",
        // Smooth transitions
        "transition-all duration-500",
        className
      )}
    >
      {/* Inner content container */}
      <div className="flex w-full max-w-sm flex-col items-center gap-6 px-8 py-12">
        {/* Lock icon */}
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full",
            "bg-primary/10 text-primary",
            "transition-all duration-300",
            isUnlocking && "animate-pulse"
          )}
        >
          {isUnlocking ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : isValid ? (
            <Unlock className="h-8 w-8" />
          ) : (
            <Lock className="h-8 w-8" />
          )}
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Welcome Back</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Enter your recovery phrase to unlock your vault
          </p>
        </div>

        {/* Error message */}
        {error && (
          <ErrorAlert
            title="Unable to unlock"
            message={error.message}
            details={error.details}
            className="w-full"
          />
        )}

        {/* Seed phrase input - simplified for circle */}
        <div className="w-full">
          <SeedPhraseInput
            value={phrase}
            onChange={handleChange}
            onComplete={handlePhraseComplete}
            layout="4x3"
            autoFocus
            disabled={isUnlocking}
          />
        </div>

        {/* Unlock button */}
        <Button
          data-testid="unlock-button"
          onClick={handleUnlock}
          disabled={!isValid || isUnlocking}
          size="lg"
          className="w-full"
        >
          {isUnlocking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Unlocking...
            </>
          ) : (
            <>
              <Unlock className="mr-2 h-4 w-4" />
              Unlock Vault
            </>
          )}
        </Button>

        {/* New user link */}
        <p className="text-muted-foreground text-center text-sm">
          Don&apos;t have an account?{" "}
          <a
            href="/new-user"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
