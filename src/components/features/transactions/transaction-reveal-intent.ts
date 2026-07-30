/**
 * Pure model for the transactions page's consume-once "bring this row to the user" intent.
 *
 * One intent covers both ways a row is brought to the user's attention, each retired independently
 * because they land at different moments:
 *
 * - `scroll` runs as soon as the target is on the displayed page, and is what the People page's
 *   deep link needs.
 * - `focusDescription` can only land once the *virtualized* row is actually mounted, and is what a
 *   freshly created row needs so the user can start typing without the row being selected.
 *
 * Retiring a step returns a new intent, or `null` once nothing is left to do, so a landed step can
 * never re-assert on a later render. An intent whose target has not arrived yet — a deep link into a
 * vault that is still loading, or a row removed by undo — simply stays pending rather than being
 * dropped or reattached to some other row: every intent is keyed by a stable transaction ID, never
 * by a row index.
 *
 * Total and side-effect-free.
 */

export interface TransactionRevealIntent {
    /** Stable ID of the transaction to reveal. Never a row index. */
    readonly transactionId: string;
    /** Whether the row still needs to be scrolled into view. */
    readonly scrollPending: boolean;
    /** Whether the row's description input still needs to take keyboard focus. */
    readonly focusDescriptionPending: boolean;
}

/** Reveals an existing row addressed by a deep link: scroll to it, leave focus where it is. */
export function revealExistingTransaction(transactionId: string): TransactionRevealIntent {
    return { transactionId, scrollPending: true, focusDescriptionPending: false };
}

/** Reveals a just-created row: scroll to it and put the caret in its description. */
export function revealCreatedTransaction(transactionId: string): TransactionRevealIntent {
    return { transactionId, scrollPending: true, focusDescriptionPending: true };
}

/** Drops the intent once every step has landed, so it cannot fire again. */
function keepIfPending(intent: TransactionRevealIntent): TransactionRevealIntent | null {
    return intent.scrollPending || intent.focusDescriptionPending ? intent : null;
}

/** Retires the scroll step after the row has been scrolled into view. */
export function retireScroll(intent: TransactionRevealIntent): TransactionRevealIntent | null {
    return keepIfPending({ ...intent, scrollPending: false });
}

/** Retires the focus step after the row's description input has taken focus. */
export function retireFocusDescription(
    intent: TransactionRevealIntent
): TransactionRevealIntent | null {
    return keepIfPending({ ...intent, focusDescriptionPending: false });
}

/** The ID whose description should focus now, or `null` when no focus is pending. */
export function pendingFocusDescriptionId(intent: TransactionRevealIntent | null): string | null {
    return intent != null && intent.focusDescriptionPending ? intent.transactionId : null;
}
