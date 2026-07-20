import { describe, expect, it } from "vitest";

import {
    createDescriptionAliasLookup,
    normalizeDescriptionAliasName,
    type DescriptionAlias,
    type DescriptionAliasCollection
} from "@/lib/domain/description-aliases";

function createLargeAliasCollection(realAliasCount: number): DescriptionAliasCollection {
    const aliases: Record<string, DescriptionAlias> = {};
    for (let index = 0; index < realAliasCount; index += 1) {
        const realId = `real-${index.toString().padStart(5, "0")}`;
        const symlinkId = `link-${index.toString().padStart(5, "0")}`;
        aliases[realId] = {
            kind: "real",
            id: realId,
            name: index === 42 ? " Cafe\u0301 " : `Alias ${index}`,
            symlinkIds: { [symlinkId]: true },
            transactionIds: { [`real-transaction-${index}`]: true }
        };
        aliases[symlinkId] = {
            kind: "symlink",
            id: symlinkId,
            targetAliasId: realId,
            transactionIds: { [`linked-transaction-${index}`]: true }
        };
    }
    return aliases;
}

describe("description alias lookup", () => {
    it("builds bounded reusable indexes for 10,000 legal real/symlink records", () => {
        const aliases = createLargeAliasCollection(5_000);
        const lookup = createDescriptionAliasLookup(aliases);

        expect(lookup.statistics).toEqual({
            sourceEntryCount: 10_000,
            activeAliasCount: 10_000,
            activeRealAliasCount: 5_000,
            backlinkVisitCount: 5_000
        });
        expect(lookup.activeRealAliases).toHaveLength(5_000);
        expect(lookup.resolve("link-04999")?.id).toBe("real-04999");
        expect(lookup.getTotalTransactionCount("link-04999")).toBe(2);
        expect(lookup.findExactAliasId(normalizeDescriptionAliasName("Café"))).toBe("real-00042");
    });

    it("ignores deleted/illegal aliases and chooses a deterministic concurrent exact duplicate", () => {
        const lookup = createDescriptionAliasLookup({
            z: {
                kind: "real",
                id: "z",
                name: "Same",
                symlinkIds: {},
                transactionIds: {}
            },
            a: {
                kind: "real",
                id: "a",
                name: "Same",
                symlinkIds: {},
                transactionIds: {}
            },
            deleted: {
                kind: "real",
                id: "deleted",
                name: "Deleted",
                symlinkIds: {},
                transactionIds: {},
                deletedAt: 1
            },
            broken: {
                kind: "symlink",
                id: "broken",
                targetAliasId: "missing",
                transactionIds: {}
            }
        });

        expect(lookup.findExactAliasId("Same")).toBe("a");
        expect(lookup.findExactAliasId("Deleted")).toBeUndefined();
        expect(lookup.resolve("broken")).toBeUndefined();
        expect(lookup.statistics).toEqual({
            sourceEntryCount: 4,
            activeAliasCount: 3,
            activeRealAliasCount: 2,
            backlinkVisitCount: 0
        });
    });
});
