/**
 * Explicit reach-set maintenance when transactions leave the vault (`specs/017-rule-reach` §3.6).
 *
 * Kept apart from `field-rule-mutations.ts` so the transaction-delete paths in
 * `description-aliases.ts` can call it without an import cycle through `field-rules.ts`. It touches
 * only the `reachTransactionIds` maps, never a rule's conditions or outputs, and needs no decode: an
 * id is simply not a member any more.
 */

import { type VaultState } from "./schema";

/**
 * Remove `transactionIds` from every rule's explicit reach set, in place. A rule whose set becomes
 * empty is kept: it is a rule "not applied anywhere", listed for cleanup, not deleted behind the
 * user's back. Returns the ids of the rules whose set changed, in key order.
 */
export function removeTransactionsFromRuleReach(
    state: VaultState,
    transactionIds: Iterable<string>
): readonly string[] {
    const removed = new Set(transactionIds);
    if (removed.size === 0) return [];
    const changed: string[] = [];
    for (const [ruleId, rule] of Object.entries(state.fieldRules)) {
        if (ruleId === "$cid" || typeof rule !== "object" || rule == null) continue;
        const members = rule.reachTransactionIds;
        if (members == null) continue;
        // An explicit set is usually one row, so walk it rather than every removed id.
        const leaving = Object.keys(members).filter((id) => id !== "$cid" && removed.has(id));
        if (leaving.length === 0) continue;
        for (const id of leaving) delete members[id];
        changed.push(ruleId);
    }
    return changed;
}
