import type { LoroDoc } from "loro-crdt";

import {
    hardDeleteUnreferencedDescriptionAliasSymlink,
    rewriteDescriptionAliasMaintenanceReference,
    type DescriptionAliasMaintenanceReference
} from "./description-aliases";
import type { VaultMirror } from "./mirror";
import { getDayBuckets, insertTransaction, pruneBuckets } from "./mutations";
import type {
    AccountTransactionTree,
    DayBucket,
    MonthBucket,
    NestedDuplicateInput,
    Transaction,
    TransactionInput,
    VaultState,
    YearBucket
} from "./schema";
import { getVaultAliasHistoryFrontier } from "./undo";

function copyAllocations(record: Transaction["allocations"]): NestedDuplicateInput["allocations"] {
    return Object.fromEntries(
        Object.entries(record).filter(([key]) => key !== "$cid")
    ) as NestedDuplicateInput["allocations"];
}

function copyNestedDuplicate(
    duplicate: Transaction["suspectedDuplicates"][number]
): NestedDuplicateInput {
    return {
        id: duplicate.id,
        date: duplicate.date,
        description: duplicate.description,
        descriptionAliasId: duplicate.descriptionAliasId,
        notes: duplicate.notes,
        amount: duplicate.amount,
        accountId: duplicate.accountId,
        tagIds: [...duplicate.tagIds],
        statusId: duplicate.statusId,
        importId: duplicate.importId,
        allocations: copyAllocations(duplicate.allocations),
        creationInstant: duplicate.creationInstant,
        importRowIndex: duplicate.importRowIndex,
        deletedAt: duplicate.deletedAt
    };
}

function copyTransaction(transaction: Transaction): TransactionInput {
    return {
        id: transaction.id,
        date: transaction.date,
        description: transaction.description,
        descriptionAliasId: transaction.descriptionAliasId,
        notes: transaction.notes,
        amount: transaction.amount,
        accountId: transaction.accountId,
        tagIds: [...transaction.tagIds],
        statusId: transaction.statusId,
        importId: transaction.importId,
        allocations: copyAllocations(transaction.allocations),
        creationInstant: transaction.creationInstant,
        importRowIndex: transaction.importRowIndex,
        suspectedDuplicates: transaction.suspectedDuplicates.map(copyNestedDuplicate),
        deletedAt: transaction.deletedAt
    };
}

function transactionsMatch(left: Transaction, right: Transaction): boolean {
    return JSON.stringify(copyTransaction(left)) === JSON.stringify(copyTransaction(right));
}

function findEarlierTransactionCopy(input: {
    readonly accountId: string;
    readonly source: Transaction;
    readonly sourceDay: DayBucket;
    readonly state: VaultState;
}): Transaction | undefined {
    const dayBuckets = getDayBuckets(input.state.transactions, input.accountId, input.source.date);
    for (const dayBucket of dayBuckets) {
        for (const candidate of dayBucket.transactions) {
            if (candidate === input.source) return undefined;
            if (candidate.id === input.source.id) return candidate;
        }
        if (dayBucket === input.sourceDay) return undefined;
    }
    return undefined;
}

function canRemoveCopiedDays(input: {
    readonly accountId: string;
    readonly days: readonly DayBucket[];
    readonly state: VaultState;
}): boolean {
    return input.days.every((day) =>
        day.transactions.every((transaction) => {
            const earlierCopy = findEarlierTransactionCopy({
                accountId: input.accountId,
                source: transaction,
                sourceDay: day,
                state: input.state
            });
            return earlierCopy != null && transactionsMatch(earlierCopy, transaction);
        })
    );
}

export interface VaultMaintenanceBudget {
    readonly maxItems: number;
    readonly maxMilliseconds: number;
}

export const DEFAULT_VAULT_MAINTENANCE_BUDGET: VaultMaintenanceBudget = {
    maxItems: 32,
    maxMilliseconds: 4
};

type MaintenancePhase = "years" | "months" | "days" | "transactions" | "aliases" | "done";

/** Explicit immutable cursor retained between animation frames. */
export interface VaultMaintenanceCursor {
    readonly accountIds: readonly string[];
    readonly aliasIds: readonly string[];
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
}

type StructuralMaintenancePlan =
    | {
          readonly kind: "relocate-conflict-transaction";
          readonly accountId: string;
          readonly yearIndex: number;
          readonly monthIndex: number;
          readonly dayIndex: number;
          readonly mode: "copy" | "remove-source";
          readonly transactionCid: string;
          readonly transactionId: string;
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
      };

export type VaultMaintenancePlan = StructuralMaintenancePlan | AliasMaintenancePlan;

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

