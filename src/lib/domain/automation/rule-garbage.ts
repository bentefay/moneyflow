import { buildRuleIndex } from "./rule-index";
import {
    ruleOutputFields,
    selectWinningRule,
    type FieldRule,
    type RuleMatchSubject,
    type RuleOutputsInput
} from "./rules";

export function ruleOutputsEqual(left: RuleOutputsInput, right: RuleOutputsInput): boolean {
    if (left.descriptionAlias?.aliasId !== right.descriptionAlias?.aliasId) return false;
    if (left.tags?.mode !== right.tags?.mode) return false;
    const leftTags = new Set(left.tags?.tagIds ?? []);
    const rightTags = new Set(right.tags?.tagIds ?? []);
    if (leftTags.size !== rightTags.size || [...leftTags].some((id) => !rightTags.has(id)))
        return false;
    const leftAllocations = Object.entries(left.allocation?.allocations ?? {});
    const rightAllocations = Object.entries(right.allocation?.allocations ?? {});
    return (
        (left.allocation == null) === (right.allocation == null) &&
        leftAllocations.length === rightAllocations.length &&
        leftAllocations.every(([id, value]) => right.allocation?.allocations[id] === value)
    );
}

/** Wide rules always survive: even an unmatched one can govern a future import. */
export function collectibleRuleIds(
    rules: readonly FieldRule[],
    subjects: ReadonlyMap<string, RuleMatchSubject>
): ReadonlySet<string> {
    const steps = collectibleRuleIdSteps(rules, subjects);
    for (;;) {
        const next = steps.next();
        if (next.done) return next.value;
    }
}

/** Resumable form shared with the frame-budgeted vault maintenance pass. */
export function* collectibleRuleIdSteps(
    rules: readonly FieldRule[],
    subjects: ReadonlyMap<string, RuleMatchSubject>,
    limit = Number.POSITIVE_INFINITY,
    retainedRuleIds?: ReadonlySet<string>
): Generator<void, ReadonlySet<string>> {
    const wide = buildRuleIndex(rules.filter((rule) => rule.reach.kind !== "transactions"));
    const collected = new Set<string>();
    for (const rule of rules) {
        if (rule.reach.kind !== "transactions" || retainedRuleIds?.has(rule.id)) continue;
        const fields = ruleOutputFields(rule);
        const [field] = fields;
        let surviving = false;
        let redundant = fields.length === 1;
        for (const id of rule.reach.ids) {
            const subject = subjects.get(id);
            if (subject != null) {
                surviving = true;
                const winner = field == null ? null : selectWinningRule(wide, field, subject);
                if (
                    field == null ||
                    winner == null ||
                    !ruleOutputsEqual(
                        { [field]: rule.outputs[field] },
                        { [field]: winner.outputs[field] }
                    )
                )
                    redundant = false;
            }
            yield;
        }
        if (!surviving || redundant) collected.add(rule.id);
        if (collected.size >= limit) return collected;
        yield;
    }
    return collected;
}
