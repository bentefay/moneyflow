import { LoroList, LoroMap, type LoroDoc } from "loro-crdt";

import {
    hardDeleteProvenDescriptionAliasSymlink,
    rewriteDescriptionAliasMaintenanceReference,
    type DescriptionAliasMaintenanceReference
} from "./description-aliases";
import type { VaultMirror } from "./mirror";
import type {
    AccountTransactionTree,
    DayBucket,
    MonthBucket,
    Transaction,
    VaultState,
    YearBucket
} from "./schema";
import { getVaultAliasHistoryFrontier } from "./undo";

export interface VaultMaintenanceBudget {
    readonly maxItems: number;
    readonly maxMilliseconds: number;
}

export const DEFAULT_VAULT_MAINTENANCE_BUDGET: VaultMaintenanceBudget = {
    maxItems: 32,
    maxMilliseconds: 4
};

type MaintenancePhase = "keys" | "years" | "months" | "days" | "transactions" | "aliases" | "done";

/** Explicit immutable cursor retained between animation frames. */
export interface VaultMaintenanceCursor {
    readonly accountIds: string[];
    readonly aliasIds: string[];
    readonly accountKeyIterator: Generator<string>;
    readonly aliasKeyIterator: Generator<string>;
    readonly accountKeysComplete: boolean;
    readonly phase: MaintenancePhase;
    readonly accountIndex: number;
    readonly yearIndex: number;
    readonly monthIndex: number;
    readonly dayIndex: number;
    readonly transactionIndex: number;
    readonly nestedIndex: number;
    readonly aliasIndex: number;
    /** A mutation landed during this pass, so one fresh proof pass is still required. */
    readonly needsRescan: boolean;
    readonly aliasProof?: AliasProofCursor;
    readonly transactionSearch?: TransactionSearchCursor;
    readonly transactionTarget?: TransactionTargetCursor;
}

interface TransactionTargetCursor {
    readonly date: string;
    readonly dayIndex: number;
    readonly monthIndex: number;
    readonly yearIndex: number;
    readonly transactionCid?: string;
    readonly transactionIndex: number;
}

interface TransactionSearchCursor {
    readonly sourceCid?: string;
    readonly sourceId: string;
    readonly sourceYearIndex: number;
    readonly sourceMonthIndex: number;
    readonly sourceDayIndex: number;
    readonly sourceTransactionIndex: number;
    readonly year: number;
    readonly month: number;
    readonly day: number;
    readonly scanYearIndex: number;
    readonly scanMonthIndex: number;
    readonly scanDayIndex: number;
    readonly scanTransactionIndex: number;
    readonly bestDayKey?: string;
    readonly bestDayYearIndex?: number;
    readonly bestDayMonthIndex?: number;
    readonly bestDayIndex?: number;
    readonly bestDayTransactionIndex?: number;
    readonly bestDayTransactionCid?: string;
    readonly bestSameIdKey?: string;
}

interface AliasProofCursor {
    readonly aliasId: string;
    readonly targetAliasId: string;
    readonly stage: "transactions" | "aliases";
    readonly accountIndex: number;
    readonly yearIndex: number;
    readonly monthIndex: number;
    readonly dayIndex: number;
    readonly transactionIndex: number;
    readonly nestedIndex: number;
    readonly aliasIndex: number;
}

type StructuralMaintenancePlan =
    | {
          readonly kind: "relocate-conflict-transaction";
          readonly accountId: string;
          readonly yearIndex: number;
          readonly monthIndex: number;
          readonly dayIndex: number;
          readonly mode: "move" | "remove-source";
          readonly targetDayIndex: number;
          readonly targetMonthIndex: number;
          readonly targetYearIndex: number;
          readonly targetTransactionCid?: string;
          readonly targetTransactionIndex: number;
          readonly transactionCid?: string;
          readonly transactionId: string;
          readonly transactionIndex: number;
          readonly provenState: VaultState;
      }
    | {
          readonly kind: "remove-year";
          readonly accountId: string;
          readonly targetYearIndex: number;
          readonly sourceYearIndex: number;
          readonly year: number;
      }
    | {
          readonly kind: "remove-month";
          readonly accountId: string;
          readonly yearIndex: number;
          readonly targetMonthIndex: number;
          readonly sourceMonthIndex: number;
          readonly month: number;
      }
    | {
          readonly kind: "remove-day";
          readonly accountId: string;
          readonly yearIndex: number;
          readonly monthIndex: number;
          readonly targetDayIndex: number;
          readonly sourceDayIndex: number;
          readonly day: number;
      };

type AliasMaintenancePlan =
    | {
          readonly kind: "rewrite-alias-reference";
          readonly reference: DescriptionAliasMaintenanceReference;
          readonly sourceAliasId: string;
          readonly targetAliasId: string;
      }
    | {
          readonly kind: "remove-alias-symlink";
          readonly symlinkId: string;
          readonly targetAliasId: string;
          readonly provenState: VaultState;
      };

export type VaultMaintenancePlan = StructuralMaintenancePlan | AliasMaintenancePlan;

export function isVaultMaintenancePlanCurrent(
    state: VaultState,
    plan: VaultMaintenancePlan
): boolean {
    return (
        (plan.kind !== "remove-alias-symlink" && plan.kind !== "relocate-conflict-transaction") ||
        plan.provenState === state
    );
}

export interface VaultMaintenanceStep {
    readonly cursor: VaultMaintenanceCursor;
    readonly plan?: VaultMaintenancePlan;
}

export interface VaultMaintenanceFrameResult {
    readonly applied: number;
    readonly complete: boolean;
    readonly cursor: VaultMaintenanceCursor;
    readonly processed: number;
    readonly yieldReason: "complete" | "items" | "mutation" | "time";
}

export interface VaultMaintenanceFrameHost {
    readonly cancelFrame: (frameId: number) => void;
    readonly isVisible: () => boolean;
    readonly now: () => number;
    readonly requestFrame: (callback: FrameRequestCallback) => number;
    readonly subscribeVisibility: (listener: () => void) => () => void;
}

function baseCursor(state: VaultState, phase: MaintenancePhase = "keys"): VaultMaintenanceCursor {
    return {
        accountIds: [],
        aliasIds: [],
        accountKeyIterator: recordKeys(state.transactions),
        aliasKeyIterator: recordKeys(state.descriptionAliases),
        accountKeysComplete: false,
        phase,
        accountIndex: 0,
        yearIndex: 0,
        monthIndex: 0,
        dayIndex: 0,
        transactionIndex: 0,
        nestedIndex: -1,
        aliasIndex: 0,
        needsRescan: false
    };
}

