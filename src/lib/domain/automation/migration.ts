/**
 * Safe, in-code migration of the legacy generic automation model (contains/regex conditions with
 * setTags/setAllocation/setStatus actions) into the HS-007 (P17A) typed field-rule model.
 *
 * This is a pure transformation: it never mutates the legacy `automations` collection, so no data
 * is lost — legacy automations are preserved and this only DERIVES equivalent field rules for the
 * subset that is faithfully representable. Everything else is reported as `skipped` with a reason,
 * making the migration fully auditable and reversible.
 *
 * Convertibility is deliberately conservative to avoid silently changing behaviour:
 * - exactly one `description` condition with the `contains` operator (its value becomes the EXACT
 *   description text — a documented semantic tightening from substring to exact),
 * - at most one `accountId` `contains` condition (its value becomes the account scope),
 * - no `notes`/`amount`/`regex`/multiple description conditions (skipped as unsupported),
 * - `setTags` -> tags rule (mode `set`, matching legacy replace semantics),
 * - `setAllocation` -> allocation rule (validated; invalid sets are rejected, never normalised),
 * - `setStatus` -> skipped (no field-rule equivalent; fields are alias/tags/allocation only).
 */

import { Temporal } from "temporal-polyfill";
import { z } from "zod";

import { validateAllocationSet } from "@/lib/domain/allocation";

import {
    type FieldRule,
    FieldRuleIdSchema,
    type RuleAction,
    dedupeRulesByUniqueness
} from "./rules";

/** Structural view of a legacy automation condition (decoupled from Loro read types). */
export interface LegacyConditionView {
    readonly column: "description" | "notes" | "amount" | "accountId";
    readonly operator: "contains" | "regex";
    readonly value: string;
}

/** Structural view of a legacy automation action. */
export interface LegacyActionView {
    readonly type: "setTags" | "setAllocation" | "setStatus";
    readonly value: unknown;
}

/** Structural view of a legacy automation. `deletedAt != null` marks a soft-deleted automation. */
export interface LegacyAutomationView {
    readonly id: string;
    readonly conditions: readonly LegacyConditionView[];
    readonly actions: readonly LegacyActionView[];
    readonly deletedAt?: unknown;
}

export type MigrationSkipReason =
    | "deleted"
    | "unsupported-conditions"
    | "regex-not-exact"
    | "missing-description"
    | "status-not-supported"
    | "invalid-tag-value"
    | "invalid-allocation-set"
    | "uniqueness-collision";

export interface MigrationSkip {
    readonly automationId: string;
    readonly reason: MigrationSkipReason;
}

export interface LegacyMigrationResult {
    readonly rules: readonly FieldRule[];
    readonly skipped: readonly MigrationSkip[];
}

export interface MigrationOptions {
    /** Absolute creation time stamped on every derived rule. */
    readonly now: Temporal.Instant;
    /** Deterministic id factory so migration stays pure and reproducible. */
    readonly idFor: (automationId: string, field: RuleAction["field"]) => string;
}

const TagValueSchema = z.array(z.string());
const AllocationRecordSchema = z.record(z.string(), z.unknown());

interface ScopeExtraction {
    readonly descriptionText: string;
    readonly accountId?: string;
}

/** Extract the exact-description text and optional account scope, or `null` if unconvertible. */
function extractScope(conditions: readonly LegacyConditionView[]): ScopeExtraction | null {
    const descriptionConditions = conditions.filter((c) => c.column === "description");
    if (descriptionConditions.length !== 1) return null;
    const [description] = descriptionConditions;
    if (description == null || description.operator !== "contains") return null;

    let accountId: string | undefined;
    for (const condition of conditions) {
        if (condition.column === "description") continue;
        if (condition.column === "accountId" && condition.operator === "contains") {
            if (accountId != null) return null; // more than one account constraint is ambiguous
            accountId = condition.value;
            continue;
        }
        return null; // notes/amount/regex conditions are not faithfully representable
    }
    return { descriptionText: description.value, accountId };
}

function buildAction(action: LegacyActionView): RuleAction | MigrationSkipReason {
    switch (action.type) {
        case "setTags": {
            const parsed = TagValueSchema.safeParse(action.value);
            if (!parsed.success) return "invalid-tag-value";
            return { field: "tags", mode: "set", tagIds: parsed.data };
        }
        case "setAllocation": {
            const record = AllocationRecordSchema.safeParse(action.value);
            if (!record.success) return "invalid-allocation-set";
            const validated = validateAllocationSet(record.data);
            if (!validated.ok) return "invalid-allocation-set";
            return { field: "allocation", allocations: validated.value };
        }
        case "setStatus":
            return "status-not-supported";
        default:
            return "unsupported-conditions";
    }
}

/**
 * Transform legacy automations into typed field rules plus a skip report. The result's rules
 * satisfy the uniqueness invariant (at most one rule per field+description+scope); any candidate
 * that collides with an already-derived rule is reported as `uniqueness-collision` rather than
 * silently dropped.
 */
export function migrateLegacyAutomations(
    automations: readonly LegacyAutomationView[],
    options: MigrationOptions
): LegacyMigrationResult {
    const candidates: { readonly rule: FieldRule; readonly automationId: string }[] = [];
    const skipped: MigrationSkip[] = [];

    for (const automation of automations) {
        if (automation.deletedAt != null) {
            skipped.push({ automationId: automation.id, reason: "deleted" });
            continue;
        }
        const scope = extractScope(automation.conditions);
        if (scope == null) {
            skipped.push({ automationId: automation.id, reason: "unsupported-conditions" });
            continue;
        }
        for (const action of automation.actions) {
            const built = buildAction(action);
            if (typeof built === "string") {
                skipped.push({ automationId: automation.id, reason: built });
                continue;
            }
            candidates.push({
                automationId: automation.id,
                rule: {
                    id: FieldRuleIdSchema.parse(options.idFor(automation.id, built.field)),
                    descriptionText: scope.descriptionText,
                    accountId: scope.accountId,
                    action: built,
                    createdAt: options.now
                }
            });
        }
    }

    const deduped = dedupeRulesByUniqueness(candidates.map((candidate) => candidate.rule));
    const survivingIds = new Set(deduped.map((rule) => rule.id));
    for (const candidate of candidates) {
        if (!survivingIds.has(candidate.rule.id)) {
            skipped.push({ automationId: candidate.automationId, reason: "uniqueness-collision" });
        }
    }

    return { rules: deduped, skipped };
}
