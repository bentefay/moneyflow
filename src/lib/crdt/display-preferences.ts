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

/** Arguments for {@link persistUserTransactionInspectorOpen}. */
export interface PersistUserTransactionInspectorOpenInput {
    /** The viewer whose preference this is. */
    readonly pubkeyHash: string;
    /** Whether the transaction inspector is open. */
    readonly transactionInspectorOpen: boolean;
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

/** Read a viewer's transaction inspector preference, defaulting absent or invalid values to open. */
export function readUserTransactionInspectorOpen(
    state: VaultState,
    pubkeyHash: string | null
): boolean {
    if (pubkeyHash == null) return true;

    return toTransactionInspectorOpen(
        state.userDisplayPreferences[pubkeyHash]?.transactionInspectorOpen
    );
}

/** Narrow an unvalidated stored transaction inspector preference, defaulting to open. */
export function toTransactionInspectorOpen(value: unknown): boolean {
    return typeof value === "boolean" ? value : true;
}

/** Persist a viewer's chosen date presentation without replacing their other display preferences. */
export function persistUserDateFormat(state: VaultState, input: PersistUserDateFormatInput): void {
    mutateUserDisplayPreference(state, input.pubkeyHash, (preference) => {
        preference.dateFormat = input.dateFormat;
    });
}

/** Persist a viewer's transaction inspector state without replacing their other preferences. */
export function persistUserTransactionInspectorOpen(
    state: VaultState,
    input: PersistUserTransactionInspectorOpenInput
): void {
    mutateUserDisplayPreference(state, input.pubkeyHash, (preference) => {
        preference.transactionInspectorOpen = input.transactionInspectorOpen;
    });
}

/** Create the keyed viewer record only when absent, then mutate the existing draft in place. */
function mutateUserDisplayPreference(
    state: VaultState,
    pubkeyHash: string,
    mutate: (preference: UserDisplayPreferenceInput) => void
): void {
    const preferences: Record<string, UserDisplayPreferenceInput> = state.userDisplayPreferences;
    const existing = preferences[pubkeyHash];
    if (existing != null) {
        mutate(existing);
        return;
    }

    const created: UserDisplayPreferenceInput = {
        pubkeyHash,
        dateFormat: undefined,
        transactionInspectorOpen: undefined
    };
    mutate(created);
    preferences[pubkeyHash] = created;
}
