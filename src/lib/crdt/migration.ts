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
import type { DescriptionAliasWire, VaultState } from "./schema";
import { getVaultSystemOrigin } from "./undo";

const VALID_BEHAVIORS = new Set(["treatAsPaid"]);

function isEpochZero(instant: Temporal.Instant | undefined): instant is Temporal.Instant {
    return instant != null && instant.epochMilliseconds === 0;
}

function getAlias(state: VaultState, aliasId: string): DescriptionAliasWire | undefined {
    const alias = state.descriptionAliases[aliasId];
    return typeof alias === "object" && alias != null ? alias : undefined;
}

function clearReferenceMap(
    referenceMap: Record<string, boolean> | undefined
): Record<string, boolean> {
    if (!referenceMap) return {};
    for (const id of Object.keys(referenceMap)) {
        if (id !== "$cid") delete referenceMap[id];
    }
    return referenceMap;
}

function normalizedRecoveryName(name: unknown, aliasId: string): string {
    return (typeof name === "string" ? name.trim().normalize("NFC") : "") || aliasId;
}

/**
 * Canonicalize the alias graph and rebuild both denormalized reference maps.
 *
 * Ordering by alias ID makes repair independent of insertion order. Chains flatten to their final
 * real node; a cycle elects its lexicographically smallest active member as the real node. Broken
 * targets become real aliases using retained recovery names. Transaction pointers are authoritative
 * for `transactionIds`; alias pointers are authoritative for `symlinkIds`.
 */
export function repairDescriptionAliases(state: VaultState): void {
    const aliases = Object.keys(state.descriptionAliases)
        .filter((aliasId) => getAlias(state, aliasId) != null)
        .sort();
    const activeIds = new Set(aliases.filter((aliasId) => !getAlias(state, aliasId)?.deletedAt));
    const tombstoneTimes = new Map<string, Temporal.Instant>();
    for (const startId of activeIds) {
        const path: string[] = [];
        const seen = new Set<string>();
        let currentId = startId;
        while (!seen.has(currentId)) {
            seen.add(currentId);
            path.push(currentId);
            const targetId = getAlias(state, currentId)?.targetAliasId;
            if (!targetId || targetId === currentId) break;
            const target = getAlias(state, targetId);
            if (!target) break;
            if (target.deletedAt) {
                for (const pathId of path) tombstoneTimes.set(pathId, target.deletedAt);
                break;
            }
            currentId = targetId;
        }
    }
    const repairableIds = new Set([...activeIds].filter((aliasId) => !tombstoneTimes.has(aliasId)));
    const roots = new Map<string, string>();

    for (const startId of repairableIds) {
        if (roots.has(startId)) continue;
        const path: string[] = [];
        const positions = new Map<string, number>();
        let currentId = startId;

        while (!roots.has(currentId) && !positions.has(currentId)) {
            positions.set(currentId, path.length);
            path.push(currentId);
            const alias = getAlias(state, currentId);
            const targetId = alias?.targetAliasId;
            if (!targetId || targetId === currentId || !repairableIds.has(targetId)) {
                roots.set(currentId, currentId);
                break;
            }
            currentId = targetId;
        }

        const cycleStart = positions.get(currentId);
        if (cycleStart != null && !roots.has(currentId)) {
            const cycleRoot = [...path.slice(cycleStart)].sort()[0];
            for (const cycleId of path.slice(cycleStart)) roots.set(cycleId, cycleRoot);
        }

        const resolvedRoot = roots.get(currentId) ?? roots.get(path[path.length - 1]);
        if (!resolvedRoot) throw new Error("Alias repair could not determine a canonical root");
        for (const pathId of path) roots.set(pathId, roots.get(pathId) ?? resolvedRoot);
    }

    const recoveryNames = new Map<string, string>();
    for (const rootId of [...new Set(roots.values())].sort()) {
        const memberIds = [
            rootId,
            ...[...repairableIds].filter(
                (aliasId) => aliasId !== rootId && roots.get(aliasId) === rootId
            )
        ];
        const recovered = memberIds
            .map((aliasId) => getAlias(state, aliasId)?.name)
            .find((name) => typeof name === "string" && name.trim() !== "");
        recoveryNames.set(rootId, normalizedRecoveryName(recovered, rootId));
    }

    for (const aliasId of aliases) {
        const alias = getAlias(state, aliasId);
        if (!alias) continue;
        alias.id = aliasId;
        Object.assign(alias, {
            symlinkIds: clearReferenceMap(alias.symlinkIds),
            transactionIds: clearReferenceMap(alias.transactionIds)
        });

        const propagatedDeletedAt = tombstoneTimes.get(aliasId);
        if (alias.deletedAt || propagatedDeletedAt) {
            alias.kind = "real";
            alias.name = normalizedRecoveryName(alias.name, aliasId);
            alias.targetAliasId = undefined;
            alias.deletedAt = alias.deletedAt ?? propagatedDeletedAt;
            continue;
        }

        const rootId = roots.get(aliasId);
        if (!rootId || rootId === aliasId) {
            alias.kind = "real";
            alias.name = recoveryNames.get(aliasId) ?? normalizedRecoveryName(alias.name, aliasId);
            alias.targetAliasId = undefined;
        } else {
            alias.kind = "symlink";
            alias.targetAliasId = rootId;
        }
    }

    for (const aliasId of repairableIds) {
        const alias = getAlias(state, aliasId);
        if (!alias || alias.kind !== "symlink" || !alias.targetAliasId) continue;
        const target = getAlias(state, alias.targetAliasId);
        if (target && !target.deletedAt && target.kind === "real") {
            target.symlinkIds[alias.id] = true;
        }
    }

    for (const tree of Object.values(state.transactions)) {
        if (typeof tree !== "object" || tree == null) continue;
        for (const year of tree.years) {
            for (const month of year.months) {
                for (const day of month.days) {
                    for (const transaction of day.transactions) {
                        const referencedAlias =
                            !transaction.deletedAt && transaction.descriptionAliasId
                                ? getAlias(state, transaction.descriptionAliasId)
                                : undefined;
                        if (referencedAlias && !referencedAlias.deletedAt) {
                            referencedAlias.transactionIds[transaction.id] = true;
                        } else {
                            transaction.descriptionAliasId = undefined;
                        }
                        for (const duplicate of transaction.suspectedDuplicates) {
                            const duplicateAlias =
                                !transaction.deletedAt &&
                                !duplicate.deletedAt &&
                                duplicate.descriptionAliasId
                                    ? getAlias(state, duplicate.descriptionAliasId)
                                    : undefined;
                            if (duplicateAlias && !duplicateAlias.deletedAt) {
                                duplicateAlias.transactionIds[duplicate.id] = true;
                            } else {
                                duplicate.descriptionAliasId = undefined;
                            }
                        }
                    }
                }
            }
        }
    }
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
    mirror.setState(
        (draft: VaultState) => {
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

            // Description aliases: deletedAt (graph repair follows transaction sentinel cleanup)
            for (const alias of Object.values(draft.descriptionAliases)) {
                if (typeof alias !== "object" || alias == null) continue;
                if (isEpochZero(alias.deletedAt)) alias.deletedAt = undefined;
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

            repairDescriptionAliases(draft);
        },
        { origin: getVaultSystemOrigin("migration") }
    );
}
