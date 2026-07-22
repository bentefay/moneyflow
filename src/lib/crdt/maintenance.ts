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
import {
    getTransactionMaintenanceShadowIdentity,
    isPublicTransaction,
    TRANSACTION_MAINTENANCE_SHADOW_ID_PREFIX
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

const MAINTENANCE_METADATA_ACCOUNT_KEY = "__moneyflow_gc_metadata__";
const MAINTENANCE_METADATA_VALUE_PREFIX = "__moneyflow_gc_metadata__:";
type TransactionShadowPhase =
    | "tags"
    | "allocations"
    | "duplicates"
    | "duplicate-tags"
    | "duplicate-allocations"
    | "ready";

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
    readonly transactionShadows: Map<string, TransactionShadowCursor>;
    readonly transactionCopies: Map<string, TransactionCopyCursor>;
}

interface TransactionCopyCursor {
    readonly cid?: string;
    readonly dayIndex: number;
    readonly key: string;
    readonly monthIndex: number;
    readonly transactionIndex: number;
    readonly yearIndex: number;
}

interface TransactionShadowCursor {
    readonly cid?: string;
    readonly dayIndex: number;
    readonly epoch?: string;
    readonly monthIndex: number;
    readonly transactionIndex: number;
    readonly yearIndex: number;
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
    readonly stage: "target" | "insertion";
    readonly sourceCid?: string;
    readonly sourceId: string;
    readonly sourceCreationMilliseconds: number;
    readonly sourceImportRowIndex?: number;
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
    readonly shadowCid?: string;
    readonly shadowDayIndex?: number;
    readonly shadowEpoch?: string;
    readonly shadowMonthIndex?: number;
    readonly shadowTransactionIndex?: number;
    readonly shadowYearIndex?: number;
    readonly insertionScanIndex: number;
    readonly targetInsertionIndex?: number;
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
          readonly targetInsertionIndex?: number;
          readonly transactionCid?: string;
          readonly transactionId: string;
          readonly transactionIndex: number;
          readonly shadowCid?: string;
          readonly shadowDayIndex?: number;
          readonly shadowEpoch?: string;
          readonly shadowMonthIndex?: number;
          readonly shadowTransactionIndex?: number;
          readonly shadowYearIndex?: number;
          readonly provenState: VaultState;
      }
    | {
          readonly kind: "discard-transaction-shadow";
          readonly accountId: string;
          readonly dayIndex: number;
          readonly monthIndex: number;
          readonly shadowCid?: string;
          readonly shadowEpoch?: string;
          readonly transactionIndex: number;
          readonly yearIndex: number;
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
        (plan.kind !== "remove-alias-symlink" &&
            plan.kind !== "relocate-conflict-transaction" &&
            plan.kind !== "discard-transaction-shadow") ||
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
        accountKeyIterator: recordKeys(state.transactions, MAINTENANCE_METADATA_ACCOUNT_KEY),
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
        transactionCopies: new Map(),
        transactionShadows: new Map(),
        needsRescan: false
    };
}

