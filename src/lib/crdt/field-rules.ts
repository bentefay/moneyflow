/**
 * CRDT-level wiring for the HS-007 (P17A) field-rule engine: reading rules out of vault state,
 * applying them at import and during explicit bulk operations, and the one-shot in-code migration
 * from the legacy generic-automation model.
 *
 * This module is the seam between the pure engine (`src/lib/domain/automation/**`) and the vault
 * document. It stays faithful to those boundaries:
 * - tag mutations go through `updateTransaction` (via the engine's `applyRulePlans`),
 * - allocation mutations go EXCLUSIVELY through P16C's `replaceTransactionAllocations` (again via
 *   `applyRulePlans`) — this module never writes allocation keys or normalises a set,
 * - description-alias mutations go EXCLUSIVELY through the existing P11 `assignDescriptionAlias`
 *   write path, reused additively and never modified.
 *
 * All functions mutate the loro-mirror draft in place (draft-style). Callers invoke them inside a
 * single `setState`/vault action so every mutation for one logical operation shares an undo group
 * (P09). Everything here is bounded (one pass per transaction), idempotent and order-independent.
 */

import { Temporal } from "temporal-polyfill";

import {
    applyRulePlans,
    planRuleApplications,
    type RuleApplicationTarget
} from "@/lib/domain/automation/apply";
import {
    migrateLegacyAutomations,
    type LegacyAutomationView
} from "@/lib/domain/automation/migration";
import {
    decodeFieldRule,
    encodeFieldRule,
    type FieldRule,
    type FieldRuleWireObject,
    isNewerTransactionDate,
    projectRuleMatchSubject,
    type RuleMatchSubject
} from "@/lib/domain/automation/rules";
import { asMinorUnits } from "@/lib/domain/currency";
import { resolveAlias } from "@/lib/domain/description-aliases";
import { asPercentage, type Percentage } from "@/types";

import { type AllocationBoundaryError } from "./allocations";
import { assignDescriptionAlias, type DescriptionAliasMutationError } from "./description-aliases";
import { type TransactionLocation } from "./mutations";
import { getAllTransactions } from "./queries";
import {
    type FieldRuleInput,
    type Transaction,
    type TransactionStore,
    type VaultState
} from "./schema";

// ============================================================================
// Reading active rules out of vault state
// ============================================================================

/**
 * Decode the active (non-deleted, valid) field rules from vault state. Invalid or soft-deleted
 * wire entries are skipped so a single malformed rule can never break application for the rest.
 */
export function readActiveFieldRules(state: VaultState): readonly FieldRule[] {
    const rules: FieldRule[] = [];
    for (const [id, wire] of Object.entries(state.fieldRules)) {
        if (id === "$cid") continue;
        if (typeof wire !== "object" || wire == null) continue;
        if (wire.deletedAtEpochMs != null) continue;
        const decoded = decodeFieldRule(wire);
        if (decoded.ok) rules.push(decoded.value);
    }
    return rules;
}

// ============================================================================
// Projecting a transaction into a match subject / application target
// ============================================================================

/**
 * Project a stored transaction into the engine's canonical match subject. Imported rows retain raw
 * provenance; manual rows resolve their visible alias before the shared domain projection applies
 * manual-field eligibility.
 */
function subjectForTransaction(
    transaction: Transaction,
    aliases: VaultState["descriptionAliases"]
): RuleMatchSubject {
    const aliasId = transaction.descriptionAliasId;
    const resolvedAlias = aliasId == null ? null : resolveAlias(aliasId, aliases);
    return projectRuleMatchSubject({
        accountId: transaction.accountId,
        amount: transaction.amount,
        description: transaction.description,
        importId: transaction.importId,
        resolvedAliasName: resolvedAlias?.name ?? null
    });
}

function targetForTransaction(
    transaction: Transaction,
    aliases: VaultState["descriptionAliases"]
): RuleApplicationTarget {
    return {
        subject: subjectForTransaction(transaction, aliases),
        location: {
            accountId: transaction.accountId,
            date: transaction.date,
            transactionId: transaction.id
        },
        currentTagIds: [...transaction.tagIds]
    };
}

// ============================================================================
// Application (import + bulk)
// ============================================================================

