/**
 * Field-specific exact-description automation rule model and deterministic precedence engine.
 *
 * This is the HS-007 (P17A) redesign of automations. Unlike the legacy generic
 * `contains`/`regex` engine (`src/lib/domain/automation.ts`), a rule here sets up to three
 * transaction fields (description alias, tags, whole-person allocation) — its outputs — and
 * matches an EXACT raw description string, optionally narrowed to a specific account and/or exact
 * amount. Precedence is still evaluated per field: a rule competes only in the lattices of the
 * fields it has an output for.
 *
 * Since `specs/017-rule-reach` a rule also has a reach (all, from a date, or an explicit set of
 * transactions) that narrows which matching transactions it governs; reach is the most significant
 * precedence dimension, above the conditions.
 *
 * The engine is pure, total and order-independent: for any transaction the winning rule for a
 * field is fully determined by the rule set, never by iteration order.
 *
 * Serialisation (the Loro wire shape) lives in `src/lib/crdt/schema.ts`; this module owns the
 * domain types and validates at the boundary via {@link decodeFieldRule}.
 */

import { Temporal } from "temporal-polyfill";
import { z } from "zod";

import {
    asTransactionId,
    type TransactionId
} from "@/components/features/transactions/table-model/ids";
import {
    type AllocationValidationError,
    type ValidatedAllocationSet,
    validateAllocationSet
} from "@/lib/domain/allocation";
import { asMinorUnits, type MoneyMinorUnits } from "@/lib/domain/currency";
import { assertNever } from "@/lib/utils/exhaustive";

import { ruleCandidatesForText, type RuleSource } from "./rule-index";

// ============================================================================
// Branded identity and enums
// ============================================================================

/** Stable identity for a field rule. Branded so a raw string is never mistaken for a rule id. */
export const FieldRuleIdSchema = z.string().min(1).brand<"FieldRuleId">();
export type FieldRuleId = z.infer<typeof FieldRuleIdSchema>;

/** The transaction field a rule sets. Each field forms an independent precedence lattice. */
export const RuleFieldSchema = z.enum(["descriptionAlias", "tags", "allocation"]);
export type RuleField = z.infer<typeof RuleFieldSchema>;
export const RULE_FIELDS: readonly RuleField[] = RuleFieldSchema.options;

/** "add" merges with existing tags; "set" replaces them (clearing existing tags). */
export const TagRuleModeSchema = z.enum(["add", "set"]);
export type TagRuleMode = z.infer<typeof TagRuleModeSchema>;

// ============================================================================
// Domain rule model
// ============================================================================

export interface DescriptionAliasOutput {
    readonly aliasId: string;
}

export interface TagsOutput {
    readonly mode: TagRuleMode;
    readonly tagIds: readonly string[];
}

export interface AllocationOutput {
    readonly allocations: ValidatedAllocationSet;
}

interface RuleOutputSlots {
    readonly descriptionAlias: DescriptionAliasOutput;
    readonly tags: TagsOutput;
    readonly allocation: AllocationOutput;
}

/** Any subset of a rule's outputs, including none. Only an intermediate value while building one. */
export type PartialRuleOutputs = Partial<RuleOutputSlots>;

/**
 * What a rule sets: at least one, and at most one per field. The union of "this slot is present"
 * members makes a rule with zero outputs unrepresentable; use {@link nonEmptyRuleOutputs} to narrow
 * a {@link PartialRuleOutputs}.
 */
export type RuleOutputs = {
    readonly [F in RuleField]: Pick<RuleOutputSlots, F> & PartialRuleOutputs;
}[RuleField];

/**
 * One output viewed on its own, discriminated on `field`. Over the validated domain outputs by
 * default; over {@link RuleOutputsInput} it is one proposed output for a mutation to write.
 */
export type RuleOutputEntry<Outputs extends RuleOutputsInput = RuleOutputSlots> = {
    readonly [F in RuleField]: { readonly field: F; readonly output: NonNullable<Outputs[F]> };
}[RuleField];

/** The three ways a rule can reach transactions. */
export const RuleReachKindSchema = z.enum(["all", "from", "transactions"]);
export type RuleReachKind = z.infer<typeof RuleReachKindSchema>;
export const RULE_REACH_KINDS: readonly RuleReachKind[] = RuleReachKindSchema.options;

