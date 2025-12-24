/**
 * SeedPhraseDisplay Component
 *
 * Displays a 12-word BIP39 seed phrase in a secure, copy-friendly format.
 * Used during new user onboarding to show the generated recovery phrase.
 *
 * Features:
 * - 3x4 or 4x3 grid layout (configurable)
 * - Numbered words for easy verification
 * - Copy to clipboard button
 * - Warning message about securing the phrase
 * - Reveal/hide toggle for privacy
 */

"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, Copy, Eye, EyeOff, AlertTriangle } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface SeedPhraseDisplayProps {
  /** The 12-word mnemonic phrase */
  mnemonic: string;

  /** Whether to initially show or hide the words */
  initiallyRevealed?: boolean;

  /** Grid layout: 3 columns x 4 rows or 4 columns x 3 rows */
  layout?: "3x4" | "4x3";

  /** Additional className for the container */
  className?: string;

  /** Whether to show the copy button */
  showCopyButton?: boolean;

  /** Whether to show the reveal/hide toggle */
  showRevealToggle?: boolean;

  /** Whether to show the security warning */
  showWarning?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function SeedPhraseDisplay({
  mnemonic,
  initiallyRevealed = true,
  layout = "3x4",
  className,
  showCopyButton = true,
  showRevealToggle = true,
  showWarning = true,
}: SeedPhraseDisplayProps) {
  const [isRevealed, setIsRevealed] = useState(initiallyRevealed);
  const [isCopied, setIsCopied] = useState(false);

  const words = mnemonic.trim().split(/\s+/);

  // -------------------------------------------------------------------------
  // Copy to clipboard
  // -------------------------------------------------------------------------

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [mnemonic]);

  // -------------------------------------------------------------------------
  // Toggle reveal
  // -------------------------------------------------------------------------

  const toggleReveal = useCallback(() => {
    setIsRevealed((prev) => !prev);
  }, []);

  // -------------------------------------------------------------------------
  // Grid layout classes
  // -------------------------------------------------------------------------

  const gridClasses = layout === "3x4" ? "grid-cols-3" : "grid-cols-4";

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={cn("space-y-4", className)}>
      {/* Security warning */}
      {showWarning && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">Write down your recovery phrase</p>
            <p className="text-yellow-600/80 dark:text-yellow-400/80">
              This is the only way to recover your account. Store it somewhere safe and never share
              it with anyone. Anyone with these words can access your vault.
            </p>
          </div>
        </div>
      )}

      {/* Seed phrase grid */}
      <div className="relative">
        <div
          className={cn(
            "bg-muted/50 grid gap-2 rounded-lg border p-4",
            gridClasses,
            !isRevealed && "select-none"
          )}
        >
          {words.map((word, index) => (
            <div
              key={index}
              className={cn(
                "bg-background flex items-center gap-2 rounded-md border px-3 py-2",
                "transition-all duration-200"
              )}
            >
              <span className="text-muted-foreground w-5 text-xs font-medium">{index + 1}.</span>
              <span className={cn("font-mono text-sm", !isRevealed && "blur-sm")}>
                {isRevealed ? word : "•••••"}
              </span>
            </div>
          ))}
        </div>

        {/* Blur overlay when hidden */}
        {!isRevealed && (
          <div className="bg-background/80 absolute inset-0 flex items-center justify-center rounded-lg backdrop-blur-sm">
            <Button variant="outline" size="sm" onClick={toggleReveal} className="gap-2">
              <Eye className="h-4 w-4" />
              Click to reveal
            </Button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between">
        {showRevealToggle && isRevealed && (
          <Button variant="ghost" size="sm" onClick={toggleReveal} className="gap-2">
            <EyeOff className="h-4 w-4" />
            Hide words
          </Button>
        )}
        {!showRevealToggle && <div />}

        {showCopyButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
            disabled={!isRevealed}
          >
            {isCopied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy to clipboard
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
