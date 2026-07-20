import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
    assignDescriptionAlias,
    assignDescriptionAliasByExactName,
    changeAllDescriptionAliases,
    changeOneDescriptionAlias,
    createDescriptionAlias,
    deleteDescriptionAliasedTransaction,
    deleteDescriptionAliasedTransactionsByImport,
    normalizeDescriptionAliasName,
    removeOneDescriptionAlias
} from "@/lib/crdt/description-aliases";
import { repairDescriptionAliases } from "@/lib/crdt/migration";
import { createVaultMirror, type VaultMirror } from "@/lib/crdt/mirror";
import {
    insertTransaction,
    updateTransaction,
    type TransactionLocation
} from "@/lib/crdt/mutations";
import type { VaultState } from "@/lib/crdt/schema";
import { asMinorUnits } from "@/lib/domain/currency";

const DATE = Temporal.PlainDate.from("2026-07-20");

function location(transactionId: string): TransactionLocation {
    return { accountId: "account", date: DATE, transactionId };
}

function seedTransaction(
    mirror: VaultMirror,
    transactionId: string,
    importId?: string,
    description = `Raw ${transactionId}`
): void {
    mirror.setState((state: VaultState) => {
        insertTransaction(state.transactions, {
            transaction: {
                id: transactionId,
                date: DATE,
                description,
                descriptionAliasId: undefined,
                notes: "",
                amount: asMinorUnits(100),
                accountId: "account",
                tagIds: [],
                statusId: "status",
                importId,
                allocations: {},
                creationInstant: Temporal.Instant.fromEpochMilliseconds(1),
                importRowIndex: 0,
                deletedAt: undefined
            }
        });
    });
}

function referenceIds(record: Record<string, boolean>): string[] {
    return Object.keys(record)
        .filter((id) => id !== "$cid")
        .sort();
}

function expectConserved(state: VaultState, transactionIds: readonly string[]): void {
    const seen = new Map<string, string>();
    for (const alias of Object.values(state.descriptionAliases)) {
        if (typeof alias !== "object" || alias == null) continue;
        for (const transactionId of referenceIds(alias.transactionIds)) {
            expect(seen.has(transactionId)).toBe(false);
            seen.set(transactionId, alias.id);
        }
    }
    for (const transactionId of transactionIds) {
        const transaction = state.transactions.account.years[0].months[0].days[0].transactions.find(
            (candidate) => candidate.id === transactionId
        );
        expect(seen.get(transactionId)).toBe(transaction?.descriptionAliasId);
    }
}

