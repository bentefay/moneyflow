/**
 * SeedPhraseInput Component
 *
 * Input component for entering a 12-word BIP39 seed phrase.
 * Used during unlock flow for returning users.
 *
 * Features:
 * - 12 individual input fields in a grid
 * - Real-time validation per word (BIP39 wordlist)
 * - Paste support (splits clipboard into fields)
 * - Tab navigation between fields
 * - Auto-focus first empty field
 * - Visual feedback for valid/invalid words
 * - Overall phrase validation indicator
 */

"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { wordlist } from "@scure/bip39/wordlists/english.js";

// ============================================================================
// Types
// ============================================================================

export interface SeedPhraseInputProps {
  /** Current value (space-separated words) */
  value?: string;

  /** Called when the phrase changes */
  onChange?: (phrase: string) => void;

  /** Called when the phrase is valid and complete */
  onComplete?: (phrase: string) => void;

  /** Grid layout */
  layout?: "3x4" | "4x3";

  /** Additional className for the container */
  className?: string;

  /** Whether to auto-focus the first input */
  autoFocus?: boolean;

  /** Whether the component is disabled */
  disabled?: boolean;
}

// ============================================================================
// BIP39 word validation
// ============================================================================

const bip39WordSet = new Set(wordlist);

function isValidBip39Word(word: string): boolean {
  return bip39WordSet.has(word.toLowerCase());
}

function getWordSuggestions(partial: string): string[] {
  if (partial.length < 2) return [];
  const lower = partial.toLowerCase();
  return wordlist.filter((w) => w.startsWith(lower)).slice(0, 5);
}

// ============================================================================
// Component
// ============================================================================

export function SeedPhraseInput({
  value = "",
  onChange,
  onComplete,
  layout = "3x4",
  className,
  autoFocus = true,
  disabled = false,
}: SeedPhraseInputProps) {
  // Parse value into array of 12 words
  const initialWords = useMemo(() => {
    const parts = value.trim().split(/\s+/);
    return Array.from({ length: 12 }, (_, i) => parts[i] || "");
  }, [value]);

  const [words, setWords] = useState<string[]>(initialWords);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sync external value changes
  useEffect(() => {
    const parts = value.trim().split(/\s+/);
    const newWords = Array.from({ length: 12 }, (_, i) => parts[i] || "");
    setWords(newWords);
  }, [value]);

  // Auto-focus first input
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // -------------------------------------------------------------------------
  // Word validation
  // -------------------------------------------------------------------------

  const wordValidation = useMemo(() => {
    return words.map((word) => {
      if (!word) return "empty";
      if (isValidBip39Word(word)) return "valid";
      return "invalid";
    });
  }, [words]);

  const isComplete = useMemo(() => {
    return wordValidation.every((v) => v === "valid");
  }, [wordValidation]);

  const filledCount = useMemo(() => {
    return words.filter((w) => w.length > 0).length;
  }, [words]);

  // -------------------------------------------------------------------------
  // Emit changes
  // -------------------------------------------------------------------------

  const emitChange = useCallback(
    (newWords: string[]) => {
      const phrase = newWords.join(" ").trim();
      onChange?.(phrase);

      // Check if complete
      const allValid = newWords.every((w) => w && isValidBip39Word(w));
      if (allValid && newWords.filter(Boolean).length === 12) {
        onComplete?.(phrase);
      }
    },
    [onChange, onComplete]
  );

  // -------------------------------------------------------------------------
  // Handle word change
  // -------------------------------------------------------------------------

  const handleWordChange = useCallback(
    (index: number, newValue: string) => {
      // Normalize: lowercase, no spaces
      const normalized = newValue.toLowerCase().replace(/\s/g, "");

      const newWords = [...words];
      newWords[index] = normalized;
      setWords(newWords);
      emitChange(newWords);
    },
    [words, emitChange]
  );

  // -------------------------------------------------------------------------
  // Handle paste (split into fields)
  // -------------------------------------------------------------------------

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>, startIndex: number) => {
      const pasted = e.clipboardData.getData("text");
      const pastedWords = pasted.trim().toLowerCase().split(/\s+/);

      // If pasting multiple words, spread across fields
      if (pastedWords.length > 1) {
        e.preventDefault();

        const newWords = [...words];
        pastedWords.forEach((word, i) => {
          const targetIndex = startIndex + i;
          if (targetIndex < 12) {
            newWords[targetIndex] = word;
          }
        });

        setWords(newWords);
        emitChange(newWords);

        // Focus the field after the last pasted word
        const nextIndex = Math.min(startIndex + pastedWords.length, 11);
        inputRefs.current[nextIndex]?.focus();
      }
    },
    [words, emitChange]
  );

  // -------------------------------------------------------------------------
  // Handle keyboard navigation
  // -------------------------------------------------------------------------

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, index: number) => {
      // Tab/Enter moves to next field if current word is valid
      if ((e.key === "Tab" && !e.shiftKey) || e.key === "Enter") {
        if (words[index] && index < 11) {
          e.preventDefault();
          inputRefs.current[index + 1]?.focus();
        }
      }

      // Shift+Tab moves to previous field
      if (e.key === "Tab" && e.shiftKey && index > 0) {
        e.preventDefault();
        inputRefs.current[index - 1]?.focus();
      }

      // Backspace on empty field moves to previous
      if (e.key === "Backspace" && !words[index] && index > 0) {
        e.preventDefault();
        inputRefs.current[index - 1]?.focus();
      }

      // Space moves to next field
      if (e.key === " " && words[index]) {
        e.preventDefault();
        if (index < 11) {
          inputRefs.current[index + 1]?.focus();
        }
      }
    },
    [words]
  );

  // -------------------------------------------------------------------------
  // Grid layout classes
  // -------------------------------------------------------------------------

  const gridClasses = layout === "3x4" ? "grid-cols-3" : "grid-cols-4";

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress indicator */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{filledCount} of 12 words entered</span>
        {isComplete && (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            Valid recovery phrase
          </span>
        )}
        {filledCount === 12 && !isComplete && (
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <XCircle className="h-4 w-4" />
            Invalid phrase
          </span>
        )}
      </div>

      {/* Input grid */}
      <div className={cn("grid gap-2", gridClasses)}>
        {words.map((word, index) => {
          const validation = wordValidation[index];
          const showError = word.length > 0 && validation === "invalid";
          const showValid = validation === "valid";

          return (
            <div key={index} className="relative">
              <Input
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                value={word}
                onChange={(e) => handleWordChange(index, e.target.value)}
                onPaste={(e) => handlePaste(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                disabled={disabled}
                placeholder={`Word ${index + 1}`}
                className={cn(
                  "pr-8 font-mono text-sm",
                  showError && "border-red-500 focus-visible:ring-red-500",
                  showValid && "border-green-500 focus-visible:ring-green-500"
                )}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              {/* Word number badge */}
              <span
                className={cn(
                  "text-muted-foreground absolute top-1/2 left-2 -translate-y-1/2 text-xs font-medium",
                  "pointer-events-none"
                )}
              >
                {/* Using sr-only for accessibility but keeping visual numbering */}
              </span>
              {/* Validation indicator */}
              <span className="absolute top-1/2 right-2 -translate-y-1/2">
                {showValid && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {showError && <AlertCircle className="h-4 w-4 text-red-500" />}
              </span>
            </div>
          );
        })}
      </div>

      {/* Helper text */}
      <p className="text-muted-foreground text-xs">
        Enter your 12-word recovery phrase. You can paste all words at once.
      </p>
    </div>
  );
}
