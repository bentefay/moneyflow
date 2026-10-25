/**
 * Additive field-rule CRUD + remembered-preference persistence for the HS-007 (P17B) shared rule
 * editor.
 *
 * P17A deliberately shipped no create/update/delete write path — only the read (`readActiveFieldRules`)
 * and application (`applyFieldRules*`) seams. This module fills that gap ADDITIVELY: it is the thin
 * vault-write layer the shared editor needs, and nothing more.
 *
 * It REUSES the P17A engine end to end and never re-implements precedence, matching, application or
 * migration:
 * - validation + the wire<->domain round-trip come from `decodeFieldRule` / `encodeFieldRule`,
 * - uniqueness comes from `ruleUniquenessKeys` (one key per output, on the frozen
 *   unscoped/amount/account/account+amount precedence lattice, per reach kind) and
 *   `uniquenessHoldersCollide` (explicit-set rules with disjoint sets coexist),
 * - remembered-choice shaping comes from `nextUserPreference` / `readRememberedChoice`.
 *
 * Every function mutates the loro-mirror draft in place (draft-style). Callers invoke each one inside
 * a single `setState`/vault action so the whole logical operation shares one undo group (P09). Each
 * one validates every precondition before its first write, so a refusal leaves the draft untouched
 * (D-019) and a two-rule change (split, move, fold) lands in one mutation (D-017). No
 * allocation keys are ever written here: an allocation rule stores an EXPLICIT validated set on the
 * rule (validated via `decodeFieldRule`); applying it to a transaction remains P16C-only, reached
 * exclusively through the P17A engine (`applyFieldRules*`). The CRUD functions never touch
 * transactions. The reach functions (`setFieldRuleReach`, `extendFieldRuleReachToTransaction`,
 * `foldFieldRuleIntoHost`, `specs/017-rule-reach`) apply a rule to the rows it newly governs, and
 * only through that same engine, after every precondition has passed.
 */

import { type Temporal } from "temporal-polyfill";

import {
    asTransactionId,
    type TransactionId
} from "@/components/features/transactions/table-model/ids";
import { type AllocationValidationError } from "@/lib/domain/allocation";
import {
    nextUserPreference,
    readRememberedChoice,
    type RememberedRuleChoice
} from "@/lib/domain/automation/preferences";
import {
    buildFieldRule,
    decodeFieldRule,
    decodeFieldRuleReach,
    type FieldRule,
    type FieldRuleCandidate,
    type FieldRuleDecodeResult,
    nonEmptyRuleOutputs,
    RULE_REACH_ALL,
    type RuleField,
    ruleGoverns,
    ruleMatchesSubject,
    ruleOutput,
    type RuleOutputEntry,
    ruleOutputFields,
    type RuleOutputsInput,
    rulePredicatesEqual,
    type RuleReach,
    ruleReaches,
    ruleReachesEqual,
    type RuleUniquenessKey,
    ruleUniquenessKeys,
    uniquenessHoldersCollide,
    withoutRuleOutput
} from "@/lib/domain/automation/rules";
import { assertNever } from "@/lib/utils/exhaustive";

import {
    applyOneFieldRuleToTransactions,
    type BulkFieldRuleEntry,
    readActiveFieldRules,
    readActiveTransactionsWithSubjects,
    ruleMatchSubjectForTransaction,
    toFieldRuleInput
} from "./field-rules";
import { findTransactionById } from "./queries";
import { type FieldRuleInput, type UserAutomationPreferenceInput, type VaultState } from "./schema";

export { removeTransactionsFromRuleReach } from "./field-rule-reach-maintenance";

// ============================================================================
// Inputs
// ============================================================================

/** The outputs to write. At least one must be present; the boundary rejects an empty set. */
export type FieldRuleOutputsInput = RuleOutputsInput<number>;

/** One output to write, discriminated on the field it belongs to. */
export type FieldRuleOutputChange = RuleOutputEntry<FieldRuleOutputsInput>;

/** A new rule to write; validated by the same {@link buildFieldRule} boundary as a wire record. */
export type CreateFieldRuleInput = FieldRuleCandidate<number>;

/**
 * Update preserves the rule's identity, description text, reach and creation time; scope and
 * outputs change. `outputs` REPLACES the rule's outputs wholesale: an output absent here is removed.
 * Use {@link setFieldRuleOutput} to change one output and keep the others, and
 * {@link setFieldRuleReach} to change the reach.
 */
export interface UpdateFieldRuleInput {
    readonly id: string;
    readonly accountId?: string;
    readonly amount?: number;
    readonly outputs: FieldRuleOutputsInput;
}

