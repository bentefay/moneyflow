/**
 * Per-user automation preferences (HS-007 / P17A, deliverable #5).
 *
 * These remember a user's last-used rule field, tag mode and scope (account/amount) choices so the
 * rule editor can pre-fill them. This is per-user UI state keyed by `pubkeyHash`, NOT shared
 * financial state, hence its own record (`userAutomationPreferenceSchema`) rather than the vault's
 * shared `preferences`.
 *
 * Pure helpers only: `readRememberedChoice` projects a stored record into a defaulted choice and
 * `nextUserPreference` derives the record to persist after a choice. Writing into the vault draft
 * is the caller's concern (deferred with root wiring — see Q-P17A-DEFAULTS).
 */

import { type RuleField, type TagRuleMode } from "./rules";

/** Structural view of a stored per-user preference record. */
export interface UserAutomationPreferenceView {
    readonly pubkeyHash: string;
    readonly lastRuleField?: RuleField;
    readonly lastTagMode?: TagRuleMode;
    readonly lastUseAccountScope?: boolean;
    readonly lastUseAmountScope?: boolean;
}

/** A fully-resolved set of remembered choices with defaults applied. */
export interface RememberedRuleChoice {
    readonly field: RuleField;
    readonly tagMode: TagRuleMode;
    readonly useAccountScope: boolean;
    readonly useAmountScope: boolean;
}

export const DEFAULT_REMEMBERED_CHOICE: RememberedRuleChoice = {
    field: "tags",
    tagMode: "add",
    useAccountScope: false,
    useAmountScope: false
};

/** Project a stored record (or its absence) into a defaulted choice. Total and pure. */
export function readRememberedChoice(
    record: UserAutomationPreferenceView | undefined
): RememberedRuleChoice {
    if (record == null) return DEFAULT_REMEMBERED_CHOICE;
    return {
        field: record.lastRuleField ?? DEFAULT_REMEMBERED_CHOICE.field,
        tagMode: record.lastTagMode ?? DEFAULT_REMEMBERED_CHOICE.tagMode,
        useAccountScope: record.lastUseAccountScope ?? DEFAULT_REMEMBERED_CHOICE.useAccountScope,
        useAmountScope: record.lastUseAmountScope ?? DEFAULT_REMEMBERED_CHOICE.useAmountScope
    };
}

/** Derive the record to persist for `pubkeyHash` after the user makes `choice`. Pure. */
export function nextUserPreference(
    pubkeyHash: string,
    choice: RememberedRuleChoice
): UserAutomationPreferenceView {
    return {
        pubkeyHash,
        lastRuleField: choice.field,
        lastTagMode: choice.tagMode,
        lastUseAccountScope: choice.useAccountScope,
        lastUseAmountScope: choice.useAmountScope
    };
}