function* recordKeys(record: object): Generator<string> {
    for (const key in record) {
        if (key !== "$cid") yield key;
    }
}

export function createVaultMaintenanceCursor(state: VaultState): VaultMaintenanceCursor {
    return baseCursor(state);
}

function withPosition(
    cursor: VaultMaintenanceCursor,
    updates: Partial<
        Pick<
            VaultMaintenanceCursor,
            | "phase"
            | "accountIndex"
            | "yearIndex"
            | "monthIndex"
            | "dayIndex"
            | "transactionIndex"
            | "nestedIndex"
            | "aliasIndex"
        >
    >
): VaultMaintenanceCursor {
    return { ...cursor, ...updates };
}

function getTree(
    state: VaultState,
    cursor: VaultMaintenanceCursor
): { readonly accountId: string; readonly tree: AccountTransactionTree } | undefined {
    const accountId = cursor.accountIds[cursor.accountIndex];
    if (!accountId) return undefined;
    const tree = state.transactions[accountId];
    if (typeof tree !== "object" || tree == null) return undefined;
    return { accountId, tree };
}

function planKeyStep(cursor: VaultMaintenanceCursor): VaultMaintenanceStep {
    if (!cursor.accountKeysComplete) {
        const next = cursor.accountKeyIterator.next();
        if (!next.done) {
            cursor.accountIds.push(next.value);
            return { cursor };
        }
        return { cursor: { ...cursor, accountKeysComplete: true } };
    }
    const next = cursor.aliasKeyIterator.next();
    if (!next.done) {
        cursor.aliasIds.push(next.value);
        return { cursor };
    }
    return { cursor: withPosition(cursor, { phase: "transactions" }) };
}

function planYearStep(state: VaultState, cursor: VaultMaintenanceCursor): VaultMaintenanceStep {
    const current = getTree(state, cursor);
    if (!current) {
        if (cursor.accountIndex >= cursor.accountIds.length) {
            return { cursor: withPosition(cursor, { phase: "aliases", accountIndex: 0 }) };
        }
        return {
            cursor: withPosition(cursor, {
                accountIndex: cursor.accountIndex + 1,
                yearIndex: 0
            })
        };
    }

    const target = current.tree.years[cursor.yearIndex];
    const source = current.tree.years[cursor.yearIndex + 1];
    if (!target || !source) {
        return {
            cursor: withPosition(cursor, {
                accountIndex: cursor.accountIndex + 1,
                yearIndex: 0
            })
        };
    }
    const next = withPosition(cursor, { yearIndex: cursor.yearIndex + 1 });
    if (target.year !== source.year) return { cursor: next };
    if (source.months.length !== 0) return { cursor: next };
    return {
        cursor: next,
        plan: {
            kind: "remove-year",
            accountId: current.accountId,
            targetYearIndex: cursor.yearIndex,
            sourceYearIndex: cursor.yearIndex + 1,
            year: target.year
        }
    };
}

function planMonthStep(state: VaultState, cursor: VaultMaintenanceCursor): VaultMaintenanceStep {
    const current = getTree(state, cursor);
    if (!current) {
        if (cursor.accountIndex >= cursor.accountIds.length) {
            return { cursor: withPosition(cursor, { phase: "years", accountIndex: 0 }) };
        }
        return {
            cursor: withPosition(cursor, {
                accountIndex: cursor.accountIndex + 1,
                yearIndex: 0,
                monthIndex: 0
            })
        };
    }
    const year = current.tree.years[cursor.yearIndex];
    if (!year) {
        return {
            cursor: withPosition(cursor, {
                accountIndex: cursor.accountIndex + 1,
                yearIndex: 0,
                monthIndex: 0
            })
        };
    }
    const target = year.months[cursor.monthIndex];
    const source = year.months[cursor.monthIndex + 1];
    if (!target || !source) {
        return {
            cursor: withPosition(cursor, {
                yearIndex: cursor.yearIndex + 1,
                monthIndex: 0
            })
        };
    }
    const next = withPosition(cursor, { monthIndex: cursor.monthIndex + 1 });
    if (target.month !== source.month) return { cursor: next };
    if (source.days.length !== 0) return { cursor: next };
    return {
        cursor: next,
        plan: {
            kind: "remove-month",
            accountId: current.accountId,
            yearIndex: cursor.yearIndex,
            targetMonthIndex: cursor.monthIndex,
            sourceMonthIndex: cursor.monthIndex + 1,
            month: target.month
        }
    };
}

function planDayStep(state: VaultState, cursor: VaultMaintenanceCursor): VaultMaintenanceStep {
    const current = getTree(state, cursor);
    if (!current) {
        if (cursor.accountIndex >= cursor.accountIds.length) {
            return { cursor: withPosition(cursor, { phase: "months", accountIndex: 0 }) };
        }
        return {
            cursor: withPosition(cursor, {
                accountIndex: cursor.accountIndex + 1,
                yearIndex: 0,
                monthIndex: 0,
                dayIndex: 0
            })
        };
    }
    const year = current.tree.years[cursor.yearIndex];
    if (!year) {
        return {
            cursor: withPosition(cursor, {
                accountIndex: cursor.accountIndex + 1,
                yearIndex: 0,
                monthIndex: 0,
                dayIndex: 0
            })
        };
    }
    const month = year.months[cursor.monthIndex];
    if (!month) {
        return {
            cursor: withPosition(cursor, {
                yearIndex: cursor.yearIndex + 1,
                monthIndex: 0,
                dayIndex: 0
            })
        };
    }
    const target = month.days[cursor.dayIndex];
    const source = month.days[cursor.dayIndex + 1];
    if (!target || !source) {
        return {
            cursor: withPosition(cursor, {
                monthIndex: cursor.monthIndex + 1,
                dayIndex: 0
            })
        };
    }
    const next = withPosition(cursor, { dayIndex: cursor.dayIndex + 1 });
    if (target.day !== source.day) return { cursor: next };
    if (source.transactions.length !== 0) return { cursor: next };
    return {
        cursor: next,
        plan: {
            kind: "remove-day",
            accountId: current.accountId,
            yearIndex: cursor.yearIndex,
            monthIndex: cursor.monthIndex,
            targetDayIndex: cursor.dayIndex,
            sourceDayIndex: cursor.dayIndex + 1,
            day: target.day
        }
    };
}