export interface DeleteFieldRuleInput {
    readonly id: string;
    readonly deletedAtEpochMs: number;
}

/** Add or replace one output of an existing rule; its conditions and other outputs are kept. */
export type SetFieldRuleOutputInput = { readonly id: string } & FieldRuleOutputChange;

/** Move one output of `id` into a new rule `newRuleId` with identical conditions. */
export interface SplitFieldRuleOutputInput {
    readonly id: string;
    readonly field: RuleField;
    readonly newRuleId: string;
    readonly createdAtEpochMs: number;
}

/**
 * The moved field, and optionally the value the host receives for it. Without `output` the host
 * takes the source's stored value; with it, the user's new value lands in the same vault action, so
 * "move and change" is one write with nothing to roll back (D-019).
 */
export type MoveFieldRuleOutputSelection = {
    readonly [F in RuleField]: {
        readonly field: F;
        readonly output?: NonNullable<FieldRuleOutputsInput[F]>;
    };
}[RuleField];

/**
 * Move one output from `sourceId` into `hostId`, which must have identical conditions. The source
 * is soft-deleted at `deletedAtEpochMs` when the move leaves it with no output.
 */
export type MoveFieldRuleOutputInput = {
    readonly sourceId: string;
    readonly hostId: string;
    readonly deletedAtEpochMs: number;
} & MoveFieldRuleOutputSelection;

/**
 * A finished edit of one field on one transaction (`specs/017-rule-reach` §3.1). The conditions are
 * the row's description text plus any restriction the user chose; `id` and `createdAtEpochMs` are
 * used only when a new rule is created.
 */
export type CreateFieldRuleFromEditInput = {
    readonly id: string;
    readonly transactionId: string;
    readonly descriptionText: string;
    readonly accountId?: string;
    readonly amount?: number;
    readonly createdAtEpochMs: number;
} & FieldRuleOutputChange;

/**
 * The reach a rule is changed to. Narrowing to an explicit set takes no ids: the set is always the
 * transactions the rule governs at that moment, so narrowing never changes a row (§3.2).
 */
export type RuleReachChange =
    | { readonly kind: "all" }
    | { readonly kind: "from"; readonly date: Temporal.PlainDate }
    | { readonly kind: "transactions" };

export interface SetFieldRuleReachInput {
    readonly id: string;
    readonly reach: RuleReachChange;
}

export interface ExtendFieldRuleReachInput {
    readonly id: string;
    readonly transactionId: string;
}

/**
 * Fold every output of the explicit-set rule `oneRowRuleId` into `hostId`, then soft-delete the
 * one-row rule at `deletedAtEpochMs`.
 */
export interface FoldFieldRuleIntoHostInput {
    readonly oneRowRuleId: string;
    readonly hostId: string;
    readonly deletedAtEpochMs: number;
}

// ============================================================================
// Result
// ============================================================================

export type FieldRuleMutationError =
    | { readonly type: "invalid-rule"; readonly issues: readonly string[] }
    | {
          readonly type: "invalid-allocations";
          readonly errors: readonly AllocationValidationError[];
      }
    | { readonly type: "duplicate-key"; readonly existingRuleId: string }
    | { readonly type: "not-found"; readonly ruleId: string }
    /** The rule has no output for the field the operation names. */
    | { readonly type: "missing-output"; readonly ruleId: string; readonly field: RuleField }
    /** Splitting the only output would leave the source rule with none. */
    | { readonly type: "single-output"; readonly ruleId: string }
    /** A move target whose conditions differ would silently change the output's population. */
    | { readonly type: "predicate-mismatch"; readonly sourceId: string; readonly hostId: string }
    /**
     * A move or fold target whose reach differs would silently change which rows the output governs
     * (§3.7). For a fold, the host must reach every row the one-row rule governs.
     */
    | { readonly type: "reach-mismatch"; readonly sourceId: string; readonly hostId: string }
    /** The operation needs a rule whose reach is an explicit set of transactions. */
    | { readonly type: "not-explicit-reach"; readonly ruleId: string }
    | { readonly type: "transaction-not-found"; readonly transactionId: string }
    /** The transaction does not match the rule's conditions, so reaching it would govern nothing. */
    | {
          readonly type: "transaction-not-matched";
          readonly ruleId: string;
          readonly transactionId: string;
      };

export type FieldRuleMutationOutcome<T> =
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: FieldRuleMutationError };

export type FieldRuleMutationResult = FieldRuleMutationOutcome<FieldRule>;

