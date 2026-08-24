import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { TransactionGridAddress } from "@/components/features/transactions/table-model/grid-interaction-state";
import {
    createTransactionProjectionSnapshot,
    resolveTransactionNavigationTarget
} from "@/components/features/transactions/table-model/grid-navigation";
import {
    asTransactionId,
    asTransactionProjectionGeneration,
    type TransactionId
} from "@/components/features/transactions/table-model/ids";

function projection(ids: readonly TransactionId[], generation = 1) {
    const projectionGeneration = asTransactionProjectionGeneration(generation);
    return createTransactionProjectionSnapshot({
        currentGeneration: () => projectionGeneration,
        generation: projectionGeneration,
        idOf: (id: TransactionId) => id,
        selectableColumnIds: ["checkbox", "date", "description", "actions"],
        source: {
            count: ids.length,
            indexOf: (id: string) => ids.indexOf(asTransactionId(id)),
            slice: (offset: number, limit: number) => ids.slice(offset, offset + limit)
        }
    });
}

describe("transaction projection navigation", () => {
    it("uses canonical row coordinates and traverses row-major across columns", () => {
        const view = projection([asTransactionId("tx-0"), asTransactionId("tx-1")]);
        const active: TransactionGridAddress = {
            columnId: "actions",
            transactionId: asTransactionId("tx-0")
        };

        expect(
            resolveTransactionNavigationTarget(view, view.generation, active, {
                direction: "forward",
                kind: "tab"
            })
        ).toEqual({
            ok: true,
            value: {
                address: { columnId: "checkbox", transactionId: "tx-1" },
                kind: "target"
            }
        });
    });

    it("reports the Tab boundary instead of wrapping", () => {
        const view = projection([asTransactionId("tx-0")]);
        const active: TransactionGridAddress = {
            columnId: "actions",
            transactionId: asTransactionId("tx-0")
        };

        expect(
            resolveTransactionNavigationTarget(view, view.generation, active, {
                direction: "forward",
                kind: "tab"
            })
        ).toEqual({
            ok: true,
            value: { direction: "forward", kind: "grid-boundary" }
        });
    });

    it("rejects stale work before reading a target", () => {
        const view = projection([asTransactionId("tx-0")], 4);
        const stale = asTransactionProjectionGeneration(3);

        expect(
            resolveTransactionNavigationTarget(
                view,
                stale,
                { columnId: "date", transactionId: asTransactionId("tx-0") },
                { direction: "down", kind: "move" }
            )
        ).toEqual({
            error: { actual: 4, expected: 3, kind: "stale-projection" },
            ok: false
        });
    });

    it("keeps every directional target inside canonical bounds", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 100 }),
                fc.integer({ min: 0, max: 99 }),
                fc.constantFrom("up", "down", "left", "right"),
                (rowCount, arbitraryIndex, direction) => {
                    const ids = Array.from({ length: rowCount }, (_unused, index) =>
                        asTransactionId(`tx-${String(index)}`)
                    );
                    const view = projection(ids);
                    const rowIndex = arbitraryIndex % rowCount;
                    const result = resolveTransactionNavigationTarget(
                        view,
                        view.generation,
                        { columnId: "description", transactionId: ids[rowIndex] },
                        { direction, kind: "move" }
                    );

                    expect(result.ok).toBe(true);
                    if (!result.ok || result.value.kind !== "target") return;
                    expect(ids).toContain(result.value.address.transactionId);
                    expect(view.selectableColumnIds).toContain(result.value.address.columnId);
                }
            ),
            { numRuns: 300 }
        );
    });
});