/**
 * Which of the transactions a rule's conditions match it governs (`specs/017-rule-reach` §2).
 *
 * - `all`: every matching transaction, past and future.
 * - `from`: every matching transaction dated on or after `date` (calendar date, inclusive),
 *   including future imports with such dates.
 * - `transactions`: an explicit set of transaction ids. It records where the rule was applied; it is
 *   never a match condition, so an id whose transaction no longer matches governs nothing.
 */
export type RuleReach =
    | { readonly kind: "all" }
    | { readonly kind: "from"; readonly date: Temporal.PlainDate }
    | { readonly kind: "transactions"; readonly ids: ReadonlySet<TransactionId> };

/** The reach every rule had before reach existed, and the default for a deliberate rule. */
export const RULE_REACH_ALL: RuleReach = { kind: "all" };

/**
 * An exact-description rule with one to three outputs.
 *
 * Matching is EXACT on {@link descriptionText}; `accountId` and `amount` are OPTIONAL narrowing
 * constraints. Absence of a constraint means "any". A more specific rule supersedes a broader
 * one via {@link ruleScopeRank}, field by field. {@link reach} narrows which matching transactions
 * the rule governs and outranks the conditions in precedence.
 */
export interface FieldRule {
    readonly id: FieldRuleId;
    /** Exact raw imported description text this rule keys on. Immutable once created. */
    readonly descriptionText: string;
    /** Optional account narrowing. `undefined` = applies to any account. */
    readonly accountId?: string;
    /** Optional exact-amount narrowing (minor units). `undefined` = applies to any amount. */
    readonly amount?: MoneyMinorUnits;
    readonly outputs: RuleOutputs;
    readonly reach: RuleReach;
    readonly createdAt: Temporal.Instant;
}

/** The transaction facts reach is tested against: identity for an explicit set, date for `from`. */
export interface RuleReachTarget {
    readonly id: TransactionId;
    readonly date: Temporal.PlainDate;
}

/** Whether `rule`'s reach includes `transaction`. Says nothing about whether its conditions match. */
export function ruleReaches(rule: Pick<FieldRule, "reach">, transaction: RuleReachTarget): boolean {
    const { reach } = rule;
    switch (reach.kind) {
        case "all":
            return true;
        case "from":
            return isOnOrAfterTransactionDate(transaction.date, reach.date);
        case "transactions":
            return reach.ids.has(transaction.id);
        default:
            return assertNever(reach, "rule reach");
    }
}

/** True iff both reaches govern exactly the same transactions. Explicit sets compare as sets. */
export function ruleReachesEqual(left: RuleReach, right: RuleReach): boolean {
    switch (left.kind) {
        case "all":
            return right.kind === "all";
        case "from":
            return right.kind === "from" && Temporal.PlainDate.compare(left.date, right.date) === 0;
        case "transactions":
            return (
                right.kind === "transactions" &&
                left.ids.size === right.ids.size &&
                [...left.ids].every((id) => right.ids.has(id))
            );
        default:
            return assertNever(left, "rule reach");
    }
}

/** True iff two explicit sets share an id. Any other reach shares no id with anything. */
function explicitReachesOverlap(left: RuleReach, right: RuleReach): boolean {
    if (left.kind !== "transactions" || right.kind !== "transactions") return false;
    const [smaller, larger] =
        left.ids.size <= right.ids.size ? [left.ids, right.ids] : [right.ids, left.ids];
    for (const id of smaller) if (larger.has(id)) return true;
    return false;
}

/** Narrow a possibly-empty output set to {@link RuleOutputs}, or `null` when it has no output. */
export function nonEmptyRuleOutputs(outputs: PartialRuleOutputs): RuleOutputs | null {
    if (outputs.descriptionAlias != null) {
        return { ...outputs, descriptionAlias: outputs.descriptionAlias };
    }
    if (outputs.tags != null) return { ...outputs, tags: outputs.tags };
    if (outputs.allocation != null) return { ...outputs, allocation: outputs.allocation };
    return null;
}

/** The fields a rule has an output for, in {@link RULE_FIELDS} order. Never empty. */
export function ruleOutputFields(rule: Pick<FieldRule, "outputs">): readonly RuleField[] {
    return RULE_FIELDS.filter((field) => rule.outputs[field] != null);
}

/** The rule's output for `field` as a {@link RuleOutputEntry}, or `null` if it has none. */
export function ruleOutput(
    rule: Pick<FieldRule, "outputs">,
    field: RuleField
): RuleOutputEntry | null {
    switch (field) {
        case "descriptionAlias": {
            const output = rule.outputs.descriptionAlias;
            return output == null ? null : { field, output };
        }
        case "tags": {
            const output = rule.outputs.tags;
            return output == null ? null : { field, output };
        }
        case "allocation": {
            const output = rule.outputs.allocation;
            return output == null ? null : { field, output };
        }
        default:
            return assertNever(field);
    }
}