function aliasRewritePlan(
    state: VaultState,
    reference: DescriptionAliasMaintenanceReference,
    transaction: Transaction | Transaction["suspectedDuplicates"][number]
): AliasMaintenancePlan | undefined {
    const sourceAliasId = transaction.descriptionAliasId;
    if (!sourceAliasId) return undefined;
    const source = state.descriptionAliases[sourceAliasId];
    if (
        typeof source !== "object" ||
        source == null ||
        source.deletedAt != null ||
        source.kind !== "symlink" ||
        !source.targetAliasId
    ) {
        return undefined;
    }
    const target = state.descriptionAliases[source.targetAliasId];
    if (
        typeof target !== "object" ||
        target == null ||
        target.deletedAt != null ||
        target.kind !== "real"
    ) {
        return undefined;
    }
    return {
        kind: "rewrite-alias-reference",
        reference,
        sourceAliasId: source.id,
        targetAliasId: target.id
    };
}

function nextTransactionContainer(cursor: VaultMaintenanceCursor): VaultMaintenanceCursor {
    return {
        ...withPosition(cursor, {
            transactionIndex: cursor.transactionIndex + 1,
            nestedIndex: -1
        }),
        transactionSearch: undefined
    };
}

function transactionIdentityKey(transaction: Transaction): string {
    return `${transaction.id}\u0000${transaction.$cid}`;
}

function createTransactionSearch(
    transaction: Transaction,
    cursor: VaultMaintenanceCursor
): TransactionSearchCursor {
    return {
        sourceCid: transaction.$cid,
        sourceId: transaction.id,
        sourceYearIndex: cursor.yearIndex,
        sourceMonthIndex: cursor.monthIndex,
        sourceDayIndex: cursor.dayIndex,
        sourceTransactionIndex: cursor.transactionIndex,
        year: transaction.date.year,
        month: transaction.date.month,
        day: transaction.date.day,
        scanYearIndex: 0,
        scanMonthIndex: 0,
        scanDayIndex: 0,
        scanTransactionIndex: 0
    };
}

function hasAdjacentBucketConflict(
    tree: AccountTransactionTree,
    cursor: VaultMaintenanceCursor
): boolean {
    const year = tree.years[cursor.yearIndex];
    const month = year?.months[cursor.monthIndex];
    const day = month?.days[cursor.dayIndex];
    if (!year || !month || !day) return false;
    return (
        tree.years[cursor.yearIndex - 1]?.year === year.year ||
        tree.years[cursor.yearIndex + 1]?.year === year.year ||
        year.months[cursor.monthIndex - 1]?.month === month.month ||
        year.months[cursor.monthIndex + 1]?.month === month.month ||
        month.days[cursor.dayIndex - 1]?.day === day.day ||
        month.days[cursor.dayIndex + 1]?.day === day.day
    );
}

function advanceTransactionSearch(
    tree: AccountTransactionTree,
    search: TransactionSearchCursor
): { readonly complete: boolean; readonly search: TransactionSearchCursor } {
    const year = tree.years[search.scanYearIndex];
    if (!year) return { complete: true, search };
    if (year.year !== search.year) {
        return {
            complete: false,
            search: {
                ...search,
                scanYearIndex: search.scanYearIndex + 1,
                scanMonthIndex: 0,
                scanDayIndex: 0,
                scanTransactionIndex: 0
            }
        };
    }
    const month = year.months[search.scanMonthIndex];
    if (!month) {
        return {
            complete: false,
            search: {
                ...search,
                scanYearIndex: search.scanYearIndex + 1,
                scanMonthIndex: 0,
                scanDayIndex: 0,
                scanTransactionIndex: 0
            }
        };
    }
    if (month.month !== search.month) {
        return {
            complete: false,
            search: {
                ...search,
                scanMonthIndex: search.scanMonthIndex + 1,
                scanDayIndex: 0,
                scanTransactionIndex: 0
            }
        };
    }
    const day = month.days[search.scanDayIndex];
    if (!day) {
        return {
            complete: false,
            search: {
                ...search,
                scanMonthIndex: search.scanMonthIndex + 1,
                scanDayIndex: 0,
                scanTransactionIndex: 0
            }
        };
    }
    if (day.day !== search.day) {
        return {
            complete: false,
            search: {
                ...search,
                scanDayIndex: search.scanDayIndex + 1,
                scanTransactionIndex: 0
            }
        };
    }
    const transaction = day.transactions[search.scanTransactionIndex];
    if (!transaction) {
        return {
            complete: false,
            search: {
                ...search,
                scanDayIndex: search.scanDayIndex + 1,
                scanTransactionIndex: 0
            }
        };
    }
    const key = transactionIdentityKey(transaction);
    const isBestDay = search.bestDayKey == null || key < search.bestDayKey;
    const isBestSameId =
        transaction.id === search.sourceId &&
        (search.bestSameIdKey == null || key < search.bestSameIdKey);
    return {
        complete: false,
        search: {
            ...search,
            scanTransactionIndex: search.scanTransactionIndex + 1,
            bestDayKey: isBestDay ? key : search.bestDayKey,
            bestDayYearIndex: isBestDay ? search.scanYearIndex : search.bestDayYearIndex,
            bestDayMonthIndex: isBestDay ? search.scanMonthIndex : search.bestDayMonthIndex,
            bestDayIndex: isBestDay ? search.scanDayIndex : search.bestDayIndex,
            bestDayTransactionIndex: isBestDay
                ? search.scanTransactionIndex
                : search.bestDayTransactionIndex,
            bestDayTransactionCid: isBestDay ? transaction.$cid : search.bestDayTransactionCid,
            bestSameIdKey: isBestSameId ? key : search.bestSameIdKey
        }
    };
}

