/**
 * Description Alias Tests
 *
 * Unit tests for description alias utility functions.
 * Uses table-driven tests for clarity and comprehensive edge case coverage.
 */

import { describe, expect, it } from "vitest";

import {
    getActiveDescriptionAliases,
    getActiveRealAliases,
    getAliasTotalTransactionCount,
    getRealAliases,
    makeSymlinkMutations,
    resolveAlias,
    type DescriptionAliasLike
} from "@/lib/domain/description-aliases";

// ============================================================================
// Test Fixtures
// ============================================================================

function createAlias(
    id: string,
    name: string,
    opts?: {
        targetAliasId?: string;
        symlinkIds?: Record<string, boolean>;
        transactionIds?: Record<string, boolean>;
        deletedAt?: number;
    }
): DescriptionAliasLike {
    return {
        id,
        name,
        targetAliasId: opts?.targetAliasId,
        symlinkIds: opts?.symlinkIds ?? {},
        transactionIds: opts?.transactionIds ?? {},
        deletedAt: opts?.deletedAt
    };
}

/**
 * Create a test collection with various alias states:
 *
 * "grocery-store" - real alias with 2 transactions
 * "old-grocery"   - symlink to grocery-store, with 1 transaction
 * "restaurant"    - real alias with 0 transactions
 * "deleted-alias" - deleted alias
 * "orphan-symlink"- symlink to non-existent target
 */
function createTestCollection(): Record<string, DescriptionAliasLike | string> {
    return {
        "grocery-store": createAlias("grocery-store", "Grocery Store", {
            transactionIds: { tx1: true, tx2: true },
            symlinkIds: { "old-grocery": true }
        }),
        "old-grocery": createAlias("old-grocery", "Old Grocery Name", {
            targetAliasId: "grocery-store",
            transactionIds: { tx3: true }
        }),
        restaurant: createAlias("restaurant", "Restaurant", {
            transactionIds: {}
        }),
        "deleted-alias": createAlias("deleted-alias", "Deleted", {
            deletedAt: Date.now()
        }),
        "orphan-symlink": createAlias("orphan-symlink", "Orphan", {
            targetAliasId: "nonexistent"
        }),
        $cid: "some-cid-string" // loro-mirror adds this
    };
}

// ============================================================================
// resolveAlias tests
// ============================================================================

describe("resolveAlias", () => {
    const collection = createTestCollection();

    const resolveTests = [
        {
            aliasId: "grocery-store",
            expected: "grocery-store",
            description: "returns real alias directly"
        },
        {
            aliasId: "old-grocery",
            expected: "grocery-store",
            description: "follows symlink one hop"
        },
        {
            aliasId: "deleted-alias",
            expected: undefined,
            description: "returns undefined for deleted alias"
        },
        {
            aliasId: "nonexistent",
            expected: undefined,
            description: "returns undefined for missing alias"
        },
        {
            aliasId: "orphan-symlink",
            expected: undefined,
            description: "returns undefined for symlink to missing target"
        }
    ];

    for (const { aliasId, expected, description } of resolveTests) {
        it(description, () => {
            const result = resolveAlias(aliasId, collection);
            if (expected === undefined) {
                expect(result).toBeUndefined();
            } else {
                expect(result?.id).toBe(expected);
            }
        });
    }

    it("returns undefined when target is deleted", () => {
        const aliases: Record<string, DescriptionAliasLike | string> = {
            symlink: createAlias("symlink", "Symlink", { targetAliasId: "target" }),
            target: createAlias("target", "Target", { deletedAt: Date.now() })
        };
        expect(resolveAlias("symlink", aliases)).toBeUndefined();
    });
});

// ============================================================================
// getAliasTotalTransactionCount tests
// ============================================================================

describe("getAliasTotalTransactionCount", () => {
    const collection = createTestCollection();

    const countTests = [
        {
            aliasId: "grocery-store",
            expected: 3,
            description: "counts own + symlink transactions"
        },
        {
            aliasId: "old-grocery",
            expected: 1,
            description: "counts only own transactions for symlink"
        },
        {
            aliasId: "restaurant",
            expected: 0,
            description: "returns 0 for alias with no transactions"
        },
        {
            aliasId: "nonexistent",
            expected: 0,
            description: "returns 0 for missing alias"
        }
    ];

    for (const { aliasId, expected, description } of countTests) {
        it(description, () => {
            expect(getAliasTotalTransactionCount(aliasId, collection)).toBe(expected);
        });
    }

    it("ignores $cid keys in transactionIds", () => {
        const aliases: Record<string, DescriptionAliasLike | string> = {
            test: {
                id: "test",
                name: "Test",
                symlinkIds: {},
                transactionIds: { $cid: "cid-string", tx1: true, tx2: true } as Record<
                    string,
                    boolean | string
                >
            }
        };
        expect(getAliasTotalTransactionCount("test", aliases)).toBe(2);
    });
});

// ============================================================================
// getActiveDescriptionAliases tests
// ============================================================================

