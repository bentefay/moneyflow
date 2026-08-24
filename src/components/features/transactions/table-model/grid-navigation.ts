import type { Transaction } from "@/lib/crdt/schema";
import type { TransactionCursor } from "@/lib/crdt/transaction-cursor";

import type { TransactionGridAddress } from "./grid-interaction-state";
import {
    asTransactionId,
    type TransactionColumnId,
    type TransactionId,
    type TransactionProjectionGeneration
} from "./ids";

const PROJECTION_READ_BLOCK = 200;

export type TransactionProjectionError =
    | {
          readonly kind: "stale-projection";
          readonly expected: TransactionProjectionGeneration;
          readonly actual: TransactionProjectionGeneration;
      }
    | {
          readonly kind: "non-advancing-generation";
          readonly previous: TransactionProjectionGeneration;
          readonly next: TransactionProjectionGeneration;
          readonly direction: "equal" | "older";
      }
    | { readonly kind: "invalid-index"; readonly index: number }
    | {
          readonly kind: "historical-lookup-unavailable";
          readonly transactionId: TransactionId;
      }
    | { readonly kind: "unknown-address"; readonly address: TransactionGridAddress }
    | {
          readonly kind: "range-limit";
          readonly requestedRows: number;
          readonly maximumRows: number;
      }
    | {
          readonly kind: "short-read";
          readonly startIndex: number;
          readonly requestedRows: number;
          readonly receivedRows: number;
      };

export type TransactionProjectionResult<TValue> =
    | { readonly ok: true; readonly value: TValue }
    | { readonly ok: false; readonly error: TransactionProjectionError };

/** Test-only generic boundary. Production callers use `transactionProjectionFromCursor`. */
export interface TransactionProjectionRowSource<TRow> {
    readonly count: number;
    readonly indexOf: (transactionId: string) => number;
    readonly slice: (offset: number, limit: number) => readonly TRow[];
}

export interface TransactionProjectionSnapshot<TRow> {
    readonly generation: TransactionProjectionGeneration;
    readonly rowCount: number;
    readonly selectableColumnIds: readonly TransactionColumnId[];
    readonly verifyCurrent: () => TransactionProjectionResult<void>;
    readonly indexOf: (
        expected: TransactionProjectionGeneration,
        transactionId: TransactionId
    ) => TransactionProjectionResult<number>;
    readonly idAt: (
        expected: TransactionProjectionGeneration,
        index: number
    ) => TransactionProjectionResult<TransactionId>;
    readonly readRowAt: (
        expected: TransactionProjectionGeneration,
        index: number
    ) => TransactionProjectionResult<TRow>;
    readonly rowsBetween: (
        expected: TransactionProjectionGeneration,
        firstIndex: number,
        secondIndex: number,
        maximumRows: number
    ) => TransactionProjectionResult<readonly TRow[]>;
}

function staleResult<TValue>(
    expected: TransactionProjectionGeneration,
    actual: TransactionProjectionGeneration
): TransactionProjectionResult<TValue> {
    return { error: { actual, expected, kind: "stale-projection" }, ok: false };
}

function verifyLiveGeneration(
    expected: TransactionProjectionGeneration,
    snapshotGeneration: TransactionProjectionGeneration,
    currentGeneration: () => TransactionProjectionGeneration
): TransactionProjectionResult<void> {
    if (expected !== snapshotGeneration) return staleResult(expected, snapshotGeneration);
    const actual = currentGeneration();
    return actual === snapshotGeneration
        ? { ok: true, value: undefined }
        : staleResult(snapshotGeneration, actual);
}

const HISTORICAL_TRANSACTION_POSITION = Symbol("historical-transaction-position");

interface TransactionProjectionHistoricalLookup {
    readonly [HISTORICAL_TRANSACTION_POSITION]: (transactionId: TransactionId) => number;
}

function hasHistoricalLookup<TRow>(
    snapshot: TransactionProjectionSnapshot<TRow>
): snapshot is TransactionProjectionSnapshot<TRow> & TransactionProjectionHistoricalLookup {
    return HISTORICAL_TRANSACTION_POSITION in snapshot;
}

/** Reconciliation-only prior-order lookup. It never authorizes an interactive read. */
export function historicalTransactionPosition<TRow>(
    snapshot: TransactionProjectionSnapshot<TRow>,
    transactionId: TransactionId
): TransactionProjectionResult<number> {
    return hasHistoricalLookup(snapshot)
        ? { ok: true, value: snapshot[HISTORICAL_TRANSACTION_POSITION](transactionId) }
        : {
              error: { kind: "historical-lookup-unavailable", transactionId },
              ok: false
          };
}