function planTransactionStep(
    state: VaultState,
    cursor: VaultMaintenanceCursor
): VaultMaintenanceStep {
    const current = getTree(state, cursor);
    if (!current) {
        if (cursor.accountIndex >= cursor.accountIds.length) {
            return { cursor: withPosition(cursor, { phase: "days", accountIndex: 0 }) };
        }
        return {
            cursor: withPosition(cursor, {
                accountIndex: cursor.accountIndex + 1,
                yearIndex: 0,
                monthIndex: 0,
                dayIndex: 0,
                transactionIndex: 0,
                nestedIndex: -1
            })
        };
    }
    const year = current.tree.years[cursor.yearIndex];
    if (!year) {
        return {
            cursor: withPosition(cursor, {
                accountIndex: cursor.accountIndex + 1,
                yearIndex: 0,
                monthIndex: 0,
                dayIndex: 0,
                transactionIndex: 0,
                nestedIndex: -1
            })
        };
    }
    const month = year.months[cursor.monthIndex];
    if (!month) {
        return {
            cursor: withPosition(cursor, {
                yearIndex: cursor.yearIndex + 1,
                monthIndex: 0,
                dayIndex: 0,
                transactionIndex: 0,
                nestedIndex: -1
            })
        };
    }
    const day = month.days[cursor.dayIndex];
    if (!day) {
        return {
            cursor: withPosition(cursor, {
                monthIndex: cursor.monthIndex + 1,
                dayIndex: 0,
                transactionIndex: 0,
                nestedIndex: -1
            })
        };
    }
    const transaction = day.transactions[cursor.transactionIndex];
    if (!transaction) {
        return {
            cursor: withPosition(cursor, {
                dayIndex: cursor.dayIndex + 1,
                transactionIndex: 0,
                nestedIndex: -1
            })
        };
    }

    if (cursor.nestedIndex < 0) {
        if (!cursor.transactionSearch && !hasAdjacentBucketConflict(current.tree, cursor)) {
            const next = transaction.suspectedDuplicates.length
                ? { ...withPosition(cursor, { nestedIndex: 0 }), transactionSearch: undefined }
                : nextTransactionContainer(cursor);
            return {
                cursor: next,
                plan: aliasRewritePlan(
                    state,
                    {
                        kind: "parent",
                        accountId: current.accountId,
                        yearIndex: cursor.yearIndex,
                        monthIndex: cursor.monthIndex,
                        dayIndex: cursor.dayIndex,
                        transactionCid: transaction.$cid,
                        transactionId: transaction.id,
                        transactionIndex: cursor.transactionIndex
                    },
                    transaction
                )
            };
        }
        const cachedTarget = cursor.transactionTarget;
        if (!cursor.transactionSearch && cachedTarget?.date === transaction.date.toString()) {
            const next = transaction.suspectedDuplicates.length
                ? { ...withPosition(cursor, { nestedIndex: 0 }), transactionSearch: undefined }
                : nextTransactionContainer(cursor);
            const move =
                cachedTarget.yearIndex !== cursor.yearIndex ||
                cachedTarget.monthIndex !== cursor.monthIndex ||
                cachedTarget.dayIndex !== cursor.dayIndex;
            return {
                cursor: next,
                plan: move
                    ? {
                          kind: "relocate-conflict-transaction",
                          accountId: current.accountId,
                          yearIndex: cursor.yearIndex,
                          monthIndex: cursor.monthIndex,
                          dayIndex: cursor.dayIndex,
                          mode: "move",
                          targetDayIndex: cachedTarget.dayIndex,
                          targetMonthIndex: cachedTarget.monthIndex,
                          targetYearIndex: cachedTarget.yearIndex,
                          targetTransactionCid: cachedTarget.transactionCid,
                          targetTransactionIndex: cachedTarget.transactionIndex,
                          transactionCid: transaction.$cid,
                          transactionId: transaction.id,
                          transactionIndex: cursor.transactionIndex,
                          provenState: state
                      }
                    : aliasRewritePlan(
                          state,
                          {
                              kind: "parent",
                              accountId: current.accountId,
                              yearIndex: cursor.yearIndex,
                              monthIndex: cursor.monthIndex,
                              dayIndex: cursor.dayIndex,
                              transactionCid: transaction.$cid,
                              transactionId: transaction.id,
                              transactionIndex: cursor.transactionIndex
                          },
                          transaction
                      )
            };
        }
        const search = cursor.transactionSearch ?? createTransactionSearch(transaction, cursor);
        if (
            search.sourceId !== transaction.id ||
            search.sourceCid !== transaction.$cid ||
            search.sourceYearIndex !== cursor.yearIndex ||
            search.sourceMonthIndex !== cursor.monthIndex ||
            search.sourceDayIndex !== cursor.dayIndex ||
            search.sourceTransactionIndex !== cursor.transactionIndex
        ) {
            return { cursor: { ...cursor, transactionSearch: undefined } };
        }
        const progress = advanceTransactionSearch(current.tree, search);
        if (!progress.complete) {
            return { cursor: { ...cursor, transactionSearch: progress.search } };
        }
        const next = transaction.suspectedDuplicates.length
            ? { ...withPosition(cursor, { nestedIndex: 0 }), transactionSearch: undefined }
            : nextTransactionContainer(cursor);
        const sourceKey = transactionIdentityKey(transaction);
        const removeSource =
            progress.search.bestSameIdKey != null && progress.search.bestSameIdKey < sourceKey;
        const targetYearIndex = progress.search.bestDayYearIndex;
        const targetMonthIndex = progress.search.bestDayMonthIndex;
        const targetDayIndex = progress.search.bestDayIndex;
        const targetTransactionIndex = progress.search.bestDayTransactionIndex;
        const move =
            targetYearIndex != null &&
            targetMonthIndex != null &&
            targetDayIndex != null &&
            (targetYearIndex !== cursor.yearIndex ||
                targetMonthIndex !== cursor.monthIndex ||
                targetDayIndex !== cursor.dayIndex);
        const transactionTarget: TransactionTargetCursor | undefined =
            targetYearIndex != null &&
            targetMonthIndex != null &&
            targetDayIndex != null &&
            targetTransactionIndex != null
                ? {
                      date: transaction.date.toString(),
                      dayIndex: targetDayIndex,
                      monthIndex: targetMonthIndex,
                      yearIndex: targetYearIndex,
                      transactionCid: progress.search.bestDayTransactionCid,
                      transactionIndex: targetTransactionIndex
                  }
                : undefined;
        const nextWithTarget = transactionTarget ? { ...next, transactionTarget } : next;
        if (
            (removeSource || move) &&
            targetYearIndex != null &&
            targetMonthIndex != null &&
            targetDayIndex != null &&
            targetTransactionIndex != null
        ) {
            return {
                cursor: nextWithTarget,
                plan: {
                    kind: "relocate-conflict-transaction",
                    accountId: current.accountId,
                    yearIndex: cursor.yearIndex,
                    monthIndex: cursor.monthIndex,
                    dayIndex: cursor.dayIndex,
                    mode: removeSource ? "remove-source" : "move",
                    targetDayIndex,
                    targetMonthIndex,
                    targetYearIndex,
                    targetTransactionCid: progress.search.bestDayTransactionCid,
                    targetTransactionIndex,
                    transactionCid: transaction.$cid,
                    transactionId: transaction.id,
                    transactionIndex: cursor.transactionIndex,
                    provenState: state
                }
            };
        }
        return {
            cursor: nextWithTarget,
            plan: aliasRewritePlan(
                state,
                {
                    kind: "parent",
                    accountId: current.accountId,
                    yearIndex: cursor.yearIndex,
                    monthIndex: cursor.monthIndex,
                    dayIndex: cursor.dayIndex,
                    transactionCid: transaction.$cid,
                    transactionId: transaction.id,
                    transactionIndex: cursor.transactionIndex
                },
                transaction
            )
        };
    }

    const duplicate = transaction.suspectedDuplicates[cursor.nestedIndex];
    if (!duplicate) return { cursor: nextTransactionContainer(cursor) };
    const next =
        cursor.nestedIndex + 1 < transaction.suspectedDuplicates.length
            ? withPosition(cursor, { nestedIndex: cursor.nestedIndex + 1 })
            : nextTransactionContainer(cursor);
    return {
        cursor: next,
        plan: aliasRewritePlan(
            state,
            {
                kind: "nested",
                accountId: current.accountId,
                yearIndex: cursor.yearIndex,
                monthIndex: cursor.monthIndex,
                dayIndex: cursor.dayIndex,
                parentTransactionCid: transaction.$cid,
                transactionCid: duplicate.$cid,
                transactionId: duplicate.id,
                transactionIndex: cursor.transactionIndex,
                nestedIndex: cursor.nestedIndex
            },
            duplicate
        )
    };
}