export interface SplitFieldRuleOutputValue {
    /** The source rule with its remaining outputs. */
    readonly source: FieldRule;
    /** The new rule holding only the split output. */
    readonly split: FieldRule;
}

export interface MoveFieldRuleOutputValue {
    readonly host: FieldRule;
    /** The source rule with its remaining outputs, or `null` when it was emptied and soft-deleted. */
    readonly source: FieldRule | null;
}

export interface CreateFieldRuleFromEditValue {
    /** `updated` when the row already had a one-row rule for the field with these conditions. */
    readonly kind: "created" | "updated";
    readonly rule: FieldRule;
}

/** A rule write that also applied the rule's outputs to the rows it newly governs. */
export interface FieldRuleApplicationValue {
    readonly rule: FieldRule;
    /** Rows the rule was applied to: newly governed rows on which it wins at least one field. */
    readonly appliedCount: number;
    readonly entries: readonly BulkFieldRuleEntry[];
}

function ok<T>(value: T): FieldRuleMutationOutcome<T> {
    return { ok: true, value };
}

function err<T>(error: FieldRuleMutationError): FieldRuleMutationOutcome<T> {
    return { ok: false, error };
}

// ============================================================================
// Validation (reuse the P17A boundary; no re-implementation)
// ============================================================================

/** Map a P17A boundary failure onto a mutation error without losing detail. */
function toMutationResult(decoded: FieldRuleDecodeResult): FieldRuleMutationResult {
    if (decoded.ok) return ok(decoded.value);
    switch (decoded.error.type) {
        case "invalid-shape":
            return err({ type: "invalid-rule", issues: decoded.error.issues });
        case "invalid-allocations":
            return err({ type: "invalid-allocations", errors: decoded.error.errors });
        default:
            return assertNever(decoded.error, "decode error");
    }
}

function buildRule(candidate: FieldRuleCandidate): FieldRuleMutationResult {
    return toMutationResult(buildFieldRule(candidate));
}

/** A rebuilt copy of `rule` with new outputs, keeping its id, conditions, reach and creation time. */
function rebuildWithOutputs(rule: FieldRule, outputs: RuleOutputsInput): FieldRuleMutationResult {
    return buildRule({
        id: rule.id,
        descriptionText: rule.descriptionText,
        accountId: rule.accountId,
        amount: rule.amount,
        outputs,
        reach: rule.reach,
        createdAtEpochMs: rule.createdAt.epochMilliseconds
    });
}

/** `rule` with a new reach. Total: a decoded rule's other parts are already valid. */
function withReach(rule: FieldRule, reach: RuleReach): FieldRule {
    return { ...rule, reach };
}

/** `rules` as they stand once `written` replace their namesakes and `removed` are gone. */
function rulesAfterWrite(
    rules: readonly FieldRule[],
    written: readonly FieldRule[],
    removed: ReadonlySet<string> = new Set()
): readonly FieldRule[] {
    const byId = new Map(written.map((rule) => [rule.id, rule]));
    return rules.filter((rule) => !removed.has(rule.id)).map((rule) => byId.get(rule.id) ?? rule);
}

function withOutput(
    outputs: RuleOutputsInput,
    change: RuleOutputEntry<RuleOutputsInput>
): RuleOutputsInput {
    switch (change.field) {
        case "descriptionAlias":
            return { ...outputs, descriptionAlias: change.output };
        case "tags":
            return { ...outputs, tags: change.output };
        case "allocation":
            return { ...outputs, allocation: change.output };
        default:
            return assertNever(change, "field-rule output");
    }
}

/** The output a move writes into the host: the caller's replacement value, else the stored one. */
function movedValue(
    selection: MoveFieldRuleOutputSelection,
    stored: RuleOutputEntry<RuleOutputsInput>
): RuleOutputEntry<RuleOutputsInput> {
    switch (selection.field) {
        case "descriptionAlias":
            return selection.output == null
                ? stored
                : { field: "descriptionAlias", output: selection.output };
        case "tags":
            return selection.output == null ? stored : { field: "tags", output: selection.output };
        case "allocation":
            return selection.output == null
                ? stored
                : { field: "allocation", output: selection.output };
        default:
            return assertNever(selection, "moved output");
    }
}

/** The stored, non-deleted, decodable rule with `id`, or `null`. Undecodable rules match nothing. */
function readActiveRule(state: VaultState, id: string): FieldRule | null {
    const existing = state.fieldRules[id];
    if (existing == null || existing.deletedAtEpochMs != null) return null;
    const decoded = decodeFieldRule(existing);
    return decoded.ok ? decoded.value : null;
}