/** `outputs` without its `field` output. Empty when that was the only one. */
export function withoutRuleOutput(outputs: RuleOutputs, field: RuleField): PartialRuleOutputs {
    const { descriptionAlias, tags, allocation } = outputs;
    return {
        ...(field === "descriptionAlias" || descriptionAlias == null ? {} : { descriptionAlias }),
        ...(field === "tags" || tags == null ? {} : { tags }),
        ...(field === "allocation" || allocation == null ? {} : { allocation })
    };
}

/** The rule's match conditions: what makes two rules cover exactly the same transactions. */
export interface RulePredicate {
    readonly descriptionText: string;
    readonly accountId?: string;
    readonly amount?: MoneyMinorUnits;
}

/** True iff both predicates cover exactly the same population. Zero is a present amount. */
export function rulePredicatesEqual(left: RulePredicate, right: RulePredicate): boolean {
    return (
        left.descriptionText === right.descriptionText &&
        (left.accountId ?? null) === (right.accountId ?? null) &&
        (left.amount ?? null) === (right.amount ?? null)
    );
}

// ============================================================================
// Precedence and uniqueness
// ============================================================================

/**
 * Reach rank, the most significant precedence dimension: an explicit set (1) beats a date or all
 * reach (0) on the rows in its set, so a one-row edit is an exception to a wider rule rather than a
 * collision with it. Date and all reach share a rank and fall through to the conditions.
 */
export type RuleReachRank = 0 | 1;

export function ruleReachRank(rule: Pick<FieldRule, "reach">): RuleReachRank {
    return rule.reach.kind === "transactions" ? 1 : 0;
}

/**
 * Scope specificity rank encoding the frozen natural precedence:
 * unscoped (0) < amount-scoped (1) < account-scoped (2) < account+amount-scoped (3).
 * Compared only between rules of equal {@link ruleReachRank}.
 */
export type RuleScopeRank = 0 | 1 | 2 | 3;

export function ruleScopeRank(rule: Pick<FieldRule, "accountId" | "amount">): RuleScopeRank {
    const accountBit = rule.accountId == null ? 0 : 2;
    const amountBit = rule.amount == null ? 0 : 1;
    const rank = accountBit + amountBit;
    // rank is provably one of 0 | 1 | 2 | 3 by construction.
    return rank === 0 ? 0 : rank === 1 ? 1 : rank === 2 ? 2 : 3;
}

/**
 * Canonical uniqueness key of one output's slot: field, exact description text, (account, amount)
 * scope and reach kind (`specs/017-rule-reach` §2.2). At most one output per field per conditions
 * slot per reach kind, so an `all` rule, a `from` rule and explicit-set rules on one slot coexist.
 * Explicit-set rules sharing a key collide only when their sets intersect: see
 * {@link rulesShareUniquenessSlot}. Two rules with identical conditions and disjoint outputs
 * coexist.
 */
export const RuleUniquenessKeySchema = z.string().brand<"RuleUniquenessKey">();
export type RuleUniquenessKey = z.infer<typeof RuleUniquenessKeySchema>;

/** What determines a rule's uniqueness slots: its conditions and its reach. */
export type RuleSlotOwner = RulePredicate & Pick<FieldRule, "reach">;

/** The uniqueness key of `owner`'s slot for `field`. */
export function ruleUniquenessKeyFor(field: RuleField, owner: RuleSlotOwner): RuleUniquenessKey {
    // JSON tuple encoding avoids delimiter collisions in free-form text/ids.
    const encoded = JSON.stringify([
        field,
        owner.descriptionText,
        owner.accountId ?? null,
        owner.amount ?? null,
        owner.reach.kind
    ]);
    return RuleUniquenessKeySchema.parse(encoded);
}

/** One uniqueness key per output the rule carries. */
export function ruleUniquenessKeys(rule: FieldRule): readonly RuleUniquenessKey[] {
    return ruleOutputFields(rule).map((field) => ruleUniquenessKeyFor(field, rule));
}

/**
 * Whether two rules holding the same uniqueness key actually collide: always, unless both are
 * explicit-set rules with disjoint sets, which govern different rows and so never compete.
 */
export function uniquenessHoldersCollide(left: RuleSlotOwner, right: RuleSlotOwner): boolean {
    if (left.reach.kind === "transactions" && right.reach.kind === "transactions") {
        return explicitReachesOverlap(left.reach, right.reach);
    }
    return true;
}

