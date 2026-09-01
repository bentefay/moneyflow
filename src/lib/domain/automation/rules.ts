/**
 * Field-specific exact-description automation rule model and deterministic precedence engine.
 *
 * This is the HS-007 (P17A) redesign of automations. Unlike the legacy generic
 * `contains`/`regex` engine (`src/lib/domain/automation.ts`), a rule here targets a single
 * transaction field (description alias, tags, or whole-person allocation) and matches an
 * EXACT raw description string, optionally narrowed to a specific account and/or exact amount.
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
    type AllocationValidationError,
    type ValidatedAllocationSet,
    validateAllocationSet
} from "@/lib/domain/allocation";
import { asMinorUnits, type MoneyMinorUnits } from "@/lib/domain/currency";
import { assertNever } from "@/lib/utils/exhaustive";

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
// Domain rule model (illegal states unrepresentable via discriminated action)
// ============================================================================

/**
 * The action a rule performs. Discriminated on `field` so a rule can never simultaneously
 * carry, say, an alias id and a tag set.
 */
export type RuleAction =
    | { readonly field: "descriptionAlias"; readonly aliasId: string }
    | { readonly field: "tags"; readonly mode: TagRuleMode; readonly tagIds: readonly string[] }
    | { readonly field: "allocation"; readonly allocations: ValidatedAllocationSet };

/**
 * A field-specific exact-description rule.
 *
 * Matching is EXACT on {@link descriptionText}; `accountId` and `amount` are OPTIONAL narrowing
 * constraints. Absence of a constraint means "any". A more specific rule supersedes a broader
 * one via {@link ruleScopeRank}.
 */
export interface FieldRule {
    readonly id: FieldRuleId;
    /** Exact raw imported description text this rule keys on. Immutable once created. */
    readonly descriptionText: string;
    /** Optional account narrowing. `undefined` = applies to any account. */
    readonly accountId?: string;
    /** Optional exact-amount narrowing (minor units). `undefined` = applies to any amount. */
    readonly amount?: MoneyMinorUnits;
    readonly action: RuleAction;
    readonly createdAt: Temporal.Instant;
}

// ============================================================================
// Precedence and uniqueness
// ============================================================================

/**
 * Scope specificity rank encoding the frozen natural precedence:
 * unscoped (0) < amount-scoped (1) < account-scoped (2) < account+amount-scoped (3).
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
 * Canonical uniqueness key. Two rules collide iff they target the same field, exact description
 * text and identical (account, amount) scope. Frozen: at most ONE rule per description text with
 * no account/amount constraint (the rank-0 slot), and one per each more specific scope.
 */
export const RuleUniquenessKeySchema = z.string().brand<"RuleUniquenessKey">();
export type RuleUniquenessKey = z.infer<typeof RuleUniquenessKeySchema>;

export function ruleUniquenessKey(rule: FieldRule): RuleUniquenessKey {
    // JSON tuple encoding avoids delimiter collisions in free-form text/ids.
    const encoded = JSON.stringify([
        rule.action.field,
        rule.descriptionText,
        rule.accountId ?? null,
        rule.amount ?? null
    ]);
    return RuleUniquenessKeySchema.parse(encoded);
}

/** Group rules by uniqueness key. A key mapping to >1 rule is a uniqueness violation. */
export function groupRulesByUniquenessKey(
    rules: readonly FieldRule[]
): ReadonlyMap<RuleUniquenessKey, readonly FieldRule[]> {
    const grouped = new Map<RuleUniquenessKey, FieldRule[]>();
    for (const rule of rules) {
        const key = ruleUniquenessKey(rule);
        const bucket = grouped.get(key);
        if (bucket) bucket.push(rule);
        else grouped.set(key, [rule]);
    }
    return grouped;
}

/** True iff no two rules share a uniqueness key. */
export function hasUniqueRuleKeys(rules: readonly FieldRule[]): boolean {
    return [...groupRulesByUniquenessKey(rules).values()].every((bucket) => bucket.length === 1);
}

/**
 * Deterministically de-duplicate a rule set so at most one rule occupies each uniqueness slot.
 * The survivor is the most recently created; ties break on the lexicographically greatest id so
 * the result is independent of input order.
 */