/**
 * The active rules holding each uniqueness key, in `readActiveFieldRules` order, built from one
 * decode pass so a collision check is one lookup per candidate key rather than a scan of every rule.
 * A key normally has one holder; more only arise from concurrent creation.
 */
type UniquenessSlots = ReadonlyMap<
    RuleUniquenessKey,
    readonly { readonly rule: FieldRule; readonly order: number }[]
>;

function readUniquenessSlots(state: VaultState): UniquenessSlots {
    const slots = new Map<
        RuleUniquenessKey,
        { readonly rule: FieldRule; readonly order: number }[]
    >();
    for (const [order, rule] of readActiveFieldRules(state).entries()) {
        for (const key of ruleUniquenessKeys(rule)) {
            const held = slots.get(key);
            if (held == null) slots.set(key, [{ rule, order }]);
            else held.push({ rule, order });
        }
    }
    return slots;
}

/**
 * The active rule (if any) sharing any of `rule`'s uniqueness keys, ignoring `rule` itself and the
 * rules in `ignore` (the rules the same mutation rewrites). A non-null result means the write would
 * violate the frozen at-most-one-output-per-field-per-scope constraint. Of several colliding rules
 * the earliest in read order is reported, the one a scan over the rules would meet first.
 */
function findUniquenessCollision(
    state: VaultState,
    rule: FieldRule,
    ignore: ReadonlySet<string>
): FieldRule | null {
    const slots = readUniquenessSlots(state);
    let collision: { readonly rule: FieldRule; readonly order: number } | null = null;
    for (const key of ruleUniquenessKeys(rule)) {
        const holder = slots
            .get(key)
            ?.find(
                (held) =>
                    held.rule.id !== rule.id &&
                    !ignore.has(held.rule.id) &&
                    uniquenessHoldersCollide(held.rule, rule)
            );
        if (holder != null && (collision == null || holder.order < collision.order)) {
            collision = holder;
        }
    }
    return collision?.rule ?? null;
}

function collisionError(
    state: VaultState,
    rule: FieldRule,
    ignore: ReadonlySet<string> = new Set()
): FieldRuleMutationError | null {
    const collision = findUniquenessCollision(state, rule, ignore);
    return collision == null ? null : { type: "duplicate-key", existingRuleId: collision.id };
}

function writeRule(state: VaultState, rule: FieldRule): void {
    const draft: Record<string, FieldRuleInput> = state.fieldRules;
    draft[rule.id] = toFieldRuleInput(rule);
}

// ============================================================================
// CRUD
// ============================================================================

/**
 * Create a new field rule, in place. Rejects (with no mutation) an invalid rule (bad shape, no
 * output or an invalid allocation set) and a rule any of whose outputs collides on the uniqueness
 * key with an existing active rule. On success the rule is written to `state.fieldRules[id]`.
 */
export function createFieldRule(
    state: VaultState,
    input: CreateFieldRuleInput
): FieldRuleMutationResult {
    const built = buildRule(input);
    if (!built.ok) return built;

    const collision = collisionError(state, built.value);
    if (collision != null) return err(collision);

    writeRule(state, built.value);
    return built;
}

/**
 * Update an existing rule's scope and outputs, in place, preserving its id, exact description text
 * and creation time (the frozen model keeps description text immutable). The outputs are replaced
 * wholesale. Rejects a missing/deleted rule (`not-found`), an invalid replacement, or a change that
 * collides with another active rule.
 */
export function updateFieldRule(
    state: VaultState,
    input: UpdateFieldRuleInput
): FieldRuleMutationResult {
    const existing = state.fieldRules[input.id];
    if (existing == null || existing.deletedAtEpochMs != null) {
        return err({ type: "not-found", ruleId: input.id });
    }

    // An update never changes where the rule applies. A record whose reach columns are malformed
    // governs nothing today, and guessing a reach for it could silently widen it.
    const reach = decodeFieldRuleReach(existing);
    if (reach == null) {
        return err({ type: "invalid-rule", issues: [`rule ${input.id} has a malformed reach`] });
    }
    const built = buildRule({
        id: input.id,
        descriptionText: existing.descriptionText,
        accountId: input.accountId,
        amount: input.amount,
        outputs: input.outputs,
        reach,
        createdAtEpochMs: existing.createdAtEpochMs
    });
    if (!built.ok) return built;

    const collision = collisionError(state, built.value);
    if (collision != null) return err(collision);

    writeRule(state, built.value);
    return built;
}