/** Whether `left` and `right` would both hold the uniqueness slot of `field`. */
export function rulesShareUniquenessSlot(
    left: RuleSlotOwner & Pick<FieldRule, "outputs">,
    right: RuleSlotOwner & Pick<FieldRule, "outputs">,
    field: RuleField
): boolean {
    if (left.outputs[field] == null || right.outputs[field] == null) return false;
    return (
        ruleUniquenessKeyFor(field, left) === ruleUniquenessKeyFor(field, right) &&
        uniquenessHoldersCollide(left, right)
    );
}

/**
 * Group rules by uniqueness key. A rule appears under each of its keys. A bucket with two rules
 * whose holders collide ({@link uniquenessHoldersCollide}) is a uniqueness violation; disjoint
 * explicit-set rules share a bucket legitimately.
 */
export function groupRulesByUniquenessKey(
    rules: readonly FieldRule[]
): ReadonlyMap<RuleUniquenessKey, readonly FieldRule[]> {
    const grouped = new Map<RuleUniquenessKey, FieldRule[]>();
    for (const rule of rules) {
        for (const key of ruleUniquenessKeys(rule)) {
            const bucket = grouped.get(key);
            if (bucket) bucket.push(rule);
            else grouped.set(key, [rule]);
        }
    }
    return grouped;
}

/** True iff no two rules collide on a uniqueness slot. */
export function hasUniqueRuleKeys(rules: readonly FieldRule[]): boolean {
    return [...groupRulesByUniquenessKey(rules).values()].every((bucket) =>
        bucket.every((rule, index) =>
            bucket.slice(index + 1).every((other) => !uniquenessHoldersCollide(rule, other))
        )
    );
}

/**
 * Deterministically de-duplicate a rule set so at most one rule occupies each uniqueness slot.
 * Rules are taken most recent first (ties on the lexicographically greatest id), and a rule survives
 * only if none of its slots is already held. For single-output rules this is exactly "the most
 * recent rule per slot wins"; for grouped rules it never keeps a rule that would share a slot. The
 * result is independent of input order.
 */
export function dedupeRulesByUniqueness(rules: readonly FieldRule[]): readonly FieldRule[] {
    const byRecencyDescending = [...rules].sort((left, right) => compareRuleRecency(right, left));
    const holders = new Map<RuleUniquenessKey, FieldRule[]>();
    const survivors: FieldRule[] = [];
    for (const rule of byRecencyDescending) {
        const keys = ruleUniquenessKeys(rule);
        const collides = keys.some((key) =>
            (holders.get(key) ?? []).some((held) => uniquenessHoldersCollide(held, rule))
        );
        if (collides) continue;
        for (const key of keys) {
            const held = holders.get(key);
            if (held == null) holders.set(key, [rule]);
            else held.push(rule);
        }
        survivors.push(rule);
    }
    return survivors;
}

