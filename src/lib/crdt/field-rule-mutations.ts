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
 * - uniqueness comes from `ruleUniquenessKey` (the frozen unscoped/amount/account/account+amount
 *   precedence lattice),
 * - remembered-choice shaping comes from `nextUserPreference` / `readRememberedChoice`.
 *
 * Every function mutates the loro-mirror draft in place (draft-style). Callers invoke each one inside
 * a single `setState`/vault action so the whole logical operation shares one undo group (P09). No
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
    decodeFieldRule,
    encodeFieldRule,
    type FieldRule,
    type FieldRuleWireObject,
    ruleUniquenessKey,
    type TagRuleMode
} from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";
import { asPercentage, type Percentage } from "@/types";

import { readActiveFieldRules } from "./field-rules";
import { type FieldRuleInput, type UserAutomationPreferenceInput, type VaultState } from "./schema";

// ============================================================================
// Inputs (illegal states unrepresentable via discriminated action)
// ============================================================================

/** The action to write, discriminated on `field` exactly like the domain {@link FieldRule}. */
export type FieldRuleActionInput =
    | { readonly field: "descriptionAlias"; readonly aliasId: string }
    | { readonly field: "tags"; readonly mode: TagRuleMode; readonly tagIds: readonly string[] }
    | { readonly field: "allocation"; readonly allocations: Readonly<Record<string, number>> };

export interface CreateFieldRuleInput {
    readonly id: string;
    /** Exact raw imported description text. Immutable once created (frozen model). */
    readonly descriptionText: string;
    /** Optional account narrowing (absent = any account). */
    readonly accountId?: string;
    /** Optional exact-amount narrowing in minor units (absent = any amount). */
    readonly amount?: number;
    readonly action: FieldRuleActionInput;
    readonly createdAtEpochMs: number;
}

/** Update preserves the rule's identity, description text and creation time; scope/action change. */
export interface UpdateFieldRuleInput {
    readonly id: string;
    readonly accountId?: string;
    readonly amount?: number;
    readonly action: FieldRuleActionInput;
}