/**
 * Add or replace one output of an existing rule, in place. The rule's conditions, identity,
 * creation time and other outputs are untouched. Rejects a missing/deleted/undecodable rule
 * (`not-found`), an invalid output, or an output whose slot another active rule already holds.
 */
export function setFieldRuleOutput(
    state: VaultState,
    input: SetFieldRuleOutputInput
): FieldRuleMutationResult {
    const rule = readActiveRule(state, input.id);
    if (rule == null) return err({ type: "not-found", ruleId: input.id });

    const built = rebuildWithOutputs(rule, withOutput(rule.outputs, input));
    if (!built.ok) return built;

    const collision = collisionError(state, built.value);
    if (collision != null) return err(collision);

    writeRule(state, built.value);
    return built;
}

/**
 * Split one output out of a rule into a new rule with identical conditions, in one mutation. The
 * source keeps its remaining outputs, so every transaction resolves to the same values afterwards.
 * Refuses a rule with only that output (`single-output`), a rule without it (`missing-output`), an
 * id already in use, and a new rule whose slot is held by another active rule (`duplicate-key`,
 * naming the holder rather than merging into it).
 */
export function splitFieldRuleOutput(
    state: VaultState,
    input: SplitFieldRuleOutputInput
): FieldRuleMutationOutcome<SplitFieldRuleOutputValue> {
    const source = readActiveRule(state, input.id);
    if (source == null) return err({ type: "not-found", ruleId: input.id });

    const moved = ruleOutput(source, input.field);
    if (moved == null) {
        return err({ type: "missing-output", ruleId: source.id, field: input.field });
    }
    const remaining = nonEmptyRuleOutputs(withoutRuleOutput(source.outputs, input.field));
    if (remaining == null) return err({ type: "single-output", ruleId: source.id });

    if (state.fieldRules[input.newRuleId] != null) {
        return err({ type: "invalid-rule", issues: [`rule id ${input.newRuleId} already exists`] });
    }

    const nextSource = rebuildWithOutputs(source, remaining);
    if (!nextSource.ok) return nextSource;
    const split = buildRule({
        id: input.newRuleId,
        descriptionText: source.descriptionText,
        accountId: source.accountId,
        amount: source.amount,
        outputs: withOutput({}, moved),
        // Both rules then govern exactly the same rows, so no transaction changes (§3.7).
        reach: source.reach,
        createdAtEpochMs: input.createdAtEpochMs
    });
    if (!split.ok) return split;

    // The source gives up the slot the new rule takes, so only a third rule can collide.
    const collision = collisionError(state, split.value, new Set([source.id]));
    if (collision != null) return err(collision);

    writeRule(state, nextSource.value);
    writeRule(state, split.value);
    return ok({ source: nextSource.value, split: split.value });
}

/**
 * Move one output from a source rule into a host rule with IDENTICAL conditions, in one mutation.
 * The source loses the output and is soft-deleted when that leaves it empty, so it can never keep
 * winning the slot (D-003). The host receives `output` when given, else the source's stored value.
 * Refuses a host whose conditions differ (`predicate-mismatch`), a host
 * that already has an output for the field (`duplicate-key`), and a source without it
 * (`missing-output`).
 */
export function moveFieldRuleOutput(
    state: VaultState,
    input: MoveFieldRuleOutputInput
): FieldRuleMutationOutcome<MoveFieldRuleOutputValue> {
    const source = readActiveRule(state, input.sourceId);
    if (source == null) return err({ type: "not-found", ruleId: input.sourceId });
    const host = readActiveRule(state, input.hostId);
    if (host == null) return err({ type: "not-found", ruleId: input.hostId });

    const moved = ruleOutput(source, input.field);
    if (moved == null) {
        return err({ type: "missing-output", ruleId: source.id, field: input.field });
    }
    if (!rulePredicatesEqual(source, host)) {
        return err({ type: "predicate-mismatch", sourceId: source.id, hostId: host.id });
    }
    if (!ruleReachesEqual(source.reach, host.reach)) {
        return err({ type: "reach-mismatch", sourceId: source.id, hostId: host.id });
    }
    if (host.outputs[input.field] != null) {
        return err({ type: "duplicate-key", existingRuleId: host.id });
    }

    const nextHost = rebuildWithOutputs(host, withOutput(host.outputs, movedValue(input, moved)));
    if (!nextHost.ok) return nextHost;
    const collision = collisionError(state, nextHost.value, new Set([source.id]));
    if (collision != null) return err(collision);

    const remaining = nonEmptyRuleOutputs(withoutRuleOutput(source.outputs, input.field));
    const nextSource = remaining == null ? null : rebuildWithOutputs(source, remaining);
    if (nextSource != null && !nextSource.ok) return nextSource;

    writeRule(state, nextHost.value);
    if (nextSource == null) {
        const stored = state.fieldRules[source.id];
        if (stored != null) stored.deletedAtEpochMs = input.deletedAtEpochMs;
        return ok({ host: nextHost.value, source: null });
    }
    writeRule(state, nextSource.value);
    return ok({ host: nextHost.value, source: nextSource.value });
}

