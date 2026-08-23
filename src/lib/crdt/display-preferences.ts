/**
 * Per-user display preference reads and writes.
 *
 * Kept out of `context.tsx` so the state transitions are plain functions over vault state and can
 * be tested without a React tree, matching how the automation preferences are handled in
 * `field-rule-mutations.ts`.
 */

import {
    DEFAULT_DATE_FORMAT_PREFERENCE,
    toDateFormatPreference,
    type DateFormatPreference
} from "@/lib/domain/date-format-preference";

import type { UserDisplayPreferenceInput, VaultState } from "./schema";

/** Arguments for {@link persistUserDateFormat}. */
export interface PersistUserDateFormatInput {
    /** The viewer whose preference this is. */
    readonly pubkeyHash: string;
    /** The presentation they chose. */
    readonly dateFormat: DateFormatPreference;
}

/**
 * Read a viewer's chosen date presentation.
 *
 * An unknown viewer, an absent record and an unrecognised stored value all mean the same thing —
 * no choice has been expressed — so all three yield the default rather than an error.
 */
export function readUserDateFormat(
    state: VaultState,
    pubkeyHash: string | null
): DateFormatPreference {
    if (pubkeyHash == null) return DEFAULT_DATE_FORMAT_PREFERENCE;

    return toDateFormatPreference(state.userDisplayPreferences[pubkeyHash]?.dateFormat);
}

/** Persist a viewer's chosen date presentation. */
export function persistUserDateFormat(state: VaultState, input: PersistUserDateFormatInput): void {
    const draft: Record<string, UserDisplayPreferenceInput> = state.userDisplayPreferences;
    draft[input.pubkeyHash] = {
        pubkeyHash: input.pubkeyHash,
        dateFormat: input.dateFormat
    };
}