function planAliasStep(state: VaultState, cursor: VaultMaintenanceCursor): VaultMaintenanceStep {
    const aliasId = cursor.aliasIds[cursor.aliasIndex];
    if (!aliasId) return { cursor: withPosition(cursor, { phase: "done" }) };
    const alias = state.descriptionAliases[aliasId];
    if (
        typeof alias !== "object" ||
        alias == null ||
        alias.deletedAt != null ||
        alias.kind !== "symlink" ||
        !alias.targetAliasId
    ) {
        return {
            cursor: {
                ...withPosition(cursor, { aliasIndex: cursor.aliasIndex + 1 }),
                aliasProof: undefined
            }
        };
    }
    const target = state.descriptionAliases[alias.targetAliasId];
    if (
        typeof target !== "object" ||
        target == null ||
        target.deletedAt != null ||
        target.kind !== "real"
    ) {
        return {
            cursor: {
                ...withPosition(cursor, { aliasIndex: cursor.aliasIndex + 1 }),
                aliasProof: undefined
            }
        };
    }

    const proof = cursor.aliasProof ?? {
        aliasId: alias.id,
        targetAliasId: target.id,
        stage: "transactions" as const,
        accountIndex: 0,
        yearIndex: 0,
        monthIndex: 0,
        dayIndex: 0,
        transactionIndex: 0,
        nestedIndex: -1,
        aliasIndex: 0
    };
    const abandon = (): VaultMaintenanceStep => ({
        cursor: {
            ...withPosition(cursor, { aliasIndex: cursor.aliasIndex + 1 }),
            aliasProof: undefined
        }
    });

    if (proof.aliasId !== alias.id || proof.targetAliasId !== target.id) return abandon();
    if (proof.stage === "transactions") {
        const accountId = cursor.accountIds[proof.accountIndex];
        if (!accountId) {
            return {
                cursor: {
                    ...cursor,
                    aliasProof: { ...proof, stage: "aliases", aliasIndex: 0 }
                }
            };
        }
        const tree = state.transactions[accountId];
        if (typeof tree !== "object" || tree == null) {
            return {
                cursor: {
                    ...cursor,
                    aliasProof: {
                        ...proof,
                        accountIndex: proof.accountIndex + 1,
                        yearIndex: 0
                    }
                }
            };
        }
        const year = tree.years[proof.yearIndex];
        if (!year) {
            return {
                cursor: {
                    ...cursor,
                    aliasProof: {
                        ...proof,
                        accountIndex: proof.accountIndex + 1,
                        yearIndex: 0,
                        monthIndex: 0
                    }
                }
            };
        }
        const month = year.months[proof.monthIndex];
        if (!month) {
            return {
                cursor: {
                    ...cursor,
                    aliasProof: {
                        ...proof,
                        yearIndex: proof.yearIndex + 1,
                        monthIndex: 0,
                        dayIndex: 0
                    }
                }
            };
        }
        const day = month.days[proof.dayIndex];
        if (!day) {
            return {
                cursor: {
                    ...cursor,
                    aliasProof: {
                        ...proof,
                        monthIndex: proof.monthIndex + 1,
                        dayIndex: 0,
                        transactionIndex: 0
                    }
                }
            };
        }
        const transaction = day.transactions[proof.transactionIndex];
        if (!transaction) {
            return {
                cursor: {
                    ...cursor,
                    aliasProof: {
                        ...proof,
                        dayIndex: proof.dayIndex + 1,
                        transactionIndex: 0,
                        nestedIndex: -1
                    }
                }
            };
        }
        if (proof.nestedIndex < 0) {
            if (transaction.descriptionAliasId === proof.aliasId) return abandon();
            return {
                cursor: {
                    ...cursor,
                    aliasProof: transaction.suspectedDuplicates.length
                        ? { ...proof, nestedIndex: 0 }
                        : {
                              ...proof,
                              transactionIndex: proof.transactionIndex + 1,
                              nestedIndex: -1
                          }
                }
            };
        }
        const duplicate = transaction.suspectedDuplicates[proof.nestedIndex];
        if (!duplicate) {
            return {
                cursor: {
                    ...cursor,
                    aliasProof: {
                        ...proof,
                        transactionIndex: proof.transactionIndex + 1,
                        nestedIndex: -1
                    }
                }
            };
        }
        if (duplicate.descriptionAliasId === proof.aliasId) return abandon();
        return {
            cursor: {
                ...cursor,
                aliasProof:
                    proof.nestedIndex + 1 < transaction.suspectedDuplicates.length
                        ? { ...proof, nestedIndex: proof.nestedIndex + 1 }
                        : {
                              ...proof,
                              transactionIndex: proof.transactionIndex + 1,
                              nestedIndex: -1
                          }
            }
        };
    }

    const inbound = cursor.aliasIds[proof.aliasIndex];
    if (inbound) {
        const inboundAlias = state.descriptionAliases[inbound];
        if (
            typeof inboundAlias === "object" &&
            inboundAlias != null &&
            ((inboundAlias.id !== proof.targetAliasId && inboundAlias.symlinkIds[proof.aliasId]) ||
                inboundAlias.targetAliasId === proof.aliasId)
        ) {
            return abandon();
        }
        return {
            cursor: {
                ...cursor,
                aliasProof: { ...proof, aliasIndex: proof.aliasIndex + 1 }
            }
        };
    }
    return {
        cursor: {
            ...withPosition(cursor, { aliasIndex: cursor.aliasIndex + 1 }),
            aliasProof: undefined
        },
        plan: {
            kind: "remove-alias-symlink",
            symlinkId: alias.id,
            targetAliasId: target.id,
            provenState: state
        }
    };
}

