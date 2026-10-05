import * as fc from "fast-check";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
    createTransactionProjectionSnapshot,
    transactionProjectionFromCursor
} from "@/components/features/transactions/table-model/grid-navigation";
import {
    asTransactionId,
    asTransactionProjectionGeneration,
    nextTransactionProjectionGeneration
} from "@/components/features/transactions/table-model/ids";
import { filterTransactions, getAllTransactions } from "@/lib/crdt/queries";
import { buildTransactionIndex, createTransactionCursor } from "@/lib/crdt/transaction-cursor";

import { UPDATER_INVOCATIONS } from "../transactions/table-model/test-table";
import { filterArbitrary, storeArbitrary, toQueryOptions } from "./transaction-cursor-fixtures";

function projectionFor(
    store: Parameters<typeof buildTransactionIndex>[0],
    filter: Parameters<typeof createTransactionCursor>[1] = {}
) {
    const cursor = createTransactionCursor(buildTransactionIndex(store), filter);
    const generation = asTransactionProjectionGeneration(11);
    return transactionProjectionFromCursor({
        currentGeneration: () => generation,
        cursor,
        generation,
        selectableColumnIds: ["date", "description", "amount"]
    });
}

describe("transaction cursor projection adapter", () => {
    it("requires a live generation authority in the production adapter", () => {
        type ProjectionOptions = Parameters<typeof transactionProjectionFromCursor>[0];
        type MissingGenerationAuthority = Omit<ProjectionOptions, "currentGeneration">;

        expectTypeOf<MissingGenerationAuthority>().not.toMatchTypeOf<ProjectionOptions>();
        expectTypeOf<ProjectionOptions["currentGeneration"]>().toEqualTypeOf<
            () => ProjectionOptions["generation"]
        >();
    });

    it("keeps idAt, readRowAt, and existing indexOf inverse in cursor order", () => {
        fc.assert(
            fc.property(storeArbitrary, filterArbitrary, (store, filter) => {
                const view = projectionFor(store, filter);
                for (let index = 0; index < view.rowCount; index++) {
                    const id = view.idAt(view.generation, index);
                    const row = view.readRowAt(view.generation, index);
                    expect(id.ok).toBe(true);
                    expect(row.ok).toBe(true);
                    if (!id.ok || !row.ok) continue;
                    expect(id.value).toBe(row.value.id);
                    expect(view.indexOf(view.generation, id.value)).toEqual({
                        ok: true,
                        value: index
                    });
                }
            }),
            { numRuns: 300 }
        );
    });

    it("matches the array pipeline for every bounded inclusive range", () => {
        fc.assert(
            fc.property(
                storeArbitrary,
                filterArbitrary,
                fc.nat(),
                fc.nat(),
                (store, filter, firstSeed, secondSeed) => {
                    const expected = filterTransactions(
                        getAllTransactions(store),
                        toQueryOptions(filter)
                    );
                    fc.pre(expected.length > 0);
                    const first = firstSeed % expected.length;
                    const second = secondSeed % expected.length;
                    const start = Math.min(first, second);
                    const end = Math.max(first, second);
                    const view = projectionFor(store, filter);
                    const result = view.rowsBetween(
                        view.generation,
                        first,
                        second,
                        end - start + 1
                    );

                    expect(result.ok).toBe(true);
                    if (!result.ok) return;
                    const expectedIds = expected.slice(start, end + 1).map((row) => row.id);
                    // Match the real table fixture's duplicate-updater contract: every pass starts
                    // from the same iterable and must observe the same cursor order.
                    const updaterResults = Array.from({ length: UPDATER_INVOCATIONS }, () =>
                        [...result.value].map((row) => row.id)
                    );
                    expect(updaterResults).toEqual(
                        Array.from({ length: UPDATER_INVOCATIONS }, () => expectedIds)
                    );
                }
            ),
            { numRuns: 300 }
        );
    });

    it("rejects a range before enumeration when its explicit bound is too small", () => {
        const store = fc.sample(storeArbitrary, { numRuns: 1, seed: 42 })[0];
        const view = projectionFor(store);
        if (view.rowCount < 2)
            throw new Error("seeded cursor fixture must contain at least two rows");

        expect(view.rowsBetween(view.generation, 0, 1, 1)).toEqual({
            error: { kind: "range-limit", maximumRows: 1, requestedRows: 2 },
            ok: false
        });
    });

    it("materializes a re-iterable immutable range before a later generation advances", () => {
        const generation = asTransactionProjectionGeneration(20);
        const nextGeneration = nextTransactionProjectionGeneration(generation);
        const rows = [asTransactionId("a"), asTransactionId("b")];
        const slices: number[] = [];
        let current = generation;
        const view = createTransactionProjectionSnapshot({
            currentGeneration: () => current,
            generation,
            idOf: (row: ReturnType<typeof asTransactionId>) => row,
            selectableColumnIds: ["description"],
            source: {
                count: rows.length,
                indexOf: (id) => rows.indexOf(asTransactionId(id)),
                slice: (offset, limit) => {
                    slices.push(offset);
                    return rows.slice(offset, offset + limit);
                }
            }
        });
        const captured = view.rowsBetween(generation, 0, 1, 2);
        expect(captured.ok).toBe(true);
        if (!captured.ok) return;
        current = nextGeneration;

        expect([...captured.value]).toEqual(rows);
        expect([...captured.value]).toEqual(rows);
        expect(slices).toEqual([0]);
    });

    it("rejects a generation advance that occurs during bounded materialization", () => {
        const generation = asTransactionProjectionGeneration(30);
        const nextGeneration = nextTransactionProjectionGeneration(generation);
        const rows = [asTransactionId("a"), asTransactionId("b")];
        let current = generation;
        const view = createTransactionProjectionSnapshot({
            currentGeneration: () => current,
            generation,
            idOf: (row: ReturnType<typeof asTransactionId>) => row,
            selectableColumnIds: ["description"],
            source: {
                count: rows.length,
                indexOf: (id) => rows.indexOf(asTransactionId(id)),
                slice: (offset, limit) => {
                    current = nextGeneration;
                    return rows.slice(offset, offset + limit);
                }
            }
        });

        expect(view.rowsBetween(generation, 0, 1, 2)).toEqual({
            error: { actual: nextGeneration, expected: generation, kind: "stale-projection" },
            ok: false
        });
    });

    it("returns a typed all-or-nothing short read", () => {
        const generation = asTransactionProjectionGeneration(40);
        const rows = [asTransactionId("a"), asTransactionId("b"), asTransactionId("c")];
        const view = createTransactionProjectionSnapshot({
            currentGeneration: () => generation,
            generation,
            idOf: (row: ReturnType<typeof asTransactionId>) => row,
            selectableColumnIds: ["description"],
            source: {
                count: rows.length,
                indexOf: (id) => rows.indexOf(asTransactionId(id)),
                slice: (offset, limit) => rows.slice(offset, offset + Math.min(limit, 2))
            }
        });

        expect(view.rowsBetween(generation, 0, 2, 3)).toEqual({
            error: {
                kind: "short-read",
                receivedRows: 2,
                requestedRows: 3,
                startIndex: 0
            },
            ok: false
        });
    });

    it("rejects old live reads after the generation authority advances", () => {
        const generation = asTransactionProjectionGeneration(50);
        const nextGeneration = nextTransactionProjectionGeneration(generation);
        let currentGeneration = generation;
        const rows = [asTransactionId("a")];
        const view = createTransactionProjectionSnapshot({
            currentGeneration: () => currentGeneration,
            generation,
            idOf: (row: ReturnType<typeof asTransactionId>) => row,
            selectableColumnIds: ["description"],
            source: {
                count: rows.length,
                indexOf: (id) => rows.indexOf(asTransactionId(id)),
                slice: (offset, limit) => rows.slice(offset, offset + limit)
            }
        });
        currentGeneration = nextGeneration;

        expect(view.idAt(generation, 0)).toEqual({
            error: { actual: nextGeneration, expected: generation, kind: "stale-projection" },
            ok: false
        });
    });

    it("rejects caller current generation when it differs from the snapshot generation", () => {
        const snapshotGeneration = asTransactionProjectionGeneration(60);
        const currentGeneration = nextTransactionProjectionGeneration(snapshotGeneration);
        const rows = [asTransactionId("a")];
        const view = createTransactionProjectionSnapshot({
            currentGeneration: () => currentGeneration,
            generation: snapshotGeneration,
            idOf: (row: ReturnType<typeof asTransactionId>) => row,
            selectableColumnIds: ["description"],
            source: {
                count: rows.length,
                indexOf: (id) => rows.indexOf(asTransactionId(id)),
                slice: (offset, limit) => rows.slice(offset, offset + limit)
            }
        });

        expect(view.idAt(currentGeneration, 0)).toEqual({
            error: {
                actual: snapshotGeneration,
                expected: currentGeneration,
                kind: "stale-projection"
            },
            ok: false
        });
    });

    it("returns typed stale results when work carries an older generation", () => {
        const store = fc.sample(storeArbitrary, { numRuns: 1, seed: 84 })[0];
        const view = projectionFor(store);
        const current = nextTransactionProjectionGeneration(view.generation);
        const rebuilt = transactionProjectionFromCursor({
            currentGeneration: () => current,
            cursor: createTransactionCursor(buildTransactionIndex(store)),
            generation: current,
            selectableColumnIds: view.selectableColumnIds
        });

        expect(rebuilt.idAt(view.generation, 0)).toEqual({
            error: {
                actual: current,
                expected: view.generation,
                kind: "stale-projection"
            },
            ok: false
        });
    });
});
