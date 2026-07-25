/**
 * Recovery Phrase Credential Contract
 *
 * The recovery phrase is this app's only credential. Password managers recognise credentials
 * through a narrow set of conventions, and a grid of twelve word inputs matches none of them:
 * Chromium ignores the `autocomplete` attribute entirely once a form carries more than two
 * password fields, and Firefox discards a form with more than five. So the twelve inputs stay
 * exactly as they are - plain text, opted out of manager heuristics - and every surface that
 * handles the phrase additionally renders ONE canonical `type="password"` field carrying the whole
 * phrase, kept in sync in both directions.
 *
 * These helpers are the only bridge between the canonical single-string form and the twelve-slot
 * form. They are pure so the synchronization can be reasoned about and tested without a DOM.
 */

/** Number of words in a BIP39 128-bit recovery phrase. */
export const WORD_SLOT_COUNT = 12;

/**
 * Stable, non-secret account identifier submitted alongside the credential.
 *
 * Managers key a saved credential on origin plus username. This app has no user-chosen account
 * name, so a single fixed identifier makes the phrase saved during creation the same credential
 * offered back during unlock. It must never contain any part of the phrase.
 */
export const RECOVERY_PHRASE_ACCOUNT_NAME = "MoneyFlow recovery phrase";

/** DOM id of the canonical credential field. Stable ids help managers match a saved credential. */
export const RECOVERY_PHRASE_FIELD_ID = "recovery-phrase";

/** DOM id of the account identifier field. */
export const RECOVERY_PHRASE_ACCOUNT_FIELD_ID = "recovery-phrase-account";

/**
 * Splits a phrase into exactly {@link WORD_SLOT_COUNT} slots for the visible grid.
 *
 * Applies only the normalization the per-word inputs already applied to typed text - lowercase and
 * whitespace collapse - so a manager fill and manual typing converge on the same value. Words are
 * never validated or corrected here: an invalid word must stay visible and invalid.
 */
export function splitPhraseIntoWordSlots(phrase: string): string[] {
    const words = phrase.trim().toLowerCase().split(/\s+/).filter(Boolean);

    return Array.from({ length: WORD_SLOT_COUNT }, (_, index) => words[index] ?? "");
}

/**
 * Joins word slots back into the canonical single-string phrase.
 *
 * Empty slots are dropped rather than emitted as padding, so a partially filled grid produces the
 * prefix a user has actually entered instead of trailing whitespace.
 */
export function joinWordSlotsIntoPhrase(wordSlots: readonly string[]): string {
    return wordSlots.filter(Boolean).join(" ");
}