// ============================================================================
// Reach (`specs/017-rule-reach`)
// ============================================================================

/**
 * Record a finished edit of one field on one transaction as a rule, in place (§3.1). The row already
 * holds the value, so no transaction is written.
 *
 * If an active explicit-set rule with identical conditions already has an output for the field and
 * contains the row, its output is updated in place (`updated`). Otherwise a new rule is created with
 * the edited field as its only output and reach `{ this row }` (`created`); it outranks any wider
 * rule on this row, so the edit is an exception and no other row changes. Rejects an invalid output,
 * an id already in use, and an explicit-set slot another rule holds for this row.
 */
export function createFieldRuleFromEdit(
    state: VaultState,
    input: CreateFieldRuleFromEditInput
): FieldRuleMutationOutcome<CreateFieldRuleFromEditValue> {
    const transactionId = asTransactionId(input.transactionId);
    const created = buildRule({
        id: input.id,
        descriptionText: input.descriptionText,
        accountId: input.accountId,
        amount: input.amount,
        outputs: withOutput({}, input),
        reach: { kind: "transactions", ids: new Set([transactionId]) },
        createdAtEpochMs: input.createdAtEpochMs
    });
    if (!created.ok) return created;

    const own = readActiveFieldRules(state).find(
        (rule) =>
            rule.reach.kind === "transactions" &&
            rule.reach.ids.has(transactionId) &&
            rule.outputs[input.field] != null &&
            rulePredicatesEqual(rule, created.value)
    );
    if (own != null) {
        const updated = rebuildWithOutputs(own, withOutput(own.outputs, input));
        if (!updated.ok) return updated;
        const collision = collisionError(state, updated.value);
        if (collision != null) return err(collision);
        writeRule(state, updated.value);
        return ok({ kind: "updated", rule: updated.value });
    }

    if (state.fieldRules[input.id] != null) {
        return err({ type: "invalid-rule", issues: [`rule id ${input.id} already exists`] });
    }
    const collision = collisionError(state, created.value);
    if (collision != null) return err(collision);
    writeRule(state, created.value);
    return ok({ kind: "created", rule: created.value });
}

/**
 * Change where a rule applies, in place, and apply its outputs to every row it newly governs (§3.2).
 *
 * Widening to a date or `all` writes the outputs to each newly governed row, but only the fields
 * the rule wins there, so a one-row exception keeps its value. Narrowing to an explicit set records
 * the rows governed now as the set and changes no row. Rejects a missing rule and a reach whose slot
 * another rule already holds (`duplicate-key`, naming the holder). Every check precedes the first
 * write.
 */
export function setFieldRuleReach(
    state: VaultState,
    input: SetFieldRuleReachInput
): FieldRuleMutationOutcome<FieldRuleApplicationValue> {
    const rule = readActiveRule(state, input.id);
    if (rule == null) return err({ type: "not-found", ruleId: input.id });

    const matching = readActiveTransactionsWithSubjects(state, (subject) =>
        ruleMatchesSubject(rule, subject)
    );
    const reach = nextReach(rule, input.reach, matching);
    const next = withReach(rule, reach);
    const collision = collisionError(state, next);
    if (collision != null) return err(collision);

    const newlyGoverned = matching.filter(
        ({ subject }) => ruleGoverns(next, subject) && !ruleGoverns(rule, subject)
    );
    const rules = rulesAfterWrite(readActiveFieldRules(state), [next]);
    writeRule(state, next);
    return ok(applyRuleToRows(state, next, rules, newlyGoverned));
}

function nextReach(
    rule: FieldRule,
    change: RuleReachChange,
    matching: ReturnType<typeof readActiveTransactionsWithSubjects>
): RuleReach {
    switch (change.kind) {
        case "all":
            return RULE_REACH_ALL;
        case "from":
            return { kind: "from", date: change.date };
        case "transactions": {
            if (rule.reach.kind === "transactions") return rule.reach;
            const governed = new Set<TransactionId>();
            for (const { subject } of matching) {
                if (ruleGoverns(rule, subject)) governed.add(subject.transactionId);
            }
            return { kind: "transactions", ids: governed };
        }
        default:
            return assertNever(change, "reach change");
    }
}

