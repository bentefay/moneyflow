/**
 * Keeping a deleted person's allocation column while the grid scrolls past their row.
 *
 * A historical column — a person who is no longer active but still holds a non-zero allocation — is
 * discovered from the rows the grid is holding. That used to be a growing page: once a row had been
 * paged in it stayed, so the column appeared and remained until the matching set changed. The grid
 * now holds a *sliding* window, so the row that revealed the column can scroll out of it, and a
 * column that vanished mid-scroll would be a visible defect.
 *
 * Both directions are asserted, because only one of them is the obvious one. Retention that never
 * lets go is just as wrong as retention that never happens: a column for a person no matching row
 * references any more is a column the user cannot explain.
 */

import { describe, expect, it } from "vitest";

import {
    buildAllocationColumnModel,
    historicalAllocationPersonIds,
    type RetainedHistoricalAllocationPeople,
    retainHistoricalAllocationPersonIds
} from "@/components/features/transactions/allocation-columns";

const ADA = { id: "person-ada", name: "Ada" };
const DEE = { id: "person-dee", name: "Dee", deletedAt: "2026-01-01T00:00:00Z" };
const RAY = { id: "person-ray", name: "Ray", deletedAt: "2026-01-01T00:00:00Z" };

const ACTIVE_IDS: ReadonlySet<string> = new Set([ADA.id]);

/** A filter identity, which is all the accumulator uses it for. */
const GROCERIES = { search: "groceries" };
const EVERYTHING = { search: undefined };

function windowHolding(...personIds: readonly string[]) {
    return [{ allocations: Object.fromEntries(personIds.map((personId) => [personId, 25])) }];
}

function columnIdsFor(
    transactions: readonly { allocations: Record<string, number> }[],
    retainedHistoricalPersonIds: ReadonlySet<string>
): readonly string[] {
    return buildAllocationColumnModel({
        activePeople: [ADA],
        allPeople: [ADA, DEE, RAY],
        transactions,
        retainedHistoricalPersonIds
    }).columns.map((column) => column.personId);
}

describe("historicalAllocationPersonIds", () => {
    it("names the inactive people a window of rows allocates to, and no one else", () => {
        expect([
            ...historicalAllocationPersonIds(windowHolding(ADA.id, DEE.id), ACTIVE_IDS)
        ]).toEqual([DEE.id]);
        expect([...historicalAllocationPersonIds(windowHolding(ADA.id), ACTIVE_IDS)]).toEqual([]);
    });

    it("ignores a plain zero, which records no allocation rather than a historical one", () => {
        expect([
            ...historicalAllocationPersonIds([{ allocations: { [DEE.id]: 0 } }], ACTIVE_IDS)
        ]).toEqual([]);
    });
});

describe("retainHistoricalAllocationPersonIds", () => {
    const underGroceries: RetainedHistoricalAllocationPeople<object> = {
        filterKey: GROCERIES,
        personIds: new Set([DEE.id])
    };

    it("keeps a person once seen, so scrolling past their row does not drop the column", () => {
        // The window has moved on and no longer holds any row allocating to Dee.
        const next = retainHistoricalAllocationPersonIds(underGroceries, GROCERIES, new Set());

        expect(next.personIds.has(DEE.id)).toBe(true);
        // The identical object, so a caller holding this in state re-renders nothing.
        expect(next).toBe(underGroceries);
    });

    it("adds a person a later window reveals", () => {
        const next = retainHistoricalAllocationPersonIds(
            underGroceries,
            GROCERIES,
            new Set([RAY.id])
        );

        expect([...next.personIds].sort()).toEqual([DEE.id, RAY.id].sort());
        expect(next).not.toBe(underGroceries);
    });

    it("forgets everything when the filters change, keeping only what the new set reveals", () => {
        // The direction that rots if nobody writes it. Retention is scoped to the matching set it was
        // discovered under; carrying it across a filter change would show a column for a person no
        // matching row references, which the user has no way to account for.
        const next = retainHistoricalAllocationPersonIds(
            underGroceries,
            EVERYTHING,
            new Set([RAY.id])
        );

        expect([...next.personIds]).toEqual([RAY.id]);
        expect(next.personIds.has(DEE.id)).toBe(false);
        expect(next.filterKey).toBe(EVERYTHING);
    });

    it("drops everything when the filters change to a set with no historical allocations at all", () => {
        const next = retainHistoricalAllocationPersonIds(underGroceries, EVERYTHING, new Set());

        expect([...next.personIds]).toEqual([]);
    });
});

describe("the columns the two produce together", () => {
    it("shows a retained person's column while the window no longer holds their row", () => {
        expect(columnIdsFor(windowHolding(ADA.id), new Set([DEE.id]))).toEqual([ADA.id, DEE.id]);
    });

    it("shows no column for a person neither the window nor the retained set names", () => {
        expect(columnIdsFor(windowHolding(ADA.id), new Set())).toEqual([ADA.id]);
    });

    it("does not duplicate a retained person who has since become active again", () => {
        // Restoring a deleted person moves them into the active columns. A retained id that is now
        // active must not also appear as a historical one.
        expect(
            buildAllocationColumnModel({
                activePeople: [ADA, { id: DEE.id, name: DEE.name }],
                allPeople: [ADA, DEE],
                transactions: windowHolding(ADA.id),
                retainedHistoricalPersonIds: new Set([DEE.id])
            }).columns.map((column) => column.personId)
        ).toEqual([ADA.id, DEE.id]);
    });
});