describe("getActiveDescriptionAliases", () => {
    const collection = createTestCollection();

    it("filters out deleted aliases", () => {
        const active = getActiveDescriptionAliases(collection);
        expect(active.every((a) => !a.deletedAt)).toBe(true);
    });

    it("filters out non-object values like $cid strings", () => {
        const active = getActiveDescriptionAliases(collection);
        expect(active.every((a) => typeof a === "object")).toBe(true);
    });

    it("includes both real and symlink aliases", () => {
        const active = getActiveDescriptionAliases(collection);
        const ids = active.map((a) => a.id).sort();
        expect(ids).toEqual(["grocery-store", "old-grocery", "orphan-symlink", "restaurant"]);
    });

    it("returns empty array for empty collection", () => {
        expect(getActiveDescriptionAliases({})).toEqual([]);
    });
});

// ============================================================================
// getRealAliases tests
// ============================================================================

describe("getRealAliases", () => {
    it("keeps real aliases and removes symlinks", () => {
        const aliases = [
            createAlias("real1", "Real 1"),
            createAlias("symlink1", "Symlink 1", { targetAliasId: "real1" }),
            createAlias("real2", "Real 2")
        ];

        const real = getRealAliases(aliases);
        expect(real.map((a) => a.id)).toEqual(["real1", "real2"]);
    });

    it("returns empty array when all are symlinks", () => {
        const aliases = [
            createAlias("s1", "S1", { targetAliasId: "target" }),
            createAlias("s2", "S2", { targetAliasId: "target" })
        ];
        expect(getRealAliases(aliases)).toEqual([]);
    });

    it("returns all when none are symlinks", () => {
        const aliases = [createAlias("a", "A"), createAlias("b", "B")];
        expect(getRealAliases(aliases)).toHaveLength(2);
    });
});

// ============================================================================
// getActiveRealAliases tests
// ============================================================================

describe("getActiveRealAliases", () => {
    const collection = createTestCollection();

    it("filters deleted and symlinks", () => {
        const activeReal = getActiveRealAliases(collection);
        const ids = activeReal.map((a) => a.id).sort();
        expect(ids).toEqual(["grocery-store", "restaurant"]);
    });

    it("returns empty array for empty collection", () => {
        expect(getActiveRealAliases({})).toEqual([]);
    });
});

// ============================================================================
// makeSymlinkMutations tests
// ============================================================================

describe("makeSymlinkMutations", () => {
    it("returns correct mutations for simple source-to-target", () => {
        const aliases: Record<string, DescriptionAliasLike | string> = {
            source: createAlias("source", "Source", { transactionIds: { tx1: true } }),
            target: createAlias("target", "Target", { transactionIds: { tx2: true } })
        };

        const result = makeSymlinkMutations("source", "target", aliases);

        expect(result.sourceBecomesSymlink).toEqual({
            sourceId: "source",
            targetId: "target"
        });
        expect(result.addSymlinksToTarget).toEqual(["source"]);
        expect(result.repointerSymlinks).toEqual([]);
        expect(result.clearSourceSymlinkIds).toEqual([]);
    });

    it("flattens existing symlinks pointing at source", () => {
        const aliases: Record<string, DescriptionAliasLike | string> = {
            source: createAlias("source", "Source", {
                symlinkIds: { existing1: true, existing2: true }
            }),
            existing1: createAlias("existing1", "E1", { targetAliasId: "source" }),
            existing2: createAlias("existing2", "E2", { targetAliasId: "source" }),
            target: createAlias("target", "Target")
        };

        const result = makeSymlinkMutations("source", "target", aliases);

        // existing1 and existing2 should repoint to target
        expect(result.repointerSymlinks).toEqual([
            { symlinkId: "existing1", newTargetId: "target" },
            { symlinkId: "existing2", newTargetId: "target" }
        ]);

        // All (existing1, existing2, source) become symlinks to target
        expect(result.addSymlinksToTarget.sort()).toEqual(["existing1", "existing2", "source"]);

        // Source's symlinkIds should be cleared
        expect(result.clearSourceSymlinkIds.sort()).toEqual(["existing1", "existing2"]);
    });

    it("handles source with no existing symlinks", () => {
        const aliases: Record<string, DescriptionAliasLike | string> = {
            source: createAlias("source", "Source"),
            target: createAlias("target", "Target")
        };

        const result = makeSymlinkMutations("source", "target", aliases);
        expect(result.repointerSymlinks).toEqual([]);
        expect(result.addSymlinksToTarget).toEqual(["source"]);
        expect(result.clearSourceSymlinkIds).toEqual([]);
    });

    it("handles missing source gracefully", () => {
        const aliases: Record<string, DescriptionAliasLike | string> = {
            target: createAlias("target", "Target")
        };

        const result = makeSymlinkMutations("missing", "target", aliases);
        expect(result.addSymlinksToTarget).toEqual(["missing"]);
        expect(result.repointerSymlinks).toEqual([]);
    });
});