/** Outcome of applying the winning rules for one field of one transaction. */
export type AppliedFieldRuleOutcome =
    | { readonly field: "tags"; readonly ruleId: string; readonly status: "applied" | "unchanged" }
    | {
          readonly field: "allocation";
          readonly ruleId: string;
          readonly status: "applied";
          readonly previousAllocations: Readonly<Record<string, number>>;
      }
    | {
          readonly field: "allocation";
          readonly ruleId: string;
          readonly status: "rejected";
          readonly error: AllocationBoundaryError;
      }
    | {
          readonly field: "descriptionAlias";
          readonly ruleId: string;
          readonly status: "applied";
          readonly aliasId: string;
      }
    | {
          readonly field: "descriptionAlias";
          readonly ruleId: string;
          readonly status: "alias-error";
          readonly error: DescriptionAliasMutationError;
      };

export interface BulkFieldRuleEntry {
    readonly location: TransactionLocation;
    readonly outcomes: readonly AppliedFieldRuleOutcome[];
}

/**
 * Apply the winning rules to a single transaction, in place. Tag and allocation plans run through
 * the engine (`applyRulePlans`, allocation via P16C); the description-alias plan runs through the
 * P11 `assignDescriptionAlias` boundary. Idempotent: re-running with the same rules converges.
 */
export function applyFieldRulesToTransaction(
    state: VaultState,
    rules: readonly FieldRule[],
    transaction: Transaction
): readonly AppliedFieldRuleOutcome[] {
    const target = targetForTransaction(transaction, state.descriptionAliases);
    const plans = planRuleApplications(rules, target);

    const aliasPlans = plans.filter((plan) => plan.field === "descriptionAlias");
    const nonAliasPlans = plans.filter((plan) => plan.field !== "descriptionAlias");

    const outcomes: AppliedFieldRuleOutcome[] = [];

    // Tags + allocation (allocation strictly via P16C inside applyRulePlans).
    const store: TransactionStore = state.transactions;
    for (const outcome of applyRulePlans(store, target, nonAliasPlans)) {
        switch (outcome.field) {
            case "tags":
                outcomes.push(outcome);
                break;
            case "allocation":
                outcomes.push(outcome);
                break;
            case "descriptionAlias":
                // Unreachable: alias plans were partitioned out above.
                break;
        }
    }

    // Description alias strictly via the existing P11 write path.
    for (const plan of aliasPlans) {
        if (plan.field !== "descriptionAlias") continue;
        const result = assignDescriptionAlias(state, {
            location: target.location,
            aliasId: plan.aliasId
        });
        outcomes.push(
            result.ok
                ? {
                      field: "descriptionAlias",
                      ruleId: plan.ruleId,
                      status: "applied",
                      aliasId: result.value
                  }
                : {
                      field: "descriptionAlias",
                      ruleId: plan.ruleId,
                      status: "alias-error",
                      error: result.error
                  }
        );
    }

    return outcomes;
}

function applyToTransactions(
    state: VaultState,
    transactions: readonly Transaction[]
): readonly BulkFieldRuleEntry[] {
    const rules = readActiveFieldRules(state);
    if (rules.length === 0) return [];
    return transactions.map((transaction) => ({
        location: {
            accountId: transaction.accountId,
            date: transaction.date,
            transactionId: transaction.id
        },
        outcomes: applyFieldRulesToTransaction(state, rules, transaction)
    }));
}

/**
 * Apply active rules to every active transaction of an import batch (the import-commit seam).
 * Bounded and order-independent: each transaction is an independent logical group.
 */
export function applyFieldRulesToImport(
    state: VaultState,
    input: { readonly importId: string }
): readonly BulkFieldRuleEntry[] {
    const transactions = getAllTransactions(state.transactions).filter(
        (transaction) => transaction.deletedAt == null && transaction.importId === input.importId
    );
    return applyToTransactions(state, transactions);
}

/** Explicit "apply to all" — apply active rules to every active transaction. */
export function applyFieldRulesToAllTransactions(state: VaultState): readonly BulkFieldRuleEntry[] {
    const transactions = getAllTransactions(state.transactions).filter(
        (transaction) => transaction.deletedAt == null
    );
    return applyToTransactions(state, transactions);
}

/**
 * Explicit "apply to new" — apply active rules to every active transaction strictly newer (greater
 * calendar date) than the reference date, matching the frozen "update new" semantics.
 */