function isValidIndex(index: number, count: number): boolean {
    return Number.isSafeInteger(index) && index >= 0 && index < count;
}

/**
 * Builds a generation-checked boundary over a cursor-like row source.
 *
 * This generic constructor is intentionally not re-exported by the table-model barrel. It exists for
 * direct low-level tests; the production boundary is the cursor adapter below.
 */
export function createTransactionProjectionSnapshot<TRow>(options: {
    readonly generation: TransactionProjectionGeneration;
    readonly currentGeneration: () => TransactionProjectionGeneration;
    readonly source: TransactionProjectionRowSource<TRow>;
    readonly selectableColumnIds: readonly TransactionColumnId[];
    readonly idOf: (row: TRow) => TransactionId;
}): TransactionProjectionSnapshot<TRow> {
    const { currentGeneration, generation, idOf, selectableColumnIds, source } = options;
    const rowCount = source.count;
    const verifyExpected = (expected: TransactionProjectionGeneration) =>
        verifyLiveGeneration(expected, generation, currentGeneration);

    const readRowAt = (
        expected: TransactionProjectionGeneration,
        index: number
    ): TransactionProjectionResult<TRow> => {
        const live = verifyExpected(expected);
        if (!live.ok) return live;
        if (!isValidIndex(index, rowCount)) {
            return { error: { index, kind: "invalid-index" }, ok: false };
        }
        const row = source.slice(index, 1)[0];
        if (row == null) return { error: { index, kind: "invalid-index" }, ok: false };
        const completedLive = verifyExpected(expected);
        return completedLive.ok ? { ok: true, value: row } : completedLive;
    };

    const snapshot = {
        [HISTORICAL_TRANSACTION_POSITION]: (transactionId: TransactionId) =>
            source.indexOf(transactionId),
        generation,
        rowCount,
        selectableColumnIds: [...selectableColumnIds],
        verifyCurrent: () => verifyExpected(generation),
        indexOf: (expected: TransactionProjectionGeneration, transactionId: TransactionId) => {
            const live = verifyExpected(expected);
            if (!live.ok) return live;
            const position = source.indexOf(transactionId);
            const completedLive = verifyExpected(expected);
            return completedLive.ok ? { ok: true, value: position } : completedLive;
        },
        idAt: (expected: TransactionProjectionGeneration, index: number) => {
            const row = readRowAt(expected, index);
            return row.ok ? { ok: true, value: idOf(row.value) } : row;
        },
        readRowAt,
        rowsBetween: (
            expected: TransactionProjectionGeneration,
            firstIndex: number,
            secondIndex: number,
            maximumRows: number
        ) => {
            const live = verifyExpected(expected);
            if (!live.ok) return live;
            const start = Math.min(firstIndex, secondIndex);
            const end = Math.max(firstIndex, secondIndex);
            if (!isValidIndex(start, rowCount)) {
                return { error: { index: start, kind: "invalid-index" }, ok: false };
            }
            if (!isValidIndex(end, rowCount)) {
                return { error: { index: end, kind: "invalid-index" }, ok: false };
            }
            const requestedRows = end - start + 1;
            if (!Number.isSafeInteger(maximumRows) || maximumRows < requestedRows) {
                return {
                    error: {
                        kind: "range-limit",
                        maximumRows: Math.max(0, Math.trunc(maximumRows)),
                        requestedRows
                    },
                    ok: false
                };
            }

            const rows: TRow[] = [];
            for (let offset = 0; offset < requestedRows; offset += PROJECTION_READ_BLOCK) {
                const requestedBlock = Math.min(PROJECTION_READ_BLOCK, requestedRows - offset);
                const block = source.slice(start + offset, requestedBlock);
                const completedLive = verifyExpected(expected);
                if (!completedLive.ok) return completedLive;
                rows.push(...block);
                if (block.length !== requestedBlock) {
                    return {
                        error: {
                            kind: "short-read",
                            receivedRows: rows.length,
                            requestedRows,
                            startIndex: start
                        },
                        ok: false
                    };
                }
            }
            return { ok: true, value: rows };
        }
    } satisfies TransactionProjectionSnapshot<TRow> & TransactionProjectionHistoricalLookup;
    return snapshot;
}