describe("atomic description alias mutations", () => {
    it("assigns through a symlink to the final real alias and preserves raw text", () => {
        const { mirror } = createVaultMirror();
        seedTransaction(mirror, "tx");
        mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "source", name: "Source" });
            createDescriptionAlias(state, { aliasId: "target", name: "Target" });
            changeAllDescriptionAliases(state, {
                sourceAliasId: "source",
                target: { kind: "existing", aliasId: "target" }
            });
            assignDescriptionAlias(state, { location: location("tx"), aliasId: "source" });
        });

        const state = mirror.getState();
        const transaction = state.transactions.account.years[0].months[0].days[0].transactions[0];
        expect(transaction.descriptionAliasId).toBe("target");
        expect(transaction.description).toBe("Raw tx");
        expect(referenceIds(state.descriptionAliases.target.transactionIds)).toEqual(["tx"]);
        expect(referenceIds(state.descriptionAliases.source.transactionIds)).toEqual([]);
    });

    it("flattens inbound symlinks without moving direct transaction pointers", () => {
        const { mirror } = createVaultMirror();
        for (const id of ["old", "middle", "new"]) seedTransaction(mirror, id);
        mirror.setState((state: VaultState) => {
            for (const id of ["old", "middle", "new"]) {
                createDescriptionAlias(state, { aliasId: id, name: id });
                assignDescriptionAlias(state, { location: location(id), aliasId: id });
            }
            changeAllDescriptionAliases(state, {
                sourceAliasId: "old",
                target: { kind: "existing", aliasId: "middle" }
            });
            changeAllDescriptionAliases(state, {
                sourceAliasId: "middle",
                target: { kind: "existing", aliasId: "new" }
            });
        });

        const aliases = mirror.getState().descriptionAliases;
        expect(aliases.old.targetAliasId).toBe("new");
        expect(aliases.middle.targetAliasId).toBe("new");
        expect(referenceIds(aliases.new.symlinkIds)).toEqual(["middle", "old"]);
        expect(referenceIds(aliases.old.transactionIds)).toEqual(["old"]);
        expect(referenceIds(aliases.middle.transactionIds)).toEqual(["middle"]);
    });

    it("returns a typed stale error without partial writes", () => {
        const { mirror } = createVaultMirror();
        seedTransaction(mirror, "tx");
        mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "a", name: "A" });
            createDescriptionAlias(state, { aliasId: "b", name: "B" });
            assignDescriptionAlias(state, { location: location("tx"), aliasId: "a" });
        });

        let errorCode: string | undefined;
        mirror.setState((state: VaultState) => {
            const result = changeOneDescriptionAlias(state, {
                location: location("tx"),
                expectedAliasId: "stale",
                target: { kind: "existing", aliasId: "b" }
            });
            errorCode = result.ok ? undefined : result.error.code;
        });

        const state = mirror.getState();
        expect(errorCode).toBe("stale-alias");
        expect(
            state.transactions.account.years[0].months[0].days[0].transactions[0].descriptionAliasId
        ).toBe("a");
        expect(referenceIds(state.descriptionAliases.a.transactionIds)).toEqual(["tx"]);
        expect(referenceIds(state.descriptionAliases.b.transactionIds)).toEqual([]);
    });

    it("uses deterministic trim + NFC, case-sensitive exact matching", () => {
        const { mirror } = createVaultMirror();
        seedTransaction(mirror, "exact");
        seedTransaction(mirror, "case");
        mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "existing", name: "Café" });
            assignDescriptionAliasByExactName(state, {
                location: location("exact"),
                newAliasId: "unused",
                name: "  Cafe\u0301  "
            });
            assignDescriptionAliasByExactName(state, {
                location: location("case"),
                newAliasId: "created",
                name: "CAFÉ"
            });
        });

        expect(normalizeDescriptionAliasName(" Cafe\u0301 ")).toBe("Café");
        const state = mirror.getState();
        const transactions = state.transactions.account.years[0].months[0].days[0].transactions;
        expect(transactions.find((tx) => tx.id === "exact")?.descriptionAliasId).toBe("existing");
        expect(transactions.find((tx) => tx.id === "case")?.descriptionAliasId).toBe("created");
    });

    it("unlinks top-level and imported transactions when deleting", () => {
        const { mirror } = createVaultMirror();
        seedTransaction(mirror, "one", "batch");
        seedTransaction(mirror, "two", "batch");
        mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "alias", name: "Alias" });
            assignDescriptionAlias(state, { location: location("one"), aliasId: "alias" });
            assignDescriptionAlias(state, { location: location("two"), aliasId: "alias" });
            deleteDescriptionAliasedTransaction(state, { location: location("one") });
            deleteDescriptionAliasedTransactionsByImport(state, "batch");
        });
        expect(referenceIds(mirror.getState().descriptionAliases.alias.transactionIds)).toEqual([]);
        expect(mirror.getState().transactions.account).toBeUndefined();
    });

    it("preserves nested-duplicate alias provenance and unlinks it on import deletion", () => {
        const { mirror } = createVaultMirror();
        mirror.setState((state: VaultState) => {
            insertTransaction(state.transactions, {
                transaction: {
                    id: "parent",
                    date: DATE,
                    description: "Parent raw",
                    descriptionAliasId: undefined,
                    notes: "",
                    amount: asMinorUnits(100),
                    accountId: "account",
                    tagIds: [],
                    statusId: "status",
                    importId: undefined,
                    allocations: {},
                    creationInstant: Temporal.Instant.fromEpochMilliseconds(1),
                    importRowIndex: undefined,
                    deletedAt: undefined,
                    suspectedDuplicates: [
                        {
                            id: "duplicate",
                            date: DATE,
                            description: "Duplicate raw",
                            descriptionAliasId: undefined,
                            notes: "",
                            amount: asMinorUnits(100),
                            accountId: "account",
                            tagIds: [],
                            statusId: "status",
                            importId: "batch",
                            allocations: {},
                            creationInstant: Temporal.Instant.fromEpochMilliseconds(2),
                            importRowIndex: 0,
                            deletedAt: undefined
                        }
                    ]
                }
            });
            createDescriptionAlias(state, { aliasId: "alias", name: "Alias" });
            assignDescriptionAlias(state, {
                location: location("duplicate"),
                aliasId: "alias"
            });
        });
        expect(referenceIds(mirror.getState().descriptionAliases.alias.transactionIds)).toEqual([
            "duplicate"
        ]);

        mirror.setState((state: VaultState) => {
            deleteDescriptionAliasedTransactionsByImport(state, "batch");
        });
        expect(referenceIds(mirror.getState().descriptionAliases.alias.transactionIds)).toEqual([]);
        expect(
            mirror.getState().transactions.account.years[0].months[0].days[0].transactions[0]
                .suspectedDuplicates
        ).toHaveLength(0);
    });

    it("blocks raw-description and pointer writes through the generic updater", () => {
        const { mirror } = createVaultMirror();
        seedTransaction(mirror, "tx", undefined, "Immutable raw");
        mirror.setState((state: VaultState) => {
            updateTransaction(state.transactions, {
                location: location("tx"),
                updates: { description: "Changed", descriptionAliasId: "untracked", notes: "kept" }
            });
        });
        const transaction =
            mirror.getState().transactions.account.years[0].months[0].days[0].transactions[0];
        expect(transaction.description).toBe("Immutable raw");
        expect(transaction.descriptionAliasId).toBeUndefined();
        expect(transaction.notes).toBe("kept");
    });

    it("repairs stale reverse references from authoritative transaction pointers", () => {
        const { mirror } = createVaultMirror();
        seedTransaction(mirror, "tx");
        mirror.setState((state: VaultState) => {
            createDescriptionAlias(state, { aliasId: "alias", name: "Alias" });
            assignDescriptionAlias(state, { location: location("tx"), aliasId: "alias" });
            state.descriptionAliases.alias.transactionIds.ghost = true;
            const transaction =
                state.transactions.account.years[0].months[0].days[0].transactions[0];
            transaction.descriptionAliasId = "missing";
            repairDescriptionAliases(state);
        });
        const state = mirror.getState();
        expect(
            state.transactions.account.years[0].months[0].days[0].transactions[0].descriptionAliasId
        ).toBeUndefined();
        expect(referenceIds(state.descriptionAliases.alias.transactionIds)).toEqual([]);
    });

    it("conserves forward and reverse references across randomized reassignment/removal", () => {
        fc.assert(
            fc.property(
                fc.array(fc.tuple(fc.integer({ min: 0, max: 5 }), fc.integer({ min: 0, max: 2 })), {
                    minLength: 1,
                    maxLength: 80
                }),
                (steps) => {
                    const { mirror } = createVaultMirror();
                    const transactionIds = Array.from({ length: 6 }, (_, index) => `tx-${index}`);
                    for (const id of transactionIds) seedTransaction(mirror, id);
                    mirror.setState((state: VaultState) => {
                        for (const aliasId of ["a", "b", "c"]) {
                            createDescriptionAlias(state, { aliasId, name: aliasId });
                        }
                        for (const [transactionIndex, operation] of steps) {
                            const transactionId = transactionIds[transactionIndex];
                            const transaction =
                                state.transactions.account.years[0].months[0].days[0].transactions.find(
                                    (candidate) => candidate.id === transactionId
                                );
                            if (!transaction) continue;
                            if (operation === 2 && transaction.descriptionAliasId) {
                                removeOneDescriptionAlias(state, {
                                    location: location(transactionId),
                                    expectedAliasId: transaction.descriptionAliasId
                                });
                            } else {
                                assignDescriptionAlias(state, {
                                    location: location(transactionId),
                                    aliasId: ["a", "b", "c"][operation]
                                });
                            }
                        }
                    });
                    expectConserved(mirror.getState(), transactionIds);
                }
            ),
            { numRuns: 40 }
        );
    });
});
