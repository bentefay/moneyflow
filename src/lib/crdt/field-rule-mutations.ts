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
 *   unscoped/amount/account/account+amount precedence lattice),
 * - remembered-choice shaping comes from `nextUserPreference` / `readRememberedChoice`.
 *
 * Every function mutates the loro-mirror draft in place (draft-style). Callers invoke each one inside
 * a single `setState`/vault action so the whole logical operation shares one undo group (P09). Each
 * one validates every precondition before its first write, so a refusal leaves the draft untouched
 * (D-019) and a two-rule change (split, move) lands in one mutation (D-017). No
 * allocation keys are ever written here: an allocation rule stores an EXPLICIT validated set on the
 * rule (validated via `decodeFieldRule`); applying it to a transaction remains P16C-only, reached
 * exclusively through the P17A engine (`applyFieldRules*`). This module never touches transactions.
 */

import { type AllocationValidationError } from "@/lib/domain/allocation";
import {
    nextUserPreference,
    readRememberedChoice,
    type RememberedRuleChoice
} from "@/lib/domain/automation/preferences";
import {
    buildFieldRule,
    decodeFieldRule,
    type FieldRule,
    type FieldRuleCandidate,
    type FieldRuleDecodeResult,
    nonEmptyRuleOutputs,
    type RuleField,
    ruleOutput,
    type RuleOutputEntry,
    type RuleOutputsInput,
    rulePredicatesEqual,
    ruleUniquenessKeys,
    withoutRuleOutput
} from "@/lib/domain/automation/rules";
import { assertNever } from "@/lib/utils/exhaustive";

import { readActiveFieldRules, toFieldRuleInput } from "./field-rules";
import { type FieldRuleInput, type UserAutomationPreferenceInput, type VaultState } from "./schema";

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
 * Update preserves the rule's identity, description text and creation time; scope and outputs
 * change. `outputs` REPLACES the rule's outputs wholesale: an output absent here is removed. Use
 * {@link setFieldRuleOutput} to change one output and keep the others.
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
 * Move one output from `sourceId` into `hostId`, which must have identical conditions. The source
 * is soft-deleted at `deletedAtEpochMs` when the move leaves it with no output.
 */
export interface MoveFieldRuleOutputInput {
    readonly sourceId: string;
    readonly field: RuleField;
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
    | { readonly type: "predicate-mismatch"; readonly sourceId: string; readonly hostId: string };

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

/** A rebuilt copy of `rule` with new outputs, keeping its id, conditions and creation time. */
function rebuildWithOutputs(rule: FieldRule, outputs: RuleOutputsInput): FieldRuleMutationResult {
    return buildRule({
        id: rule.id,
        descriptionText: rule.descriptionText,
        accountId: rule.accountId,
        amount: rule.amount,
        outputs,
        createdAtEpochMs: rule.createdAt.epochMilliseconds
    });
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

/** The stored, non-deleted, decodable rule with `id`, or `null`. Undecodable rules match nothing. */
function readActiveRule(state: VaultState, id: string): FieldRule | null {
    const existing = state.fieldRules[id];
    if (existing == null || existing.deletedAtEpochMs != null) return null;
    const decoded = decodeFieldRule(existing);
    return decoded.ok ? decoded.value : null;
}

/**
 * The active rule (if any) sharing any of `rule`'s uniqueness keys, ignoring the rules in `ignore`
 * (the rules the same mutation rewrites). A non-null result means the write would violate the
 * frozen at-most-one-output-per-field-per-scope constraint.
 */
function findUniquenessCollision(
    state: VaultState,
    rule: FieldRule,
    ignore: ReadonlySet<string>
): FieldRule | null {
    const keys = new Set(ruleUniquenessKeys(rule));
    for (const existing of readActiveFieldRules(state)) {
        if (existing.id === rule.id || ignore.has(existing.id)) continue;
        if (ruleUniquenessKeys(existing).some((key) => keys.has(key))) return existing;
    }
    return null;
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

    const built = buildRule({
        id: input.id,
        descriptionText: existing.descriptionText,
        accountId: input.accountId,
        amount: input.amount,
        outputs: input.outputs,
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
 * winning the slot (D-003). Refuses a host whose conditions differ (`predicate-mismatch`), a host
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
    if (host.outputs[input.field] != null) {
        return err({ type: "duplicate-key", existingRuleId: host.id });
    }

    const nextHost = rebuildWithOutputs(host, withOutput(host.outputs, moved));
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
