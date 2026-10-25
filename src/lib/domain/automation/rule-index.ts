/**
 * Rules grouped by their exact description text.
 *
 * A rule can only ever match a subject whose description text equals its own (see
 * `ruleMatchesSubject`), so the rules worth testing against a subject are exactly the bucket for
 * that text. Building the index once and looking up a bucket per subject turns "every rule against
 * every row" into "the few rules for this row's text". The index changes which rules are visited,
 * never which one wins: precedence stays in `selectWinningRule`.
 *
 * Pure. Build it once from an already-decoded rule list, never per row.
 */

import { type FieldRule, type RuleMatchSubject } from "./rules";

export interface RuleIndex {
    /** Every indexed rule, in input order. */
    readonly rules: readonly FieldRule[];
    /** Rules per exact description text, each bucket in input order. */
    readonly byDescriptionText: ReadonlyMap<string, readonly FieldRule[]>;
}

/** Either a plain rule list or its index; every engine entry point accepts both. */
export type RuleSource = readonly FieldRule[] | RuleIndex;

const NO_RULES: readonly FieldRule[] = [];

export function buildRuleIndex(rules: readonly FieldRule[]): RuleIndex {
    const byDescriptionText = new Map<string, FieldRule[]>();
    for (const rule of rules) {
        const bucket = byDescriptionText.get(rule.descriptionText);
        if (bucket == null) byDescriptionText.set(rule.descriptionText, [rule]);
        else bucket.push(rule);
    }
    return { rules, byDescriptionText };
}

export function isRuleIndex(source: RuleSource): source is RuleIndex {
    return "byDescriptionText" in source;
}

/** The rules keyed on exactly `descriptionText`. Empty for `null`, which matches nothing. */
export function rulesWithDescriptionText(
    index: RuleIndex,
    descriptionText: string | null
): readonly FieldRule[] {
    if (descriptionText == null) return NO_RULES;
    return index.byDescriptionText.get(descriptionText) ?? NO_RULES;
}

/** The only rules that can match `subject`: those keyed on its description text. */
export function candidateRulesFor(
    index: RuleIndex,
    subject: RuleMatchSubject
): readonly FieldRule[] {
    return rulesWithDescriptionText(index, subject.descriptionText);
}

/**
 * The rules worth testing for `descriptionText`: the index bucket, or the whole list. Either way the
 * caller still applies its own match test, so the list path stays the reference behaviour.
 */
export function ruleCandidatesForText(
    source: RuleSource,
    descriptionText: string | null
): readonly FieldRule[] {
    return isRuleIndex(source) ? rulesWithDescriptionText(source, descriptionText) : source;
}

/**
 * Exactly the rules keyed on `descriptionText`: the bucket of an index, or one filtering pass over
 * a list. For questions about a single rule's text, where no other rule can take part.
 */
export function rulesKeyedOnText(
    source: RuleSource,
    descriptionText: string
): readonly FieldRule[] {
    return isRuleIndex(source)
        ? rulesWithDescriptionText(source, descriptionText)
        : source.filter((rule) => rule.descriptionText === descriptionText);
}