function compareRuleRecency(left: FieldRule, right: FieldRule): number {
    const byCreated = Temporal.Instant.compare(left.createdAt, right.createdAt);
    if (byCreated !== 0) return byCreated;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

// ============================================================================
// Matching
// ============================================================================

/**
 * The transaction facts a rule matches against. Callers project a transaction (imported or
 * manual) into this subject; alias-aware description resolution is the caller's concern.
 *
 * - `descriptionText` is the exact text to match. `null` means the transaction exposes no
 *   matchable description (e.g. a manual row without raw import text), which matches nothing.
 * - `isManual` gates field eligibility: description-alias rules never touch manual rows; tag and
 *   allocation rules do.
 * - `transactionId` and `date` are what a rule's reach is tested against; they never affect
 *   whether its conditions match.
 */
export interface RuleMatchSubject {
    readonly transactionId: TransactionId;
    readonly date: Temporal.PlainDate;
    readonly descriptionText: string | null;
    readonly accountId: string;
    /** `undefined` when the amount is blank, which never satisfies an amount-scoped rule. */
    readonly amount: MoneyMinorUnits | undefined;
    readonly isManual: boolean;
}

export interface RuleMatchTransactionFacts {
    readonly transactionId: string;
    readonly date: Temporal.PlainDate;
    readonly accountId: string;
    readonly amount: MoneyMinorUnits | undefined;
    readonly description: string;
    readonly importId: string | undefined;
    readonly resolvedAliasName: string | null;
}

/** Project imported provenance or a resolved manual alias into the match engine's canonical subject. */
export function projectRuleMatchSubject(facts: RuleMatchTransactionFacts): RuleMatchSubject {
    const isManual = facts.importId == null;
    const candidate = isManual ? facts.resolvedAliasName : facts.description;
    return {
        transactionId: asTransactionId(facts.transactionId),
        date: facts.date,
        accountId: facts.accountId,
        amount: facts.amount,
        descriptionText: candidate != null && candidate.length > 0 ? candidate : null,
        isManual
    };
}

/** Whether a manual transaction is eligible for rules of the given field. */
export function fieldAppliesToManual(field: RuleField): boolean {
    switch (field) {
        case "descriptionAlias":
            return false;
        case "tags":
        case "allocation":
            return true;
        default:
            return assertNever(field);
    }
}

/**
 * Exact, side-effect-free test of the rule's conditions (text, account, amount) against a subject.
 * Field eligibility for manual rows is per output, so it lives in {@link selectWinningRule}.
 */
export function ruleMatchesSubject(rule: RulePredicate, subject: RuleMatchSubject): boolean {
    if (subject.descriptionText == null) return false;
    if (rule.descriptionText !== subject.descriptionText) return false;
    if (rule.accountId != null && rule.accountId !== subject.accountId) return false;
    if (rule.amount != null && rule.amount !== subject.amount) return false;
    return true;
}

/**
 * Whether `rule` governs the subject's transaction: its conditions match AND its reach includes the
 * transaction. Reach only narrows what the conditions match; it never widens it.
 */
export function ruleGoverns(
    rule: RulePredicate & Pick<FieldRule, "reach">,
    subject: RuleMatchSubject
): boolean {
    return (
        ruleMatchesSubject(rule, subject) &&
        ruleReaches(rule, { id: subject.transactionId, date: subject.date })
    );
}

/**
 * Precedence between two rules competing for one field on one row: reach rank first, then the
 * conditions' scope rank. Positive when `left` outranks `right`; zero is a tie for recency to break.
 */
export function compareRulePrecedence(
    left: Pick<FieldRule, "reach" | "accountId" | "amount">,
    right: Pick<FieldRule, "reach" | "accountId" | "amount">
): number {
    const byReach = ruleReachRank(left) - ruleReachRank(right);
    if (byReach !== 0) return byReach;
    return ruleScopeRank(left) - ruleScopeRank(right);
}

/**
 * The single highest-precedence rule with an output for `field` governing `subject`, or `null` if
 * none does. A field a manual row is ineligible for never has a winner on that row.
 * Pure and order-independent: a strictly higher precedence ({@link compareRulePrecedence}) wins; a
 * tie breaks on recency then id so the winner is always deterministic. A tie needs a uniqueness
 * violation, or an `all` and a `from` rule on one slot, which §2.2 lets coexist.
 *
 * `rules` may be a {@link RuleSource} index: it only narrows which rules are visited to those that
 * share the subject's text, every one of which this loop would have tested anyway.
 */
export function selectWinningRule(
    rules: RuleSource,
    field: RuleField,
    subject: RuleMatchSubject
): FieldRule | null {
    if (subject.isManual && !fieldAppliesToManual(field)) return null;
    let winner: FieldRule | null = null;
    for (const rule of ruleCandidatesForText(rules, subject.descriptionText)) {
        if (rule.outputs[field] == null) continue;
        if (!ruleGoverns(rule, subject)) continue;
        if (winner == null) {
            winner = rule;
            continue;
        }
        const byRank = compareRulePrecedence(rule, winner);
        if (byRank > 0 || (byRank === 0 && compareRuleRecency(rule, winner) > 0)) winner = rule;
    }
    return winner;
}

/** Winning rule per field for a subject. Missing keys mean no rule of that field matched. */
export function selectWinningRulesByField(
    rules: RuleSource,
    subject: RuleMatchSubject
): Readonly<Partial<Record<RuleField, FieldRule>>> {
    const result: Partial<Record<RuleField, FieldRule>> = {};
    for (const field of RULE_FIELDS) {
        const winner = selectWinningRule(rules, field, subject);
        if (winner != null) result[field] = winner;
    }
    return result;
}

// ============================================================================
// Date / import boundary semantics
// ============================================================================

/**
 * "Update new" semantics: a transaction is in scope iff its CALENDAR date is on or after the
 * reference date. The cutoff is inclusive so a row dated the same day as the edited one is updated
 * too (the saved plan's acceptance criterion; the older scratch note said strictly later).
 * `Temporal.PlainDate` carries no time or zone, so this is free of locale and timezone ambiguity.
 */
export function isOnOrAfterTransactionDate(
    candidate: Temporal.PlainDate,
    reference: Temporal.PlainDate
): boolean {
    return Temporal.PlainDate.compare(candidate, reference) >= 0;
}

// ============================================================================
// Tag application semantics
// ============================================================================

/**
 * Resolve the final tag set a tags rule produces. "set" replaces existing tags entirely; "add"
 * unions the rule's tags onto the existing set. Both preserve first-seen order and de-duplicate,
 * making repeated application idempotent and convergent.
 */
export function resolveTagRuleResult(
    currentTagIds: readonly string[],
    output: TagsOutput
): readonly string[] {
    switch (output.mode) {
        case "set":
            return dedupePreservingOrder(output.tagIds);
        case "add":
            return dedupePreservingOrder([...currentTagIds, ...output.tagIds]);
        default:
            return assertNever(output.mode);
    }
}

function dedupePreservingOrder(values: readonly string[]): readonly string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
        if (seen.has(value)) continue;
        seen.add(value);
        result.push(value);
    }
    return result;
}

