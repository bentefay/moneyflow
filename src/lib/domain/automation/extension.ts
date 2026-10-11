/**
 * Which existing rule an edit of one field on one transaction should extend: the selection ladder
 * of `specs/automation-rule-ownership.md` §5.3 (decisions D-001, D-003, D-004, D-005).
 *
 * This answers a question about ONE write, never about which rule drives which rows: per-field
 * precedence stays exclusively in `selectWinningRule`. The ladder only looks at rules whose match
 * conditions are IDENTICAL to what the edit would create, because folding an output into a rule
 * with a broader or narrower predicate would silently change which transactions it reaches.
 *
 * Pure and order-independent. It never breaks a tie by recency, id or list order: wherever the
 * ladder cannot decide without such a tiebreak it reports `ambiguous` so the user chooses.
 */

import {
    fieldAppliesToManual,
    type FieldRule,
    type RuleField,
    type RuleMatchSubject,
    type RulePredicate,
    ruleMatchesSubject,
    ruleOutputFields,
    rulePredicatesEqual
} from "./rules";

export interface RuleExtensionQuery {
    /** Active, decoded rules. An undecodable record is never passed in, so it is never a host. */
    readonly rules: readonly FieldRule[];
    /** The transaction being edited. */
    readonly subject: RuleMatchSubject;
    /** The field the user edited. */
    readonly field: RuleField;
    /** The match conditions the draft would create a rule with. */
    readonly predicate: RulePredicate;
}

export type RuleExtensionTarget =
    /** The field can never apply to this transaction (an alias on a manual row): propose nothing. */
    | { readonly kind: "ineligible" }
    /** No identical-predicate rule matches: write a new rule. */
    | { readonly kind: "create" }
    /** A candidate already has an output for the field: update it in place, change nothing else. */
    | { readonly kind: "update-owner"; readonly rule: FieldRule }
    /** No candidate owns the field: add the output to this rule. */
    | { readonly kind: "extend"; readonly rule: FieldRule }
    /**
     * `owner` holds the field and a different candidate, `host`, is the description rule the
     * mission prefers. Updating `owner` is the default; moving the output into `host` is an explicit
     * choice the surface must offer with `owner`'s fate stated.
     */
    | { readonly kind: "conflict"; readonly owner: FieldRule; readonly host: FieldRule }
    /** Several candidates and no rule for choosing among them: the user must pick. Sorted by id. */
    | { readonly kind: "ambiguous"; readonly candidates: readonly FieldRule[] };

/**
 * Resolve the extension target for an edit of `field` on `subject`, given the draft's `predicate`.
 *
 * 0. A field the subject is ineligible for (an alias on a manual row): `ineligible`. No rule,
 *    created or extended, could ever set it on this transaction.
 * 1. Candidates are active rules matching the subject whose predicate equals the draft's. For a
 *    manual subject a rule whose only outputs are ineligible (an alias-only rule) is excluded: it
 *    can never apply to the row, so it is not a host for it.
 * 2. No candidates: `create`.
 * 3. One candidate owns the field: `update-owner`, unless a different candidate carries the
 *    description alias, which makes it a `conflict` between keeping the owner and consolidating.
 * 4. Else one candidate carries the description alias: `extend` it.
 * 5. Else exactly one candidate: `extend` it.
 * 6. Else: `ambiguous`.
 *
 * Two candidates owning the same field, or two alias hosts, are a duplicated uniqueness slot (only
 * reachable through concurrent creation). Picking one would be exactly the tiebreak the contract
 * forbids, so both surface as `ambiguous` (D-012).
 */
export function resolveRuleExtensionTarget(query: RuleExtensionQuery): RuleExtensionTarget {
    const { isManual } = query.subject;
    if (isManual && !fieldAppliesToManual(query.field)) return { kind: "ineligible" };
    const candidates = query.rules
        .filter(
            (rule) =>
                rulePredicatesEqual(rule, query.predicate) &&
                ruleMatchesSubject(rule, query.subject) &&
                (!isManual || ruleOutputFields(rule).some(fieldAppliesToManual))
        )
        .sort(compareRuleIds);
    if (candidates.length === 0) return { kind: "create" };

    const owners = candidates.filter((rule) => rule.outputs[query.field] != null);
    const aliasHosts = candidates.filter((rule) => rule.outputs.descriptionAlias != null);

    if (owners.length > 1) return { kind: "ambiguous", candidates: owners };
    const [owner] = owners;
    if (owner != null) {
        const otherHosts = aliasHosts.filter((rule) => rule.id !== owner.id);
        const [host, ...moreHosts] = otherHosts;
        if (host == null) return { kind: "update-owner", rule: owner };
        if (moreHosts.length > 0) {
            return { kind: "ambiguous", candidates: [owner, ...otherHosts].sort(compareRuleIds) };
        }
        return { kind: "conflict", owner, host };
    }

    if (aliasHosts.length > 1) return { kind: "ambiguous", candidates: aliasHosts };
    const [aliasHost] = aliasHosts;
    if (aliasHost != null) return { kind: "extend", rule: aliasHost };

    const [only, ...others] = candidates;
    if (only != null && others.length === 0) return { kind: "extend", rule: only };
    return { kind: "ambiguous", candidates };
}

/** Presentation order only, so the result is independent of input order. Never a tiebreak. */
function compareRuleIds(left: FieldRule, right: FieldRule): number {
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}
