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
import { type RulePopulationTransaction } from "@/lib/domain/automation/population";
import { buildRuleIndex, type RuleSource } from "@/lib/domain/automation/rule-index";
import {
    decodeFieldRule,
    encodeFieldRule,
    type FieldRule,
    isOnOrAfterTransactionDate,
    projectRuleMatchSubject,
    type RuleField,
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
        transactionId: transaction.id,
        date: transaction.date,
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

function explicitAllocations(allocations: unknown): Readonly<Record<string, number>> {
    const explicit: Record<string, number> = {};
    if (allocations == null || typeof allocations !== "object") return explicit;
    for (const [personId, value] of Object.entries(allocations)) {
        if (personId !== "$cid" && typeof value === "number") explicit[personId] = value;
    }
    return explicit;
}

/**
 * Every active transaction as the population count sees it, projected exactly as the bulk apply
 * projects it, so "would change now" and what Apply then changes cannot disagree.
 */
export function readRulePopulation(
    transactions: TransactionStore,
    aliases: VaultState["descriptionAliases"]
): readonly RulePopulationTransaction[] {
    return getAllTransactions(transactions)
        .filter((transaction) => transaction.deletedAt == null)
        .map((transaction) => {
            const aliasId = transaction.descriptionAliasId;
            return {
                subject: subjectForTransaction(transaction, aliases),
                date: transaction.date,
                aliasId: aliasId == null ? null : (resolveAlias(aliasId, aliases)?.id ?? null),
                tagIds: [...transaction.tagIds],
                allocations: explicitAllocations(transaction.allocations)
            };
        });
}

/** The match subject of one stored transaction, projected exactly as application projects it. */
export function ruleMatchSubjectForTransaction(
    state: VaultState,
    transaction: Transaction
): RuleMatchSubject {
    return subjectForTransaction(transaction, state.descriptionAliases);
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
 * Narrows an application to one rule's own fields: only the plans `ruleId` wins, and of those only
 * `fields` when given. Widening, extending or folding one rule must never write a field another rule
 * wins on the row (`specs/017-rule-reach` mockup `applyWinning`), so a one-row exception keeps its
 * own value.
 */
export interface FieldRuleApplicationFilter {
    readonly ruleId: string;
    readonly fields?: ReadonlySet<RuleField>;
}

/**
 * Apply the winning rules to a single transaction, in place. Tag and allocation plans run through
 * the engine (`applyRulePlans`, allocation via P16C); the description-alias plan runs through the
 * P11 `assignDescriptionAlias` boundary. Idempotent: re-running with the same rules converges.
 * With `only`, applies just the plans that rule wins.
 */
export function applyFieldRulesToTransaction(
    state: VaultState,
    rules: RuleSource,
    transaction: Transaction,
    only?: FieldRuleApplicationFilter
): readonly AppliedFieldRuleOutcome[] {
    const target = targetForTransaction(transaction, state.descriptionAliases);
    const plans = planRuleApplications(rules, target).filter(
        (plan) =>
            only == null ||
            (plan.ruleId === only.ruleId && (only.fields == null || only.fields.has(plan.field)))
    );

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
    // One index per bulk call: each row then tests only the rules sharing its description text.
    const index = buildRuleIndex(rules);
    return transactions.map((transaction) => ({
        location: {
            accountId: transaction.accountId,
            date: transaction.date,
            transactionId: transaction.id
        },
        outcomes: applyFieldRulesToTransaction(state, index, transaction)
    }));
}

/**
 * Every active transaction `isIncluded` accepts, with its match subject, in one walk of the vault.
 * The subject is projected exactly as application projects it, so "governed" here and "applied"
 * there cannot disagree.
 */
export function readActiveTransactionsWithSubjects(
    state: VaultState,
    isIncluded: (subject: RuleMatchSubject) => boolean
): readonly { readonly transaction: Transaction; readonly subject: RuleMatchSubject }[] {
    return getAllTransactions(state.transactions)
        .filter((transaction) => transaction.deletedAt == null)
        .map((transaction) => ({
            transaction,
            subject: subjectForTransaction(transaction, state.descriptionAliases)
        }))
        .filter(({ subject }) => isIncluded(subject));
}

/**
 * Apply `filter.ruleId`'s winning fields to each of `transactions`, against `rules` as they stand
 * after the caller's change. Rows on which that rule wins nothing get no entry, so the result's
 * length is the number of rows the rule was applied to.
 */
export function applyOneFieldRuleToTransactions(
    state: VaultState,
    rules: readonly FieldRule[],
    transactions: readonly Transaction[],
    filter: FieldRuleApplicationFilter
): readonly BulkFieldRuleEntry[] {
    const index = buildRuleIndex(rules);
    const entries: BulkFieldRuleEntry[] = [];
    for (const transaction of transactions) {
        const outcomes = applyFieldRulesToTransaction(state, index, transaction, filter);
        if (outcomes.length === 0) continue;
        entries.push({
            location: {
                accountId: transaction.accountId,
                date: transaction.date,
                transactionId: transaction.id
            },
            outcomes
        });
    }
    return entries;
}

/**
 * Apply active rules to every active transaction of an import batch (the import-commit seam).
 * Bounded and order-independent: each transaction is an independent logical group. A rule governs a
 * new row only if its reach includes it: `all` always, `from` by the row's date, an explicit set
 * never, since a new row's id cannot already be in a set (`specs/017-rule-reach` §3.5).
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
 * Explicit "apply to new" — apply active rules to every active transaction dated on or after the
 * reference date. Inclusive, so rows sharing the edited row's date are updated too.
 */
export function applyFieldRulesToNewerTransactions(
    state: VaultState,
    input: { readonly referenceDate: Temporal.PlainDate }
): readonly BulkFieldRuleEntry[] {
    const transactions = getAllTransactions(state.transactions).filter(
        (transaction) =>
            transaction.deletedAt == null &&
            isOnOrAfterTransactionDate(transaction.date, input.referenceDate)
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

function migratedRuleId(automationId: string, field: RuleField): string {
    return `fieldrule:migrated:${automationId}:${field}`;
}

/**
 * Encode a domain rule with the engine's {@link encodeFieldRule} (the only wire writer) and fill
 * every optional wire key (present, possibly undefined) so the object satisfies the loro-mirror
 * input contract without unsafe casts. The single adapter between a domain rule and the draft.
 */
export function toFieldRuleInput(rule: FieldRule): FieldRuleInput {
    const wire = encodeFieldRule(rule);
    const allocations: Record<string, Percentage> = {};
    for (const [personId, value] of Object.entries(wire.allocations)) {
        allocations[personId] = asPercentage(value);
    }
    return {
        id: wire.id,
        field: wire.field,
        outputFields: [...wire.outputFields],
        descriptionText: wire.descriptionText,
        accountId: wire.accountId,
        amount: wire.amount == null ? undefined : asMinorUnits(wire.amount),
        aliasId: wire.aliasId,
        tagMode: wire.tagMode,
        tagIds: [...wire.tagIds],
        allocations,
        reachKind: wire.reachKind,
        reachFromDate: wire.reachFromDate,
        reachTransactionIds: { ...wire.reachTransactionIds },
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
        fieldRulesDraft[rule.id] = toFieldRuleInput(rule);
        migrated += 1;
    }

    if (state.preferences != null) {
        state.preferences.automationRulesMigrationVersion = AUTOMATION_RULES_MIGRATION_VERSION;
    }

    return { migrated, skipped: result.skipped.length, ran: true };
}