// ============================================================================
// Boundary decode (wire -> domain)
// ============================================================================

export type FieldRuleDecodeError =
    | { readonly type: "invalid-shape"; readonly issues: readonly string[] }
    | {
          readonly type: "invalid-allocations";
          readonly errors: readonly AllocationValidationError[];
      };

export type FieldRuleDecodeResult =
    | { readonly ok: true; readonly value: FieldRule }
    | { readonly ok: false; readonly error: FieldRuleDecodeError };

/** The scalar columns every rule has, independent of its outputs. */
const FieldRuleScalarsSchema = z.object({
    id: FieldRuleIdSchema,
    descriptionText: z.string(),
    accountId: z.string().min(1).optional(),
    amount: z.number().int().optional(),
    createdAtEpochMs: z.number().int()
});

/**
 * Wire fields. `field` is the legacy single-output marker and is always written as the rule's first
 * output field, so a reader that predates `outputFields` still decodes one output. `outputFields`
 * lists every output; when absent or empty (every record written before grouped rules) the rule has
 * exactly the one output named by `field`.
 */
const FieldRuleWireBaseSchema = FieldRuleScalarsSchema.extend({
    field: RuleFieldSchema,
    outputFields: z.array(RuleFieldSchema).optional(),
    aliasId: z.string().optional(),
    tagMode: TagRuleModeSchema.optional(),
    tagIds: z.array(z.string()).optional(),
    allocations: z.record(z.string(), z.unknown()).optional(),
    /** Absent on every record written before reach existed, which therefore reaches `all`. */
    reachKind: RuleReachKindSchema.optional(),
    reachFromDate: z.instanceof(Temporal.PlainDate).optional(),
    /** The explicit set as a Loro map of id -> true, so concurrent additions merge as a union. */
    reachTransactionIds: z.record(z.string(), z.unknown()).optional()
});

/**
 * Unvalidated outputs: what an editor or a wire record proposes before the boundary checks it.
 * `AllocationValue` is `unknown` for wire records and `number` for typed editor input.
 */
export interface RuleOutputsInput<AllocationValue = unknown> {
    readonly descriptionAlias?: { readonly aliasId: string };
    readonly tags?: { readonly mode: TagRuleMode; readonly tagIds: readonly string[] };
    readonly allocation?: { readonly allocations: Readonly<Record<string, AllocationValue>> };
}

/**
 * Validate proposed outputs into {@link RuleOutputs}: at least one output, a non-empty alias id, and
 * a whole valid allocation set. Tag ids are de-duplicated preserving order. Rejects (rather than
 * clamps) any invalid allocation set so a malformed complete-set can never be silently normalised.
 * The single validation path for both wire decode and the CRUD mutations.
 */