function applyRuleToRows(
    state: VaultState,
    rule: FieldRule,
    rules: readonly FieldRule[],
    rows: ReturnType<typeof readActiveTransactionsWithSubjects>,
    fields?: ReadonlySet<RuleField>
): FieldRuleApplicationValue {
    const entries = applyOneFieldRuleToTransactions(
        state,
        rules,
        rows.map(({ transaction }) => transaction),
        { ruleId: rule.id, fields }
    );
    return { rule, appliedCount: entries.length, entries };
}

/**
 * Add one transaction to an explicit-set rule's reach, in place, and apply the rule to it where it
 * wins (§3.2 "extend it to this transaction"). Only the new id is written to the set, so an
 * extension made concurrently on another device merges as a union. Rejects a missing rule, a rule
 * whose reach is not an explicit set (`not-explicit-reach`: widen it instead), a missing
 * transaction, one the rule's conditions do not match, and a set that would overlap another
 * explicit-set rule's for the same slot. Extending to a row already in the set changes nothing.
 */
export function extendFieldRuleReachToTransaction(
    state: VaultState,
    input: ExtendFieldRuleReachInput
): FieldRuleMutationOutcome<FieldRuleApplicationValue> {
    const rule = readActiveRule(state, input.id);
    if (rule == null) return err({ type: "not-found", ruleId: input.id });
    if (rule.reach.kind !== "transactions") {
        return err({ type: "not-explicit-reach", ruleId: rule.id });
    }
    const found = findTransactionById(state.transactions, input.transactionId);
    if (found == null || found.transaction.deletedAt != null) {
        return err({ type: "transaction-not-found", transactionId: input.transactionId });
    }
    const { transaction } = found;
    const subject = ruleMatchSubjectForTransaction(state, transaction);
    if (!ruleMatchesSubject(rule, subject)) {
        return err({
            type: "transaction-not-matched",
            ruleId: rule.id,
            transactionId: input.transactionId
        });
    }
    if (rule.reach.ids.has(subject.transactionId)) {
        return ok({ rule, appliedCount: 0, entries: [] });
    }

    const next = withReach(rule, {
        kind: "transactions",
        ids: new Set([...rule.reach.ids, subject.transactionId])
    });
    const collision = collisionError(state, next);
    if (collision != null) return err(collision);

    const rules = rulesAfterWrite(readActiveFieldRules(state), [next]);
    addReachMember(state, next, subject.transactionId);
    return ok(applyRuleToRows(state, next, rules, [{ transaction, subject }]));
}

/** Write one id into a stored rule's explicit set, or the whole rule when it has no set yet. */
function addReachMember(state: VaultState, rule: FieldRule, transactionId: TransactionId): void {
    const members = state.fieldRules[rule.id]?.reachTransactionIds;
    if (members == null) {
        writeRule(state, rule);
        return;
    }
    members[transactionId] = true;
}

/**
 * Fold a one-row rule into a wider rule with identical conditions, in one mutation (§3.1). Every
 * output of the one-row rule is set on the host (added, or replacing the host's), the host is applied
 * across its reach for those fields wherever it wins, and the one-row rule is soft-deleted.
 *
 * The host must reach every row the one-row rule governs, and the one-row rule must govern at least
 * one; otherwise the fold would move an exception somewhere it never applied (`reach-mismatch`).
 * Rejects a missing rule, a one-row rule whose reach is not an explicit set, a host whose conditions
 * differ (`predicate-mismatch`) and a host whose new outputs collide with a third rule.
 */