function baseCursor(
    state: VaultState,
    phase: MaintenancePhase = "transactions"
): VaultMaintenanceCursor {
    return {
        accountIds: Object.keys(state.transactions).filter((accountId) => accountId !== "$cid"),
        aliasIds: Object.keys(state.descriptionAliases)
            .filter((aliasId) => aliasId !== "$cid")
            .sort(),
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
    if (
        !canRemoveCopiedDays({
            accountId: current.accountId,
            days: source.months.flatMap((month) => month.days),
            state
        })
    ) {
        return { cursor: next };
    }
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
    if (!canRemoveCopiedDays({ accountId: current.accountId, days: source.days, state })) {
        return { cursor: next };
    }
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
    if (!canRemoveCopiedDays({ accountId: current.accountId, days: [source], state })) {
        return { cursor: next };
    }
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
    return withPosition(cursor, {
        transactionIndex: cursor.transactionIndex + 1,
        nestedIndex: -1
    });
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
        const next = transaction.suspectedDuplicates.length
            ? withPosition(cursor, { nestedIndex: 0 })
            : nextTransactionContainer(cursor);
        const dayBuckets = getDayBuckets(state.transactions, current.accountId, transaction.date);
        const earlierCopy = findEarlierTransactionCopy({
            accountId: current.accountId,
            source: transaction,
            sourceDay: day,
            state
        });
        const needsBucketRelocation = dayBuckets[0] !== day;
        if (
            (earlierCopy && dayBuckets[0] === day && transactionsMatch(earlierCopy, transaction)) ||
            (needsBucketRelocation && !earlierCopy)
        ) {
            return {
                cursor: next,
                plan: {
                    kind: "relocate-conflict-transaction",
                    accountId: current.accountId,
                    yearIndex: cursor.yearIndex,
                    monthIndex: cursor.monthIndex,
                    dayIndex: cursor.dayIndex,
                    mode: earlierCopy ? "remove-source" : "copy",
                    transactionCid: transaction.$cid,
                    transactionId: transaction.id
                }
            };
        }
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
                    transactionId: transaction.id
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
                transactionId: duplicate.id
            },
            duplicate
        )
    };
}

function planAliasStep(state: VaultState, cursor: VaultMaintenanceCursor): VaultMaintenanceStep {
    const aliasId = cursor.aliasIds[cursor.aliasIndex];
    if (!aliasId) return { cursor: withPosition(cursor, { phase: "done" }) };
    const next = withPosition(cursor, { aliasIndex: cursor.aliasIndex + 1 });
    const alias = state.descriptionAliases[aliasId];
    if (
        typeof alias !== "object" ||
        alias == null ||
        alias.deletedAt != null ||
        alias.kind !== "symlink" ||
        !alias.targetAliasId
    ) {
        return { cursor: next };
    }
    const target = state.descriptionAliases[alias.targetAliasId];
    if (
        typeof target !== "object" ||
        target == null ||
        target.deletedAt != null ||
        target.kind !== "real"
    ) {
        return { cursor: next };
    }
    return {
        cursor: next,
        plan: {
            kind: "remove-alias-symlink",
            symlinkId: alias.id,
            targetAliasId: target.id
        }
    };
}

/** Process exactly one deterministic discovery item. */
export function planVaultMaintenanceStep(
    state: VaultState,
    cursor: VaultMaintenanceCursor
): VaultMaintenanceStep {
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

/** Revalidate and apply one narrow maintenance mutation. */
export function applyVaultMaintenancePlan(state: VaultState, plan: VaultMaintenancePlan): boolean {
    if (plan.kind === "rewrite-alias-reference") {
        return rewriteDescriptionAliasMaintenanceReference(state, plan);
    }
    if (plan.kind === "remove-alias-symlink") {
        return hardDeleteUnreferencedDescriptionAliasSymlink(state, plan);
    }
    if (plan.kind === "relocate-conflict-transaction") {
        const tree = state.transactions[plan.accountId];
        if (typeof tree !== "object" || tree == null) return false;
        const { yearIndex, monthIndex, dayIndex } = plan;
        const year = tree.years[yearIndex];
        const month = year?.months[monthIndex];
        const day = month?.days[dayIndex];
        if (!year || !month || !day) return false;
        const transactionIndex = day.transactions.findIndex(
            (transaction) =>
                transaction.$cid === plan.transactionCid && transaction.id === plan.transactionId
        );
        if (transactionIndex < 0) return false;
        const transaction = day.transactions[transactionIndex];
        const transactionInput = copyTransaction(transaction);
        const dayBuckets = getDayBuckets(state.transactions, plan.accountId, transaction.date);
        const earlierCopy = findEarlierTransactionCopy({
            accountId: plan.accountId,
            source: transaction,
            sourceDay: day,
            state
        });
        if (plan.mode === "copy") {
            if (dayBuckets[0] === day || earlierCopy) return false;
            insertTransaction(state.transactions, { transaction: transactionInput });
            return true;
        }
        if (!earlierCopy || dayBuckets[0] !== day || !transactionsMatch(earlierCopy, transaction)) {
            return false;
        }
        day.transactions.splice(transactionIndex, 1);
        pruneBuckets(state.transactions, plan.accountId, transactionInput.date);
        return true;
    }
    if (plan.kind === "remove-year") {
        const pair = getYearPair(state, plan);
        if (
            !pair ||
            !canRemoveCopiedDays({
                accountId: plan.accountId,
                days: pair.source.months.flatMap((month) => month.days),
                state
            })
        ) {
            return false;
        }
        pair.tree.years.splice(plan.sourceYearIndex, 1);
        return true;
    }
    if (plan.kind === "remove-month") {
        const pair = getMonthPair(state, plan);
        if (
            !pair ||
            !canRemoveCopiedDays({ accountId: plan.accountId, days: pair.source.days, state })
        ) {
            return false;
        }
        pair.year.months.splice(plan.sourceMonthIndex, 1);
        return true;
    }
    const pair = getDayPair(state, plan);
    if (!pair || !canRemoveCopiedDays({ accountId: plan.accountId, days: [pair.source], state })) {
        return false;
    }
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
    };
}