export function validateRuleOutputs(
    input: RuleOutputsInput
):
    | { readonly ok: true; readonly value: RuleOutputs }
    | { readonly ok: false; readonly error: FieldRuleDecodeError } {
    const outputs: { -readonly [F in RuleField]?: RuleOutputSlots[F] } = {};
    if (input.descriptionAlias != null) {
        if (input.descriptionAlias.aliasId.length === 0) {
            return invalidShapeError(["descriptionAlias output requires a non-empty aliasId"]);
        }
        outputs.descriptionAlias = { aliasId: input.descriptionAlias.aliasId };
    }
    if (input.tags != null) {
        outputs.tags = {
            mode: input.tags.mode,
            tagIds: dedupePreservingOrder(input.tags.tagIds)
        };
    }
    if (input.allocation != null) {
        const validated = validateAllocationSet(input.allocation.allocations);
        if (!validated.ok) {
            return { ok: false, error: { type: "invalid-allocations", errors: validated.errors } };
        }
        outputs.allocation = { allocations: validated.value };
    }
    const nonEmpty = nonEmptyRuleOutputs(outputs);
    if (nonEmpty == null) return invalidShapeError(["a rule requires at least one output"]);
    return { ok: true, value: nonEmpty };
}

type FieldRuleWireBase = z.infer<typeof FieldRuleWireBaseSchema>;

/** Project the wire columns for each listed output field into an unvalidated outputs input. */
function wireOutputsInput(
    base: FieldRuleWireBase
):
    | { readonly ok: true; readonly value: RuleOutputsInput }
    | { readonly ok: false; readonly error: FieldRuleDecodeError } {
    const fields =
        base.outputFields != null && base.outputFields.length > 0
            ? base.outputFields
            : [base.field];
    const input: { -readonly [K in keyof RuleOutputsInput]: RuleOutputsInput[K] } = {};
    for (const field of fields) {
        switch (field) {
            case "descriptionAlias":
                if (base.aliasId == null || base.aliasId.length === 0) {
                    return invalidShapeError([
                        "descriptionAlias rule requires a non-empty aliasId"
                    ]);
                }
                input.descriptionAlias = { aliasId: base.aliasId };
                break;
            case "tags":
                if (base.tagMode == null) {
                    return invalidShapeError(["tags rule requires a tagMode"]);
                }
                input.tags = { mode: base.tagMode, tagIds: base.tagIds ?? [] };
                break;
            case "allocation":
                input.allocation = { allocations: base.allocations ?? {} };
                break;
            default:
                return assertNever(field);
        }
    }
    return { ok: true, value: input };
}

type FieldRuleWireReach = Pick<
    FieldRuleWireBase,
    "reachKind" | "reachFromDate" | "reachTransactionIds"
>;

/**
 * Project the wire reach columns into a {@link RuleReach}. A record without `reachKind` reaches
 * `all`. The id map's `$cid` bookkeeping key and any entry not set to `true` are not members.
 */
function wireReach(
    base: FieldRuleWireReach
):
    | { readonly ok: true; readonly value: RuleReach }
    | { readonly ok: false; readonly error: FieldRuleDecodeError } {
    switch (base.reachKind) {
        case undefined:
        case "all":
            return { ok: true, value: RULE_REACH_ALL };
        case "from":
            if (base.reachFromDate == null) {
                return invalidShapeError(["a from-date reach requires reachFromDate"]);
            }
            return { ok: true, value: { kind: "from", date: base.reachFromDate } };
        case "transactions": {
            const ids = new Set<TransactionId>();
            for (const [id, member] of Object.entries(base.reachTransactionIds ?? {})) {
                if (id !== "$cid" && member === true) ids.add(asTransactionId(id));
            }
            return { ok: true, value: { kind: "transactions", ids } };
        }
        default:
            return assertNever(base.reachKind, "reach kind");
    }
}

/** An unvalidated rule as an editor or a wire record proposes it. */
export interface FieldRuleCandidate<AllocationValue = unknown> {
    readonly id: string;
    /** Exact raw imported description text. Immutable once created (frozen model). */
    readonly descriptionText: string;
    /** Optional account narrowing (absent = any account). */
    readonly accountId?: string;
    /** Optional exact-amount narrowing in minor units (absent = any amount). */
    readonly amount?: number;
    readonly outputs: RuleOutputsInput<AllocationValue>;
    /** Absent means `all`: a rule written deliberately governs every matching transaction. */
    readonly reach?: RuleReach;
    readonly createdAtEpochMs: number;
}

/**
 * Validate a candidate into the rich domain model: the one constructor every rule passes through,
 * whether it is decoded from the wire or written by a mutation.
 */
export function buildFieldRule(candidate: FieldRuleCandidate): FieldRuleDecodeResult {
    const scalars = FieldRuleScalarsSchema.safeParse(candidate);
    if (!scalars.success) return invalidShapeError(scalars.error.issues.map((i) => i.message));
    const outputs = validateRuleOutputs(candidate.outputs);
    if (!outputs.ok) return outputs;
    const { id, descriptionText, accountId, amount, createdAtEpochMs } = scalars.data;
    return {
        ok: true,
        value: {
            id,
            descriptionText,
            accountId,
            amount: amount == null ? undefined : asMinorUnits(amount),
            outputs: outputs.value,
            reach: candidate.reach ?? RULE_REACH_ALL,
            createdAt: Temporal.Instant.fromEpochMilliseconds(createdAtEpochMs)
        }
    };
}