export function dedupeRulesByUniqueness(rules: readonly FieldRule[]): readonly FieldRule[] {
    const survivors = new Map<RuleUniquenessKey, FieldRule>();
    for (const rule of rules) {
        const key = ruleUniquenessKey(rule);
        const current = survivors.get(key);
        if (current == null || compareRuleRecency(rule, current) > 0) survivors.set(key, rule);
    }
    return [...survivors.values()];
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
 */
export interface RuleMatchSubject {
    readonly descriptionText: string | null;
    readonly accountId: string;
    readonly amount: MoneyMinorUnits;
    readonly isManual: boolean;
}

export interface RuleMatchTransactionFacts {
    readonly accountId: string;
    readonly amount: MoneyMinorUnits;
    readonly description: string;
    readonly importId: string | undefined;
    readonly resolvedAliasName: string | null;
}

/** Project imported provenance or a resolved manual alias into the match engine's canonical subject. */
export function projectRuleMatchSubject(facts: RuleMatchTransactionFacts): RuleMatchSubject {
    const isManual = facts.importId == null;
    const candidate = isManual ? facts.resolvedAliasName : facts.description;
    return {
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

/** Exact, side-effect-free match test. */
export function ruleMatchesSubject(rule: FieldRule, subject: RuleMatchSubject): boolean {
    if (subject.isManual && !fieldAppliesToManual(rule.action.field)) return false;
    if (subject.descriptionText == null) return false;
    if (rule.descriptionText !== subject.descriptionText) return false;
    if (rule.accountId != null && rule.accountId !== subject.accountId) return false;
    if (rule.amount != null && rule.amount !== subject.amount) return false;
    return true;
}

/**
 * The single highest-precedence rule of `field` matching `subject`, or `null` if none match.
 * Pure and order-independent: a strictly higher scope rank wins; a rank tie (only possible with a
 * uniqueness violation) breaks on recency then id so the winner is always deterministic.
 */
export function selectWinningRule(
    rules: readonly FieldRule[],
    field: RuleField,
    subject: RuleMatchSubject
): FieldRule | null {
    let winner: FieldRule | null = null;
    for (const rule of rules) {
        if (rule.action.field !== field) continue;
        if (!ruleMatchesSubject(rule, subject)) continue;
        if (winner == null) {
            winner = rule;
            continue;
        }
        const byRank = ruleScopeRank(rule) - ruleScopeRank(winner);
        if (byRank > 0 || (byRank === 0 && compareRuleRecency(rule, winner) > 0)) winner = rule;
    }
    return winner;
}

/** Winning rule per field for a subject. Missing keys mean no rule of that field matched. */
export function selectWinningRulesByField(
    rules: readonly FieldRule[],
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
 * Frozen "new / newer" semantics: a transaction is newer than the reference iff its CALENDAR date
 * is strictly greater. `Temporal.PlainDate` carries no time or zone, so this is free of locale and
 * timezone ambiguity. "update new" applies only to transactions for which this returns true.
 */
export function isNewerTransactionDate(
    candidate: Temporal.PlainDate,
    reference: Temporal.PlainDate
): boolean {
    return Temporal.PlainDate.compare(candidate, reference) > 0;
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
    action: Extract<RuleAction, { field: "tags" }>
): readonly string[] {
    switch (action.mode) {
        case "set":
            return dedupePreservingOrder(action.tagIds);
        case "add":
            return dedupePreservingOrder([...currentTagIds, ...action.tagIds]);
        default:
            return assertNever(action.mode);
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

/** Base wire fields shared by every rule, independent of action. */
const FieldRuleWireBaseSchema = z.object({
    id: FieldRuleIdSchema,
    field: RuleFieldSchema,
    descriptionText: z.string(),
    accountId: z.string().min(1).optional(),
    amount: z.number().int().optional(),
    aliasId: z.string().optional(),
    tagMode: TagRuleModeSchema.optional(),
    tagIds: z.array(z.string()).optional(),
    allocations: z.record(z.string(), z.unknown()).optional(),
    createdAtEpochMs: z.number().int()
});

/**
 * Validate a serialised rule into the rich domain model. Rejects (rather than clamps) any invalid
 * allocation set so a malformed complete-set can never be silently normalised.
 */
export function decodeFieldRule(wire: unknown): FieldRuleDecodeResult {
    const parsed = FieldRuleWireBaseSchema.safeParse(wire);
    if (!parsed.success) {
        return {
            ok: false,
            error: { type: "invalid-shape", issues: parsed.error.issues.map((i) => i.message) }
        };
    }
    const base = parsed.data;
    const scope = {
        accountId: base.accountId,
        amount: base.amount == null ? undefined : asMinorUnits(base.amount)
    } satisfies Pick<FieldRule, "accountId" | "amount">;
    const createdAt = Temporal.Instant.fromEpochMilliseconds(base.createdAtEpochMs);

    switch (base.field) {
        case "descriptionAlias": {
            if (base.aliasId == null || base.aliasId.length === 0) {
                return invalidShape(["descriptionAlias rule requires a non-empty aliasId"]);
            }
            return okRule({
                id: base.id,
                descriptionText: base.descriptionText,
                ...scope,
                action: { field: "descriptionAlias", aliasId: base.aliasId },
                createdAt
            });
        }
        case "tags": {
            if (base.tagMode == null) {
                return invalidShape(["tags rule requires a tagMode"]);
            }
            return okRule({
                id: base.id,
                descriptionText: base.descriptionText,
                ...scope,
                action: {
                    field: "tags",
                    mode: base.tagMode,
                    tagIds: dedupePreservingOrder(base.tagIds ?? [])
                },
                createdAt
            });
        }
        case "allocation": {
            const validated = validateAllocationSet(base.allocations ?? {});
            if (!validated.ok) {
                return {
                    ok: false,
                    error: { type: "invalid-allocations", errors: validated.errors }
                };
            }
            return okRule({
                id: base.id,
                descriptionText: base.descriptionText,
                ...scope,
                action: { field: "allocation", allocations: validated.value },
                createdAt
            });
        }
        default:
            return assertNever(base.field);
    }
}

/**
 * Plain serialised shape of a field rule (the Loro wire object). This is the exact inverse of
 * {@link decodeFieldRule}: `encodeFieldRule(rule)` produces an object that decodes back to `rule`.
 * Action-specific fields absent for a given `field` are emitted empty (never as illegal values), so
 * the discriminated domain action can never leak an out-of-band field.
 */
export interface FieldRuleWireObject {
    readonly id: string;
    readonly field: RuleField;
    readonly descriptionText: string;
    readonly accountId?: string;
    readonly amount?: number;
    readonly aliasId?: string;
    readonly tagMode?: TagRuleMode;
    readonly tagIds: readonly string[];
    readonly allocations: Readonly<Record<string, number>>;
    readonly createdAtEpochMs: number;
    readonly deletedAtEpochMs?: number;
}

/**
 * Serialise a domain rule into its wire object. Pure and total; the round-trip
 * `decodeFieldRule(encodeFieldRule(rule))` is the identity on valid rules.
 */
export function encodeFieldRule(rule: FieldRule): FieldRuleWireObject {
    const base = {
        id: rule.id,
        descriptionText: rule.descriptionText,
        accountId: rule.accountId,
        amount: rule.amount,
        createdAtEpochMs: rule.createdAt.epochMilliseconds
    } satisfies Partial<FieldRuleWireObject>;

    switch (rule.action.field) {
        case "descriptionAlias":
            return {
                ...base,
                field: "descriptionAlias",
                aliasId: rule.action.aliasId,
                tagIds: [],
                allocations: {}
            };
        case "tags":
            return {
                ...base,
                field: "tags",
                tagMode: rule.action.mode,
                tagIds: [...rule.action.tagIds],
                allocations: {}
            };
        case "allocation":
            return {
                ...base,
                field: "allocation",
                tagIds: [],
                allocations: { ...rule.action.allocations }
            };
        default:
            return assertNever(rule.action);
    }
}

function okRule(rule: FieldRule): FieldRuleDecodeResult {
    return { ok: true, value: rule };
}

function invalidShape(issues: readonly string[]): FieldRuleDecodeResult {
    return { ok: false, error: { type: "invalid-shape", issues } };
}