export function applyFieldRulesToNewerTransactions(
    state: VaultState,
    input: { readonly referenceDate: Temporal.PlainDate }
): readonly BulkFieldRuleEntry[] {
    const transactions = getAllTransactions(state.transactions).filter(
        (transaction) =>
            transaction.deletedAt == null &&
            isNewerTransactionDate(transaction.date, input.referenceDate)
    );
    return applyToTransactions(state, transactions);
}

// ============================================================================
// One-shot legacy-automation -> field-rule migration (in-code CRDT migration)
// ============================================================================

/** Bumped when the migration logic changes in a way that should re-run once. */
export const AUTOMATION_RULES_MIGRATION_VERSION = 1;

/**
 * Migrated rules are stamped with epoch 0 so any user-created rule (later `createdAt`) always wins
 * a precedence tie, and so the marker below — not the timestamp — governs idempotency.
 */
const MIGRATED_RULE_CREATED_AT = Temporal.Instant.fromEpochMilliseconds(0);

function migratedRuleId(automationId: string, field: FieldRule["action"]["field"]): string {
    return `fieldrule:migrated:${automationId}:${field}`;
}

/**
 * Fill every optional wire key (present, possibly undefined) so the object satisfies the loro-mirror
 * input contract without unsafe casts. The engine's {@link encodeFieldRule} keeps a clean optional
 * domain shape; this boundary adapts it to the draft's required-present-with-undefined keys.
 */
function toFieldRuleInput(wire: FieldRuleWireObject): FieldRuleInput {
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

function readLegacyAutomationViews(state: VaultState): readonly LegacyAutomationView[] {
    const views: LegacyAutomationView[] = [];
    for (const [id, automation] of Object.entries(state.automations)) {
        if (id === "$cid") continue;
        if (typeof automation !== "object" || automation == null) continue;
        views.push({
            id: automation.id,
            deletedAt: automation.deletedAt,
            conditions: automation.conditions.map((condition) => ({
                column: condition.column,
                operator: condition.operator,
                value: condition.value
            })),
            actions: automation.actions.map((action) => ({
                type: action.type,
                value: action.value
            }))
        });
    }
    return views;
}

export interface AutomationMigrationSummary {
    readonly migrated: number;
    readonly skipped: number;
    /** True when the migration ran this call (false when the marker already recorded a prior run). */
    readonly ran: boolean;
}

/**
 * Derive field rules from the legacy automation collection exactly once per vault, in place.
 *
 * Idempotency is twofold: a version marker in vault preferences short-circuits re-runs (so a rule
 * a user later deletes is never resurrected on re-hydration), and derived rule ids are deterministic
 * so concurrent first-migrations on different devices converge on the same entries. The legacy
 * `automations` collection is never mutated — no data is lost.
 */
export function migrateVaultAutomationsToFieldRules(state: VaultState): AutomationMigrationSummary {
    const currentVersion = state.preferences?.automationRulesMigrationVersion ?? 0;
    if (currentVersion >= AUTOMATION_RULES_MIGRATION_VERSION) {
        return { migrated: 0, skipped: 0, ran: false };
    }

    const legacy = readLegacyAutomationViews(state);
    // No legacy automations means nothing to derive and nothing to resurrect later, so leave the
    // marker unstamped and write nothing. This keeps hydration of a clean vault side-effect-free
    // (no spurious vault op); the marker is only advanced once a vault actually has legacy data.
    if (legacy.length === 0) {
        return { migrated: 0, skipped: 0, ran: false };
    }

    const result = migrateLegacyAutomations(legacy, {
        now: MIGRATED_RULE_CREATED_AT,
        idFor: migratedRuleId
    });

    // Write through the input-typed view of the record so plain (unbranded) wire values slot in
    // without unsafe casts.
    const fieldRulesDraft: Record<string, FieldRuleInput> = state.fieldRules;
    let migrated = 0;
    for (const rule of result.rules) {
        if (fieldRulesDraft[rule.id] != null) continue; // deterministic id already present -> converge
        fieldRulesDraft[rule.id] = toFieldRuleInput(encodeFieldRule(rule));
        migrated += 1;
    }

    if (state.preferences != null) {
        state.preferences.automationRulesMigrationVersion = AUTOMATION_RULES_MIGRATION_VERSION;
    }

    return { migrated, skipped: result.skipped.length, ran: true };
}