/** Process exactly one deterministic discovery item. */
export function planVaultMaintenanceStep(
    state: VaultState,
    cursor: VaultMaintenanceCursor
): VaultMaintenanceStep {
    if (cursor.phase === "keys") return planKeyStep(cursor);
    if (cursor.phase === "years") return planYearStep(state, cursor);
    if (cursor.phase === "months") return planMonthStep(state, cursor);
    if (cursor.phase === "days") return planDayStep(state, cursor);
    if (cursor.phase === "transactions") return planTransactionStep(state, cursor);
    if (cursor.phase === "aliases") return planAliasStep(state, cursor);
    return { cursor };
}

function getYearPair(
    state: VaultState,
    plan: Extract<StructuralMaintenancePlan, { kind: "remove-year" }>
):
    | {
          readonly tree: AccountTransactionTree;
          readonly target: YearBucket;
          readonly source: YearBucket;
      }
    | undefined {
    const tree = state.transactions[plan.accountId];
    if (typeof tree !== "object" || tree == null) return undefined;
    if (plan.sourceYearIndex !== plan.targetYearIndex + 1) return undefined;
    const target = tree.years[plan.targetYearIndex];
    const source = tree.years[plan.sourceYearIndex];
    if (!target || !source || target.year !== plan.year || source.year !== plan.year)
        return undefined;
    return { tree, target, source };
}

function getMonthPair(
    state: VaultState,
    plan: Extract<StructuralMaintenancePlan, { kind: "remove-month" }>
):
    | { readonly year: YearBucket; readonly target: MonthBucket; readonly source: MonthBucket }
    | undefined {
    const tree = state.transactions[plan.accountId];
    if (typeof tree !== "object" || tree == null) return undefined;
    const year = tree.years[plan.yearIndex];
    if (!year) return undefined;
    if (plan.sourceMonthIndex !== plan.targetMonthIndex + 1) return undefined;
    const target = year.months[plan.targetMonthIndex];
    const source = year.months[plan.sourceMonthIndex];
    if (!target || !source || target.month !== plan.month || source.month !== plan.month)
        return undefined;
    return { year, target, source };
}

function getDayPair(
    state: VaultState,
    plan: Extract<StructuralMaintenancePlan, { kind: "remove-day" }>
):
    | { readonly month: MonthBucket; readonly target: DayBucket; readonly source: DayBucket }
    | undefined {
    const tree = state.transactions[plan.accountId];
    if (typeof tree !== "object" || tree == null) return undefined;
    const year = tree.years[plan.yearIndex];
    const month = year?.months[plan.monthIndex];
    if (!month) return undefined;
    if (plan.sourceDayIndex !== plan.targetDayIndex + 1) return undefined;
    const target = month.days[plan.targetDayIndex];
    const source = month.days[plan.sourceDayIndex];
    if (!target || !source || target.day !== plan.day || source.day !== plan.day) return undefined;
    return { month, target, source };
}

type CloneableTransaction = Transaction | Transaction["suspectedDuplicates"][number];

interface NestedCloneJob {
    readonly allocations: LoroMap;
    readonly allocationEntries: Generator<readonly [string, number]>;
    readonly map: LoroMap;
    readonly source: Transaction["suspectedDuplicates"][number];
    readonly tags: LoroList;
    allocationComplete: boolean;
    tagIndex: number;
}

interface TransactionCloneJob {
    readonly allocations: LoroMap;
    readonly allocationEntries: Generator<readonly [string, number]>;
    readonly duplicates: LoroList;
    readonly root: LoroMap;
    readonly source: Transaction;
    readonly tags: LoroList;
    allocationComplete: boolean;
    duplicateIndex: number;
    nested?: NestedCloneJob;
    tagIndex: number;
}

const relocationCloneJobs = new WeakMap<LoroDoc, Map<string, TransactionCloneJob>>();
const MAX_RELOCATION_CLONE_ITEMS = 8;

function* numericRecordEntries(
    record: Transaction["allocations"]
): Generator<readonly [string, number]> {
    for (const key in record) {
        const value = record[key];
        if (key !== "$cid" && typeof value === "number") yield [key, value];
    }
}

function setTransactionScalars(target: LoroMap, source: CloneableTransaction): void {
    target.set("id", source.id);
    target.set("date", source.date.toString());
    target.set("description", source.description);
    if (source.descriptionAliasId != null) {
        target.set("descriptionAliasId", source.descriptionAliasId);
    }
    target.set("notes", source.notes);
    target.set("amount", source.amount);
    target.set("accountId", source.accountId);
    target.set("statusId", source.statusId);
    if (source.importId != null) target.set("importId", source.importId);
    target.set("creationInstant", source.creationInstant.epochMilliseconds);
    if (source.importRowIndex != null) target.set("importRowIndex", source.importRowIndex);
    if (source.deletedAt != null) target.set("deletedAt", source.deletedAt.epochMilliseconds);
}

function createTransactionCloneJob(source: Transaction): TransactionCloneJob {
    const root = new LoroMap();
    setTransactionScalars(root, source);
    const tags = root.setContainer("tagIds", new LoroList());
    const allocations = root.setContainer("allocations", new LoroMap());
    const duplicates = root.setContainer("suspectedDuplicates", new LoroList());
    return {
        allocations,
        allocationEntries: numericRecordEntries(source.allocations),
        duplicates,
        root,
        source,
        tags,
        allocationComplete: false,
        duplicateIndex: 0,
        tagIndex: 0
    };
}

function createNestedCloneJob(
    source: Transaction["suspectedDuplicates"][number],
    parent: LoroList
): NestedCloneJob {
    const map = parent.pushContainer(new LoroMap());
    setTransactionScalars(map, source);
    const tags = map.setContainer("tagIds", new LoroList());
    const allocations = map.setContainer("allocations", new LoroMap());
    return {
        allocations,
        allocationEntries: numericRecordEntries(source.allocations),
        map,
        source,
        tags,
        allocationComplete: false,
        tagIndex: 0
    };
}