/**
 * Validate a serialised rule into the rich domain model. A record without `outputFields` (written
 * before grouped rules) decodes to exactly the one output its `field` names, as it always did.
 */
export function decodeFieldRule(wire: unknown): FieldRuleDecodeResult {
    const parsed = FieldRuleWireBaseSchema.safeParse(wire);
    if (!parsed.success) return invalidShapeError(parsed.error.issues.map((i) => i.message));
    const outputs = wireOutputsInput(parsed.data);
    if (!outputs.ok) return outputs;
    const reach = wireReach(parsed.data);
    if (!reach.ok) return reach;
    return buildFieldRule({ ...parsed.data, outputs: outputs.value, reach: reach.value });
}

/**
 * The reach of a serialised rule on its own, for a writer that must preserve it while rewriting a
 * record whose outputs may not decode. `null` when the reach columns themselves are malformed.
 */
export function decodeFieldRuleReach(wire: unknown): RuleReach | null {
    const parsed = FieldRuleWireBaseSchema.pick({
        reachKind: true,
        reachFromDate: true,
        reachTransactionIds: true
    }).safeParse(wire);
    if (!parsed.success) return null;
    const reach = wireReach(parsed.data);
    return reach.ok ? reach.value : null;
}

/**
 * Plain serialised shape of a field rule (the Loro wire object). This is the exact inverse of
 * {@link decodeFieldRule}: `encodeFieldRule(rule)` produces an object that decodes back to `rule`.
 * Output columns for fields the rule has no output for are emitted empty (never as stale values).
 */
export interface FieldRuleWireObject {
    readonly id: string;
    readonly field: RuleField;
    readonly outputFields: readonly RuleField[];
    readonly descriptionText: string;
    readonly accountId?: string;
    readonly amount?: number;
    readonly aliasId?: string;
    readonly tagMode?: TagRuleMode;
    readonly tagIds: readonly string[];
    readonly allocations: Readonly<Record<string, number>>;
    readonly reachKind: RuleReachKind;
    readonly reachFromDate?: Temporal.PlainDate;
    /** Emitted empty for a reach that is not an explicit set, like an absent output's columns. */
    readonly reachTransactionIds: Readonly<Record<string, true>>;
    readonly createdAtEpochMs: number;
    readonly deletedAtEpochMs?: number;
}

/** The first output field in {@link RULE_FIELDS} order; what the legacy `field` marker carries. */
export function primaryOutputField(outputs: RuleOutputs): RuleField {
    if (outputs.descriptionAlias != null) return "descriptionAlias";
    if (outputs.tags != null) return "tags";
    // RuleOutputs guarantees one slot is present, so a rule with neither of the above has this one.
    return "allocation";
}

/**
 * Serialise a domain rule into its wire object. Pure and total; the round-trip
 * `decodeFieldRule(encodeFieldRule(rule))` is the identity on valid rules. This is the only wire
 * writer for field rules.
 */
export function encodeFieldRule(rule: FieldRule): FieldRuleWireObject {
    const { descriptionAlias, tags, allocation } = rule.outputs;
    return {
        id: rule.id,
        field: primaryOutputField(rule.outputs),
        outputFields: ruleOutputFields(rule),
        descriptionText: rule.descriptionText,
        accountId: rule.accountId,
        amount: rule.amount,
        aliasId: descriptionAlias?.aliasId,
        tagMode: tags?.mode,
        tagIds: tags == null ? [] : [...tags.tagIds],
        allocations: allocation == null ? {} : { ...allocation.allocations },
        reachKind: rule.reach.kind,
        reachFromDate: rule.reach.kind === "from" ? rule.reach.date : undefined,
        reachTransactionIds:
            rule.reach.kind === "transactions"
                ? Object.fromEntries([...rule.reach.ids].map((id) => [id, true] as const))
                : {},
        createdAtEpochMs: rule.createdAt.epochMilliseconds
    };
}

function invalidShapeError(issues: readonly string[]): {
    readonly ok: false;
    readonly error: FieldRuleDecodeError;
} {
    return { ok: false, error: { type: "invalid-shape", issues } };
}
