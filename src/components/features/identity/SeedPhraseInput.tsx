/**
 * SeedPhraseInput Component
 *
 * Input component for entering a 12-word BIP39 seed phrase.
 * Used during unlock flow for returning users.
 *
 * Features:
 * - 12 individual input fields in a grid
 * - One canonical credential field so password managers offer to fill the phrase
 * - Real-time validation per word (BIP39 wordlist)
 * - Paste support (splits clipboard into fields)
 * - Tab navigation between fields
 * - Auto-focus first empty field
 * - Visual feedback for valid/invalid words
 * - Overall phrase validation indicator
 */

"use client";

import { wordlist } from "@scure/bip39/wordlists/english.js";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import {
    type ClipboardEvent,
    type KeyboardEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

import { Input } from "@/components/ui/input";
import { validateSeedPhrase } from "@/lib/crypto/seed";
import { cn } from "@/lib/utils";

import { joinWordSlotsIntoPhrase, splitPhraseIntoWordSlots } from "./recoveryPhraseCredential";
import { RecoveryPhraseCredentialFields } from "./RecoveryPhraseCredentialFields";

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

// Reserved for future autocomplete feature
// function getWordSuggestions(partial: string): string[] {
// 	if (partial.length < 2) return [];
// 	const lower = partial.toLowerCase();
// 	return wordlist.filter((w) => w.startsWith(lower)).slice(0, 5);
// }

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
    disabled = false
}: SeedPhraseInputProps) {
    // Parse value into array of 12 words
    const initialWords = useMemo(() => splitPhraseIntoWordSlots(value), [value]);

    const [words, setWords] = useState<string[]>(initialWords);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const canonicalRef = useRef<HTMLInputElement | null>(null);

    // Sync external value changes - intentional controlled input pattern
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing controlled input value
        setWords(splitPhraseIntoWordSlots(value));
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

    const filledCount = useMemo(() => {
        return words.filter((w) => w.length > 0).length;
    }, [words]);

    // Mirrors the grid back into the canonical field so a manager sees the phrase the user typed.
    const canonicalPhrase = useMemo(() => joinWordSlotsIntoPhrase(words), [words]);

    // The indicator must agree with what the unlock button accepts, so it uses the same full BIP39
    // check - wordlist membership plus checksum - rather than per-word validity alone.
    const isComplete = useMemo(() => validateSeedPhrase(canonicalPhrase), [canonicalPhrase]);

    // -------------------------------------------------------------------------
    // Emit changes
    // -------------------------------------------------------------------------

    const emitChange = useCallback(
        (newWords: string[]) => {
            const phrase = joinWordSlotsIntoPhrase(newWords);
            onChange?.(phrase);

            // A phrase is only complete when the BIP39 checksum holds, not merely when all twelve
            // words are in the wordlist. A password manager can fill a whole phrase at once, and a
            // corrupted fill would otherwise be offered to the user as valid.
            if (validateSeedPhrase(phrase)) {
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

    // Kept in a ref so the mount-time autofill adoption above does not depend on a callback that
    // changes whenever the consumer re-renders.
    const emitChangeRef = useRef(emitChange);
    useEffect(() => {
        emitChangeRef.current = emitChange;
    }, [emitChange]);

    // Browsers and password managers autofill as soon as the markup exists, which can happen
    // before React hydrates. Adopt whatever the canonical field already holds on mount, otherwise
    // a fill that landed early would sit in the credential field with an empty word grid.
    useEffect(() => {
        const prefilled = canonicalRef.current?.value ?? "";
        if (!prefilled) return;

        const prefilledWords = splitPhraseIntoWordSlots(prefilled);
        setWords(prefilledWords);
        emitChangeRef.current(prefilledWords);
    }, []);

    // -------------------------------------------------------------------------
    // Handle a password manager filling the canonical credential field
    // -------------------------------------------------------------------------

    const handleCanonicalChange = useCallback(
        (phrase: string) => {
            const newWords = splitPhraseIntoWordSlots(phrase);
            setWords(newWords);
            emitChange(newWords);
        },
        [emitChange]
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
        <div className={cn("relative space-y-4", className)}>
            {/*
             * One canonical credential for password managers. The twelve inputs below stay plain
             * text so managers never try to fill them individually.
             */}
            <RecoveryPhraseCredentialFields
                value={canonicalPhrase}
                autoComplete="current-password"
                label="Recovery phrase"
                onValueChange={handleCanonicalChange}
                fieldRef={canonicalRef}
            />

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
                                placeholder={`${index + 1}`}
                                aria-label={`Word ${index + 1}`}
                                aria-invalid={showError}
                                data-testid={`seed-word-input-${index}`}
                                className={cn(
                                    "bg-background/80 font-mono",
                                    showError &&
                                        "border-destructive focus-visible:ring-destructive",
                                    showValid && "border-green-500 focus-visible:ring-green-500"
                                )}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                                // Keep third-party managers off the individual word slots; the
                                // canonical field above is the only credential they should see.
                                data-1p-ignore
                                data-bwignore
                                data-lpignore="true"
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
