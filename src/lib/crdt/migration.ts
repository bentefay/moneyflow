/**
 * Vault Data Migration
 *
 * Converts sentinel values (deletedAt: epoch 0, behavior: empty, currency: invalid)
 * to undefined (deletes the CRDT key) so consumers can rely on `!entity.deletedAt`.
 *
 * Must run immediately after mirror creation, before any consumers read state.
 *
 * Because transforms are active, reads go through decode — deletedAt 0 becomes
 * Temporal.Instant(epoch 0) and empty-string enums become that string. We detect
 * these decoded sentinel values and clear them.
 */

import { Temporal } from "temporal-polyfill";

import { isValidCurrencyCode } from "@/lib/domain/currency";

import type { VaultMirror } from "./mirror";

const EPOCH_ZERO = Temporal.Instant.fromEpochMilliseconds(0);
const VALID_BEHAVIORS = new Set(["treatAsPaid"]);

function isEpochZero(instant: Temporal.Instant | undefined): instant is Temporal.Instant {
    return instant != null && instant.epochMilliseconds === 0;
}

/**
 * Migrate sentinel values in the vault to undefined.
 *
 * Legacy data uses sentinel values for optional fields:
 * - deletedAt: 0 (epoch) means "not deleted"
 * - behavior: "" means "no behavior"
 * - currency: "" means "inherit from vault"
 * - linkedUserId: "" means "no linked user"
 *
 * After rich transforms, these decode to truthy domain values
 * (e.g. Temporal.Instant.fromEpochMilliseconds(0) is truthy), breaking
 * every `if (!entity.deletedAt)` check.
 *
 * This migration clears those sentinel keys so they become undefined.
 */
export function migrateVaultSentinels(mirror: VaultMirror): void {
    mirror.setState((draft) => {
        // People: deletedAt, linkedUserId
        for (const person of Object.values(draft.people)) {
            if (typeof person !== "object" || person == null) continue;
            if (isEpochZero(person.deletedAt)) person.deletedAt = undefined;
            if (person.linkedUserId === "") person.linkedUserId = undefined;
        }

        // Accounts: deletedAt, currency
        for (const account of Object.values(draft.accounts)) {
            if (typeof account !== "object" || account == null) continue;
            if (isEpochZero(account.deletedAt)) account.deletedAt = undefined;
            if (account.currency != null && !isValidCurrencyCode(account.currency)) {
                account.currency = undefined;
            }
        }

        // Tags: deletedAt
        for (const tag of Object.values(draft.tags)) {
            if (typeof tag !== "object" || tag == null) continue;
            if (isEpochZero(tag.deletedAt)) tag.deletedAt = undefined;
        }

        // Statuses: deletedAt, behavior
        for (const status of Object.values(draft.statuses)) {
            if (typeof status !== "object" || status == null) continue;
            if (isEpochZero(status.deletedAt)) status.deletedAt = undefined;
            if (status.behavior != null && !VALID_BEHAVIORS.has(status.behavior)) {
                status.behavior = undefined;
            }
        }

        // Imports: deletedAt
        for (const imp of Object.values(draft.imports)) {
            if (typeof imp !== "object" || imp == null) continue;
            if (isEpochZero(imp.deletedAt)) imp.deletedAt = undefined;
        }

        // Import templates: deletedAt
        for (const tpl of Object.values(draft.importTemplates)) {
            if (typeof tpl !== "object" || tpl == null) continue;
            if (isEpochZero(tpl.deletedAt)) tpl.deletedAt = undefined;
        }

        // Automations: deletedAt
        for (const auto of Object.values(draft.automations)) {
            if (typeof auto !== "object" || auto == null) continue;
            if (isEpochZero(auto.deletedAt)) auto.deletedAt = undefined;
        }

        // Transactions: walk hierarchical structure
        for (const accountId of Object.keys(draft.transactions)) {
            const tree = draft.transactions[accountId];
            if (!tree || typeof tree === "string") continue;
            for (const yearBucket of tree.years) {
                for (const monthBucket of yearBucket.months) {
                    for (const dayBucket of monthBucket.days) {
                        for (const tx of dayBucket.transactions) {
                            if (isEpochZero(tx.deletedAt)) tx.deletedAt = undefined;
                            if (tx.suspectedDuplicates) {
                                for (const dup of tx.suspectedDuplicates) {
                                    if (isEpochZero(dup.deletedAt)) dup.deletedAt = undefined;
                                }
                            }
                        }
                    }
                }
            }
        }
    });
}