export function foldFieldRuleIntoHost(
    state: VaultState,
    input: FoldFieldRuleIntoHostInput
): FieldRuleMutationOutcome<FieldRuleApplicationValue> {
    const oneRow = readActiveRule(state, input.oneRowRuleId);
    if (oneRow == null) return err({ type: "not-found", ruleId: input.oneRowRuleId });
    const host = readActiveRule(state, input.hostId);
    if (host == null || host.id === oneRow.id) {
        return err({ type: "not-found", ruleId: input.hostId });
    }
    if (oneRow.reach.kind !== "transactions") {
        return err({ type: "not-explicit-reach", ruleId: oneRow.id });
    }
    if (!rulePredicatesEqual(oneRow, host)) {
        return err({ type: "predicate-mismatch", sourceId: oneRow.id, hostId: host.id });
    }

    // Identical conditions, so one walk finds every row either rule could govern.
    const matching = readActiveTransactionsWithSubjects(state, (subject) =>
        ruleMatchesSubject(host, subject)
    );
    const oneRowRows = matching.filter(({ subject }) => ruleGoverns(oneRow, subject));
    const hostReachesThem = oneRowRows.every(({ subject }) =>
        ruleReaches(host, { id: subject.transactionId, date: subject.date })
    );
    if (oneRowRows.length === 0 || !hostReachesThem) {
        return err({ type: "reach-mismatch", sourceId: oneRow.id, hostId: host.id });
    }

    const folded = ruleOutputFields(oneRow);
    const outputs = folded.reduce<RuleOutputsInput>((current, field) => {
        const entry = ruleOutput(oneRow, field);
        return entry == null ? current : withOutput(current, entry);
    }, host.outputs);
    const nextHost = rebuildWithOutputs(host, outputs);
    if (!nextHost.ok) return nextHost;
    const collision = collisionError(state, nextHost.value, new Set([oneRow.id]));
    if (collision != null) return err(collision);

    const rules = rulesAfterWrite(
        readActiveFieldRules(state),
        [nextHost.value],
        new Set([oneRow.id])
    );
    writeRule(state, nextHost.value);
    const stored = state.fieldRules[oneRow.id];
    if (stored != null) stored.deletedAtEpochMs = input.deletedAtEpochMs;

    const hostRows = matching.filter(({ subject }) => ruleGoverns(nextHost.value, subject));
    return ok(applyRuleToRows(state, nextHost.value, rules, hostRows, new Set(folded)));
}

/**
 * Soft-delete a rule by stamping `deletedAtEpochMs`, in place. A soft-deleted rule is excluded from
 * matching (`readActiveFieldRules`) and frees its uniqueness slots for a fresh rule, so delete is the
 * inverse of create for the shared editor. Rejects a missing/already-deleted rule.
 */
export function deleteFieldRule(
    state: VaultState,
    input: DeleteFieldRuleInput
): FieldRuleMutationResult {
    const existing = state.fieldRules[input.id];
    if (existing == null || existing.deletedAtEpochMs != null) {
        return err({ type: "not-found", ruleId: input.id });
    }
    const decoded = decodeFieldRule(existing);
    existing.deletedAtEpochMs = input.deletedAtEpochMs;
    if (!decoded.ok) {
        // A rule that fails to decode is already excluded from matching; deletion still succeeds,
        // but there is no rich domain value to return, so report it as not-found for the editor.
        return err({ type: "not-found", ruleId: input.id });
    }
    return ok(decoded.value);
}

// ============================================================================
// Remembered per-user preferences
// ============================================================================

export interface PersistUserAutomationPreferenceInput {
    readonly pubkeyHash: string;
    readonly choice: RememberedRuleChoice;
}

/**
 * Persist a user's last-used editor choice, in place, keyed by `pubkeyHash`. Shaping is delegated to
 * the P17A `nextUserPreference`; this only writes the record. Per-user UI state, never shared
 * financial data.
 */
export function persistUserAutomationPreference(
    state: VaultState,
    input: PersistUserAutomationPreferenceInput
): void {
    const record = nextUserPreference(input.pubkeyHash, input.choice);
    const draft: Record<string, UserAutomationPreferenceInput> = state.userAutomationPreferences;
    draft[input.pubkeyHash] = {
        pubkeyHash: record.pubkeyHash,
        lastRuleField: record.lastRuleField,
        lastTagMode: record.lastTagMode,
        lastUseAccountScope: record.lastUseAccountScope,
        lastUseAmountScope: record.lastUseAmountScope,
        lastApplyMode: record.lastApplyMode
    };
}

/** Read a user's remembered choice (defaults applied) via the P17A `readRememberedChoice`. */
export function readUserAutomationChoice(
    state: VaultState,
    pubkeyHash: string
): RememberedRuleChoice {
    const record = state.userAutomationPreferences[pubkeyHash];
    if (record == null) return readRememberedChoice(undefined);
    return readRememberedChoice({
        pubkeyHash,
        lastRuleField: record.lastRuleField,
        lastTagMode: record.lastTagMode,
        lastUseAccountScope: record.lastUseAccountScope,
        lastUseAmountScope: record.lastUseAmountScope,
        lastApplyMode: record.lastApplyMode
    });
}