function advanceTransactionClone(job: TransactionCloneJob): boolean {
    let processed = 0;
    while (processed < MAX_RELOCATION_CLONE_ITEMS) {
        if (job.tagIndex < job.source.tagIds.length) {
            job.tags.push(job.source.tagIds[job.tagIndex]);
            job.tagIndex += 1;
            processed += 1;
            continue;
        }
        if (!job.allocationComplete) {
            const next = job.allocationEntries.next();
            processed += 1;
            if (!next.done) {
                job.allocations.set(next.value[0], next.value[1]);
                continue;
            }
            job.allocationComplete = true;
        }
        if (!job.nested) {
            const source = job.source.suspectedDuplicates[job.duplicateIndex];
            if (!source) return true;
            job.nested = createNestedCloneJob(source, job.duplicates);
            processed += 1;
            continue;
        }
        const nested = job.nested;
        if (nested.tagIndex < nested.source.tagIds.length) {
            nested.tags.push(nested.source.tagIds[nested.tagIndex]);
            nested.tagIndex += 1;
            processed += 1;
            continue;
        }
        if (!nested.allocationComplete) {
            const next = nested.allocationEntries.next();
            processed += 1;
            if (!next.done) {
                nested.allocations.set(next.value[0], next.value[1]);
                continue;
            }
            nested.allocationComplete = true;
        }
        job.duplicateIndex += 1;
        job.nested = undefined;
    }
    return false;
}

function getRelocationCloneJobs(doc: LoroDoc): Map<string, TransactionCloneJob> {
    const existing = relocationCloneJobs.get(doc);
    if (existing) return existing;
    const created = new Map<string, TransactionCloneJob>();
    relocationCloneJobs.set(doc, created);
    return created;
}

function clearRelocationCloneJobs(doc: LoroDoc): void {
    relocationCloneJobs.delete(doc);
}

function getTransactionList(input: {
    readonly accountId: string;
    readonly dayIndex: number;
    readonly doc: LoroDoc;
    readonly monthIndex: number;
    readonly yearIndex: number;
}): LoroList | undefined {
    const account = input.doc.getMap("transactions").get(input.accountId);
    if (!(account instanceof LoroMap)) return undefined;
    const years = account.get("years");
    const year = years instanceof LoroList ? years.get(input.yearIndex) : undefined;
    const months = year instanceof LoroMap ? year.get("months") : undefined;
    const month = months instanceof LoroList ? months.get(input.monthIndex) : undefined;
    const days = month instanceof LoroMap ? month.get("days") : undefined;
    const day = days instanceof LoroList ? days.get(input.dayIndex) : undefined;
    const transactions = day instanceof LoroMap ? day.get("transactions") : undefined;
    return transactions instanceof LoroList ? transactions : undefined;
}

function deleteContainerAt(list: LoroList, index: number, container: LoroMap): boolean {
    const indexed = list.get(index);
    if (!(indexed instanceof LoroMap) || indexed.id !== container.id) return false;
    list.delete(index, 1);
    return true;
}

function pruneEmptyTransactionContainers(input: {
    readonly dayIndex: number;
    readonly monthIndex: number;
    readonly sourceList: LoroList;
    readonly yearIndex: number;
}): void {
    if (input.sourceList.length !== 0) return;
    const day = input.sourceList.parent();
    const days = day?.parent();
    if (!(day instanceof LoroMap) || !(days instanceof LoroList)) return;
    if (!deleteContainerAt(days, input.dayIndex, day) || days.length !== 0) return;
    const month = days.parent();
    const months = month?.parent();
    if (!(month instanceof LoroMap) || !(months instanceof LoroList)) return;
    if (!deleteContainerAt(months, input.monthIndex, month) || months.length !== 0) return;
    const year = months.parent();
    const years = year?.parent();
    if (year instanceof LoroMap && years instanceof LoroList) {
        deleteContainerAt(years, input.yearIndex, year);
    }
}

/** Revalidate and apply one narrow maintenance mutation. */
export function applyVaultMaintenancePlan(
    state: VaultState,
    plan: VaultMaintenancePlan,
    doc?: LoroDoc
): boolean {
    if (plan.kind === "rewrite-alias-reference") {
        return rewriteDescriptionAliasMaintenanceReference(state, plan);
    }
    if (plan.kind === "remove-alias-symlink") {
        return hardDeleteProvenDescriptionAliasSymlink(state, plan);
    }
    if (plan.kind === "relocate-conflict-transaction") {
        if (!doc) return false;
        const tree = state.transactions[plan.accountId];
        if (typeof tree !== "object" || tree == null) return false;
        const { yearIndex, monthIndex, dayIndex } = plan;
        const year = tree.years[yearIndex];
        const month = year?.months[monthIndex];
        const day = month?.days[dayIndex];
        if (!year || !month || !day) return false;
        const transactionIndex = plan.transactionIndex;
        const transaction = day.transactions[transactionIndex];
        if (
            !transaction ||
            transaction.id !== plan.transactionId ||
            transaction.$cid !== plan.transactionCid
        ) {
            return false;
        }
        const sourceList = getTransactionList({
            accountId: plan.accountId,
            dayIndex,
            doc,
            monthIndex,
            yearIndex
        });
        const targetList = getTransactionList({
            accountId: plan.accountId,
            dayIndex: plan.targetDayIndex,
            doc,
            monthIndex: plan.targetMonthIndex,
            yearIndex: plan.targetYearIndex
        });
        const transactionContainer = sourceList?.get(transactionIndex);
        const targetAnchor = targetList?.get(plan.targetTransactionIndex);
        if (
            !(transactionContainer instanceof LoroMap) ||
            !(sourceList instanceof LoroList) ||
            !(targetList instanceof LoroList) ||
            !(targetAnchor instanceof LoroMap) ||
            (plan.targetTransactionCid != null && targetAnchor.id !== plan.targetTransactionCid)
        ) {
            return false;
        }
        if (plan.mode === "move") {
            const jobs = getRelocationCloneJobs(doc);
            const key = transactionContainer.id;
            const job = jobs.get(key) ?? createTransactionCloneJob(transaction);
            jobs.set(key, job);
            if (!advanceTransactionClone(job)) return true;
            targetList.pushContainer(job.root);
            jobs.delete(key);
        }
        sourceList.delete(transactionIndex, 1);
        pruneEmptyTransactionContainers({ dayIndex, monthIndex, sourceList, yearIndex });
        doc.commit({ origin: "system:gc" });
        return true;
    }
    if (plan.kind === "remove-year") {
        const pair = getYearPair(state, plan);
        if (!pair || pair.source.months.length !== 0) return false;
        pair.tree.years.splice(plan.sourceYearIndex, 1);
        return true;
    }
    if (plan.kind === "remove-month") {
        const pair = getMonthPair(state, plan);
        if (!pair || pair.source.days.length !== 0) return false;
        pair.year.months.splice(plan.sourceMonthIndex, 1);
        return true;
    }
    const pair = getDayPair(state, plan);
    if (!pair || pair.source.transactions.length !== 0) return false;
    pair.month.days.splice(plan.sourceDayIndex, 1);
    return true;
}

