/**
 * RecoveryPhraseCredentialFields Component
 *
 * The one canonical credential a password manager sees. Renders a single `type="password"` field
 * carrying the entire recovery phrase, plus a stable non-secret account identifier so the
 * credential saved during vault creation is the same credential offered back during unlock.
 *
 * Hiding technique matters here and is deliberate. The field is positioned off-screen at full size
 * rather than `type="hidden"`, `display:none`, `visibility:hidden`, `opacity:0` or a 1x1 `sr-only`
 * clip, because each of those is skipped by at least one engine's fill heuristics - Chromium
 * requires a focusable element of at least 10px per side, WebKit requires a rendered focusable
 * element, and Firefox's autofill visibility check rejects zero opacity. An off-screen element at
 * full size satisfies all three.
 *
 * The field stays keyboard reachable and becomes visible when focused, so a keyboard or screen
 * reader user who tabs into it gets a usable single-field alternative to the word grid rather than
 * focus vanishing off-screen.
 */

"use client";

import type { RefObject } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import {
    RECOVERY_PHRASE_ACCOUNT_FIELD_ID,
    RECOVERY_PHRASE_ACCOUNT_NAME,
    RECOVERY_PHRASE_FIELD_ID
} from "./recoveryPhraseCredential";

// ============================================================================
// Types
// ============================================================================

export interface RecoveryPhraseCredentialFieldsProps {
    /** The whole phrase as a single string. */
    value: string;

    /**
     * Which credential this is. `new-password` during vault creation so managers offer to save,
     * `current-password` during unlock so they offer to fill.
     */
    autoComplete: "new-password" | "current-password";

    /** Accessible name for the credential field. */
    label: string;

    /** Called when a manager fill or direct edit changes the phrase. */
    onValueChange: (value: string) => void;

    /**
     * Access to the underlying field, so a consumer can adopt a value that a browser or manager
     * autofilled before React hydrated.
     */
    fieldRef?: RefObject<HTMLInputElement | null>;
}

// ============================================================================
// Styles
// ============================================================================

/**
 * Rendered and focusable but out of view, sized well above Chromium's 10px minimum so it is
 * treated as a real credential target.
 *
 * The field stays absolutely positioned in every state, including when focused: it must never
 * re-enter the layout flow, or focusing it would shift the surrounding controls out from under the
 * user's pointer. When focused it slides into view over the top of the layout instead, so keyboard
 * users still get a visible single-field alternative to the word grid.
 */
const offScreenUntilFocused = cn(
    "absolute top-0 -left-[9999px] h-9 w-56",
    "focus:left-0 focus:z-10 focus:w-full"
);

// ============================================================================
// Component
// ============================================================================

export function RecoveryPhraseCredentialFields({
    value,
    autoComplete,
    label,
    onValueChange,
    fieldRef
}: RecoveryPhraseCredentialFieldsProps) {
    return (
        <>
            {/*
             * Account identifier. Managers key a saved credential on origin plus username, so this
             * anchor is what links the phrase saved at creation to the fill offered at unlock. It
             * carries no secret and is kept out of the tab order and the accessibility tree.
             */}
            <input
                id={RECOVERY_PHRASE_ACCOUNT_FIELD_ID}
                name="username"
                type="text"
                autoComplete="username"
                value={RECOVERY_PHRASE_ACCOUNT_NAME}
                readOnly
                tabIndex={-1}
                aria-hidden="true"
                className={offScreenUntilFocused}
                data-testid="recovery-phrase-account"
                onChange={() => {}}
            />

            <Input
                ref={fieldRef}
                id={RECOVERY_PHRASE_FIELD_ID}
                name="recovery-phrase"
                type="password"
                autoComplete={autoComplete}
                value={value}
                onChange={(event) => onValueChange(event.target.value)}
                aria-label={label}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={offScreenUntilFocused}
                data-testid="recovery-phrase-credential"
            />
        </>
    );
}