function* recordKeys(record: object, excludedKey?: string): Generator<string> {
    for (const key in record) {
        if (key !== "$cid" && key !== excludedKey) yield key;
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

function containerIdentityKey(cid: string | undefined): string | undefined {
    return cid?.startsWith("cid:") ? cid.slice(4) : cid;
}

function createTransactionSearch(
    transaction: Transaction,
    cursor: VaultMaintenanceCursor
): TransactionSearchCursor {
    return {
        stage: "target",
        sourceCid: transaction.$cid,
        sourceId: transaction.id,
        sourceCreationMilliseconds: transaction.creationInstant.epochMilliseconds,
        sourceImportRowIndex: transaction.importRowIndex,
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
        scanTransactionIndex: 0,
        insertionScanIndex: 0
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

function compareSearchSourceToTransaction(
    search: TransactionSearchCursor,
    transaction: Transaction
): number {
    const instantCompare =
        transaction.creationInstant.epochMilliseconds - search.sourceCreationMilliseconds;
    if (instantCompare !== 0) return instantCompare;
    const sourceIndex = search.sourceImportRowIndex ?? Infinity;
    const transactionIndex = transaction.importRowIndex ?? Infinity;
    const importCompare = sourceIndex - transactionIndex;
    if (importCompare !== 0) return importCompare;
    const identity = getTransactionMaintenanceShadowIdentity(transaction);
    return search.sourceId.localeCompare(identity?.publicId ?? transaction.id);
}

function advanceTransactionSearch(
    tree: AccountTransactionTree,
    search: TransactionSearchCursor
): { readonly complete: boolean; readonly search: TransactionSearchCursor } {
    if (search.stage === "insertion") {
        const year =
            search.bestDayYearIndex == null ? undefined : tree.years[search.bestDayYearIndex];
        const month =
            search.bestDayMonthIndex == null ? undefined : year?.months[search.bestDayMonthIndex];
        const day = search.bestDayIndex == null ? undefined : month?.days[search.bestDayIndex];
        if (!day) return { complete: true, search };
        const transaction = day.transactions[search.insertionScanIndex];
        if (!transaction) {
            return {
                complete: true,
                search: { ...search, targetInsertionIndex: search.insertionScanIndex }
            };
        }
        const identity = getTransactionMaintenanceShadowIdentity(transaction);
        const matchesSource =
            identity?.publicId === search.sourceId &&
            (search.sourceCid == null ||
                containerIdentityKey(identity.sourceCid) ===
                    containerIdentityKey(search.sourceCid));
        const withShadow: TransactionSearchCursor = matchesSource
            ? {
                  ...search,
                  shadowCid: transaction.$cid,
                  shadowDayIndex: search.bestDayIndex,
                  shadowEpoch: identity.epoch,
                  shadowMonthIndex: search.bestDayMonthIndex,
                  shadowTransactionIndex: search.insertionScanIndex,
                  shadowYearIndex: search.bestDayYearIndex
              }
            : search;
        if (compareSearchSourceToTransaction(search, transaction) < 0) {
            return {
                complete: true,
                search: { ...withShadow, targetInsertionIndex: search.insertionScanIndex }
            };
        }
        return {
            complete: false,
            search: { ...withShadow, insertionScanIndex: search.insertionScanIndex + 1 }
        };
    }
    const year = tree.years[search.scanYearIndex];
    if (!year) {
        if (
            search.bestDayYearIndex == null ||
            search.bestDayMonthIndex == null ||
            search.bestDayIndex == null
        ) {
            return { complete: true, search };
        }
        return {
            complete: false,
            search: { ...search, stage: "insertion", insertionScanIndex: 0 }
        };
    }
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
    if (!isPublicTransaction(transaction)) {
        const identity = getTransactionMaintenanceShadowIdentity(transaction);
        const matchesSource =
            containerIdentityKey(identity?.sourceCid) === containerIdentityKey(search.sourceCid);
        const replacesShadow =
            matchesSource &&
            (search.shadowCid == null || transaction.$cid.localeCompare(search.shadowCid) < 0);
        return {
            complete: false,
            search: {
                ...search,
                scanTransactionIndex: search.scanTransactionIndex + 1,
                shadowCid: replacesShadow ? transaction.$cid : search.shadowCid,
                shadowDayIndex: replacesShadow ? search.scanDayIndex : search.shadowDayIndex,
                shadowEpoch: replacesShadow ? identity?.epoch : search.shadowEpoch,
                shadowMonthIndex: replacesShadow ? search.scanMonthIndex : search.shadowMonthIndex,
                shadowTransactionIndex: replacesShadow
                    ? search.scanTransactionIndex
                    : search.shadowTransactionIndex,
                shadowYearIndex: replacesShadow ? search.scanYearIndex : search.shadowYearIndex
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

    if (!isPublicTransaction(transaction)) {
        const identity = getTransactionMaintenanceShadowIdentity(transaction);
        if (identity) {
            const sourceKey = containerIdentityKey(identity.sourceCid);
            const shadow = {
                cid: transaction.$cid,
                dayIndex: cursor.dayIndex,
                epoch: identity.epoch,
                monthIndex: cursor.monthIndex,
                transactionIndex: cursor.transactionIndex,
                yearIndex: cursor.yearIndex
            };
            if (sourceKey) cursor.transactionShadows.set(sourceKey, shadow);
            cursor.transactionShadows.set(`id:${identity.publicId}`, shadow);
        }
        return {
            cursor: nextTransactionContainer(cursor),
            plan: {
                kind: "discard-transaction-shadow",
                accountId: current.accountId,
                dayIndex: cursor.dayIndex,
                monthIndex: cursor.monthIndex,
                shadowCid: transaction.$cid,
                shadowEpoch: identity?.epoch,
                transactionIndex: cursor.transactionIndex,
                yearIndex: cursor.yearIndex,
                provenState: state
            }
        };
    }

    if (cursor.nestedIndex < 0 && !cursor.transactionSearch) {
        const copyKey = `${current.accountId}\u0000${transaction.date}\u0000${transaction.id}`;
        const transactionKey = transactionIdentityKey(transaction);
        const existing = cursor.transactionCopies.get(copyKey);
        const currentCopy: TransactionCopyCursor = {
            cid: transaction.$cid,
            dayIndex: cursor.dayIndex,
            key: transactionKey,
            monthIndex: cursor.monthIndex,
            transactionIndex: cursor.transactionIndex,
            yearIndex: cursor.yearIndex
        };
        if (!existing) cursor.transactionCopies.set(copyKey, currentCopy);
        else {
            const currentWins = transactionKey < existing.key;
            const winner = currentWins ? currentCopy : existing;
            const loser = currentWins ? existing : currentCopy;
            cursor.transactionCopies.set(copyKey, winner);
            return {
                cursor: nextTransactionContainer(cursor),
                plan: {
                    kind: "relocate-conflict-transaction",
                    accountId: current.accountId,
                    yearIndex: loser.yearIndex,
                    monthIndex: loser.monthIndex,
                    dayIndex: loser.dayIndex,
                    mode: "remove-source",
                    targetDayIndex: winner.dayIndex,
                    targetMonthIndex: winner.monthIndex,
                    targetYearIndex: winner.yearIndex,
                    targetTransactionCid: winner.cid,
                    targetTransactionIndex: winner.transactionIndex,
                    transactionCid: loser.cid,
                    transactionId: transaction.id,
                    transactionIndex: loser.transactionIndex,
                    provenState: state
                }
            };
        }
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
            const shadow =
                cursor.transactionShadows.get(containerIdentityKey(transaction.$cid) ?? "") ??
                cursor.transactionShadows.get(`id:${transaction.id}`);
            const move =
                cachedTarget.yearIndex !== cursor.yearIndex ||
                cachedTarget.monthIndex !== cursor.monthIndex ||
                cachedTarget.dayIndex !== cursor.dayIndex;
            if (move && !shadow) {
                const search = createTransactionSearch(transaction, cursor);
                return {
                    cursor: {
                        ...cursor,
                        transactionSearch: {
                            ...search,
                            stage: "insertion",
                            bestDayIndex: cachedTarget.dayIndex,
                            bestDayMonthIndex: cachedTarget.monthIndex,
                            bestDayTransactionCid: cachedTarget.transactionCid,
                            bestDayTransactionIndex: cachedTarget.transactionIndex,
                            bestDayYearIndex: cachedTarget.yearIndex
                        }
                    }
                };
            }
            const next = transaction.suspectedDuplicates.length
                ? { ...withPosition(cursor, { nestedIndex: 0 }), transactionSearch: undefined }
                : nextTransactionContainer(cursor);
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
                          shadowCid: shadow?.cid,
                          shadowDayIndex: shadow?.dayIndex,
                          shadowEpoch: shadow?.epoch,
                          shadowMonthIndex: shadow?.monthIndex,
                          shadowTransactionIndex: shadow?.transactionIndex,
                          shadowYearIndex: shadow?.yearIndex,
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
                    targetInsertionIndex: progress.search.targetInsertionIndex,
                    transactionCid: transaction.$cid,
                    transactionId: transaction.id,
                    transactionIndex: cursor.transactionIndex,
                    shadowCid: progress.search.shadowCid,
                    shadowDayIndex: progress.search.shadowDayIndex,
                    shadowEpoch: progress.search.shadowEpoch,
                    shadowMonthIndex: progress.search.shadowMonthIndex,
                    shadowTransactionIndex: progress.search.shadowTransactionIndex,
                    shadowYearIndex: progress.search.shadowYearIndex,
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
        if (!isPublicTransaction(transaction)) {
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

interface AllocationIteratorState {
    readonly iterator: Generator<readonly [string, number]>;
    readonly sourceCid: string;
}

const relocationAllocationIterators = new WeakMap<LoroDoc, Map<string, AllocationIteratorState>>();

function* numericRecordEntries(
    record: Transaction["allocations"]
): Generator<readonly [string, number]> {
    for (const key in record) {
        const value = record[key];
        if (key !== "$cid" && typeof value === "number") yield [key, value];
    }
}

function setTransactionScalars(
    target: LoroMap,
    source: CloneableTransaction,
    id: string = source.id
): void {
    target.set("id", id);
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

function getMaintenanceMetadata(doc: LoroDoc): LoroMap | undefined {
    const metadata = doc.getMap("transactions").get(MAINTENANCE_METADATA_ACCOUNT_KEY);
    return metadata instanceof LoroMap ? metadata : undefined;
}

function getMaintenanceEpoch(doc: LoroDoc): string | undefined {
    const value = getMaintenanceMetadata(doc)?.get("accountId");
    if (typeof value !== "string" || !value.startsWith(MAINTENANCE_METADATA_VALUE_PREFIX)) {
        return undefined;
    }
    const [epoch] = value.slice(MAINTENANCE_METADATA_VALUE_PREFIX.length).split("\u0000");
    return epoch || undefined;
}

function hasActiveMaintenanceShadow(doc: LoroDoc): boolean {
    const value = getMaintenanceMetadata(doc)?.get("accountId");
    if (typeof value !== "string" || !value.startsWith(MAINTENANCE_METADATA_VALUE_PREFIX)) {
        return false;
    }
    const [, , active] = value.slice(MAINTENANCE_METADATA_VALUE_PREFIX.length).split("\u0000");
    return active === "1";
}

function setMaintenanceMetadata(doc: LoroDoc, epoch: string, shadowActive: boolean): void {
    const transactions = doc.getMap("transactions");
    const existing = transactions.get(MAINTENANCE_METADATA_ACCOUNT_KEY);
    const metadata =
        existing instanceof LoroMap
            ? existing
            : transactions.setContainer(MAINTENANCE_METADATA_ACCOUNT_KEY, new LoroMap());
    if (!(metadata.get("years") instanceof LoroList)) {
        metadata.setContainer("years", new LoroList());
    }
    metadata.set(
        "accountId",
        `${MAINTENANCE_METADATA_VALUE_PREFIX}${epoch}\u0000${crypto.randomUUID()}\u0000${shadowActive ? "1" : "0"}`
    );
}

function commitMaintenance(
    doc: LoroDoc,
    shadowActive = false,
    epoch = getMaintenanceEpoch(doc) ?? crypto.randomUUID()
): void {
    setMaintenanceMetadata(doc, epoch, shadowActive);
    doc.commit({ origin: "system:gc" });
}

function ensureMaintenanceEpoch(doc: LoroDoc): {
    readonly created: boolean;
    readonly epoch: string;
} {
    const existing = getMaintenanceEpoch(doc);
    if (existing) return { created: false, epoch: existing };
    const epoch = crypto.randomUUID();
    commitMaintenance(doc, false, epoch);
    return { created: true, epoch };
}

function rotateMaintenanceEpoch(doc: LoroDoc): void {
    commitMaintenance(doc, false, crypto.randomUUID());
}

function getAllocationIterators(doc: LoroDoc): Map<string, AllocationIteratorState> {
    const existing = relocationAllocationIterators.get(doc);
    if (existing) return existing;
    const created = new Map<string, AllocationIteratorState>();
    relocationAllocationIterators.set(doc, created);
    return created;
}

function nextAllocationEntry(
    doc: LoroDoc,
    key: string,
    source: CloneableTransaction
): IteratorResult<readonly [string, number]> {
    const iterators = getAllocationIterators(doc);
    const existing = iterators.get(key);
    const state =
        existing != null && existing.sourceCid === source.$cid
            ? existing
            : { iterator: numericRecordEntries(source.allocations), sourceCid: source.$cid };
    iterators.set(key, state);
    const next = state.iterator.next();
    if (next.done) iterators.delete(key);
    return next;
}

function clearRelocationAllocationIterators(doc: LoroDoc): void {
    relocationAllocationIterators.delete(doc);
}

function isTransactionShadowPhase(value: unknown): value is TransactionShadowPhase {
    return (
        value === "tags" ||
        value === "allocations" ||
        value === "duplicates" ||
        value === "duplicate-tags" ||
        value === "duplicate-allocations" ||
        value === "ready"
    );
}

function createAttachedTransactionShadow(input: {
    readonly epoch: string;
    readonly insertionIndex: number;
    readonly source: Transaction;
    readonly sourceCid: string;
    readonly targetList: LoroList;
}): LoroMap {
    // Only an empty map crosses the Loro attachment boundary; all descendants are attached later.
    const shadow = input.targetList.insertContainer(input.insertionIndex, new LoroMap());
    setTransactionScalars(
        shadow,
        input.source,
        `${TRANSACTION_MAINTENANCE_SHADOW_ID_PREFIX}${input.epoch}\u0000${input.sourceCid}\u0000${input.source.id}`
    );
    shadow.set("maintenanceShadowPhase", "tags");
    shadow.set("maintenanceShadowDuplicateIndex", 0);
    shadow.setContainer("tagIds", new LoroList());
    shadow.setContainer("allocations", new LoroMap());
    shadow.setContainer("suspectedDuplicates", new LoroList());
    return shadow;
}

function createAttachedNestedShadow(
    source: Transaction["suspectedDuplicates"][number],
    duplicates: LoroList
): LoroMap {
    const nested = duplicates.pushContainer(new LoroMap());
    setTransactionScalars(nested, source);
    nested.setContainer("tagIds", new LoroList());
    nested.setContainer("allocations", new LoroMap());
    return nested;
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

function shadowPhase(shadow: LoroMap): TransactionShadowPhase | undefined {
    const phase = shadow.get("maintenanceShadowPhase");
    return isTransactionShadowPhase(phase) ? phase : undefined;
}

function shadowDuplicateIndex(shadow: LoroMap): number | undefined {
    const index = shadow.get("maintenanceShadowDuplicateIndex");
    return typeof index === "number" && Number.isInteger(index) && index >= 0 ? index : undefined;
}

function childList(parent: LoroMap, key: string): LoroList | undefined {
    const child = parent.get(key);
    return child instanceof LoroList ? child : undefined;
}

function childMap(parent: LoroMap, key: string): LoroMap | undefined {
    const child = parent.get(key);
    return child instanceof LoroMap ? child : undefined;
}

function advanceAttachedTransactionShadow(input: {
    readonly doc: LoroDoc;
    readonly shadow: LoroMap;
    readonly source: Transaction;
}): "advanced" | "invalid" | "ready" {
    const phase = shadowPhase(input.shadow);
    if (!phase) return "invalid";
    if (phase === "ready") return "ready";

    const tags = childList(input.shadow, "tagIds");
    const allocations = childMap(input.shadow, "allocations");
    const duplicates = childList(input.shadow, "suspectedDuplicates");
    if (!tags || !allocations || !duplicates) return "invalid";

    if (phase === "tags") {
        if (tags.length > input.source.tagIds.length) return "invalid";
        const tagId = input.source.tagIds[tags.length];
        if (tagId != null) tags.push(tagId);
        else input.shadow.set("maintenanceShadowPhase", "allocations");
        return "advanced";
    }

    if (phase === "allocations") {
        const next = nextAllocationEntry(input.doc, `${input.shadow.id}:root`, input.source);
        if (!next.done) allocations.set(next.value[0], next.value[1]);
        else input.shadow.set("maintenanceShadowPhase", "duplicates");
        return "advanced";
    }

    const duplicateIndex = shadowDuplicateIndex(input.shadow);
    if (duplicateIndex == null || duplicateIndex > input.source.suspectedDuplicates.length) {
        return "invalid";
    }
    if (duplicateIndex === input.source.suspectedDuplicates.length) {
        input.shadow.set("maintenanceShadowPhase", "ready");
        return "advanced";
    }
    const sourceDuplicate = input.source.suspectedDuplicates[duplicateIndex];
    if (!sourceDuplicate) return "invalid";

    if (phase === "duplicates") {
        if (duplicates.length < duplicateIndex || duplicates.length > duplicateIndex + 1) {
            return "invalid";
        }
        if (duplicates.length === duplicateIndex) {
            createAttachedNestedShadow(sourceDuplicate, duplicates);
        }
        input.shadow.set("maintenanceShadowPhase", "duplicate-tags");
        return "advanced";
    }

    const nested = duplicates.get(duplicateIndex);
    if (!(nested instanceof LoroMap)) return "invalid";
    const nestedTags = childList(nested, "tagIds");
    const nestedAllocations = childMap(nested, "allocations");
    if (!nestedTags || !nestedAllocations) return "invalid";

    if (phase === "duplicate-tags") {
        if (nestedTags.length > sourceDuplicate.tagIds.length) return "invalid";
        const tagId = sourceDuplicate.tagIds[nestedTags.length];
        if (tagId != null) nestedTags.push(tagId);
        else input.shadow.set("maintenanceShadowPhase", "duplicate-allocations");
        return "advanced";
    }

    const next = nextAllocationEntry(
        input.doc,
        `${input.shadow.id}:nested:${duplicateIndex}`,
        sourceDuplicate
    );
    if (!next.done) nestedAllocations.set(next.value[0], next.value[1]);
    else {
        input.shadow.set("maintenanceShadowDuplicateIndex", duplicateIndex + 1);
        input.shadow.set("maintenanceShadowPhase", "duplicates");
    }
    return "advanced";
}

function getPlannedShadow(
    doc: LoroDoc,
    plan: Extract<StructuralMaintenancePlan, { kind: "relocate-conflict-transaction" }>
): LoroMap | undefined {
    if (
        plan.shadowYearIndex == null ||
        plan.shadowMonthIndex == null ||
        plan.shadowDayIndex == null ||
        plan.shadowTransactionIndex == null
    ) {
        return undefined;
    }
    const list = getTransactionList({
        accountId: plan.accountId,
        dayIndex: plan.shadowDayIndex,
        doc,
        monthIndex: plan.shadowMonthIndex,
        yearIndex: plan.shadowYearIndex
    });
    const shadow = list?.get(plan.shadowTransactionIndex);
    return shadow instanceof LoroMap && (plan.shadowCid == null || shadow.id === plan.shadowCid)
        ? shadow
        : undefined;
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
    if (plan.kind === "discard-transaction-shadow") {
        if (!doc) return false;
        const list = getTransactionList({
            accountId: plan.accountId,
            dayIndex: plan.dayIndex,
            doc,
            monthIndex: plan.monthIndex,
            yearIndex: plan.yearIndex
        });
        const shadow = list?.get(plan.transactionIndex);
        if (
            !(list instanceof LoroList) ||
            !(shadow instanceof LoroMap) ||
            (plan.shadowCid != null && shadow.id !== plan.shadowCid)
        )
            return false;
        const currentEpoch = getMaintenanceEpoch(doc);
        const id = shadow.get("id");
        const identity =
            typeof id === "string" ? getTransactionMaintenanceShadowIdentity({ id }) : undefined;
        const validCurrentShadow =
            currentEpoch != null &&
            plan.shadowEpoch === currentEpoch &&
            identity?.epoch === currentEpoch &&
            identity.sourceCid.length > 0 &&
            shadowPhase(shadow) != null &&
            shadowDuplicateIndex(shadow) != null;
        if (validCurrentShadow) return false;
        list.delete(plan.transactionIndex, 1);
        commitMaintenance(doc);
        return true;
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
            const epoch = ensureMaintenanceEpoch(doc);
            if (epoch.created) return true;
            const plannedShadow = getPlannedShadow(doc, plan);
            if (!plannedShadow) {
                if (plan.shadowCid != null) return false;
                createAttachedTransactionShadow({
                    epoch: epoch.epoch,
                    insertionIndex: plan.targetInsertionIndex ?? targetList.length,
                    source: transaction,
                    sourceCid: plan.transactionCid ?? transactionContainer.id,
                    targetList
                });
                commitMaintenance(doc, true);
                return true;
            }
            const plannedShadowId = plannedShadow.get("id");
            const plannedShadowIdentity =
                typeof plannedShadowId === "string"
                    ? getTransactionMaintenanceShadowIdentity({ id: plannedShadowId })
                    : undefined;
            if (
                containerIdentityKey(plannedShadowIdentity?.sourceCid) !==
                    containerIdentityKey(plan.transactionCid ?? transactionContainer.id) ||
                plannedShadowIdentity?.epoch !== epoch.epoch ||
                plan.shadowEpoch !== epoch.epoch
            ) {
                return false;
            }
            const progress = advanceAttachedTransactionShadow({
                doc,
                shadow: plannedShadow,
                source: transaction
            });
            if (progress === "invalid") return false;
            if (progress === "advanced") {
                commitMaintenance(doc, true);
                return true;
            }
            plannedShadow.set("id", transaction.id);
            plannedShadow.delete("maintenanceShadowPhase");
            plannedShadow.delete("maintenanceShadowDuplicateIndex");
        }
        sourceList.delete(transactionIndex, 1);
        pruneEmptyTransactionContainers({ dayIndex, monthIndex, sourceList, yearIndex });
        commitMaintenance(doc);
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
    const touchesDomain = event.events.some(
        (item) =>
            (item.path[0] === "transactions" &&
                item.path[1] !== MAINTENANCE_METADATA_ACCOUNT_KEY) ||
            item.path[0] === "descriptionAliases"
    );
    if (!touchesDomain) return false;
    if (event.by === "local") return true;
    return !hasEncodedMaintenanceBatch(event);
}

function hasEncodedMaintenanceBatch(
    event: Parameters<LoroDoc["subscribe"]>[0] extends (event: infer Event) => void ? Event : never
): boolean {
    return event.events.some(
        (item) =>
            item.path[0] === "transactions" &&
            item.path[1] === MAINTENANCE_METADATA_ACCOUNT_KEY &&
            item.diff.type === "map" &&
            Object.hasOwn(item.diff.updated, "accountId")
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
                    if (
                        plan.kind === "relocate-conflict-transaction" ||
                        plan.kind === "discard-transaction-shadow"
                    ) {
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
        if (hasActiveMaintenanceShadow(input.doc)) rotateMaintenanceEpoch(input.doc);
        clearRelocationAllocationIterators(input.doc);
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
        clearRelocationAllocationIterators(input.doc);
    };
}