/** Execute a bounded frame while keeping discovery separate from applied CRDT mutations. */
export function runVaultMaintenanceFrame(input: {
    readonly apply: (plan: VaultMaintenancePlan) => boolean;
    readonly budget?: VaultMaintenanceBudget;
    readonly cursor: VaultMaintenanceCursor;
    readonly getState: () => VaultState;
    readonly now: () => number;
}): VaultMaintenanceFrameResult {
    const budget = input.budget ?? DEFAULT_VAULT_MAINTENANCE_BUDGET;
    const startedAt = input.now();
    let cursor = input.cursor;
    let processed = 0;
    let applied = 0;

    while (processed < budget.maxItems) {
        if (input.now() - startedAt >= budget.maxMilliseconds) {
            return { applied, complete: false, cursor, processed, yieldReason: "time" };
        }
        const stepCursor = cursor;
        const step = planVaultMaintenanceStep(input.getState(), cursor);
        cursor = step.cursor;
        processed += 1;
        if (input.now() - startedAt >= budget.maxMilliseconds) {
            return { applied, complete: false, cursor: stepCursor, processed, yieldReason: "time" };
        }
        if (step.plan && input.apply(step.plan)) {
            applied += 1;
            cursor = { ...cursor, needsRescan: true };
        }
        if (input.now() - startedAt >= budget.maxMilliseconds) {
            return { applied, complete: false, cursor, processed, yieldReason: "time" };
        }
        if (cursor.phase === "done") {
            if (cursor.needsRescan) {
                return {
                    applied,
                    complete: false,
                    cursor: createVaultMaintenanceCursor(input.getState()),
                    processed,
                    yieldReason: "mutation"
                };
            }
            return { applied, complete: true, cursor, processed, yieldReason: "complete" };
        }
    }
    return { applied, complete: false, cursor, processed, yieldReason: "items" };
}

function hasRelevantMaintenanceChanges(
    event: Parameters<LoroDoc["subscribe"]>[0] extends (event: infer Event) => void ? Event : never
): boolean {
    if (event.origin === "system:gc") return false;
    return event.events.some(
        (item) => item.path[0] === "transactions" || item.path[0] === "descriptionAliases"
    );
}

function hasAliasProofInvalidatingChanges(
    event: Parameters<LoroDoc["subscribe"]>[0] extends (event: infer Event) => void ? Event : never
): boolean {
    return event.events.some((item) => {
        if (item.path[0] === "descriptionAliases") return true;
        if (item.path[0] !== "transactions") return false;
        const last = item.path[item.path.length - 1];
        return (
            item.path.includes("descriptionAliasId") ||
            last === "transactions" ||
            last === "suspectedDuplicates"
        );
    });
}

/** Own one resumable frame loop and exact document/visibility lifecycle. */
export function startVaultMaintenanceScheduler(input: {
    readonly budget?: VaultMaintenanceBudget;
    readonly doc: LoroDoc;
    readonly host: VaultMaintenanceFrameHost;
    readonly store: Pick<VaultMirror, "getState" | "setState">;
}): () => void {
    let cursor = createVaultMaintenanceCursor(input.store.getState());
    let frameId: number | undefined;
    let disposed = false;
    let needsAnotherPass = false;
    const aliasHistory = getVaultAliasHistoryFrontier(input.doc);

    const schedule = () => {
        if (disposed || frameId != null || !input.host.isVisible()) return;
        frameId = input.host.requestFrame(() => {
            frameId = undefined;
            if (disposed || !input.host.isVisible()) return;
            const result = runVaultMaintenanceFrame({
                apply: (plan) => {
                    const aliasId =
                        plan.kind === "rewrite-alias-reference"
                            ? plan.sourceAliasId
                            : plan.kind === "remove-alias-symlink"
                              ? plan.symlinkId
                              : undefined;
                    if (aliasId && aliasHistory?.has(aliasId)) return false;
                    if (!isVaultMaintenancePlanCurrent(input.store.getState(), plan)) return false;
                    if (plan.kind === "relocate-conflict-transaction") {
                        return applyVaultMaintenancePlan(input.store.getState(), plan, input.doc);
                    }
                    let applied = false;
                    input.store.setState(
                        (state: VaultState) => {
                            applied = applyVaultMaintenancePlan(state, plan);
                        },
                        { origin: "system:gc" }
                    );
                    return applied;
                },
                budget: input.budget,
                cursor,
                getState: () => input.store.getState(),
                now: input.host.now
            });
            cursor = result.cursor;
            if (result.complete && needsAnotherPass) {
                needsAnotherPass = false;
                cursor = createVaultMaintenanceCursor(input.store.getState());
                schedule();
            } else if (!result.complete) {
                schedule();
            }
        });
    };

    const unsubscribeDocument = input.doc.subscribe((event) => {
        if (!hasRelevantMaintenanceChanges(event)) return;
        clearRelocationCloneJobs(input.doc);
        if (cursor.transactionSearch) cursor = { ...cursor, transactionSearch: undefined };
        if (cursor.aliasProof && hasAliasProofInvalidatingChanges(event)) {
            cursor = { ...cursor, aliasProof: undefined };
        }
        needsAnotherPass = true;
        if (cursor.phase === "done") {
            needsAnotherPass = false;
            cursor = createVaultMaintenanceCursor(input.store.getState());
        }
        schedule();
    });
    const unsubscribeAliasHistory = aliasHistory?.subscribe(() => {
        needsAnotherPass = true;
        if (cursor.phase === "done") {
            needsAnotherPass = false;
            cursor = createVaultMaintenanceCursor(input.store.getState());
        }
        schedule();
    });
    const unsubscribeVisibility = input.host.subscribeVisibility(() => {
        if (!input.host.isVisible()) {
            if (frameId != null) input.host.cancelFrame(frameId);
            frameId = undefined;
            return;
        }
        schedule();
    });
    schedule();

    return () => {
        if (disposed) return;
        disposed = true;
        if (frameId != null) input.host.cancelFrame(frameId);
        frameId = undefined;
        unsubscribeVisibility();
        unsubscribeDocument();
        unsubscribeAliasHistory?.();
        clearRelocationCloneJobs(input.doc);
    };
}