/** The production cursor projection, preserving its existing `indexOf` and lazy cursor ordering. */
export function transactionProjectionFromCursor(options: {
    readonly cursor: TransactionCursor;
    readonly generation: TransactionProjectionGeneration;
    readonly currentGeneration: () => TransactionProjectionGeneration;
    readonly selectableColumnIds: readonly TransactionColumnId[];
}): TransactionProjectionSnapshot<Transaction> {
    return createTransactionProjectionSnapshot({
        currentGeneration: options.currentGeneration,
        generation: options.generation,
        idOf: (transaction) => asTransactionId(transaction.id),
        selectableColumnIds: options.selectableColumnIds,
        source: options.cursor
    });
}

export type TransactionNavigationCommand =
    | { readonly kind: "move"; readonly direction: "up" | "down" | "left" | "right" }
    | { readonly kind: "row-start" }
    | { readonly kind: "row-end" }
    | { readonly kind: "grid-start" }
    | { readonly kind: "grid-end" }
    | { readonly kind: "page-up"; readonly viewportRows: number }
    | { readonly kind: "page-down"; readonly viewportRows: number }
    | { readonly kind: "tab"; readonly direction: "forward" | "reverse" };

export type TransactionNavigationResolution =
    | { readonly kind: "target"; readonly address: TransactionGridAddress }
    | { readonly kind: "grid-boundary"; readonly direction: "forward" | "reverse" };

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value));
}

/** Resolves navigation only from canonical projection coordinates, never sparse Table adjacency. */
export function resolveTransactionNavigationTarget<TRow>(
    projection: TransactionProjectionSnapshot<TRow>,
    expected: TransactionProjectionGeneration,
    active: TransactionGridAddress,
    command: TransactionNavigationCommand
): TransactionProjectionResult<TransactionNavigationResolution> {
    if (expected !== projection.generation) return staleResult(expected, projection.generation);
    const currentRow = projection.indexOf(expected, active.transactionId);
    if (!currentRow.ok) return currentRow;
    const currentColumn = projection.selectableColumnIds.indexOf(active.columnId);
    if (currentRow.value < 0 || currentColumn < 0) {
        return { error: { address: active, kind: "unknown-address" }, ok: false };
    }
    const finalRow = projection.rowCount - 1;
    const finalColumn = projection.selectableColumnIds.length - 1;
    if (finalRow < 0 || finalColumn < 0) {
        return { error: { address: active, kind: "unknown-address" }, ok: false };
    }

    const coordinates:
        | { readonly column: number; readonly row: number }
        | {
              readonly boundary: Extract<
                  TransactionNavigationResolution,
                  { readonly kind: "grid-boundary" }
              >;
          } = (() => {
        if (command.kind === "move") {
            const rowDelta = command.direction === "up" ? -1 : command.direction === "down" ? 1 : 0;
            const columnDelta =
                command.direction === "left" ? -1 : command.direction === "right" ? 1 : 0;
            return {
                column: clamp(currentColumn + columnDelta, 0, finalColumn),
                row: clamp(currentRow.value + rowDelta, 0, finalRow)
            };
        }
        if (command.kind === "row-start") return { column: 0, row: currentRow.value };
        if (command.kind === "row-end") return { column: finalColumn, row: currentRow.value };
        if (command.kind === "grid-start") return { column: 0, row: 0 };
        if (command.kind === "grid-end") return { column: finalColumn, row: finalRow };
        if (command.kind === "page-up" || command.kind === "page-down") {
            const distance = Math.max(1, Math.trunc(command.viewportRows));
            const direction = command.kind === "page-up" ? -1 : 1;
            return {
                column: currentColumn,
                row: clamp(currentRow.value + distance * direction, 0, finalRow)
            };
        }

        const delta = command.direction === "forward" ? 1 : -1;
        const flatIndex = currentRow.value * (finalColumn + 1) + currentColumn;
        const targetFlatIndex = flatIndex + delta;
        const cellCount = projection.rowCount * (finalColumn + 1);
        if (targetFlatIndex < 0 || targetFlatIndex >= cellCount) {
            return {
                boundary: {
                    direction: command.direction,
                    kind: "grid-boundary"
                }
            };
        }
        return {
            column: targetFlatIndex % (finalColumn + 1),
            row: Math.floor(targetFlatIndex / (finalColumn + 1))
        };
    })();

    if ("boundary" in coordinates) return { ok: true, value: coordinates.boundary };
    const transactionId = projection.idAt(expected, coordinates.row);
    if (!transactionId.ok) return transactionId;
    const columnId = projection.selectableColumnIds[coordinates.column];
    if (columnId == null) {
        return { error: { address: active, kind: "unknown-address" }, ok: false };
    }
    return {
        ok: true,
        value: {
            address: { columnId, transactionId: transactionId.value },
            kind: "target"
        }
    };
}