export interface DeleteFieldRuleInput {
    readonly id: string;
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
    | { readonly type: "not-found"; readonly ruleId: string };

export type FieldRuleMutationResult =
    | { readonly ok: true; readonly value: FieldRule }
    | { readonly ok: false; readonly error: FieldRuleMutationError };

function ok(value: FieldRule): FieldRuleMutationResult {
    return { ok: true, value };
}

function err(error: FieldRuleMutationError): FieldRuleMutationResult {
    return { ok: false, error };
}

// ============================================================================
// Wire construction + input adaptation (reuse P17A encode/decode; no re-implementation)
// ============================================================================

/** Build the plain wire object the P17A boundary validates, from a create/update projection. */
function buildWireObject(input: {
    readonly id: string;
    readonly descriptionText: string;
    readonly accountId?: string;
    readonly amount?: number;
    readonly action: FieldRuleActionInput;
    readonly createdAtEpochMs: number;
}): FieldRuleWireObject {
    const base = {
        id: input.id,
        descriptionText: input.descriptionText,
        accountId: input.accountId,
        amount: input.amount,
        createdAtEpochMs: input.createdAtEpochMs
    } satisfies Partial<FieldRuleWireObject>;

    switch (input.action.field) {
        case "descriptionAlias":
            return {
                ...base,
                field: "descriptionAlias",
                aliasId: input.action.aliasId,
                tagIds: [],
                allocations: {}
            };
        case "tags":
            return {
                ...base,
                field: "tags",
                tagMode: input.action.mode,
                tagIds: [...input.action.tagIds],
                allocations: {}
            };
        case "allocation":
            return {
                ...base,
                field: "allocation",
                tagIds: [],
                allocations: { ...input.action.allocations }
            };
        default:
            return assertNeverAction(input.action);
    }
}

/** Compile-time exhaustiveness guard (ts-pattern is not a dependency of this package). */
function assertNeverAction(value: never): never {
    throw new Error(`Unexpected field-rule action: ${JSON.stringify(value)}`);
}

/**
 * Adapt a domain rule to the loro-mirror input shape (required-present-with-undefined keys), reusing
 * the engine's {@link encodeFieldRule}. Mirrors the boundary adapter in `field-rules.ts` so
 * `mutations.ts` and `field-rules.ts` both stay byte-identical.
 */
function toFieldRuleInput(rule: FieldRule): FieldRuleInput {
    const wire = encodeFieldRule(rule);
    const allocations: Record<string, Percentage> = {};
    for (const [personId, value] of Object.entries(wire.allocations)) {
        allocations[personId] = asPercentage(value);
    }
    return {
        id: wire.id,
        field: wire.field,
        descriptionText: wire.descriptionText,
        accountId: wire.accountId,
        amount: wire.amount == null ? undefined : asMinorUnits(wire.amount),
        aliasId: wire.aliasId,
        tagMode: wire.tagMode,
        tagIds: [...wire.tagIds],
        allocations,
        createdAtEpochMs: wire.createdAtEpochMs,
        deletedAtEpochMs: wire.deletedAtEpochMs
    };
}

/** Map a P17A decode failure onto a mutation error without losing detail. */
function decodeOrError(
    wire: FieldRuleWireObject
):
    | { readonly ok: true; readonly rule: FieldRule }
    | { readonly ok: false; readonly error: FieldRuleMutationError } {
    const decoded = decodeFieldRule(wire);
    if (decoded.ok) return { ok: true, rule: decoded.value };
    switch (decoded.error.type) {
        case "invalid-shape":
            return { ok: false, error: { type: "invalid-rule", issues: decoded.error.issues } };
        case "invalid-allocations":
            return {
                ok: false,
                error: { type: "invalid-allocations", errors: decoded.error.errors }
            };
        default:
            return assertNeverDecode(decoded.error);
    }
}

function assertNeverDecode(value: never): never {
    throw new Error(`Unexpected decode error: ${JSON.stringify(value)}`);
}

/**
 * The active rule (if any) whose uniqueness key equals `rule`'s, excluding `rule`'s own id. A
 * non-null result means the write would violate the frozen at-most-one-per-scope constraint.
 */
function findUniquenessCollision(state: VaultState, rule: FieldRule): FieldRule | null {
    const key = ruleUniquenessKey(rule);
    for (const existing of readActiveFieldRules(state)) {
        if (existing.id === rule.id) continue;
        if (ruleUniquenessKey(existing) === key) return existing;
    }
    return null;
}

// ============================================================================
// CRUD
// ============================================================================

/**
 * Create a new field rule, in place. Rejects (with no mutation) an invalid rule (bad shape or
 * invalid allocation set) and a rule that collides on the uniqueness key with an existing active
 * rule. On success the rule is written to `state.fieldRules[id]`.
 */
export function createFieldRule(
    state: VaultState,
    input: CreateFieldRuleInput
): FieldRuleMutationResult {
    const decoded = decodeOrError(buildWireObject(input));
    if (!decoded.ok) return err(decoded.error);

    const collision = findUniquenessCollision(state, decoded.rule);
    if (collision != null) return err({ type: "duplicate-key", existingRuleId: collision.id });

    const draft: Record<string, FieldRuleInput> = state.fieldRules;
    draft[input.id] = toFieldRuleInput(decoded.rule);
    return ok(decoded.rule);
}

/**
 * Update an existing rule's scope and/or action, in place, preserving its id, exact description text
 * and creation time (the frozen model keeps description text immutable). Rejects a missing/deleted
 * rule (`not-found`), an invalid replacement, or a scope change that collides with another active
 * rule.
 */
export function updateFieldRule(
    state: VaultState,
    input: UpdateFieldRuleInput
): FieldRuleMutationResult {
    const existing = state.fieldRules[input.id];
    if (existing == null || existing.deletedAtEpochMs != null) {
        return err({ type: "not-found", ruleId: input.id });
    }

    const decoded = decodeOrError(
        buildWireObject({
            id: input.id,
            descriptionText: existing.descriptionText,
            accountId: input.accountId,
            amount: input.amount,
            action: input.action,
            createdAtEpochMs: existing.createdAtEpochMs
        })
    );
    if (!decoded.ok) return err(decoded.error);

    const collision = findUniquenessCollision(state, decoded.rule);
    if (collision != null) return err({ type: "duplicate-key", existingRuleId: collision.id });

    const draft: Record<string, FieldRuleInput> = state.fieldRules;
    draft[input.id] = toFieldRuleInput(decoded.rule);
    return ok(decoded.rule);
}

/**
 * Soft-delete a rule by stamping `deletedAtEpochMs`, in place. A soft-deleted rule is excluded from
 * matching (`readActiveFieldRules`) and frees its uniqueness slot for a fresh rule, so delete is the
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
        lastUseAmountScope: record.lastUseAmountScope
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
        lastUseAmountScope: record.lastUseAmountScope
    });
}
